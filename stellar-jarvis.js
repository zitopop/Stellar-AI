// ============================================================
// stellar-jarvis.js — Stellar AI Voice Call Mode
// Upload to repo root. One line in app.html before </body>:
//   <script src="/stellar-jarvis.js"></script>
// ============================================================

(function () {
  'use strict';

  const VOICE_KEY = 'stellar-jarvis-voice';
  const RATE_KEY  = 'stellar-jarvis-rate';
  const PITCH_KEY = 'stellar-jarvis-pitch';

  let synth      = window.speechSynthesis;
  let voices     = [];
  let isSpeaking = false;
  let isOnCall   = false;       // are we in a voice call?
  let callRecog  = null;        // speech recognition for the call
  let lastSpoken = '';
  let silenceTimer = null;

  // ── PREFERRED VOICES ──────────────────────────────────────
  const VOICE_PREFS = [
    'Google UK English Male', 'Daniel', 'Arthur',
    'Microsoft George', 'Google UK English Female',
    'Rishi', 'Karen', 'Google US English', 'Samantha',
  ];

  function loadVoices() {
    voices = synth.getVoices();
    if (!voices.length || localStorage.getItem(VOICE_KEY)) return;
    for (const pref of VOICE_PREFS) {
      const v = voices.find(v => v.name.toLowerCase().includes(pref.toLowerCase()));
      if (v) { localStorage.setItem(VOICE_KEY, v.name); break; }
    }
  }
  loadVoices();
  if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadVoices;

  function getBestVoice() {
    if (!voices.length) voices = synth.getVoices();
    const saved = localStorage.getItem(VOICE_KEY);
    if (saved) { const v = voices.find(v => v.name === saved); if (v) return v; }
    for (const pref of VOICE_PREFS) {
      const v = voices.find(v => v.name.toLowerCase().includes(pref.toLowerCase()));
      if (v) return v;
    }
    return voices.find(v => v.lang && v.lang.startsWith('en')) || voices[0] || null;
  }

  // ── CLEAN TEXT FOR SPEECH ─────────────────────────────────
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
      .replace(/[⚡✓✅❌⚠🔥💡🚀⭐💎🎮🔫🤖🔊📞]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 900);
  }

  // ── SPEAK ─────────────────────────────────────────────────
  function speak(text, onEnd) {
    if (!synth) return;
    stopSpeaking();
    const clean = cleanForSpeech(text);
    if (!clean || clean.length < 3) { if (onEnd) onEnd(); return; }

    const chunks = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
    let idx = 0;

    function next() {
      if (idx >= chunks.length) {
        isSpeaking = false;
        updateBtn();
        if (onEnd) onEnd();
        return;
      }
      const chunk = (chunks[idx++] || '').trim();
      if (!chunk) { next(); return; }
      const utt   = new SpeechSynthesisUtterance(chunk);
      const voice = getBestVoice();
      if (voice)  utt.voice  = voice;
      utt.rate    = parseFloat(localStorage.getItem(RATE_KEY)  || '1.0');
      utt.pitch   = parseFloat(localStorage.getItem(PITCH_KEY) || '0.85');
      utt.volume  = 1;
      utt.onend   = next;
      utt.onerror = (e) => { if (e.error !== 'interrupted') { isSpeaking = false; updateBtn(); if (onEnd) onEnd(); } };
      isSpeaking  = true;
      updateBtn();
      synth.speak(utt);
    }
    next();
  }

  function stopSpeaking() {
    if (synth) synth.cancel();
    isSpeaking = false;
  }

  // ── INJECT CALL BUTTON ────────────────────────────────────
  function injectButton() {
    if (document.getElementById('jarvis-btn')) return;

    // Find something to attach to — send button or input area
    const sendBtn = document.getElementById('send-btn');
    if (!sendBtn) { setTimeout(injectButton, 300); return; }

    const btn = document.createElement('button');
    btn.id    = 'jarvis-btn';
    btn.title = 'Start voice call with Stellar';
    btn.style.cssText = `
      flex: none;
      width: 46px;
      height: 46px;
      border-radius: 16px;
      font-size: 20px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.04);
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, transform 0.15s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    `;
    btn.textContent = '📞';
    btn.onclick     = toggleCall;

    // Insert before send button
    sendBtn.parentNode.insertBefore(btn, sendBtn);
    updateBtn();
  }

  // ── BUTTON STATE ──────────────────────────────────────────
  function updateBtn() {
    const btn = document.getElementById('jarvis-btn');
    if (!btn) return;

    if (isOnCall && isSpeaking) {
      btn.textContent       = '🔊';
      btn.title             = 'Stellar is speaking…';
      btn.style.background  = 'rgba(16,163,127,0.35)';
      btn.style.borderColor = 'rgba(52,211,153,0.7)';
      btn.style.animation   = 'call-pulse 1s ease-in-out infinite';
    } else if (isOnCall) {
      btn.textContent       = '🎙️';
      btn.title             = 'Listening… tap to end call';
      btn.style.background  = 'rgba(239,68,68,0.25)';
      btn.style.borderColor = 'rgba(248,113,113,0.6)';
      btn.style.animation   = 'call-pulse 1.4s ease-in-out infinite';
    } else {
      btn.textContent       = '📞';
      btn.title             = 'Start voice call with Stellar';
      btn.style.background  = '';
      btn.style.borderColor = '';
      btn.style.animation   = '';
    }
  }

  // ── VOICE CALL ────────────────────────────────────────────
  function toggleCall() {
    if (isOnCall) { endCall(); return; }
    startCall();
  }
  window.toggleJarvis = toggleCall;

  function startCall() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Your browser does not support voice. Try Chrome on desktop.');
      return;
    }

    isOnCall = true;
    updateBtn();
    showCallBanner(true);

    speak("Hey, I'm Stellar. What do you need?", () => {
      listenForSpeech();
    });
  }

  function endCall() {
    isOnCall = false;
    stopSpeaking();
    stopListening();
    clearTimeout(silenceTimer);
    updateBtn();
    showCallBanner(false);
    speak("Call ended. Tap the phone button any time to call again.");
  }

  function listenForSpeech() {
    if (!isOnCall) return;
    stopListening();
    updateBtn(); // show mic icon

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    callRecog = new SR();
    callRecog.continuous     = false;
    callRecog.interimResults = true;
    callRecog.lang           = 'en-GB';

    let finalTranscript = '';
    let interimTranscript = '';

    callRecog.onresult = (e) => {
      finalTranscript   = '';
      interimTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        } else {
          interimTranscript += e.results[i][0].transcript;
        }
      }
      // Show what's being heard in the text box
      const txt = document.getElementById('txt');
      if (txt) txt.value = finalTranscript || interimTranscript;
    };

    callRecog.onend = () => {
      if (!isOnCall) return;
      const txt = document.getElementById('txt');
      const said = (txt && txt.value.trim()) || finalTranscript.trim();
      if (said && said.length > 1) {
        // Send it as a message
        sendVoiceMessage(said);
      } else {
        // Nothing heard — listen again
        setTimeout(listenForSpeech, 800);
      }
    };

    callRecog.onerror = (e) => {
      if (!isOnCall) return;
      if (e.error === 'no-speech') {
        setTimeout(listenForSpeech, 500);
      } else if (e.error !== 'aborted') {
        setTimeout(listenForSpeech, 1500);
      }
    };

    try { callRecog.start(); } catch {}
  }

  function stopListening() {
    if (callRecog) {
      try { callRecog.abort(); } catch {}
      callRecog = null;
    }
  }

  // ── SEND VOICE MESSAGE AND SPEAK REPLY ───────────────────
  function sendVoiceMessage(text) {
    if (!isOnCall) return;

    // Put text in the box and send it
    const txt = document.getElementById('txt');
    if (txt) {
      txt.value = text;
      txt.dispatchEvent(new Event('input'));
    }

    // Stop sending button animation then trigger send
    stopSpeaking();

    // Use the app's sendMessage function
    if (typeof window.sendMessage === 'function') {
      window.sendMessage();
    } else {
      // Fallback: click the send button
      const sendBtn = document.getElementById('send-btn');
      if (sendBtn) sendBtn.click();
    }

    // Watch for the response to finish then speak it
    waitForResponse();
  }

  function waitForResponse() {
    if (!isOnCall) return;
    const sendBtn = document.getElementById('send-btn');

    // Poll until send button says "Send" again (not "◼ Stop")
    const poll = setInterval(() => {
      if (!isOnCall) { clearInterval(poll); return; }
      const btnText = sendBtn ? (sendBtn.textContent || '') : '';
      if (!btnText.includes('Stop')) {
        clearInterval(poll);
        // Grab latest AI response
        setTimeout(() => {
          if (!isOnCall) return;
          const msgs = document.querySelectorAll('#chat .message.msg-ai');
          if (!msgs.length) { listenForSpeech(); return; }
          const text = ((msgs[msgs.length - 1].innerText || msgs[msgs.length - 1].textContent) || '').trim();
          if (text && text !== lastSpoken) {
            lastSpoken = text;
            speak(text, () => {
              // After speaking, listen again for next question
              if (isOnCall) setTimeout(listenForSpeech, 500);
            });
          } else {
            if (isOnCall) setTimeout(listenForSpeech, 800);
          }
        }, 400);
      }
    }, 300);
  }

  // ── CALL BANNER ───────────────────────────────────────────
  function showCallBanner(show) {
    let banner = document.getElementById('call-banner');
    if (!show) { if (banner) banner.remove(); return; }
    if (banner) return;

    banner = document.createElement('div');
    banner.id = 'call-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0;
      background: linear-gradient(90deg, rgba(16,163,127,0.95), rgba(6,120,95,0.95));
      color: #fff;
      text-align: center;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 800;
      font-family: -apple-system, BlinkMacSystemFont, Inter, sans-serif;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      letter-spacing: 0.02em;
    `;
    banner.innerHTML = `
      <span style="animation: call-pulse 1s ease-in-out infinite; display:inline-block;">🔴</span>
      <span>On a call with Stellar AI</span>
      <button onclick="endCall()" style="background:rgba(0,0,0,0.25);border:none;color:#fff;padding:4px 14px;border-radius:99px;font-weight:900;font-size:13px;cursor:pointer;margin-left:8px;">End call</button>
    `;
    document.body.prepend(banner);
  }

  // Make endCall globally accessible for the banner button
  window.endCall = endCall;

  // ── CSS ───────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @keyframes call-pulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.6); }
      50%      { box-shadow: 0 0 0 9px rgba(52,211,153,0); }
    }
    #jarvis-btn:hover { background: rgba(255,255,255,0.10) !important; transform: translateY(-1px) !important; }
    #jarvis-btn:active { transform: scale(0.95) !important; }
  `;
  document.head.appendChild(style);

  // ── BOOT ─────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    setTimeout(injectButton, 500);
  }

  console.log('[Stellar JARVIS] Voice call mode ready 📞');

})();
