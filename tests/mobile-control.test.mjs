import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/mobile-store-build.yml',import.meta.url),'utf8');
const patcher=readFileSync(new URL('../mobile/scripts/apply-android-control.mjs',import.meta.url),'utf8');
const service=readFileSync(new URL('../mobile/native/android/StellarAccessibilityService.java',import.meta.url),'utf8');
const plugin=readFileSync(new URL('../mobile/native/android/StellarControlPlugin.java',import.meta.url),'utf8');
const config=readFileSync(new URL('../mobile/native/android/stellar_accessibility_service.xml',import.meta.url),'utf8');

test('homepage keeps one dominant developer conversion path',()=>{
  assert.match(home,/Start free — no card/);
  assert.match(home,/See the workflow/);
  assert.match(home,/\.public-home #business-path\{display:none!important\}/);
  assert.doesNotMatch(home,/href="\/business">Business<\/a>/);
  assert.doesNotMatch(home,/hero-service-link">Want Stellar on your phone/);
});

test('Android Assist Mode is disclosed, native-only and user controlled',()=>{
  assert.match(app,/Android Assist Mode/);
  assert.match(app,/MOBILE_CONTROL_CONSENT_KEY/);
  assert.match(app,/I understand and want to enable Assist Mode/);
  assert.match(app,/one explicit action/);
  assert.match(app,/Ask Stellar about this screen/);
  assert.match(app,/Do not claim you tapped, typed, changed a setting/);
});

test('native bridge exposes bounded single-step controls',()=>{
  for(const action of ['back','home','scrollForward','scrollBackward','clickText','setText']) assert.ok(service.includes('"'+action+'"'),action);
  assert.doesNotMatch(service,/dispatchGesture\s*\(/);
  assert.doesNotMatch(service,/while\s*\(\s*true\s*\)/);
  assert.match(service,/isPassword\(\)/);
  assert.match(service,/permissioncontroller/);
  assert.match(service,/packageinstaller/);
  assert.match(plugin,/user-approved-single-action/);
});

test('Android build wires Accessibility service without claiming accessibility-tool status',()=>{
  assert.match(workflow,/Apply Android Assist Mode native layer/);
  assert.match(patcher,/BIND_ACCESSIBILITY_SERVICE/);
  assert.match(patcher,/android:exported="true"/);
  assert.match(config,/android:canRetrieveWindowContent="true"/);
  assert.match(config,/android:isAccessibilityTool="false"/);
});
