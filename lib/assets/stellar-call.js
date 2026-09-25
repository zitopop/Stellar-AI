(() => {
  const POLL_MS = 5000;
  const VOICE_KEY = 'stellarVoiceAgentEnabled';
  const VOICE_PROVIDER_KEY = 'stellarPremiumVoiceEnabled';
  const MIC_ECHO_GUARD_MS = 1400;

  let activeCall = null;
  let pollTimer = null;
  let ringTimer = null;
  let audioContext = null;
  let recognition = null;
  let speaking = false;
  let callConversation = [];
  let voiceAgentEnabled = localStorage.getItem(VOICE_KEY) === '1';
  let premiumVoiceEnabled = localStorage.getItem(VOICE_PROVIDER_KEY) !== '0';
  let voiceObserver = null;
  let voiceDebounceTimer = null;
  let currentAudio = null;
  let micMutedUntil = 0;
  const spokenTextByBubble = new WeakMap();

  const $ = (id) => document.getElementById(id);

  function ownerReady() {
    try { return typeof window.isOwner === 'function' && window.isOwner(); } catch { return false; }
  }

  function headers(json = true) {
    try { if (typeof window.authHeaders === 'function') return window.authHeaders(json); } catch {}
    return json ? { 'Content-Type': 'application/json' } : {};
  }

  function setAppStatus(text, kind = '') {
    try { if (typeof window.setStatus === 'function') window.setStatus(text, kind); } catch {}
  }

  async function request(action, payload = {}) {
    const actionMap = {
      status: 'stellarCallStatus',
      pending: 'stellarCallPending',
      answer: 'stellarCallAnswer',
      decline: 'stellarCallDecline',
      complete: 'stellarCallComplete',
      test: 'stellarCallTest',
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

  function cleanSpeechText(text) {
    return String(text || '')
      .replace(/```[\s\S]*?```/g, 'I have code ready for you on screen.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/https?:\/\/\S+/g, 'a link')
      .replace(/[•*_>#~]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function chooseVoice() {
    try {
      const voices = window.speechSynthesis?.getVoices?.() || [];
      return voices.find((voice) => /^en-GB$/i.test(voice.lang) && /female|natural|premium|google|microsoft/i.test(voice.name))
        || voices.find((voice) => /^en-GB$/i.test(voice.lang))
        || voices.find((voice) => /^en/i.test(voice.lang))
        || null;
    } catch { return null; }
  }

  function resetCallTalkButton(text = 'Talk to Jarvis') {
    const talk = $('stellar-call-talk');
    if (!talk) return;
    talk.disabled = false;
    talk.textContent = text;
  }

  function muteMicFor(ms = MIC_ECHO_GUARD_MS) {
    micMutedUntil = Math.max(micMutedUntil, Date.now() + ms);
  }

  function isEchoGuardActive() {
    try {
      return speaking || Date.now() < micMutedUntil || Boolean(window.speechSynthesis?.speaking);
    } catch {
      return speaking || Date.now() < micMutedUntil;
    }
  }

  function abortVoiceInputs() {
    try { recognition?.abort?.(); } catch {}
    recognition = null;
    resetCallTalkButton();
    try { if (typeof window.stopVoiceInput === 'function') window.stopVoiceInput(); } catch {}
  }

  function beginAiSpeech() {
    muteMicFor();
    abortVoiceInputs();
    speaking = true;
  }

  function endAiSpeech() {
    speaking = false;
    muteMicFor();
    resetCallTalkButton();
  }

  function stopSpeech() {
    try { currentAudio?.pause?.(); } catch {}
    try { if (currentAudio) currentAudio.src = ''; } catch {}
    currentAudio = null;
    try { window.speechSynthesis?.cancel?.(); } catch {}
    speaking = false;
    muteMicFor(650);
  }

  async function speakWithPremiumVoice(text, options = {}) {
    if (!premiumVoiceEnabled) return false;
    const clean = cleanSpeechText(text).slice(0, options.maxLength || 1500);
    if (!clean) return false;
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          action: 'premiumVoice',
          text: clean,
          voice: localStorage.getItem('stellarPremiumVoiceName') || 'onyx',
          instructions: 'Sound like Jarvis: calm, premium, British, smart, warm, concise, and never robotic.',
        }),
        cache: 'no-store',
      });
      if (!response.ok) return false;
      const blob = await response.blob();
      if (!blob.size) return false;
      const url = URL.createObjectURL(blob);
      stopSpeech();
      beginAiSpeech();
      const audio = new Audio(url);
      currentAudio = audio;
      audio.preload = 'auto';
      audio.volume = options.volume || 1;
      await new Promise((resolve) => {
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.onabort = resolve;
        audio.play().catch(resolve);
      });
      if (currentAudio === audio) currentAudio = null;
      URL.revokeObjectURL(url);
      endAiSpeech();
      return true;
    } catch {
      endAiSpeech();
      return false;
    }
  }

  function speakWithBrowserVoice(text, options = {}) {
    return new Promise((resolve) => {
      const clean = cleanSpeechText(text);
      if (!clean || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return resolve();
      try {
        stopSpeech();
        beginAiSpeech();
        const utterance = new SpeechSynthesisUtterance(clean.slice(0, options.maxLength || 1200));
        utterance.lang = 'en-GB';
        utterance.rate = options.rate || 1.02;
        utterance.pitch = options.pitch || 0.92;
        utterance.volume = options.volume || 1;
        const voice = chooseVoice();
        if (voice) utterance.voice = voice;
        utterance.onend = () => { endAiSpeech(); resolve(); };
        utterance.onerror = () => { endAiSpeech(); resolve(); };
        window.speechSynthesis.speak(utterance);
      } catch {
        endAiSpeech();
        resolve();
      }
    });
  }

  async function speak(text, options = {}) {
    const clean = cleanSpeechText(text);
    if (!clean) return;
    const premiumOk = await speakWithPremiumVoice(clean, options);
    if (!premiumOk) await speakWithBrowserVoice(clean, options);
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

  function injectVoiceStyles() {
    if ($('stellar-voice-agent-style')) return;
    const style = document.createElement('style');
    style.id = 'stellar-voice-agent-style';
    style.textContent = `
      .stellar-voice-toggle[aria-pressed="true"],.stellar-premium-voice-toggle[aria-pressed="true"]{background:rgba(139,124,246,.16)!important;color:#f4f1ff!important;border-color:rgba(185,176,255,.26)!important}
      .stellar-voice-toggle::after,.stellar-premium-voice-toggle::after{content:"";width:6px;height:6px;border-radius:50%;background:#747b87;margin-left:6px;box-shadow:none}
      .stellar-voice-toggle[aria-pressed="true"]::after,.stellar-premium-voice-toggle[aria-pressed="true"]::after{background:#7cf3bd;box-shadow:0 0 0 4px rgba(124,243,189,.08)}
      .stellar-voice-replying{outline:1px solid rgba(185,176,255,.20)!important;outline-offset:4px!important;border-radius:16px!important}
    `;
    document.head.appendChild(style);
  }

  function updateVoiceButton() {
    const toggle = $('stellar-voice-agent-toggle');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(voiceAgentEnabled));
      toggle.textContent = voiceAgentEnabled ? 'Voice replies on' : 'Voice replies off';
      toggle.title = voiceAgentEnabled ? 'Stellar will speak Claude replies aloud' : 'Turn on spoken Claude replies';
    }
    const premium = $('stellar-premium-voice-toggle');
    if (premium) {
      premium.setAttribute('aria-pressed', String(premiumVoiceEnabled));
      premium.textContent = premiumVoiceEnabled ? 'Premium voice on' : 'Premium voice off';
      premium.title = premiumVoiceEnabled ? 'Use premium voice first, then browser fallback' : 'Use browser speech only';
    }
    const voice = $('voice-input-btn');
    if (voice) {
      voice.title = voiceAgentEnabled ? 'Speak your message. Stellar will pause the mic while Jarvis replies.' : 'Speak your message';
      voice.dataset.voiceReplies = voiceAgentEnabled ? 'on' : 'off';
    }
  }

  function setVoiceAgentEnabled(enabled, announce = true) {
    voiceAgentEnabled = Boolean(enabled);
    localStorage.setItem(VOICE_KEY, voiceAgentEnabled ? '1' : '0');
    updateVoiceButton();
    if (announce) setAppStatus(voiceAgentEnabled ? 'Voice replies on. Jarvis will speak back and pause the mic.' : 'Voice replies off.', voiceAgentEnabled ? 'good' : '');
    if (!voiceAgentEnabled) stopSpeech();
  }

  function setPremiumVoiceEnabled(enabled, announce = true) {
    premiumVoiceEnabled = Boolean(enabled);
    localStorage.setItem(VOICE_PROVIDER_KEY, premiumVoiceEnabled ? '1' : '0');
    updateVoiceButton();
    if (announce) setAppStatus(premiumVoiceEnabled ? 'Premium voice on. Using Jarvis voice when configured.' : 'Premium voice off. Browser voice only.', premiumVoiceEnabled ? 'good' : '');
  }

  function injectVoiceAgentButton() {
    injectVoiceStyles();
    const moreRow = document.querySelector('#composer-more .composer-more-row') || $('composer-more') || document.querySelector('.composer-tools');
    if (!moreRow) return;
    if (!$('stellar-voice-agent-toggle')) {
      const button = document.createElement('button');
      button.id = 'stellar-voice-agent-toggle';
      button.type = 'button';
      button.className = 'composer-tool stellar-voice-toggle';
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => setVoiceAgentEnabled(!voiceAgentEnabled));
      const voiceBtn = $('voice-input-btn');
      if (voiceBtn?.parentNode === moreRow) voiceBtn.insertAdjacentElement('afterend', button);
      else moreRow.appendChild(button);
    }
    if (!$('stellar-premium-voice-toggle')) {
      const premium = document.createElement('button');
      premium.id = 'stellar-premium-voice-toggle';
      premium.type = 'button';
      premium.className = 'composer-tool stellar-premium-voice-toggle';
      premium.setAttribute('aria-pressed', 'false');
      premium.addEventListener('click', () => setPremiumVoiceEnabled(!premiumVoiceEnabled));
      $('stellar-voice-agent-toggle')?.insertAdjacentElement('afterend', premium);
    }
    updateVoiceButton();
  }

  function wrapVoiceInput() {
    const original = window.toggleVoiceInput;
    if (typeof original !== 'function' || original.__stellarVoiceAgentWrapped) return;
    function wrappedToggleVoiceInput(...args) {
      if (isEchoGuardActive()) {
        setAppStatus('Wait for Jarvis to finish speaking before using the mic.', 'good');
        return undefined;
      }
      setVoiceAgentEnabled(true, false);
      setPremiumVoiceEnabled(true, false);
      setAppStatus('Listening. Jarvis will pause the mic while he speaks back.', 'good');
      return original.apply(this, args);
    }
    wrappedToggleVoiceInput.__stellarVoiceAgentWrapped = true;
    wrappedToggleVoiceInput.__stellarOriginal = original;
    window.toggleVoiceInput = wrappedToggleVoiceInput;
  }

  function latestAssistantBubble() {
    const bubbles = Array.from(document.querySelectorAll('#chatInner .msg.assistant .bubble'));
    return bubbles[bubbles.length - 1] || null;
  }

  function shouldSpeakBubbleText(text) {
    const clean = cleanSpeechText(text);
    if (!clean || clean.length < 3) return false;
    if (/^(thinking|generation stopped|i could not send|send failed|stopped)$/i.test(clean)) return false;
    return true;
  }

  function scheduleVoiceReply() {
    if (!voiceAgentEnabled || activeCall) return;
    clearTimeout(voiceDebounceTimer);
    voiceDebounceTimer = setTimeout(async () => {
      if (!voiceAgentEnabled || activeCall) return;
      const bubble = latestAssistantBubble();
      if (!bubble) return;
      const text = String(bubble.textContent || '').trim();
      if (!shouldSpeakBubbleText(text)) return;
      if (spokenTextByBubble.get(bubble) === text) return;
      spokenTextByBubble.set(bubble, text);
      bubble.classList.add('stellar-voice-replying');
      await speak(text, { maxLength: 1500, rate: 1.01, pitch: 0.94 });
      bubble.classList.remove('stellar-voice-replying');
    }, 1050);
  }

  function watchAssistantReplies() {
    const host = $('chatInner');
    if (!host || voiceObserver) return;
    voiceObserver = new MutationObserver(scheduleVoiceReply);
    voiceObserver.observe(host, { childList: true, subtree: true, characterData: true });
  }

  function injectSettingsRow() {
    if (!ownerReady() || $('stellar-call-settings')) return;
    const grid = document.querySelector('#settings-panel .settings-grid');
    if (!grid) return;
    const row = document.createElement('button');
    row.id = 'stellar-call-settings';
    row.type = 'button';
    row.className = 'settings-row stellar-call-settings-row settings-advanced owner-only';
    row.hidden = false;
    row.innerHTML = '<span class="settings-icon" aria-hidden="true">☎</span><span class="settings-row-copy"><strong>Stellar Call</strong><small id="stellar-call-settings-status">Test in-app Jarvis calling</small></span><span class="settings-row-meta">Test <span aria-hidden="true">›</span></span>';
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

    if ('Notification' in window && !$('stellar-call-alerts')) {
      const alerts = document.createElement('button');
      alerts.id = 'stellar-call-alerts';
      alerts.type = 'button';
      alerts.className = 'settings-row stellar-call-settings-row settings-advanced owner-only';
      alerts.hidden = false;
      const current = Notification.permission === 'granted' ? 'On' : (Notification.permission === 'denied' ? 'Blocked' : 'Tap to enable');
      alerts.innerHTML = `<span class="settings-icon" aria-hidden="true">⚡</span><span class="settings-row-copy"><strong>Incoming call alerts</strong><small id="stellar-call-alert-status">${current}</small></span><span class="settings-row-meta">Push <span aria-hidden="true">›</span></span>`;
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
    if (!shell) return;
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
    stopSpeech();
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

  async function answerCall() {
    if (!activeCall) return;
    stopRingtone();
    try {
      const data = await request('answer', { callId: activeCall.id });
      activeCall = data.call || activeCall;
    } catch {}
    $('stellar-call-shell')?.classList.add('stellar-call-connected');
    $('stellar-call-state').textContent = 'Connected · Jarvis';
    const greeting = `Tobi, Jarvis here. ${activeCall.summary || 'I need your attention.'}`;
    const transcript = $('stellar-call-transcript');
    if (transcript) transcript.textContent = 'Jarvis: ' + greeting;
    callConversation.push({ role: 'assistant', content: greeting });
    await speak(greeting, { maxLength: 900 });
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
    const messages = [{
      role: 'user',
      content: `You are Jarvis speaking with Tobi in Stellar Call. Keep replies concise and natural for speech. The reason for this call is: ${context}. Continue the conversation using the following recent call turns: ${JSON.stringify(recent)}`,
    }];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ action: 'chat', model: 'star', selectedModel: 'star', messages, use_credit: false, client: { source: 'stellar-call', callId: activeCall?.id || '' } }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Jarvis could not answer.');
      }
      const reply = await readStream(response);
      if (!reply) throw new Error('Jarvis returned no reply.');
      appendTranscript('Jarvis', reply);
      callConversation.push({ role: 'assistant', content: reply });
      await speak(reply, { maxLength: 1100 });
    } catch (error) {
      appendTranscript('Jarvis', error.message || 'I could not answer that just now.');
    } finally {
      if (talk) { talk.disabled = false; talk.textContent = 'Talk to Jarvis'; }
    }
  }

  function listenTurn() {
    const talk = $('stellar-call-talk');
    if (!activeCall) return;
    if (isEchoGuardActive()) {
      if (talk) {
        talk.disabled = true;
        talk.textContent = 'Wait for Jarvis…';
        setTimeout(() => {
          if (talk.textContent === 'Wait for Jarvis…') resetCallTalkButton();
        }, Math.max(600, micMutedUntil - Date.now()));
      }
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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
        if (isEchoGuardActive()) {
          resetCallTalkButton();
          return;
        }
        const spoken = Array.from(event.results || []).map((result) => String(result?.[0]?.transcript || '').trim()).filter(Boolean).join(' ').trim();
        if (spoken) void askJarvis(spoken);
      };
      recognition.onerror = () => { resetCallTalkButton(); };
      recognition.onend = () => {
        if (talk && talk.textContent === 'Listening…') resetCallTalkButton();
      };
      recognition.start();
    } catch {
      resetCallTalkButton();
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

  function bootstrapVoiceAgent() {
    injectVoiceAgentButton();
    wrapVoiceInput();
    watchAssistantReplies();
    updateVoiceButton();
    const params = new URLSearchParams(location.search);
    if (params.get('voice') === '1') setVoiceAgentEnabled(true, false);
    if (params.get('premiumVoice') === '0') setPremiumVoiceEnabled(false, false);
  }

  window.StellarCall = { showIncoming, poll, startPolling };
  window.StellarVoiceAgent = {
    enable: () => setVoiceAgentEnabled(true),
    disable: () => setVoiceAgentEnabled(false),
    toggle: () => setVoiceAgentEnabled(!voiceAgentEnabled),
    enablePremium: () => setPremiumVoiceEnabled(true),
    disablePremium: () => setPremiumVoiceEnabled(false),
    speak,
    stop: stopSpeech,
    isEchoGuardActive,
    get enabled() { return voiceAgentEnabled; },
    get premiumEnabled() { return premiumVoiceEnabled; },
  };

  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', (event) => { if (event.data?.type === 'STELLAR_CALL_OPEN') poll(); });
  window.addEventListener('focus', poll);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
  document.addEventListener('DOMContentLoaded', () => {
    injectUi();
    startPolling();
    void maybeRunOwnerTestFromUrl();
    bootstrapVoiceAgent();
    setTimeout(injectSettingsRow, 1600);
    setTimeout(bootstrapVoiceAgent, 1800);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
})();
