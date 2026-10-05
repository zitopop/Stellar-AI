#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const mobile = dirname(here);
const android = join(mobile, 'android');
if (!existsSync(android)) throw new Error('mobile/android is missing. Run npm run add:android first.');

const packageDir = join(android, 'app/src/main/java/com/trystellarai/stellar');
mkdirSync(packageDir, { recursive: true });
copyFileSync(join(here, 'StellarAssistPlugin.java'), join(packageDir, 'StellarAssistPlugin.java'));
copyFileSync(join(here, 'StellarAssistService.java'), join(packageDir, 'StellarAssistService.java'));

const mainPath = join(packageDir, 'MainActivity.java');
let main = readFileSync(mainPath, 'utf8');
if (!main.includes('registerPlugin(StellarAssistPlugin.class)')) {
  if (!main.includes('import android.os.Bundle;')) {
    main = main.replace('package com.trystellarai.stellar;\n', 'package com.trystellarai.stellar;\n\nimport android.os.Bundle;\n');
  }
  const emptyClass = /public class MainActivity extends BridgeActivity\s*\{\s*\}/m;
  const body = [
    'public class MainActivity extends BridgeActivity {',
    '    @Override',
    '    public void onCreate(Bundle savedInstanceState) {',
    '        registerPlugin(StellarAssistPlugin.class);',
    '        super.onCreate(savedInstanceState);',
    '    }',
    '}'
  ].join('\n');
  if (!emptyClass.test(main)) throw new Error('Unexpected MainActivity.java shape; refusing to patch blindly.');
  main = main.replace(emptyClass, body);
  writeFileSync(mainPath, main);
}

const manifestPath = join(android, 'app/src/main/AndroidManifest.xml');
let manifest = readFileSync(manifestPath, 'utf8');
if (!manifest.includes('StellarAssistService')) {
  const service = [
    '        <service',
    '            android:name=".StellarAssistService"',
    '            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"',
    '            android:exported="true"',
    '            android:label="@string/stellar_assist_label">',
    '            <intent-filter>',
    '                <action android:name="android.accessibilityservice.AccessibilityService" />',
    '            </intent-filter>',
    '            <meta-data',
    '                android:name="android.accessibilityservice"',
    '                android:resource="@xml/stellar_accessibility_service" />',
    '        </service>',
    ''
  ].join('\n');
  if (!manifest.includes('</application>')) throw new Error('AndroidManifest.xml has no application close tag.');
  manifest = manifest.replace('    </application>', service + '    </application>');
  writeFileSync(manifestPath, manifest);
}

const xmlDir = join(android, 'app/src/main/res/xml');
mkdirSync(xmlDir, { recursive: true });
copyFileSync(join(here, 'stellar_accessibility_service.xml'), join(xmlDir, 'stellar_accessibility_service.xml'));

const stringsPath = join(android, 'app/src/main/res/values/strings.xml');
let strings = readFileSync(stringsPath, 'utf8');
if (!strings.includes('stellar_assist_description')) {
  const additions = [
    '    <string name="stellar_assist_label">Stellar Assist Mode</string>',
    '    <string name="stellar_assist_description">Optional user-controlled help that can inspect visible interface labels and perform one explicit action at a time.</string>',
    ''
  ].join('\n');
  if (!strings.includes('</resources>')) throw new Error('strings.xml has no resources close tag.');
  strings = strings.replace('</resources>', additions + '</resources>');
  writeFileSync(stringsPath, strings);
}

console.log('Android Phone Assist Mode installed into generated Capacitor project.');
