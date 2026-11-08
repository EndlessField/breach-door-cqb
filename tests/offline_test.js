// 离线审计: 所有页面必须零网络依赖、零 emoji 字体依赖
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..');   // 项目根目录(本文件位于 tests/ 子目录)
const FILES = ['index.html', 'game/hub.html', 'game/breach.html', 'game/street.html'];

// 允许保留的基础 Unicode 符号(所有系统字体均包含, 非 emoji 依赖)
const ALLOWED = new Set(['★', '☆', '●', '○', '■', '□', '◆', '▲', '►', '▶', '→', '×', '·', '｜', '↔', '—', '…', '—', '✔']);
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2764}]/gu;

let failed = 0;
function assert(cond, msg) {
  if (!cond) { console.log('FAIL: ' + msg); failed++; }
  else console.log('ok: ' + msg);
}

for (const f of FILES) {
  const h = fs.readFileSync(path.join(DIR, f), 'utf8');
  console.log('=== ' + f + ' ===');

  // v3.6.2 起 <head> 里多了一段 __VER_FRESH__ 版本保鲜脚本：它只在 http(s) 下
  // 请求 version.json，file:// 与游戏大厅内嵌页会立即 return。它是唯一允许出现
  // 网络 API 的代码块，因此先把它摘出来单独审计，再对剩余页面做"零网络"扫描。
  const freshRe = /<script>\s*\/\* __VER_FRESH__[\s\S]*?<\/script>/;
  const fresh = h.match(freshRe);
  assert(!!fresh, '存在 __VER_FRESH__ 版本保鲜脚本');
  if (fresh) {
    assert(/protocol !== 'http:'/.test(fresh[0]) && /protocol !== 'https:'/.test(fresh[0]),
      '保鲜脚本只在 http(s) 下运行 (file:// 与离线包直接 return)');
  }
  const body = fresh ? h.replace(freshRe, '') : h;

  // 1. 网络引用模式（保鲜块之外必须为零）
  const netPatterns = [
    ['http(s)://', /https?:\/\//],
    ['协议相对 //', /(?<!:)\/\/[a-zA-Z0-9.-]/],
    ['@import', /@import/],
    ['url(...)', /url\(/],
    ['fetch(', /fetch\(/],
    ['XMLHttpRequest', /XMLHttpRequest/],
    ['WebSocket', /WebSocket/],
    ['<script src=', /<script[^>]+src=/],
    ['<iframe', /<iframe/],
    ['<img src=', /<img[^>]+src=/],
    ['importScripts', /importScripts/],
    ['Web 字体引用', /font-face/],
  ];
  for (const [name, re] of netPatterns) {
    assert(!re.test(body), '无 ' + name + ' 引用');
  }
  // 允许本地 FontAwesome 样式表 + 本地 favicon(photo.ico):
  // <link href> 必须指向本地文件, 禁止任何带协议 / // 的外部引用 —— 断网本地即可用, 不算网络依赖。
  const links = [...body.matchAll(/<link[^>]+href=["']([^"']*)["']/g)].map(m => m[1]).filter(x => x);
  const cssLinks = links.filter(l => /\.css$/i.test(l));
  const iconLinks = links.filter(l => /\.ico$/i.test(l));
  assert(links.every(l => /^(?:\.\.\/)?(?:fontawesome-free-[^\/]+\/css\/all\.min\.css|photo\.ico)$/.test(l)), '仅允许本地 fontawesome 样式表与 photo.ico: ' + JSON.stringify(links));
  assert(cssLinks.length === 1, '恰好引入一个本地样式表 (css=' + cssLinks.length + ')');
  assert(iconLinks.length <= 1, '图标声明至多 1 个 (icons=' + iconLinks.length + ')');
  // 允许的本地相对跳转(.html 文件名)
  const jumps = [...body.matchAll(/href\s*=\s*'([^']*\.html[^']*)'/g)].map(m => m[1]);
  assert(jumps.every(j => !/^[a-z]+:/i.test(j) && !j.startsWith('//')), '本地相对跳转: ' + JSON.stringify(jumps));

  // 2. emoji 依赖
  const emoji = [...body.matchAll(EMOJI_RE)].map(m => m[0]).filter(c => !ALLOWED.has(c));
  assert(emoji.length === 0, '无 emoji 字体依赖 (残留: ' + JSON.stringify([...new Set(emoji)]) + ')');

  // 3. 编码与结构
  assert(/<meta charset="UTF-8">/.test(h), 'UTF-8 声明存在');
  assert(/<script>\s*('use strict';[\s\S]*?)<\/script>/.test(h), '脚本完整');
}

if (failed) { console.log('\nOFFLINE AUDIT FAILED (' + failed + ')'); process.exit(1); }
console.log('\nOFFLINE AUDIT PASSED: 四个页面零网络依赖、零 emoji 依赖, 纯本地可运行');
