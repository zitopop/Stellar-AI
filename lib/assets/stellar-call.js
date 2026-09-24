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
    const response = await fetch('/api/stellar-call', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ action, ...payload }),
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

  function injectSettingsRow() {
    if (!ownerReady() || $('stellar-call-settings')) return;
    const grid = document.querySelector('#settings-panel .settings-grid');
    if (!grid) return;
    const row = document.createElement('button');
    row.id = 'stellar-call-settings';
    row.type = 'button';
    row.className = 'settings-row stellar-call-settings-row owner-only';
    row.hidden = false;
    row.innerHTML = '<strong>Stellar Call</strong><small id="stellar-call-settings-status">Test in-app Jarvis calling</small>';
    row.addEventListener('click', async () => {
      const status = $('stellar-call-settings-status');
      if (status) status.textContent = 'Creating a test call…';
      try {
        const data = await request('test');
        if (status) status.textContent = 'Test call created';
        if (data.call) showIncoming(data.call);
      } catch (error) {
        if (status) status.textContent = error.message || 'Test call failed';
      }
    });
    const callHealth = $('owner-call-health-btn');
    if (callHealth?.parentElement === grid) grid.insertBefore(row, callHealth);
    else grid.appendChild(row);

    if ('Notification' in window) {
      const alerts = document.createElement('button');
      alerts.id = 'stellar-call-alerts';
      alerts.type = 'button';
      alerts.className = 'settings-row stellar-call-settings-row owner-only';
      alerts.hidden = false;
      const current = Notification.permission === 'granted' ? 'On' : (Notification.permission === 'denied' ? 'Blocked' : 'Tap to enable');
      alerts.innerHTML = `<strong>Incoming call alerts</strong><small id="stellar-call-alert-status">${current}</small>`;
      alerts.addEventListener('click', async () => {
        const status = $('stellar-call-alert-status');
        try {
          const permission = await Notification.requestPermission();
          if (status) status.textContent = permission === 'granted' ? 'On' : (permission === 'denied' ? 'Blocked in browser settings' : 'Not enabled');
          if ('serviceWorker' in navigator) await navigator.serviceWorker.register('/sw.js');
        } catch {
          if (status) status.textContent = 'Unavailable in this browser';
        }
      });
      grid.insertBefore(alerts, row.nextSibling);
    }
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
    shell.classList.remove('stellar-call-connected');
    $('stellar-call-state').textContent = 'Incoming call…';
    $('stellar-call-reason').textContent = call.summary || 'Jarvis needs your attention.';
    $('stellar-call-transcript').textContent = '';
    document.documentElement.style.overflow = 'hidden';
    startRingtone();
    notifyIncoming(call);
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

  window.addEventListener('focus', poll);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
  document.addEventListener('DOMContentLoaded', () => {
    injectUi();
    startPolling();
    setTimeout(injectSettingsRow, 1600);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
})();