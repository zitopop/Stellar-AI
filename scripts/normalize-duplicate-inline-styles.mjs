import fs from 'node:fs';

const file = 'app.html';
let html = fs.readFileSync(file, 'utf8');
const blocks = [];
html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (block) => {
  const token = `<!--__STYLE_${blocks.length}__-->`;
  blocks.push(block);
  return token;
});

let removed = 0;
const tagRe = /<[A-Za-z][A-Za-z0-9:-]*(?:\s+(?:"[^"]*"|'[^']*'|[^'">])*)?\s*\/?>/g;
html = html.replace(tagRe, (tag) => {
  const styleRe = /\sstyle\s*=\s*(?:"[^"]*"|'[^']*')/gi;
  const matches = [...tag.matchAll(styleRe)];
  if (matches.length <= 1) return tag;

  // HTML parsers keep the first occurrence of a duplicated attribute and ignore later
  // duplicates. Remove only the ignored duplicates so rendered behaviour is unchanged.
  let next = tag;
  for (let i = matches.length - 1; i >= 1; i -= 1) {
    const m = matches[i];
    next = next.slice(0, m.index) + next.slice(m.index + m[0].length);
    removed += 1;
  }
  return next;
});

for (let i = 0; i < blocks.length; i += 1) html = html.replace(`<!--__STYLE_${i}__-->`, blocks[i]);
fs.writeFileSync(file, html);
console.log(`Removed ${removed} ignored duplicate style attributes before class extraction.`);
if (removed !== 6) throw new Error(`Expected 6 ignored duplicate style attributes, removed ${removed}.`);
