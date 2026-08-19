import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('Task 49 exposes an accessible validated image-upload control in the workspace composer', () => {
  assert.match(appHtml, /id="image-upload-input"[^>]*type="file"[^>]*accept="image\/png,image\/jpeg,image\/gif,image\/webp"/);
  assert.match(appHtml, /id="image-upload-btn"[^>]*aria-label="Attach an image"/);
  assert.match(appHtml, /id="image-upload-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(appHtml, /const UPLOAD_IMAGE_MAX_BYTES = 3_000_000;/);
  assert.match(appHtml, /const UPLOAD_IMAGE_MEDIA_TYPES = new Set\(\['image\/png', 'image\/jpeg', 'image\/gif', 'image\/webp'\]\);/);
  assert.match(appHtml, /if \(!UPLOAD_IMAGE_MEDIA_TYPES\.has\(file\.type\)\)/);
  assert.match(appHtml, /if \(file\.size > UPLOAD_IMAGE_MAX_BYTES\)/);
  assert.match(appHtml, /let imageUploadRequestId = 0;/);
  assert.match(appHtml, /const uploadRequestId = \+\+imageUploadRequestId;/);
  assert.match(appHtml, /reader\.onload = function\(e\) \{\s+if \(uploadRequestId !== imageUploadRequestId\) return;/);
  assert.match(appHtml, /reader\.onerror = function\(\) \{\s+if \(uploadRequestId !== imageUploadRequestId\) return;/);
  assert.match(appHtml, /function removeImage\(\) \{\s+imageUploadRequestId \+= 1;/);
  assert.match(appHtml, /reader\.onerror = function\(\)/);
  assert.match(appHtml, /const imageItem = Array\.from\(clipboard\?\.items \|\| \[\]\)\.find\(\(item\) => item\.kind === 'file' && item\.type\.startsWith\('image\/'\)\)/);
  assert.match(appHtml, /attachImageFile\(imageFile, null, 'Pasted image'\)/);
  assert.match(appHtml, /if \(imageFile\) \{\s+e\.preventDefault\(\);\s+attachImageFile\(imageFile, null, 'Pasted image'\);\s+return;\s+\}\s+\}\s+const t = clipboard\.getData\('text'\);/);
  assert.match(appHtml, /function initImageDrop\(\)/);
  assert.match(appHtml, /composer\.addEventListener\('drop', \(event\) => \{[\s\S]*?const droppedFile = Array\.from\(event\.dataTransfer\?\.files \|\| \[\]\)\[0\];[\s\S]*?event\.preventDefault\(\);\s+attachImageFile\(droppedFile, null, 'Dropped image'\);/);
  assert.match(appHtml, /initPaste\(\);\s+initImageDrop\(\);/);
});

test('Task 67 keeps IME composition intact while documenting composer keyboard behavior', () => {
  assert.match(appHtml, /id="txt"[^>]*aria-label="Message composer\. Press Enter to send and Shift\+Enter for a new line\."/);
  assert.match(appHtml, /onkeydown="if \(event\.key === 'Enter' && !event\.shiftKey && !event\.isComposing\) \{ event\.preventDefault\(\); if \(!currentAbort\) sendMessage\(\); \}"/);
});

test('Task 68 exposes a visible desktop keyboard hint without squashing mobile controls', () => {
  assert.match(appHtml, /id="keyboard-hint" class="keyboard-hint">Enter to send · Shift\+Enter for new line<\/span>/);
  assert.match(appHtml, /\.keyboard-hint \{ color: rgba\(226,217,255,0\.58\);/);
  assert.match(appHtml, /body\.light \.keyboard-hint \{ color: #6b7280; \}/);
  assert.match(appHtml, /@media \(max-width: 640px\) \{\s+\.composer-foot \{ gap: 6px; justify-content: flex-start; \}\s+\.keyboard-hint \{ display: none; \}/);
});
