import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
test('voice settings expose device voices without a paid voice provider',()=>{ assert.match(app,/data-panel="voice"/); assert.match(app,/speechSynthesis\.getVoices\(\)/); assert.match(app,/This adds no paid voice API/); });
test('spoken replies are opt-in and conversation mode is opt-in',()=>{ assert.match(app,/id="voice-autoplay-toggle"[^>]*aria-pressed="false"/); assert.match(app,/id="voice-conversation-toggle"[^>]*aria-pressed="false"/); assert.match(app,/voiceAutoplayEnabled\(\)/); });
test('voice conversation can send a finished microphone turn and speak the reply',()=>{ assert.match(app,/\(voiceCallActive \|\| voiceConversationEnabled\(\)\) && voiceTurnHasFinal/); assert.match(app,/maybeSpeakAssistantReply\(full\)/); });
test('voice controls include all enumerated device voices, speed, preview and stop',()=>{ assert.match(app,/id="voice-select"/); assert.match(app,/id="voice-rate" type="range" min="0.75" max="1.5"/); assert.match(app,/previewVoice\(\)/); assert.match(app,/stopSpeaking\(\)/); });
