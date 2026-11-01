// 文件头目录(TOC)行号重算器 —— 只改行号, 不动章节名与说明文字。
// 为什么需要: breach.html 的 TOC 每条都带行号(如 `17  新手教程 ...... 722`), 行号会随改动漂移;
// tests/doc_test.js 只校验"章节名齐全 + 顺序一致 + 条数相等", 不看行号, 所以漂了也不会红 ——
// 但人查表时会找错地方, 发版前应当重算一次。
// 用法: node .uiwork/toc-fix.js game/breach.html
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const file = process.argv[2] || 'game/breach.html';
const p = path.join(ROOT, file);
let raw = fs.readFileSync(p, 'utf8');

// 与 doc_test.js 完全相同的章节标记正则, 保证"算出来的行号"就是门禁眼里的行号
const SEC_RE = /^\s*\/\/ -{6,}\s*(.+?)\s*-{6,}\s*$/;
const secs = [];
raw.split('\n').forEach((ln, i) => {
  const m = ln.match(SEC_RE);
  if (m) secs.push({ name: m[1], line: i + 1 });
});

const TOC_START = '【目录 TABLE OF CONTENTS】';
const TOC_END = '============================================================================ */';
const i0 = raw.indexOf(TOC_START);
if (i0 < 0) { console.error('找不到 TOC 起始标记: ' + TOC_START); process.exit(1); }
const iEnd = raw.indexOf(TOC_END, i0);
if (iEnd < 0) { console.error('找不到 TOC 结束标记'); process.exit(1); }
const toc = raw.slice(i0, iEnd);

let idx = 0, changed = 0;
const out = toc.split('\n').map(line => {
  const m = line.match(/^(\s*)(\d+)(\s+)(.+?)(\s*\.{3,}\s*)(\d+)?(\s*)$/);
  if (!m) return line;
  const s = secs[idx++];
  if (!s) return line;
  const prefix = m[1] + m[2] + m[3];
  const name = m[4];
  const num = String(s.line);
  const total = 76;                        // 行号右对齐到第 76 列(与既有排版一致)
  let dots = total - prefix.length - name.length - num.length;
  if (dots < 4) dots = 4;
  const pad = ' ' + '.'.repeat(dots - 2) + ' ';
  changed++;
  return prefix + name + pad + num;
}).join('\n');

// 名称必须与代码一致, 否则说明 TOC 结构本身腐烂了, 直接报错而不是改坏它
const tocNames = toc.split('\n')
  .map(l => { const m = l.trim().match(/^\d+\s+(.+?)(?:\s*\.{3,}.*)?$/); return m ? m[1].trim() : null; })
  .filter(Boolean);
const bad = secs.filter((s, i) => tocNames[i] !== s.name);
if (bad.length) {
  console.error('章节名与 TOC 不一致, 请先手工对齐后再重算行号:');
  bad.forEach(s => console.error('  ' + s.name));
  process.exit(1);
}
if (tocNames.length !== secs.length) {
  console.error('目录条数(' + tocNames.length + ') !== 实际章节数(' + secs.length + ')');
  process.exit(1);
}

raw = raw.slice(0, i0) + out + raw.slice(i0 + toc.length);
fs.writeFileSync(p, raw);
console.log(file + ': TOC 行号已重算 ' + changed + ' 条 / 章节 ' + secs.length + ' 个');
