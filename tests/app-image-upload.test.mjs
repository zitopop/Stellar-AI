import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('composer exposes accessible validated file and image attachment controls', () => {
  assert.match(app, /id="image-upload-input"[^>]*type="file"[^>]*accept="[^"]*image\/png[^"]*\.lua[^"]*\.py/);
  assert.match(app, /id="image-upload-btn"[^>]*aria-label="Attach a file or image"/);
  assert.match(app, /id="image-upload-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(app, /const UPLOAD_IMAGE_MAX_BYTES=3_000_000/);
  assert.match(app, /const UPLOAD_TEXT_MAX_BYTES=120_000/);
  assert.match(app, /UPLOAD_IMAGE_MEDIA_TYPES=new Set/);
  assert.match(app, /UPLOAD_TEXT_EXTENSIONS=new Set/);
});

test('attachments support picker paste and drag-drop', () => {
  assert.match(app, /function attachImageFile\(file,input=null,label='Image'\)/);
  assert.match(app, /async function attachTextFile\(file,input=null\)/);
  assert.match(app, /async function attachAnyFile\(file,input=null,label='Attachment'\)/);
  assert.match(app, /clipboardData\?\.items/);
  assert.match(app, /dataTransfer\?\.files/);
  assert.match(app, /attachAnyFile\(file,null,'Dropped attachment'\)/);
});

test('image and text attachment context are sent safely with chat', () => {
  assert.match(app, /requestImage=uploadedImage/);
  assert.match(app, /requestTextFile=uploadedTextFile/);
  assert.match(app, /attachmentText:requestTextFile\?\.content\|\|''/);
  assert.match(app, /ATTACHED FILE/);
  assert.match(app, /image:requestImage/);
});

test('composer remains keyboard accessible and mobile safe', () => {
  assert.match(app, /aria-label="Message composer\. Press Enter to send and Shift\+Enter for a new line\."/);
  assert.match(app, /id="sendBtn"[^>]*type="submit"[^>]*aria-label="Send message"/);
  assert.match(app, /@media\(max-width:540px\)[\s\S]*composer-main/);
});
