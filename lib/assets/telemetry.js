(() => {
  const endpoint = '/api/client-metric';
  const allowed = new Set([
    'landing-view','app-view','app-open-cta','upgrade-intent','signup-success','login-success',
    'first-message-sent','chat-send-error','checkout-open','checkout-error','billing-open','client-error'
  ]);

  function track(event) {
    const name = String(event || '').trim().toLowerCase();
    if (!allowed.has(name)) return false;
    const body = JSON.stringify({ event: name });
    try {
      if (navigator.sendBeacon) {
        const ok = navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
        if (ok) return true;
      }
    } catch {}
    try {
      fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true, credentials: 'same-origin' }).catch(() => {});
      return true;
    } catch { return false; }
  }

  function installReliableVoiceInput() {
    if (!(location.pathname === '/app' || location.pathname === '/app.html')) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition || window.__stellarReliableVoiceInputInstalled) return;
    window.__stellarReliableVoiceInputInstalled = true;

    let recognition = null;
    let listening = false;
    let baseText = '';
    let heardSpeech = false;
    let silenceTimer = null;

    const $ = (id) => document.getElementById(id);
    const status = (text, kind = '') => {
      try {
        if (typeof window.setStatus === 'function') window.setStatus(text, kind);
        else {
          const node = $('status');
          if (node) {
            node.textContent = text;
            node.className = 'status ' + kind;
            node.dataset.idle = 'false';
          }
        }
      } catch {}
    };
    const updateButton = () => {
      const button = $('voice-input-btn');
      if (!button) return;
      button.setAttribute('aria-pressed', String(listening));
      button.setAttribute('aria-label', listening ? 'Stop voice input' : 'Start voice input');
      button.textContent = listening ? '■ Stop voice' : '◉ Voice';
    };
    const cleanupTimer = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = null;
    };
    const resetSilenceTimer = () => {
      cleanupTimer();
      silenceTimer = setTimeout(() => {
        if (listening && !heardSpeech) status('Mic is on, but I have not caught words yet. Speak closer or check the selected microphone.', 'warn');
      }, 4500);
    };
    const stop = () => {
      cleanupTimer();
      try { recognition?.abort?.(); } catch {}
      try { recognition?.stop?.(); } catch {}
      recognition = null;
      listening = false;
      updateButton();
    };
    const ensurePermission = async () => {
      if (!navigator.mediaDevices?.getUserMedia) return true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      } catch (error) {
        const name = String(error?.name || '');
        if (name === 'NotAllowedError' || name === 'SecurityError') status('Microphone is blocked. Press the lock icon, allow Microphone, then reload Stellar.', 'error');
        else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') status('No microphone was found. Check Windows or phone microphone input settings.', 'error');
        else status('Microphone could not start. Check browser permission and your input device.', 'error');
        return false;
      }
    };
    const writeTranscript = (finalText, interimText = '') => {
      const prompt = $('prompt');
      if (!prompt) return;
      const parts = [baseText, finalText, interimText].map((part) => String(part || '').trim()).filter(Boolean);
      prompt.value = parts.join(' ');
      prompt.focus();
    };

    async function toggleReliableVoiceInput() {
      if (listening) {
        stop();
        status($('prompt')?.value?.trim() ? 'Voice input ready. Review it, then press Send.' : 'Voice input stopped.', $('prompt')?.value?.trim() ? 'good' : '');
        return;
      }
      if (window.StellarVoiceAgent?.micBlocked) {
        status('Wait for Jarvis to finish speaking, then press Voice again.', 'warn');
        return;
      }
      const allowedMic = await ensurePermission();
      if (!allowedMic) return;

      const prompt = $('prompt');
      baseText = String(prompt?.value || '').trim();
      heardSpeech = false;
      let finalText = '';

      try {
        recognition = new Recognition();
        recognition.lang = navigator.language && /^en-/i.test(navigator.language) ? navigator.language : 'en-GB';
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          listening = true;
          heardSpeech = false;
          updateButton();
          status('Listening now — speak normally. I will type what I hear.', 'good');
          resetSilenceTimer();
        };
        recognition.onaudiostart = () => {
          status('Mic is active — start speaking.', 'good');
          resetSilenceTimer();
        };
        recognition.onsoundstart = () => {
          status('Mic hears sound — keep talking.', 'good');
          resetSilenceTimer();
        };
        recognition.onspeechstart = () => {
          heardSpeech = true;
          status('Speech detected — keep talking.', 'good');
        };
        recognition.onresult = (event) => {
          let interimText = '';
          finalText = '';
          for (let i = 0; i < event.results.length; i += 1) {
            const text = String(event.results[i]?.[0]?.transcript || '').trim();
            if (!text) continue;
            if (event.results[i].isFinal) finalText += (finalText ? ' ' : '') + text;
            else interimText += (interimText ? ' ' : '') + text;
          }
          if (finalText || interimText) {
            heardSpeech = true;
            writeTranscript(finalText, interimText);
            status(interimText ? 'Listening… words are appearing.' : 'Voice captured. Keep talking or press Stop voice.', 'good');
          }
        };
        recognition.onerror = (event) => {
          const code = String(event.error || '');
          if (code === 'not-allowed' || code === 'service-not-allowed') status('Microphone permission is blocked. Allow microphone access and try again.', 'error');
          else if (code === 'no-speech') status('I did not catch words. Press Voice again and speak closer to the mic.', 'warn');
          else if (code !== 'aborted') status('Voice input stopped: ' + code + '. Try again or type your message.', 'warn');
        };
        recognition.onend = () => {
          cleanupTimer();
          listening = false;
          updateButton();
          if (String(prompt?.value || '').trim()) status('Voice input ready. Review it, then press Send.', 'good');
          else if (!heardSpeech) status('I did not hear words. Check your input mic and try again.', 'warn');
        };
        recognition.start();
      } catch {
        listening = false;
        updateButton();
        status('Voice input could not start. Check microphone permission and try again.', 'error');
      }
    }

    toggleReliableVoiceInput.__stellarReliable = true;
    window.toggleVoiceInput = toggleReliableVoiceInput;
    window.stopVoiceInput = stop;
  }

  function scheduleReliableVoiceInputInstall() {
    let attempts = 0;
    const tick = () => {
      attempts += 1;
      installReliableVoiceInput();
      if (!window.__stellarReliableVoiceInputInstalled && attempts < 30) setTimeout(tick, 250);
    };
    tick();
  }

  window.StellarTelemetry = Object.freeze({ track });
  if (location.pathname === '/' || location.pathname === '/index.html') track('landing-view');
  if (location.pathname === '/app' || location.pathname === '/app.html') {
    track('app-view');
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleReliableVoiceInputInstall, { once: true });
    else scheduleReliableVoiceInputInstall();
  }

  document.addEventListener('click', (event) => {
    const link = event.target?.closest?.('a[href]');
    if (!link) return;
    let url;
    try { url = new URL(link.href, location.href); } catch { return; }
    if (url.hostname === 'buy.stripe.com' || url.hostname === 'checkout.stripe.com') {
      track('checkout-open');
      return;
    }
    if (url.origin !== location.origin) return;
    if (url.pathname === '/app' || url.pathname === '/app.html') track(url.searchParams.has('upgrade') ? 'upgrade-intent' : 'app-open-cta');
  }, { passive: true });

  addEventListener('error', () => track('client-error'));
  addEventListener('unhandledrejection', () => track('client-error'));
})();