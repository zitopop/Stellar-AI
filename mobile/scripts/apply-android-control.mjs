#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const android=join(root,'android');
const mainJavaRoot=join(android,'app','src','main','java');
const manifestPath=join(android,'app','src','main','AndroidManifest.xml');
const stringsPath=join(android,'app','src','main','res','values','strings.xml');
const xmlDir=join(android,'app','src','main','res','xml');
const templateDir=join(root,'native','android');
if(!existsSync(android)) throw new Error('Android project missing. Run npm run add:android first.');

function findFile(dir,name){
  for(const entry of readdirSync(dir,{withFileTypes:true})){
    const full=join(dir,entry.name);
    if(entry.isDirectory()){const hit=findFile(full,name);if(hit)return hit}
    else if(entry.name===name)return full;
  }
  return null;
}

const mainActivityPath=findFile(mainJavaRoot,'MainActivity.java');
if(!mainActivityPath) throw new Error('Could not locate generated MainActivity.java');
const generated=readFileSync(mainActivityPath,'utf8');
const packageName=generated.match(/package\s+([A-Za-z0-9_.]+)\s*;/)?.[1];
if(!packageName) throw new Error('Could not determine Android package name');
const javaDir=dirname(mainActivityPath);

for(const name of ['StellarControlPlugin.java','StellarAccessibilityService.java']){
  const source=readFileSync(join(templateDir,name),'utf8').replaceAll('__PACKAGE__',packageName);
  writeFileSync(join(javaDir,name),source);
}

writeFileSync(mainActivityPath,[
  'package '+packageName+';','','import android.os.Bundle;','import com.getcapacitor.BridgeActivity;','',
  'public class MainActivity extends BridgeActivity {','  @Override','  public void onCreate(Bundle savedInstanceState) {',
  '    super.onCreate(savedInstanceState);','    registerPlugin(StellarControlPlugin.class);','  }','}',''
].join('\n'));

let manifest=readFileSync(manifestPath,'utf8');
if(!manifest.includes('StellarAccessibilityService')){
  const service=[
    '        <service',
    '            android:name=".StellarAccessibilityService"',
    '            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"',
    '            android:exported="true"',
    '            android:label="@string/stellar_control_service_label">',
    '            <intent-filter>',
    '                <action android:name="android.accessibilityservice.AccessibilityService" />',
    '            </intent-filter>',
    '            <meta-data',
    '                android:name="android.accessibilityservice"',
    '                android:resource="@xml/stellar_accessibility_service" />',
    '        </service>',''
  ].join('\n');
  manifest=manifest.replace('</application>',service+'    </application>');
  writeFileSync(manifestPath,manifest);
}

mkdirSync(xmlDir,{recursive:true});
cpSync(join(templateDir,'stellar_accessibility_service.xml'),join(xmlDir,'stellar_accessibility_service.xml'));

let strings=readFileSync(stringsPath,'utf8');
if(!strings.includes('stellar_control_service_label')){
  strings=strings.replace('</resources>',
    '    <string name="stellar_control_service_label">Stellar AI Assist Mode</string>\n'+
    '    <string name="stellar_control_service_description">Lets you ask Stellar to read visible interface labels and perform one action you explicitly approve. Password fields and protected Android screens are blocked.</string>\n</resources>');
  writeFileSync(stringsPath,strings);
}
console.log('Android Assist Mode native layer applied for '+packageName);
