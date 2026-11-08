// ui_check.js —— 四页 UI 硬约束自检(只读, 不修改任何文件)。用法: node .uiwork/ui_check.js
const fs = require('fs');
const PAGES = ['index.html', 'game/hub.html', 'game/breach.html', 'game/street.html'];
const ALLOWED = new Set(['★','☆','●','○','■','□','◆','▲','►','▶','→','×','·','｜','↔','—','…','✔']);
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2764}]/gu;
const NET = [
  ['http(s)://',      /https?:\/\//],
  ['协议相对 //',      /(?<!:)\/\/[a-zA-Z0-9.-]/],
  ['@import',         /@import/],
  ['url(...)',        /url\(/],
  ['fetch(',          /fetch\(/],
  ['XMLHttpRequest',  /XMLHttpRequest/],
  ['WebSocket',       /WebSocket/],
  ['<script src=',    /<script[^>]+src=/],
  ['<iframe',         /<iframe/],
  ['<img src=',       /<img[^>]+src=/],
  ['importScripts',   /importScripts/],
  ['font-face',       /font-face/],
];
let bad = 0;
const ck = (c, m) => { if (!c) { bad++; console.log('  FAIL  ' + m); } else console.log('  ok    ' + m); };
for (const f of PAGES) {
  const h = fs.readFileSync(f, 'utf8');
  console.log('=== ' + f + ' ===');
  for (const [n, re] of NET) ck(!re.test(h), 'no ' + n + (re.test(h) ? '  <-- ' + JSON.stringify((h.match(new RegExp(re.source, 'g')) || []).slice(0, 4)) : ''));
  const links = [...h.matchAll(/<link[^>]+href=["']([^"']*)["']/g)].map(m => m[1]).filter(Boolean);
  ck(links.every(l => /^(?:\.\.\/)?(?:fontawesome-free-[^\/]+\/css\/all\.min\.css|photo\.ico)$/.test(l)), 'link whitelist ' + JSON.stringify(links));
  ck(links.filter(l => /\.css$/i.test(l)).length === 1, 'exactly 1 css link');
  ck(links.filter(l => /\.ico$/i.test(l)).length <= 1, '<=1 ico link');
  ck(/<meta charset="UTF-8">/.test(h), 'exact <meta charset="UTF-8">');
  ck((h.match(/<script/g) || []).length === 1 && /<script>/.test(h), 'exactly 1 <script>, literal tag');
  ck(/<script>([\s\S]*?)<\/script>/.test(h), 'script extractable');
  ck((h.match(/<style/g) || []).length === 1, 'exactly 1 <style>');
  const em = [...new Set([...h.matchAll(EMOJI_RE)].map(m => m[0]).filter(c => !ALLOWED.has(c)))];
  ck(em.length === 0, 'no emoji/dingbat residue ' + JSON.stringify(em));
  ck(h.indexOf('prefers-reduced-motion') >= 0, 'prefers-reduced-motion block present (soft)');
  const secs = (h.match(/^\s*\/\/ -{6,}\s*(.+?)\s*-{6,}\s*$/gm) || []).length;
  console.log('  info  section markers: ' + secs);
}
for (const f of ['index.html', 'game/hub.html']) {
  const h = fs.readFileSync(f, 'utf8');
  ck(h.indexOf('// <map-preview-data:auto>') >= 0 && h.indexOf('// </map-preview-data:auto>') >= 0, f + ': map-preview-data markers');
}
{
  const h = fs.readFileSync('game/breach.html', 'utf8');
  const i0 = h.indexOf('【目录 TABLE OF CONTENTS】');
  const END = '============================================================================ */';
  const iEnd = i0 >= 0 ? h.indexOf(END, i0) : -1;
  ck(i0 >= 0 && iEnd > i0, 'breach: TOC block bound by 76 x "=" + " */"');
  const secs = [...h.matchAll(/^\s*\/\/ -{6,}\s*(.+?)\s*-{6,}\s*$/gm)].map(m => m[1]);
  ck(secs.length >= 40, 'breach: >=40 section markers (' + secs.length + ')');
  const toc = i0 >= 0 && iEnd > i0 ? h.slice(i0, iEnd) : '';
  const names = toc.split('\n').map(l => l.trim().match(/^\d+\s+(.+?)(?:\s*\.{3,}.*)?$/)).filter(Boolean)
                   .map(m => m[1].trim()).filter(n => n && n.indexOf('【') < 0);
  ck(names.length === secs.length, 'breach: TOC entries === section count (' + names.length + ' vs ' + secs.length + ')');
  let cur = 0; const ooo = [], miss = [];
  for (const n of secs) { const at = toc.indexOf(n, cur); if (at < 0) (toc.indexOf(n) >= 0 ? ooo : miss).push(n); else cur = at + n.length; }
  ck(miss.length === 0 && ooo.length === 0, 'breach: TOC covers all sections in order ' + JSON.stringify({ miss, ooo }));
  ck(h.indexOf('蓝方5人') >= 0 && h.indexOf('蓝方6人') >= 0, "breach: contains '蓝方5人' + '蓝方6人'");
  ck(h.indexOf('蓝方7人') < 0 && h.indexOf('蓝方8人') < 0, "breach: no '蓝方7人' / '蓝方8人'");
}
console.log(bad ? '\nUI CHECK FAILED (' + bad + ')' : '\nUI CHECK PASSED (all hard constraints)');
process.exit(bad ? 1 : 0);
