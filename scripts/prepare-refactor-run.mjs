import fs from 'node:fs';

const file = 'scripts/refactor-repository.mjs';
let source = fs.readFileSync(file, 'utf8');

const oldReplace = `function replacePathRefs(text, oldRel, newRel) {
  const oldAbs = \`/\${oldRel}\`;
  const newAbs = \`/\${newRel}\`;
  let out = text.split(oldAbs).join(newAbs);
  out = out.split(oldRel).join(newRel);
  return out;
}`;

const newReplace = `function replacePathRefs(text, oldRel, newRel) {
  // Public page names such as /models are URL contracts, not arbitrary text tokens.
  // Their files move physically and Vercel compatibility rewrites keep the URLs stable.
  if (oldRel === 'models' || oldRel === 'models.html') return text;
  const oldAbs = \`/\${oldRel}\`;
  const newAbs = \`/\${newRel}\`;
  const marker = \`__STELLAR_PATH_MOVE_\${crypto.createHash('sha1').update(oldRel).digest('hex')}__\`;
  // Hide absolute references before replacing relative ones so a filename contained in
  // its destination (currency.js -> assets/js/currency.js) cannot be replaced twice.
  let out = text.split(oldAbs).join(marker);
  out = out.split(oldRel).join(newRel);
  return out.split(marker).join(newAbs);
}`;

if (!source.includes(oldReplace) && !source.includes(newReplace)) {
  throw new Error('Could not locate replacePathRefs implementation to patch.');
}
source = source.replace(oldReplace, newReplace);

const oldVercelLoop = `    for (const move of moves) out = out.split(\`/\${move.old}\`).join(\`/\${move.new}\`);`;
const newVercelLoop = `    for (const move of moves) {
      if (move.old === 'models' || move.old === 'models.html') continue;
      out = out.split(\`/\${move.old}\`).join(\`/\${move.new}\`);
    }`;
if (!source.includes(oldVercelLoop) && !source.includes(newVercelLoop)) {
  throw new Error('Could not locate Vercel destination rewrite loop to patch.');
}
source = source.replace(oldVercelLoop, newVercelLoop);

fs.writeFileSync(file, source);
console.log('Prepared path-safe repository refactor source.');
