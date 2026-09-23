import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('composer exposes accessible validated image attachment controls', () => {
  assert.match(app, /id="image-upload-input"[^>]*type="file"[^>]*accept="image\/png,image\/jpeg,image\/gif,image\/webp"/);
  assert.match(app, /id="image-upload-btn"[^>]*aria-label="Attach an image"/);
  assert.match(app, /id="image-upload-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(app, /const UPLOAD_IMAGE_MAX_BYTES=3_000_000/);
  assert.match(app, /UPLOAD_IMAGE_MEDIA_TYPES=new Set/);
  assert.match(app, /file\.size>UPLOAD_IMAGE_MAX_BYTES/);
});

test('image input supports picker paste and drag-drop', () => {
  assert.match(app, /function attachImageFile\(file,input=null,label='Image'\)/);
  assert.match(app, /clipboardData\?\.items/);
  assert.match(app, /getAsFile/);
  assert.match(app, /dataTransfer\?\.files/);
  assert.match(app, /initImageInput\(\)/);
});

test('image is sent with the request and clears after success', () => {
  assert.match(app, /const requestImage=uploadedImage/);
  assert.match(app, /image:requestImage/);
  assert.match(app, /if\(uploadedImage===requestImage\)removeImage\(\)/);
});

test('composer remains keyboard accessible and mobile safe', () => {
  assert.match(app, /aria-label="Message composer\. Press Enter to send and Shift\+Enter for a new line\."/);
  assert.match(app, /id="sendBtn"[^>]*type="submit"[^>]*aria-label="Send message"/);
  assert.match(app, /@media\(max-width:640px\)[\s\S]*?\.composer-tool\{min-height:44px\}/);
});
