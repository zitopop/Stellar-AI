(() => {
  const POLL_MS = 5000;
  let activeCall = null;
  let pollTimer = null;
  let ringTimer = null;
  let audioContext = null;
  let recognition = null;
  let speaking = false;
  let callConversation = [];

  const $ = (id) => document.getElementById(id);

  function ownerReady() {
    try { return typeof window.isOwner === 'function' && window.isOwner(); } catch { return false; }
  }

  function headers() {
    try {
      if (typeof window.authHeaders === 'function') return window.authHeaders();
    } catch {}
    return { 'Content-Type': 'application/json' };
  }

  async function request(action, payload = {}) {
    const actionMap = {
      status: 'stellarCallStatus',
      pending: 'stellarCallPending',
      answer: 'stellarCallAnswer',
      decline: 'stellarCallDecline',
      complete: 'stellarCallComplete',
      test: 'stellarCallTest',
      pushConfig: 'stellarPushConfig',
      pushSubscribe: 'stellarPushSubscribe',
      schedule: 'stellarCallSchedule',
      scheduleList: 'stellarCallScheduleList',
      scheduleCancel: 'stellarCallScheduleCancel',
    };
    const response = await fetch('/api/broadcast', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ action: actionMap[action] || action, ...payload }),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Stellar Call request failed.');
    return data;
  }

  function injectUi() {
    if ($('stellar-call-shell')) return;
    const shell = document.createElement('section');
    shell.id = 'stellar-call-shell';
    shell.className = 'stellar-call-shell';
    shell.hidden = true;
    shell.setAttribute('role', 'dialog');
    shell.setAttribute('aria-modal', 'true');
    shell.setAttribute('aria-labelledby', 'stellar-call-title');
    shell.innerHTML = `
      <div class="stellar-call-card">
        <div class="stellar-call-avatar" aria-hidden="true">✦</div>
        <p class="stellar-call-kicker">STELLAR CALL</p>
        <h2 id="stellar-call-title">Jarvis</h2>
        <p id="stellar-call-state" class="stellar-call-state">Incoming call…</p>
        <div id="stellar-call-reason" class="stellar-call-reason"></div>
        <div id="stellar-call-transcript" class="stellar-call-transcript" aria-live="polite"></div>
        <div class="stellar-call-actions">
          <button id="stellar-call-decline" class="stellar-call-decline" type="button">Decline</button>
          <button id="stellar-call-answer" class="stellar-call-answer" type="button">Answer</button>
          <button id="stellar-call-talk" class="stellar-call-talk" type="button">Talk to Jarvis</button>
          <button id="stellar-call-end" class="stellar-call-end" type="button">End call</button>
        </div>
      </div>`;
    document.body.appendChild(shell);
    $('stellar-call-answer')?.addEventListener('click', answerCall);
    $('stellar-call-decline')?.addEventListener('click', declineCall);
    $('stellar-call-talk')?.addEventListener('click', listenTurn);
    $('stellar-call-end')?.addEventListener('click', completeCall);
  }

  function base64UrlToBytes(value) {
    const padding = '='.repeat((4 - String(value || '').length % 4) % 4);
    const base64 = String(value || '').replace(/-/g, '+').replace(/_/g, '/') + padding;
    const raw = atob(base64);
    return Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
  }

  function isIosDevice() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  }

  function isStandaloneApp() {
    return window.matchMedia?.('(display-mode: standalone)')?.matches === true || navigator.standalone === true;
  }

  async function enablePhoneRinging(status) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      if (status) status.textContent = 'Background ringing is unavailable in this browser';
      return false;
    }
    if (isIosDevice() && !isStandaloneApp()) {
      if (status) status.textContent = 'iPhone: Share → Add to Home Screen first';
      return false;
    }
    try {
      if (status) status.textContent = 'Enabling phone ringing…';
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        if (status) status.textContent = permission === 'denied' ? 'Blocked in phone settings' : 'Not enabled';
        return false;
      }
      const config = await request('pushConfig');
      if (!config.configured || !config.publicKey) throw new Error('Phone push is not configured yet.');
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToBytes(config.publicKey),
        });
      }
      await request('pushSubscribe', { subscription: subscription.toJSON() });
      if (status) status.textContent = 'On · Jarvis can ring this phone';
      return true;
    } catch (error) {
      if (status) status.textContent = error.message || 'Could not enable phone ringing';
      return false;
    }
  }

  async function syncExistingPhoneSubscription() {
    if (!ownerReady() || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) await request('pushSubscribe', { subscription: subscription.toJSON() });
    } catch {}
  }

  function localDateTimeValue(ms) {
    const date = new Date(ms);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function injectScheduleUi() {
    if ($('stellar-call-schedule-shell')) return;
    const shell = document.createElement('section');
    shell.id = 'stellar-call-schedule-shell';
    shell.className = 'stellar-call-schedule-shell';
    shell.hidden = true;
    shell.setAttribute('role', 'dialog');
    shell.setAttribute('aria-modal', 'true');
    shell.innerHTML = `
      <form id="stellar-call-schedule-form" class="stellar-call-schedule-card">
        <div class="stellar-call-schedule-head">
          <div><strong>Jarvis phone calls</strong><small>Meetings, reminders and approved important events.</small></div>
          <button id="stellar-call-schedule-close" type="button" aria-label="Close">×</button>
        </div>
        <label>Reason<input id="stellar-call-schedule-reason" maxlength="300" placeholder="Meeting with Alex" required></label>
        <div class="stellar-call-schedule-grid">
          <label>Type<select id="stellar-call-schedule-category"><option value="meeting">Meeting</option><option value="reminder">Reminder</option><option value="approval">Approval</option><option value="personal">Personal</option></select></label>
          <label>Call me at<input id="stellar-call-schedule-time" type="datetime-local" required></label>
        </div>
        <button class="stellar-call-schedule-submit" type="submit">Schedule Jarvis call</button>
        <p id="stellar-call-schedule-status" class="stellar-call-schedule-status"></p>
        <div id="stellar-call-schedule-list" class="stellar-call-schedule-list"></div>
      </form>`;
    document.body.appendChild(shell);
    $('stellar-call-schedule-close')?.addEventListener('click', () => { shell.hidden = true; });
    shell.addEventListener('click', (event) => { if (event.target === shell) shell.hidden = true; });
    $('stellar-call-schedule-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = $('stellar-call-schedule-status');
      const summary = String($('stellar-call-schedule-reason')?.value || '').trim();
      const category = String($('stellar-call-schedule-category')?.value || 'reminder');
      const scheduledAt = new Date(String($('stellar-call-schedule-time')?.value || '')).getTime();
      if (!summary || !Number.isFinite(scheduledAt)) return;
      try {
        if (status) status.textContent = 'Scheduling…';
        await request('schedule', { summary, category, scheduledAt });
        if (status) status.textContent = 'Scheduled. Jarvis will ring your enabled phone.';
        $('stellar-call-schedule-reason').value = '';
        await renderSchedules();
      } catch (error) {
        if (status) status.textContent = error.message || 'Could not schedule that call';
      }
    });
  }

  async function renderSchedules() {
    const list = $('stellar-call-schedule-list');
    if (!list) return;
    try {
      const data = await request('scheduleList');
      const items = Array.isArray(data.schedules) ? data.schedules.filter((item) => item.status === 'scheduled') : [];
      list.innerHTML = '';
      if (!items.length) {
        list.innerHTML = '<small>No upcoming Jarvis calls.</small>';
        return;
      }
      for (const item of items.slice(0, 12)) {
        const row = document.createElement('div');
        row.className = 'stellar-call-schedule-item';
        const copy = document.createElement('div');
        const strong = document.createElement('strong');
        strong.textContent = item.summary || 'Jarvis call';
        const small = document.createElement('small');
        small.textContent = new Date(item.scheduledAt).toLocaleString();
        copy.append(strong, small);
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.textContent = 'Cancel';
        cancel.addEventListener('click', async () => {
          await request('scheduleCancel', { scheduleId: item.id }).catch(() => {});
          await renderSchedules();
        });
        row.append(copy, cancel);
        list.appendChild(row);
      }
    } catch {
      list.innerHTML = '<small>Could not load scheduled calls.</small>';
    }
  }

  async function openScheduleUi() {
    injectScheduleUi();
    const shell = $('stellar-call-schedule-shell');
    if (!shell) return;
    shell.hidden = false;
    const input = $('stellar-call-schedule-time');
    if (input && !input.value) input.value = localDateTimeValue(Date.now() + 10 * 60 * 1000);
    await renderSchedules();
  }

  function injectSettingsRow() {
    if (!ownerReady() || $('stellar-call-settings')) return;
    const grid = document.querySelector('#settings-panel .settings-grid');
    if (!grid) return;

    const row = document.createElement('button');
    row.id = 'stellar-call-settings';
    row.type = 'button';
    row.className = 'settings-row stellar-call-settings-row';
    row.hidden = false;
    row.innerHTML = '<strong>Stellar Call</strong><small id="stellar-call-settings-status">Run a test Jarvis call</small>';
    row.addEventListener('click', async () => {
      const status = $('stellar-call-settings-status');
      if (status) status.textContent = 'Creating a test call…';
      try {
        const data = await request('test');
        if (status) status.textContent = data.push?.sent ? 'Test call sent to your phone' : 'Test in-app call created';
        if (data.call) showIncoming(data.call);
      } catch (error) {
        if (status) status.textContent = error.message || 'Test call failed';
      }
    });

    const phone = document.createElement('button');
    phone.id = 'stellar-call-phone';
    phone.type = 'button';
    phone.className = 'settings-row stellar-call-settings-row';
    phone.hidden = false;
    const phoneState = ('Notification' in window && Notification.permission === 'granted') ? 'Tap to verify this phone' : 'Tap to enable on this phone';
    phone.innerHTML = `<strong>Phone ringing</strong><small id="stellar-call-phone-status">${phoneState}</small>`;
    phone.addEventListener('click', () => enablePhoneRinging($('stellar-call-phone-status')));

    const schedule = document.createElement('button');
    schedule.id = 'stellar-call-schedule';
    schedule.type = 'button';
    schedule.className = 'settings-row stellar-call-settings-row';
    schedule.hidden = false;
    schedule.innerHTML = '<strong>Meetings & reminders</strong><small>Schedule when Jarvis should call you</small>';
    schedule.addEventListener('click', openScheduleUi);

    const callHealth = $('owner-call-health-btn');
    if (callHealth?.parentElement === grid) {
      grid.insertBefore(schedule, callHealth);
      grid.insertBefore(phone, schedule);
      grid.insertBefore(row, phone);
    } else {
      grid.append(row, phone, schedule);
    }
    void syncExistingPhoneSubscription();
  }

  function stopRingtone() {
    if (ringTimer) clearInterval(ringTimer);
    ringTimer = null;
    try { audioContext?.close?.(); } catch {}
    audioContext = null;
    try { navigator.vibrate?.(0); } catch {}
  }

  async function beep() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContext || audioContext.state === 'closed') audioContext = new AudioCtx();
      if (audioContext.state === 'suspended') await audioContext.resume();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.value = 720;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.32);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      osc.stop(audioContext.currentTime + 0.34);
    } catch {}
  }

  function startRingtone() {
    stopRingtone();
    beep();
    try { navigator.vibrate?.([250, 180, 250]); } catch {}
    ringTimer = setInterval(() => {
      beep();
      try { navigator.vibrate?.([250, 180, 250]); } catch {}
    }, 1500);
  }

  async function notifyIncoming(call) {
    if (!document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : null;
      if (registration) {
        await registration.showNotification('Jarvis is calling', {
          body: call.summary || 'Stellar AI needs your attention.',
          icon: '/lib/assets/pwa/icon-192.png',
          badge: '/lib/assets/pwa/icon-192.png',
          tag: 'stellar-call-' + call.id,
          renotify: true,
          data: { url: '/app?stellarCall=1', callId: call.id },
        });
      } else {
        new Notification('Jarvis is calling', { body: call.summary || 'Stellar AI needs your attention.' });
      }
    } catch {}
  }

  function showIncoming(call) {
    if (!call?.id) return;
    injectUi();
    activeCall = call;
    callConversation = [];
    const shell = $('stellar-call-shell');
    shell.hidden = false;
    shell.classList.toggle('stellar-call-connected', call.status === 'answered');
    $('stellar-call-state').textContent = call.status === 'answered' ? 'Connected · Jarvis' : 'Incoming call…';
    $('stellar-call-reason').textContent = call.summary || 'Jarvis needs your attention.';
    $('stellar-call-transcript').textContent = '';
    document.documentElement.style.overflow = 'hidden';
    if (call.status === 'answered') stopRingtone(); else startRingtone();
    if (call.status !== 'answered') notifyIncoming(call);
  }

  function hideCall() {
    stopRingtone();
    try { speechSynthesis?.cancel?.(); } catch {}
    try { recognition?.abort?.(); } catch {}
    recognition = null;
    const shell = $('stellar-call-shell');
    if (shell) {
      shell.hidden = true;
      shell.classList.remove('stellar-call-connected');
    }
    document.documentElement.style.overflow = '';
    activeCall = null;
    callConversation = [];
  }

  function chooseVoice() {
    try {
      const voices = speechSynthesis.getVoices();
      return voices.find((voice) => /^en-GB$/i.test(voice.lang))
        || voices.find((voice) => /^en/i.test(voice.lang))
        || null;
    } catch { return null; }
  }

  function speak(text) {
    return new Promise((resolve) => {
      const clean = String(text || '').trim();
      if (!clean || !('speechSynthesis' in window)) return resolve();
      try {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(clean.slice(0, 900));
        utterance.lang = 'en-GB';
        utterance.rate = 1.02;
        utterance.pitch = 0.92;
        const voice = chooseVoice();
        if (voice) utterance.voice = voice;
        speaking = true;
        utterance.onend = () => { speaking = false; resolve(); };
        utterance.onerror = () => { speaking = false; resolve(); };
        speechSynthesis.speak(utterance);
      } catch {
        speaking = false;
        resolve();
      }
    });
  }

  async function answerCall() {
    if (!activeCall) return;
    stopRingtone();
    try {
      const data = await request('answer', { callId: activeCall.id });
      activeCall = data.call || activeCall;
    } catch {}
    const shell = $('stellar-call-shell');
    shell?.classList.add('stellar-call-connected');
    $('stellar-call-state').textContent = 'Connected · Jarvis';
    const greeting = `Tobi, Jarvis here. ${activeCall.summary || 'I need your attention.'}`;
    const transcript = $('stellar-call-transcript');
    transcript.textContent = 'Jarvis: ' + greeting;
    callConversation.push({ role: 'assistant', content: greeting });
    await speak(greeting);
  }

  async function declineCall() {
    if (!activeCall) return;
    try { await request('decline', { callId: activeCall.id }); } catch {}
    hideCall();
  }

  async function completeCall() {
    if (!activeCall) return;
    try { await request('complete', { callId: activeCall.id }); } catch {}
    hideCall();
  }

  function appendTranscript(who, text) {
    const box = $('stellar-call-transcript');
    if (!box) return;
    const line = document.createElement('div');
    line.textContent = who + ': ' + text;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  async function readStream(response) {
    if (!response.body) throw new Error('Jarvis returned no voice reply.');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    const consume = (line) => {
      if (!line.startsWith('data:')) return;
      const raw = line.slice(5).trim();
      if (!raw || raw === '[DONE]') return;
      try {
        const event = JSON.parse(raw);
        const delta =
          (event?.type === 'content_block_delta' && typeof event?.delta?.text === 'string' ? event.delta.text : '')
          || (event?.type === 'response.output_text.delta' && typeof event?.delta === 'string' ? event.delta : '')
          || (typeof event?.choices?.[0]?.delta?.content === 'string' ? event.choices[0].delta.content : '');
        if (delta) full += delta;
      } catch {}
    };
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) consume(line);
    }
    buffer += decoder.decode();
    for (const line of buffer.split('\n')) consume(line);
    return full.trim();
  }

  async function askJarvis(spoken) {
    const talk = $('stellar-call-talk');
    if (talk) { talk.disabled = true; talk.textContent = 'Jarvis is thinking…'; }
    appendTranscript('You', spoken);
    callConversation.push({ role: 'user', content: spoken });

    const context = activeCall?.summary || 'Owner Stellar Call';
    const recent = callConversation.slice(-8);
    const messages = [
      {
        role: 'user',
        content: `You are Jarvis speaking with Tobi in Stellar Call. Keep replies concise and natural for speech. The reason for this call is: ${context}. Continue the conversation using the following recent call turns: ${JSON.stringify(recent)}`,
      },
    ];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          action: 'chat',
          model: 'star',
          selectedModel: 'star',
          messages,
          use_credit: false,
          client: { source: 'stellar-call', callId: activeCall?.id || '' },
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Jarvis could not answer.');
      }
      const reply = await readStream(response);
      if (!reply) throw new Error('Jarvis returned no reply.');
      appendTranscript('Jarvis', reply);
      callConversation.push({ role: 'assistant', content: reply });
      await speak(reply);
    } catch (error) {
      appendTranscript('Jarvis', error.message || 'I could not answer that just now.');
    } finally {
      if (talk) { talk.disabled = false; talk.textContent = 'Talk to Jarvis'; }
    }
  }

  function listenTurn() {
    if (!activeCall || speaking) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const talk = $('stellar-call-talk');
    if (!Recognition) {
      if (talk) talk.textContent = 'Voice input unavailable';
      return;
    }
    try {
      recognition?.abort?.();
      recognition = new Recognition();
      recognition.lang = 'en-GB';
      recognition.interimResults = false;
      recognition.continuous = false;
      if (talk) { talk.disabled = true; talk.textContent = 'Listening…'; }
      recognition.onresult = (event) => {
        const spoken = Array.from(event.results || [])
          .map((result) => String(result?.[0]?.transcript || '').trim())
          .filter(Boolean)
          .join(' ')
          .trim();
        if (spoken) void askJarvis(spoken);
      };
      recognition.onerror = () => {
        if (talk) { talk.disabled = false; talk.textContent = 'Talk to Jarvis'; }
      };
      recognition.onend = () => {
        if (talk && talk.textContent === 'Listening…') {
          talk.disabled = false;
          talk.textContent = 'Talk to Jarvis';
        }
      };
      recognition.start();
    } catch {
      if (talk) { talk.disabled = false; talk.textContent = 'Talk to Jarvis'; }
    }
  }

  async function poll() {
    if (!ownerReady() || activeCall) {
      injectSettingsRow();
      return;
    }
    injectSettingsRow();
    try {
      const data = await request('pending');
      if (data.call?.id) showIncoming(data.call);
    } catch {}
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    poll();
    pollTimer = setInterval(poll, POLL_MS);
  }

  async function maybeRunOwnerTestFromUrl() {
    const params = new URLSearchParams(location.search);
    if (params.get('stellarCallTest') !== '1') return;
    let attempts = 0;
    while (!ownerReady() && attempts < 12) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts += 1;
    }
    if (!ownerReady()) return;
    try {
      const data = await request('test');
      if (data.call) showIncoming(data.call);
      params.delete('stellarCallTest');
      const next = params.toString();
      history.replaceState(null, '', location.pathname + (next ? '?' + next : '') + location.hash);
    } catch {}
  }

  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', (event) => { if (event.data?.type === 'STELLAR_CALL_OPEN') poll(); });
  window.addEventListener('focus', poll);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
  document.addEventListener('DOMContentLoaded', () => {
    injectUi();
    startPolling();
    void maybeRunOwnerTestFromUrl();
    setTimeout(injectSettingsRow, 1600);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(() => syncExistingPhoneSubscription()).catch(() => {});
    }
  });
})();