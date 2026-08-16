// ============================================================
// stellar-jarvis.js  —  Stellar AI Voice Mode
// Upload this file to your GitHub repo root
// Then in app.html, just before </body>, add ONE line:
//   <script src="/stellar-jarvis.js"></script>
// That's it. No other changes needed!
// ============================================================

(function () {
  'use strict';

  const JARVIS_KEY = 'stellar-jarvis-on';
  const VOICE_KEY  = 'stellar-jarvis-voice';
  const RATE_KEY   = 'stellar-jarvis-rate';
  const PITCH_KEY  = 'stellar-jarvis-pitch';

  // ON by default — only turns off if user taps the button
  if (localStorage.getItem(JARVIS_KEY) === null) {
    localStorage.setItem(JARVIS_KEY, 'true');
  }

  let jarvisOn   = localStorage.getItem(JARVIS_KEY) !== 'false';
  let synth      = window.speechSynthesis;
  let voices     = [];
  let isSpeaking = false;
  let lastSpoken = '';
  let wakeListen = false;
  let wakeRecog  = null;

  // ── PREFERRED VOICES ──────────────────────────────────────
  const VOICE_PREFS = [
    'Google UK English Male', 'Daniel', 'Arthur',
    'Microsoft George', 'Google UK English Female',
    'Karen', 'Rishi', 'Google US English', 'Samantha',
  ];

  function loadVoices() {
    voices = synth.getVoices();
    if (!voices.length || localStorage.getItem(VOICE_KEY)) return;
    for (const pref of VOICE_PREFS) {
      const match = voices.find(v => v.name.toLowerCase().includes(pref.toLowerCase()));
      if (match) { localStorage.setItem(VOICE_KEY, match.name); break; }
    }
  }
  loadVoices();
  if (synth && synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadVoices;

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
      .replace(/[⚡✓✅❌⚠🔥💡🚀⭐💎🎮🔫🤖🔊]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1000);
  }

  // ── SPEAK ─────────────────────────────────────────────────
  function speak(text, onEnd) {
    if (!synth || !jarvisOn) return;
    stopSpeaking();
    const clean = cleanForSpeech(text);
    if (!clean || clean.length < 5) return;
    const chunks = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
    let idx = 0;
    function next() {
      if (idx >= chunks.length) { isSpeaking = false; updateBtn(); if (onEnd) onEnd(); return; }
      const chunk = (chunks[idx++] || '').trim();
      if (!chunk) { next(); return; }
      const utt   = new SpeechSynthesisUtterance(chunk);
      const voice = getBestVoice();
      if (voice)  utt.voice  = voice;
      utt.rate    = parseFloat(localStorage.getItem(RATE_KEY)  || '0.95');
      utt.pitch   = parseFloat(localStorage.getItem(PITCH_KEY) || '0.85');
      utt.volume  = 1;
      utt.onend   = next;
      utt.onerror = (e) => { if (e.error !== 'interrupted') { isSpeaking = false; updateBtn(); } };
      isSpeaking  = true;
      updateBtn();
      synth.speak(utt);
    }
    next();
  }

  function stopSpeaking() {
    if (synth) synth.cancel();
    isSpeaking = false;
    updateBtn();
  }

  // ── INJECT THE BUTTON INTO THE PAGE ───────────────────────
  // Adds the JARVIS button right next to the existing mic button
  // so you DON'T need to edit app.html manually
  function injectButton() {
    if (document.getElementById('jarvis-btn')) return; // already exists

    const micBtn = document.getElementById('mic-btn');
    if (!micBtn) { setTimeout(injectButton, 300); return; }

    const btn = document.createElement('button');
    btn.id        = 'jarvis-btn';
    btn.className = 'mic-btn';
    btn.title     = 'JARVIS Voice Mode';
    btn.textContent = '🤖';
    btn.style.cssText = `
      flex: none;
      width: 46px;
      border-radius: 16px;
      font-size: 18px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.04);
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, transform 0.15s;
    `;
    micBtn.insertAdjacentElement('afterend', btn);
    btn.onclick = toggleJarvis;
    updateBtn();
  }

  // ── BUTTON VISUAL STATE ───────────────────────────────────
  function updateBtn() {
    const btn = document.getElementById('jarvis-btn');
    if (!btn) return;
    if (isSpeaking) {
      btn.textContent       = '🔊';
      btn.title             = 'Speaking — tap to stop';
      btn.style.background  = 'rgba(16,163,127,0.35)';
      btn.style.borderColor = 'rgba(52,211,153,0.7)';
      btn.style.animation   = 'jarvis-pulse 1s ease-in-out infinite';
      btn.onclick           = stopSpeaking;
    } else if (jarvisOn) {
      btn.textContent       = '🤖';
      btn.title             = 'JARVIS ON — tap to mute';
      btn.style.background  = 'rgba(16,163,127,0.18)';
      btn.style.borderColor = 'rgba(52,211,153,0.4)';
      btn.style.animation   = '';
      btn.onclick           = toggleJarvis;
    } else {
      btn.textContent       = '🤖';
      btn.title             = 'JARVIS OFF — tap to enable voice';
      btn.style.background  = '';
      btn.style.borderColor = '';
      btn.style.animation   = '';
      btn.onclick           = toggleJarvis;
    }
  }

  // ── TOGGLE ────────────────────────────────────────────────
  function toggleJarvis() {
    if (isSpeaking) { stopSpeaking(); return; }
    jarvisOn = !jarvisOn;
    localStorage.setItem(JARVIS_KEY, jarvisOn ? 'true' : 'false');
    updateBtn();
    if (jarvisOn) {
      speak("JARVIS mode on. I will speak every response aloud.");
      startWakeWord();
    } else {
      stopSpeaking();
      stopWakeWord();
    }
  }
  window.toggleJarvis = toggleJarvis;

  // ── WAKE WORD ─────────────────────────────────────────────
  function startWakeWord() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || wakeListen) return;
    try {
      wakeRecog = new SR();
      wakeRecog.continuous     = true;
      wakeRecog.interimResults = false;
      wakeRecog.lang           = 'en-GB';
      wakeRecog.onresult = (e) => {
        const said = (e.results[e.results.length - 1][0].transcript || '').toLowerCase().trim();
        if (said.includes('hey stellar') || said.includes('stellar') || said.includes('hey star')) {
          if (window.toggleMic) window.toggleMic();
          speak('Ready.');
        }
      };
      wakeRecog.onerror = () => {};
      wakeRecog.onend   = () => { wakeListen = false; if (jarvisOn) setTimeout(startWakeWord, 1500); };
      wakeRecog.start();
      wakeListen = true;
    } catch {}
  }

  function stopWakeWord() {
    if (wakeRecog) { try { wakeRecog.stop(); } catch {} }
    wakeListen = false;
  }

  // ── WATCH CHAT FOR NEW AI MESSAGES ────────────────────────
  let speakTimer = null;

  const observer = new MutationObserver(() => {
    if (!jarvisOn) return;
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn && (sendBtn.textContent || '').includes('Stop')) return;
    clearTimeout(speakTimer);
    speakTimer = setTimeout(() => {
      const msgs = document.querySelectorAll('#chat .message.msg-ai');
      if (!msgs.length) return;
      const text = ((msgs[msgs.length - 1].innerText || msgs[msgs.length - 1].textContent) || '').trim();
      if (text && text !== lastSpoken && text.length > 15) {
        lastSpoken = text;
        speak(text);
      }
    }, 700);
  });

  function hookObserver() {
    const chat = document.getElementById('chat');
    if (chat) {
      observer.observe(chat, { childList: true, subtree: true, characterData: true });
    } else {
      setTimeout(hookObserver, 600);
    }
  }
  hookObserver();

  // Stop when user sends a new message
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { stopSpeaking(); lastSpoken = ''; }
  });
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'send-btn') { stopSpeaking(); lastSpoken = ''; }
  });

  // ── CSS ───────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @keyframes jarvis-pulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.6); }
      50%      { box-shadow: 0 0 0 9px rgba(52,211,153,0); }
    }
    #jarvis-btn:hover { background: rgba(255,255,255,0.10) !important; transform: translateY(-1px); }
    #jarvis-btn:active { transform: scale(0.95) !important; }
  `;
  document.head.appendChild(style);

  // ── BOOT ─────────────────────────────────────────────────
  // Wait for page to fully load then inject button
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    setTimeout(injectButton, 500);
  }

  setTimeout(() => {
    updateBtn();
    if (jarvisOn) {
      startWakeWord();
      if (!localStorage.getItem('stellar-jarvis-greeted')) {
        localStorage.setItem('stellar-jarvis-greeted', 'true');
        speak("Stellar AI voice mode activated. I will speak every response aloud. Tap the robot button to mute me.");
      }
    }
  }, 1200);

  console.log('[Stellar JARVIS] loaded — voice is', jarvisOn ? 'ON' : 'OFF');

})();
