// ============================================================
// stellar-jarvis.js — Stellar AI Voice Call Mode
// Upload to repo root alongside app.html
// ============================================================
(function () {
  'use strict';

  const VOICE_KEY = 'stellar-jarvis-voice';
  const RATE_KEY  = 'stellar-jarvis-rate';

  let synth        = window.speechSynthesis;
  let voices       = [];
  let isSpeaking   = false;
  let isOnCall     = false;
  let callRecog    = null;
  let lastSpoken   = '';
  let micPermission = false;

  // ── VOICES ───────────────────────────────────────────────
  const VOICE_PREFS = [
    'Google UK English Male','Daniel','Arthur',
    'Microsoft George','Google UK English Female',
    'Rishi','Karen','Google US English','Samantha',
  ];

  function loadVoices() {
    voices = synth.getVoices();
    if (!voices.length || localStorage.getItem(VOICE_KEY)) return;
    for (const p of VOICE_PREFS) {
      const v = voices.find(v => v.name.toLowerCase().includes(p.toLowerCase()));
      if (v) { localStorage.setItem(VOICE_KEY, v.name); break; }
    }
  }
  loadVoices();
  if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadVoices;

  function getBestVoice() {
    if (!voices.length) voices = synth.getVoices();
    const saved = localStorage.getItem(VOICE_KEY);
    if (saved) { const v = voices.find(v => v.name === saved); if (v) return v; }
    for (const p of VOICE_PREFS) {
      const v = voices.find(v => v.name.toLowerCase().includes(p.toLowerCase()));
      if (v) return v;
    }
    return voices.find(v => v.lang && v.lang.startsWith('en')) || voices[0] || null;
  }

  // ── CLEAN TEXT ────────────────────────────────────────────
  function cleanForSpeech(text) {
    return String(text)
      .replace(/```[\s\S]*?```/g, 'Here is the code.')
      .replace(/`[^`]+`/g, 'code')
      .replace(/#{1,6}\s*/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/^[\s\-*•]+/gm, '')
      .replace(/^\d+\.\s*/gm, '')
      .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
      .replace(/[⚡✓✅❌⚠🔥💡🚀⭐💎🎮🔫🤖🔊📞🎙️]/g, '')
      .replace(/\s+/g, ' ').trim().slice(0, 900);
  }

  // ── SPEAK ─────────────────────────────────────────────────
  function speak(text, onEnd) {
    if (!synth) { if (onEnd) onEnd(); return; }
    synth.cancel();
    const clean = cleanForSpeech(text);
    if (!clean || clean.length < 3) { isSpeaking = false; setOrbState('idle'); if (onEnd) onEnd(); return; }
    const chunks = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
    let idx = 0;
    function next() {
      if (idx >= chunks.length) {
        isSpeaking = false; setOrbState(isOnCall ? 'listening' : 'idle');
        if (onEnd) onEnd(); return;
      }
      const chunk = (chunks[idx++] || '').trim();
      if (!chunk) { next(); return; }
      const utt   = new SpeechSynthesisUtterance(chunk);
      const voice = getBestVoice();
      if (voice)  utt.voice  = voice;
      utt.rate    = parseFloat(localStorage.getItem(RATE_KEY) || '1.0');
      utt.pitch   = 0.85;
      utt.volume  = 1;
      utt.onend   = next;
      utt.onerror = (e) => { if (e.error !== 'interrupted') { isSpeaking = false; if (onEnd) onEnd(); } };
      isSpeaking  = true;
      setOrbState('speaking');
      synth.speak(utt);
    }
    next();
  }

  function stopSpeaking() { synth.cancel(); isSpeaking = false; }

  // ── REQUEST MIC PERMISSION UP FRONT ───────────────────────
  async function requestMicPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop()); // stop immediately, just needed permission
      micPermission = true;
      return true;
    } catch (e) {
      micPermission = false;
      return false;
    }
  }

  // ── ORB (ChatGPT-style animated logo) ─────────────────────
  let orbEl = null;
  let orbStateNow = 'idle';

  function createOrb() {
    if (document.getElementById('stellar-orb')) return;
    const wrap = document.createElement('div');
    wrap.id = 'stellar-orb';
    wrap.style.cssText = `
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9000;
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      pointer-events: none;
    `;
    wrap.innerHTML = `
      <div id="orb-circle" style="
        width: 140px; height: 140px; border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, #8b5cf6, #10a37f);
        display: flex; align-items: center; justify-content: center;
        font-size: 52px; color: #fff;
        box-shadow: 0 0 60px rgba(139,92,246,0.5);
        transition: all 0.3s ease;
        position: relative;
      ">
        <span id="orb-icon">✦</span>
        <div id="orb-ring" style="
          position: absolute; inset: -10px; border-radius: 50%;
          border: 2px solid rgba(139,92,246,0.4);
          animation: orb-spin 4s linear infinite;
        "></div>
        <div id="orb-ring2" style="
          position: absolute; inset: -20px; border-radius: 50%;
          border: 1px solid rgba(16,163,127,0.25);
          animation: orb-spin 7s linear infinite reverse;
        "></div>
      </div>
      <div id="orb-label" style="
        color: #fff; font-size: 16px; font-weight: 800;
        font-family: -apple-system, BlinkMacSystemFont, Inter, sans-serif;
        letter-spacing: 0.05em; text-shadow: 0 2px 12px rgba(0,0,0,0.5);
      ">Stellar AI</div>
      <div id="orb-transcript" style="
        color: rgba(255,255,255,0.7); font-size: 14px; font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, Inter, sans-serif;
        max-width: 320px; text-align: center; min-height: 22px;
        text-shadow: 0 2px 8px rgba(0,0,0,0.5);
      "></div>
    `;

    // Dark overlay behind orb
    const overlay = document.createElement('div');
    overlay.id = 'orb-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 8999;
      background: rgba(5,2,15,0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: none;
    `;
    document.body.appendChild(overlay);
    document.body.appendChild(wrap);
    orbEl = wrap;
  }

  function showOrb(show) {
    const orb = document.getElementById('stellar-orb');
    const ov  = document.getElementById('orb-overlay');
    if (!orb || !ov) return;
    orb.style.display = show ? 'flex' : 'none';
    ov.style.display  = show ? 'block' : 'none';
  }

  function setOrbState(state) {
    orbStateNow = state;
    const circle = document.getElementById('orb-circle');
    const label  = document.getElementById('orb-label');
    const icon   = document.getElementById('orb-icon');
    if (!circle) return;
    if (state === 'speaking') {
      circle.style.background   = 'radial-gradient(circle at 35% 35%, #10a37f, #047857)';
      circle.style.boxShadow    = '0 0 80px rgba(16,163,127,0.7)';
      circle.style.animation    = 'orb-speak 0.6s ease-in-out infinite alternate';
      if (icon)  icon.textContent  = '✦';
      if (label) label.textContent = 'Stellar is speaking…';
    } else if (state === 'listening') {
      circle.style.background   = 'radial-gradient(circle at 35% 35%, #ef4444, #b91c1c)';
      circle.style.boxShadow    = '0 0 80px rgba(239,68,68,0.6)';
      circle.style.animation    = 'orb-listen 1.2s ease-in-out infinite alternate';
      if (icon)  icon.textContent  = '🎙️';
      if (label) label.textContent = 'Listening…';
    } else if (state === 'thinking') {
      circle.style.background   = 'radial-gradient(circle at 35% 35%, #8b5cf6, #5b21b6)';
      circle.style.boxShadow    = '0 0 80px rgba(139,92,246,0.6)';
      circle.style.animation    = 'orb-think 1s ease-in-out infinite';
      if (icon)  icon.textContent  = '✦';
      if (label) label.textContent = 'Thinking…';
    } else {
      circle.style.background   = 'radial-gradient(circle at 35% 35%, #8b5cf6, #10a37f)';
      circle.style.boxShadow    = '0 0 60px rgba(139,92,246,0.5)';
      circle.style.animation    = '';
      if (icon)  icon.textContent  = '✦';
      if (label) label.textContent = 'Stellar AI';
    }
  }

  function setTranscript(text) {
    const t = document.getElementById('orb-transcript');
    if (t) t.textContent = text || '';
  }

  // ── END CALL BUTTON (on orb overlay) ─────────────────────
  function addEndCallBtn() {
    if (document.getElementById('orb-end-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'orb-end-btn';
    btn.textContent = 'End Call';
    btn.onclick = endCall;
    btn.style.cssText = `
      position: fixed;
      bottom: 60px; left: 50%; transform: translateX(-50%);
      z-index: 9001;
      background: rgba(239,68,68,0.9);
      color: #fff; border: none;
      padding: 14px 40px; border-radius: 99px;
      font-size: 16px; font-weight: 900;
      font-family: -apple-system, BlinkMacSystemFont, Inter, sans-serif;
      cursor: pointer;
      box-shadow: 0 8px 30px rgba(239,68,68,0.5);
      display: none;
      pointer-events: all;
    `;
    document.body.appendChild(btn);
  }

  function showEndBtn(show) {
    const btn = document.getElementById('orb-end-btn');
    if (btn) btn.style.display = show ? 'block' : 'none';
  }

  // ── PHONE BUTTON ──────────────────────────────────────────
  function injectButton() {
    if (document.getElementById('jarvis-btn')) return;
    const sendBtn = document.getElementById('send-btn');
    if (!sendBtn) { setTimeout(injectButton, 300); return; }

    const btn = document.createElement('button');
    btn.id    = 'jarvis-btn';
    btn.style.cssText = `
      flex: none; width: 46px; height: 46px;
      border-radius: 16px; font-size: 20px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.04);
      cursor: pointer;
      transition: background 0.2s, transform 0.15s;
      display: inline-flex; align-items: center; justify-content: center;
    `;
    btn.textContent = '📞';
    btn.title       = 'Start voice call with Stellar';
    btn.onclick     = toggleCall;
    sendBtn.parentNode.insertBefore(btn, sendBtn);

    createOrb();
    addEndCallBtn();
  }

  function updatePhoneBtn() {
    const btn = document.getElementById('jarvis-btn');
    if (!btn) return;
    if (isOnCall) {
      btn.textContent       = '📵';
      btn.title             = 'End call';
      btn.style.background  = 'rgba(239,68,68,0.3)';
      btn.style.borderColor = 'rgba(248,113,113,0.6)';
    } else {
      btn.textContent       = '📞';
      btn.title             = 'Start voice call with Stellar';
      btn.style.background  = '';
      btn.style.borderColor = '';
    }
  }

  // ── CALL FLOW ─────────────────────────────────────────────
  function toggleCall() {
    if (isOnCall) { endCall(); return; }
    startCall();
  }
  window.toggleJarvis = toggleCall;
  window.endCall      = endCall;

  async function startCall() {
    // Request mic permission first
    setOrbState('thinking');
    showOrb(true);
    showEndBtn(true);
    setTranscript('Requesting microphone access…');

    const granted = await requestMicPermission();
    if (!granted) {
      setTranscript('Microphone access denied. Please allow microphone in your browser settings and try again.');
      setOrbState('idle');
      await delay(3000);
      showOrb(false);
      showEndBtn(false);
      return;
    }

    isOnCall = true;
    updatePhoneBtn();
    setOrbState('speaking');
    setTranscript('');

    speak("Hey, I'm Stellar. What do you need?", () => {
      listenForSpeech();
    });
  }

  function endCall() {
    isOnCall = false;
    stopSpeaking();
    stopListening();
    updatePhoneBtn();
    showOrb(false);
    showEndBtn(false);
    setOrbState('idle');
    setTranscript('');
  }

  function listenForSpeech() {
    if (!isOnCall) return;
    stopListening();
    setOrbState('listening');
    setTranscript('');

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    callRecog = new SR();
    callRecog.continuous     = false;
    callRecog.interimResults = true;
    callRecog.lang           = 'en-GB';
    callRecog.maxAlternatives = 1;

    let final = '';

    callRecog.onresult = (e) => {
      let interim = '';
      final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setTranscript(final || interim);
      // Also put in text box so user can see
      const txt = document.getElementById('txt');
      if (txt) txt.value = final || interim;
    };

    callRecog.onend = () => {
      if (!isOnCall) return;
      const txt = document.getElementById('txt');
      const said = final.trim() || (txt && txt.value.trim()) || '';
      if (said.length > 1) {
        sendVoiceMessage(said);
      } else {
        // Nothing heard — try again
        setTimeout(listenForSpeech, 600);
      }
    };

    callRecog.onerror = (e) => {
      if (!isOnCall) return;
      if (e.error === 'no-speech') {
        setTimeout(listenForSpeech, 400);
      } else if (e.error === 'not-allowed') {
        setTranscript('Microphone blocked. Check browser settings.');
        setTimeout(endCall, 3000);
      } else if (e.error !== 'aborted') {
        setTimeout(listenForSpeech, 1000);
      }
    };

    try { callRecog.start(); } catch (e) { setTimeout(listenForSpeech, 800); }
  }

  function stopListening() {
    if (callRecog) { try { callRecog.abort(); } catch {} callRecog = null; }
  }

  function sendVoiceMessage(text) {
    if (!isOnCall) return;
    setOrbState('thinking');
    setTranscript('You said: ' + text);

    const txt = document.getElementById('txt');
    if (txt) { txt.value = text; txt.dispatchEvent(new Event('input')); }

    // Send the message
    if (typeof window.sendMessage === 'function') {
      window.sendMessage();
    } else {
      const btn = document.getElementById('send-btn');
      if (btn) btn.click();
    }

    // Clear txt box after send
    setTimeout(() => { if (txt) txt.value = ''; }, 200);

    waitForAIResponse();
  }

  function waitForAIResponse() {
    if (!isOnCall) return;
    const sendBtn = document.getElementById('send-btn');
    let attempts  = 0;

    const poll = setInterval(() => {
      attempts++;
      if (!isOnCall) { clearInterval(poll); return; }
      if (attempts > 120) { clearInterval(poll); if (isOnCall) listenForSpeech(); return; } // 36s timeout

      const stillStreaming = sendBtn && (sendBtn.textContent || '').includes('Stop');
      if (!stillStreaming) {
        clearInterval(poll);
        setTimeout(() => {
          if (!isOnCall) return;
          const msgs = document.querySelectorAll('#chat .message.msg-ai');
          if (!msgs.length) { listenForSpeech(); return; }
          const text = ((msgs[msgs.length - 1].innerText || msgs[msgs.length - 1].textContent) || '').trim();
          if (text && text !== lastSpoken) {
            lastSpoken = text;
            setTranscript('');
            speak(text, () => { if (isOnCall) setTimeout(listenForSpeech, 600); });
          } else {
            if (isOnCall) listenForSpeech();
          }
        }, 500);
      }
    }, 300);
  }

  // ── HELPERS ───────────────────────────────────────────────
  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── CSS ───────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @keyframes orb-speak {
      from { transform: scale(1);    box-shadow: 0 0 60px rgba(16,163,127,0.5); }
      to   { transform: scale(1.08); box-shadow: 0 0 100px rgba(16,163,127,0.8); }
    }
    @keyframes orb-listen {
      from { transform: scale(1);    box-shadow: 0 0 60px rgba(239,68,68,0.4); }
      to   { transform: scale(1.05); box-shadow: 0 0 90px rgba(239,68,68,0.7); }
    }
    @keyframes orb-think {
      0%,100% { transform: scale(1);    }
      50%     { transform: scale(1.04); }
    }
    @keyframes orb-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    #jarvis-btn:hover { background: rgba(255,255,255,0.10) !important; transform: translateY(-1px) !important; }
    #jarvis-btn:active { transform: scale(0.95) !important; }
    #orb-end-btn:hover { filter: brightness(1.1); transform: translateX(-50%) scale(1.02); }
  `;
  document.head.appendChild(style);

  // ── BOOT ─────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    setTimeout(injectButton, 600);
  }

  console.log('[Stellar JARVIS] 📞 Voice call mode ready');
})();
