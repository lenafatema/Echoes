import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const tokenCss = fs.readFileSync(path.join(sourceRoot, 'tokens/colors.css'), 'utf8');
const allowed = new Set((tokenCss.match(/#[\da-f]{3,8}\b/ig) || []).map(value => value.toLowerCase()));
const failures = [];
const literal = /#[\da-f]{3,8}\b/ig;
function audit(file, text) {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const hits = line.match(literal) || [];
    for (const hit of hits) if (!allowed.has(hit.toLowerCase())) failures.push(`${path.relative(root,file)}:${index+1}: off-palette ${hit}`);
    if (/\b(?:linear|radial|conic)-gradient\s*\(/i.test(line)) failures.push(`${path.relative(root,file)}:${index+1}: gradient()`);
    if (/filter\s*:\s*(?:blur|drop-shadow)\s*\(/i.test(line)) failures.push(`${path.relative(root,file)}:${index+1}: blur/drop-shadow filter`);
    if (/box-shadow\s*:[^;]*(?:#[\da-f]{3,8}\b|rgba?\(|hsla?\(|\b(?:black|white)\b)/i.test(line)) failures.push(`${path.relative(root,file)}:${index+1}: shadow colour must use a token`);
    if (/(?:#[\da-f]{6}|#[\da-f]{3})\b/i.test(line) && /#(?:000|000000|fff|ffffff)\b/i.test(line)) failures.push(`${path.relative(root,file)}:${index+1}: pure black/white is forbidden`);
    literal.lastIndex = 0;
  });
}
function visit(dir, includeTokens = false) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()){visit(file,includeTokens);continue;}
    if(!/\.(?:css|tsx?|html)$/.test(file))continue;
    if(!includeTokens && file.startsWith(path.join(sourceRoot,'tokens')+path.sep))continue;
    audit(file,fs.readFileSync(file,'utf8'));
  }
}
visit(sourceRoot);
const dist=path.join(root,'dist/assets');
if(fs.existsSync(dist))for(const name of fs.readdirSync(dist).filter(name=>name.endsWith('.css')))audit(path.join(dist,name),fs.readFileSync(path.join(dist,name),'utf8'));
if(failures.length){console.error('Palette audit failed:\n'+[...new Set(failures)].join('\n'));process.exitCode=1;}
else console.log('Palette audit passed for source and built CSS.');
