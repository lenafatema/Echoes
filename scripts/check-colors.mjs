import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const scriptRoot = path.join(root, 'scripts');
const allowPath = path.join(sourceRoot, 'tokens/color-allowlist.txt');
const allow = new Set(fs.readFileSync(allowPath, 'utf8').split(/\r?\n/).map(line => line.split('—')[0].trim()).filter(line => line && !line.startsWith('#')));
const pattern = /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?)\s*\([^)]*\)/ig;
const failures = [];
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { visit(file); continue; }
    if (!/\.(?:css|tsx?|html)$/.test(file)) continue;
    if (file.startsWith(path.join(sourceRoot, 'tokens') + path.sep)) continue;
    const relative = path.relative(root, file);
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (pattern.test(line) && !allow.has(`${relative}:${index + 1}`)) failures.push(`${relative}:${index + 1}: ${line.trim().slice(0, 180)}`);
      pattern.lastIndex = 0;
    });
  }
}
visit(sourceRoot);
if (fs.existsSync(scriptRoot)) visit(scriptRoot);
const html = path.join(root, 'index.html');
if (fs.existsSync(html)) fs.readFileSync(html, 'utf8').split(/\r?\n/).forEach((line, index) => {
  if (pattern.test(line) && !allow.has(`index.html:${index + 1}`)) failures.push(`index.html:${index + 1}: ${line.trim().slice(0, 180)}`);
  pattern.lastIndex = 0;
});
if (failures.length) { console.error('Off-token colour literals found. Use tokens from src/tokens/colors.ts or CSS custom properties:\n' + failures.join('\n')); process.exitCode = 1; }
else console.log('Color token check passed. No off-token color literals found.');
