// api/broadcast.js - owner-authorized email broadcast
import { isOwnerEmail, requireSession } from '../lib/auth.js';
import { readConversionMetrics } from '../lib/conversion-metrics.js';
import { readFunnelMetrics } from '../lib/funnel-metrics.js';
import { readOwnerCallHealth, startOwnerCall } from '../lib/owner-call.js';
import { createStellarCallSession, getActiveStellarCall, stellarCallConfigured, updateStellarCall } from '../lib/stellar-call.js';
import { DEFAULT_OWNER_CALL_POLICY, OWNER_AUTO_CALL_CATEGORIES, normalizeOwnerCallPolicy } from '../lib/auto-call-rules.js';
import { handleJarvisVoiceWebhook } from '../lib/jarvis-voice.js';
import { getOwnerPushPublicKey, ownerPushConfigured, saveOwnerPushSubscription, sendOwnerPushAlert } from '../lib/owner-push.js';
import { resendSender, SUPPORT_EMAIL } from '../lib/email-config.js';

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = /^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendOwnerFallbackEmail({ category, severity, summary }) {
  const resendKey = process.env.RESEND_API_KEY;
  const from = resendSender();
  const recipients = String(process.env.OWNER_EMAILS || process.env.OWNER_EMAIL || '')
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value));
  if (!resendKey || !from || !recipients.length) return false;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: '[Stellar ' + severity.toUpperCase() + '] ' + category + ' alert - phone call unavailable',
        text: 'Stellar AI could not place the urgent owner phone call.\n\nCategory: ' + category + '\nSeverity: ' + severity + '\n\n' + summary + '\n\nThe phone provider blocked the call, so this email was sent as the fallback alert.',
      }),
      signal: AbortSignal.timeout(10000),
    });
    return response.ok;
  } catch (error) {
    console.error('Owner fallback email failed', error?.message || error);
    return false;
  }
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  if (String(req.query?.jarvisVoice || '') === '1') return handleJarvisVoiceWebhook(req, res);

  const action = String(req.body?.action || '');
  const bridgeToken = String(process.env.CALL_BRIDGE_TOKEN || '');
  const suppliedBridgeToken = String(req.headers['x-call-bridge-token'] || '');
  const internalOwnerCall = ['escalateOwner','callOwner','callHealth'].includes(action) && bridgeToken && suppliedBridgeToken === bridgeToken;
  const internalEscalation = internalOwnerCall;

  let ownerSession = null;
  if (!internalEscalation) {
    const session = requireSession(req, res);
    if (!session) return;
    if (!isOwnerEmail(session.email)) return res.status(403).json({ error: 'Owner access is required.' });
    ownerSession = session;
  }

  if (req.body?.action === 'verifyOwner') return res.status(200).json({ ok: true, owner: true });
  if (action === 'ownerPushPublicKey') {
    return res.status(200).json({ ok: true, configured: ownerPushConfigured(), publicKey: getOwnerPushPublicKey() });
  }
  if (action === 'ownerPushSubscribe') {
    const result = await saveOwnerPushSubscription({
      email: ownerSession?.email || 'owner',
      subscription: req.body?.subscription,
      userAgent: req.headers['user-agent'] || '',
    });
    return res.status(result.ok ? 200 : 400).json(result);
  }
  if (action === 'ownerPushTest') {
    const created = await createStellarCallSession({
      category: 'test',
      severity: 'info',
      summary: 'Jarvis push-call test. Tap the notification to open the Stellar in-app call.',
      metadata: { trigger: 'owner-push-test' },
    });
    const pushed = await sendOwnerPushAlert({
      category: 'test',
      severity: 'urgent',
      summary: 'Jarvis push-call test. Tap to open Stellar.',
      call: created?.call || null,
    });
    return res.status(200).json({ ok: true, call: created?.call || null, push: pushed });
  }

  if (action === 'stellarCallStatus') {
    return res.status(200).json({ ok: true, configured: stellarCallConfigured(), active: await getActiveStellarCall() });
  }
  if (action === 'stellarCallPending') {
    return res.status(200).json({ ok: true, call: await getActiveStellarCall() });
  }
  if (['stellarCallAnswer','stellarCallDecline','stellarCallComplete'].includes(action)) {
    const status = action === 'stellarCallAnswer' ? 'answered' : (action === 'stellarCallDecline' ? 'declined' : 'completed');
    const updated = await updateStellarCall(req.body?.callId, status);
    return res.status(updated.ok ? 200 : 404).json(updated);
  }
  if (action === 'stellarCallTest') {
    const created = await createStellarCallSession({
      category: 'test',
      severity: 'info',
      summary: 'Stellar Call test. Jarvis is checking that your in-app calling screen works.',
      metadata: { trigger: 'owner-test' },
    });
    return res.status(created.ok ? 200 : 503).json(created);
  }

  if (req.body?.action === 'getCallPolicy') {
    const kvUrl = process.env.KV_REST_API_URL, kvToken = process.env.KV_REST_API_TOKEN;
    if (!kvUrl || !kvToken) return res.status(200).json({ ok:true, ...DEFAULT_OWNER_CALL_POLICY });
    const r=await fetch(`${kvUrl}/get/stellar:owner-call:policy`,{headers:{Authorization:`Bearer ${kvToken}`}}); const d=await r.json().catch(()=>({}));
    let policy=normalizeOwnerCallPolicy(); try{if(d?.result)policy=normalizeOwnerCallPolicy(JSON.parse(d.result))}catch{}
    return res.status(200).json({ok:true,...policy});
  }

  if (req.body?.action === 'setCallPolicy') {
    const kvUrl = process.env.KV_REST_API_URL, kvToken = process.env.KV_REST_API_TOKEN;
    if (!kvUrl || !kvToken) return res.status(503).json({error:'Owner call policy storage is unavailable.'});
    const policy=normalizeOwnerCallPolicy({enabled:req.body?.enabled!==false,cooldownMinutes:req.body?.cooldownMinutes,categories:req.body?.categories});
    const r=await fetch(`${kvUrl}/set/stellar:owner-call:policy/${encodeURIComponent(JSON.stringify(policy))}`,{headers:{Authorization:`Bearer ${kvToken}`}});
    if(!r.ok)return res.status(502).json({error:'Could not save call policy.'}); return res.status(200).json({ok:true,...policy});
  }

  if (req.body?.action === 'callHealth') {
    const authorization = String(req.headers.authorization || '');
    const health = await readOwnerCallHealth({ authorization, bridgeToken });
    if (!health.ok && !health.ready) return res.status(502).json({ error: health.error || 'The phone service health check failed.' });
    return res.status(200).json(health);
  }
  if (req.body?.action === 'callOwner') {
    const authorization = String(req.headers.authorization || '');
    const purpose = String(req.body?.purpose || 'Owner requested a call from Jarvis in Stellar AI.').slice(0, 300);
    try {
      const data = await startOwnerCall({ purpose, authorization, bridgeToken });
      return res.status(200).json({ ok: true, provider: data.provider, call_id: data.call_id || null, status: data.status || 'started' });
    } catch (error) {
      console.error('Owner call provider error', error?.provider || '', error?.message || error);
      try {
        const created = await createStellarCallSession({
          category: 'owner-call',
          severity: 'info',
          summary: purpose || 'Jarvis tried to phone you, but the phone provider blocked the call.',
          metadata: {
            trigger: 'owner-call-phone-fallback',
            phoneProvider: error?.provider || 'phone',
            phoneStatus: error?.status || null,
            phoneMessage: String(error?.message || 'phone-unavailable').slice(0, 240),
          },
        });
        if (created?.ok) {
          const pushed = await sendOwnerPushAlert({ category: 'owner-call', severity: 'urgent', summary: purpose, reason: error?.message || 'phone-unavailable', call: created.call || null });
          return res.status(200).json({
            ok: true,
            provider: 'stellar-inapp',
            phone_blocked: true,
            fallback: pushed?.sent > 0 ? 'push_in_app_call' : 'in_app_call',
            call_id: null,
            status: 'ringing',
            stellar_call: created.call || null,
            push: pushed,
            message: pushed?.sent > 0 ? 'The phone provider blocked the outbound call, so Stellar sent a Jarvis push alert and opened the in-app call.' : 'The phone provider blocked the outbound call, so Stellar opened the in-app Jarvis call instead.',
          });
        }
      } catch (fallbackError) {
        console.error('Owner in-app call fallback failed', fallbackError?.message || fallbackError);
      }
      return res.status(error?.status >= 400 && error?.status < 500 ? error.status : 502).json({ error: 'The phone service could not start the call.' });
    }
  }
  if (req.body?.action === 'escalateOwner') {
    const category=String(req.body?.category||'').toLowerCase(), severity=String(req.body?.severity||'').toLowerCase(), summary=String(req.body?.summary||'').trim().slice(0,300);
    const allowed=OWNER_AUTO_CALL_CATEGORIES;
    if(!allowed.includes(category)||!['urgent','critical'].includes(severity)||!summary)return res.status(400).json({error:'A valid urgent escalation is required.'});
    const kvUrl=process.env.KV_REST_API_URL, kvToken=process.env.KV_REST_API_TOKEN; let policy=normalizeOwnerCallPolicy(), last=0;
    if(!kvUrl||!kvToken)return res.status(200).json({ok:true,called:false,reason:'storage'});
    try {
      const [pr,lr]=await Promise.all([fetch(`${kvUrl}/get/stellar:owner-call:policy`,{headers:{Authorization:`Bearer ${kvToken}`}}),fetch(`${kvUrl}/get/stellar:owner-call:last`,{headers:{Authorization:`Bearer ${kvToken}`}})]);
      const pd=await pr.json().catch(()=>({})),ld=await lr.json().catch(()=>({}));
      if(pd?.result)policy=normalizeOwnerCallPolicy(JSON.parse(pd.result)); last=Number(ld?.result||0)||0;
    } catch(error) { console.error('Owner call policy lookup failed',error?.message||error); return res.status(200).json({ok:true,called:false,reason:'storage'}); }
    if(policy.enabled===false||!policy.categories?.includes(category))return res.status(200).json({ok:true,called:false,reason:'policy'});
    if(last&&Date.now()-last<policy.cooldownMinutes*60000)return res.status(200).json({ok:true,called:false,reason:'cooldown'});
    const authorization = String(req.headers.authorization || '');
    const metadata = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};
    const purpose = `URGENT ${category.toUpperCase()}: ${summary}`;
    let stellarCall = null;
    try {
      const created = await createStellarCallSession({
        category,
        severity,
        summary,
        metadata: { ...metadata, escalation: { category, severity, summary }, trigger: metadata?.trigger || 'owner-escalation' },
      });
      if (created?.ok) stellarCall = created.call || null;
    } catch (error) {
      console.error('Stellar Call session creation failed', error?.message || error);
    }
    try {
      const data = await startOwnerCall({ purpose, authorization, bridgeToken, metadata: { ...metadata, escalation: { category, severity, summary } } });
      const stamp = Date.now();
      await Promise.all([
        fetch(`${kvUrl}/set/stellar:owner-call:last/${stamp}`, { headers: { Authorization: `Bearer ${kvToken}` } }),
        fetch(`${kvUrl}/set/stellar:owner-call:audit/${encodeURIComponent(JSON.stringify({ t: stamp, category, severity, summary, call_id: data?.call_id || null, provider: data?.provider || null, channel: 'phone' }))}`, { headers: { Authorization: `Bearer ${kvToken}` } }),
      ]).catch(() => {});
      if (data?.provider === 'twilio') {
        return res.status(200).json({ ok: true, called: false, pending: true, provider: 'twilio', call_id: data?.call_id || null, status: data?.status || 'queued', stellar_call: stellarCall });
      }
      return res.status(200).json({ ok: true, called: true, provider: data?.provider || null, call_id: data?.call_id || null, status: data?.status || 'started', stellar_call: stellarCall });
    } catch (error) {
      console.error('Urgent owner escalation failed', error?.provider || '', error?.message || error);
      const pushed = await sendOwnerPushAlert({ category, severity, summary, reason: error?.message || 'phone-unavailable', call: stellarCall });
      if (pushed?.sent > 0) {
        const stamp = Date.now();
        await fetch(`${kvUrl}/set/stellar:owner-call:audit/${encodeURIComponent(JSON.stringify({ t: stamp, category, severity, summary, channel: 'push' }))}`, { headers: { Authorization: `Bearer ${kvToken}` } }).catch(() => {});
        return res.status(200).json({ ok: true, called: false, fallback: 'push', reason: 'phone-unavailable', push: pushed, stellar_call: stellarCall });
      }
      const emailed = await sendOwnerFallbackEmail({ category, severity, summary });
      if (emailed) {
        const stamp = Date.now();
        await fetch(`${kvUrl}/set/stellar:owner-call:audit/${encodeURIComponent(JSON.stringify({ t: stamp, category, severity, summary, channel: 'email' }))}`, { headers: { Authorization: `Bearer ${kvToken}` } }).catch(() => {});
        return res.status(200).json({ ok: true, called: false, fallback: 'email', reason: 'phone-unavailable', push: pushed, stellar_call: stellarCall });
      }
      if (stellarCall) {
        return res.status(200).json({ ok: true, called: false, in_app: true, reason: 'phone-unavailable', stellar_call: stellarCall });
      }
      return res.status(502).json({ error: 'Urgent owner call failed.' });
    }
  }
  if (req.body?.action === 'conversionMetrics') {
    const requestedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.date || '')) ? new Date(`${req.body.date}T00:00:00.000Z`) : new Date();
    const result = await readConversionMetrics(requestedDate);
    return res.status(result.ok ? 200 : 500).json(result);
  }

  if (req.body?.action === 'funnelMetrics') {
    const result = await readFunnelMetrics({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
    return res.status(result.ok ? 200 : 500).json(result);
  }

  const subject = String(req.body?.subject || '').trim();
  const body = String(req.body?.body || '').trim();
  if (!subject || !body) return res.status(400).json({ error: 'Enter both a subject and message.' });
  if (subject.length > 160 || body.length > 10000) return res.status(400).json({ error: 'Your email is too long.' });

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  const resendKey = process.env.RESEND_API_KEY;
  const from = resendSender();
  if (!kvUrl || !kvToken || !resendKey || !from) return res.status(500).json({ error: 'Email delivery is not configured.' });

  try {
    const [authResponse, userResponse] = await Promise.all([
      fetch(`${kvUrl}/keys/stellar:auth:*`, { headers: { Authorization: `Bearer ${kvToken}` } }),
      fetch(`${kvUrl}/keys/stellar:user:*`, { headers: { Authorization: `Bearer ${kvToken}` } }),
    ]);
    if (!authResponse.ok || !userResponse.ok) throw new Error('Recipient lookup failed');

    const authKeys = (await authResponse.json()).result || [];
    const userKeys = (await userResponse.json()).result || [];
    const emails = [...new Set([
      ...authKeys.map((key) => String(key).replace('stellar:auth:', '')),
      ...userKeys.map((key) => String(key).replace('stellar:user:', '')),
    ])].filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email));

    let sent = 0;
    let failed = 0;
    for (const email of emails) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          reply_to: SUPPORT_EMAIL,
          to: [email],
          subject,
          html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#050505;color:#fff;">
            <div style="font-size:18px;font-weight:900;margin-bottom:24px;">Stellar AI</div>
            <div style="font-size:15px;color:rgba(255,255,255,0.84);line-height:1.7;white-space:pre-wrap;">${escapeHtml(body)}</div>
            <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;">
            <a href="https://trystellarai.com/app" style="display:inline-block;background:#10a37f;color:#000;font-weight:800;padding:12px 24px;border-radius:8px;text-decoration:none;">Open Stellar AI</a>
          </div>`,
        }),
      });
      if (response.ok) sent += 1;
      else failed += 1;
    }

    return res.status(200).json({ ok: true, count: sent, failed });
  } catch (error) {
    console.error('Broadcast error', error?.message || error);
    return res.status(500).json({ error: 'Could not send the broadcast.' });
  }
}


