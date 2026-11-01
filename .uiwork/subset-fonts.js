#!/usr/bin/env node
/*
 * subset-fonts.js —— 把随包的 FontAwesome 字体裁成"只有四页真正用到的图标"
 *
 * 背景: 完整实心体 119 KB / 常规体 19.5 KB，而四页只用到 100 多个图标。慢链路上光是字体
 * 就要 2 s 以上，裁剪后 10 KB 级别，首屏明显变快。CSS 不用改（@font-face 的族名/字重都不变）。
 *
 * 用法（需要一次性装个工具库，不进仓库）：
 *   npm i subset-font          # 装到当前目录即可，或者任意有 node_modules 的父目录
 *   node .uiwork/subset-fonts.js
 *
 * 它做三件事:
 *   1) 从 css/all.min.css 解析出 .fa-x → 码点（含 "\#" "\+" 这种字符转义）；
 *   2) 扫四个页面（含 JS 里的字符串）收集所有 fa-* 图标名，和 CSS 求交集；
 *   3) 用 subset-font 重写 webfonts/fa-solid-900.woff2 与 fa-regular-400.woff2。
 *
 * 任何"页面用到但 CSS 里查不到码点"的图标都会让它直接失败（不会静默产出缺图标的字体）。
 * 原始完整字体备份在 归档/字体原始/（该目录不进仓库）。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const GAME = path.resolve(__dirname, '..');
const FA = path.join(GAME, 'fontawesome-free-7.3.1-web');
const CSS = fs.readFileSync(path.join(FA, 'css', 'all.min.css'), 'utf8');

// 只是工具类, 不含字形
const UTILITY = /^fa-(solid|regular|brands|fw|spin|spin-pulse|spin-reverse|pulse|beat|beat-fade|fade|shake|bounce|flip|flip-horizontal|flip-vertical|rotate-\d+|xs|sm|lg|xl|2xl|1x|2x|3x|4x|5x|6x|7x|8x|9x|10x|border|li|pull-left|pull-right|stack|stack-1x|stack-2x|inverse|swap-opacity|width-auto|class|sr-only)$/;

function decodeCssEscape(v) {
  let out = '';
  for (let i = 0; i < v.length; i++) {
    if (v[i] !== '\\') { out += v[i]; continue; }
    const rest = v.slice(i + 1);
    const hex = /^[0-9a-fA-F]{1,6}(\s)?/.exec(rest);
    if (hex) { out += String.fromCodePoint(parseInt(hex[0].trim(), 16)); i += hex[0].length; }
    else { out += rest[0]; i += 1; }
  }
  return out;
}

const map = new Map();
for (const m of CSS.matchAll(/([^{}]+)\{--fa:"((?:[^"\\]|\\.)*)"\}/g)) {
  const glyph = decodeCssEscape(m[2]);
  if ([...glyph].length !== 1) continue;
  const cp = glyph.codePointAt(0);
  for (const s of m[1].matchAll(/\.(fa-[a-z0-9-]+)/g)) map.set(s[1], cp);
}

const pages = ['index.html', 'game/hub.html', 'game/breach.html', 'game/street.html']
  .map(f => path.join(GAME, f));
const used = new Set();
for (const p of pages) {
  const t = fs.readFileSync(p, 'utf8');
  for (const m of t.matchAll(/\bfa-[a-z0-9][a-z0-9-]*/g)) if (!UTILITY.test(m[0])) used.add(m[0]);
}
const missing = [...used].filter(n => !map.has(n));
if (missing.length) {
  console.error('这些图标在 CSS 里找不到码点, 拒绝产出缺少字形的字体: ' + missing.join(', '));
  process.exit(1);
}

(async () => {
  const subsetFont = require('subset-font');
  const solidCps = [...new Set([...used].map(n => map.get(n)))].sort((a, b) => a - b);
  // 常规体只用到空心星与空心圆（评级/空槽）
  const regCps = [...new Set(['fa-star', 'fa-circle'].map(n => map.get(n)))];
  const jobs = [
    ['fa-solid-900.woff2', solidCps],
    ['fa-regular-400.woff2', regCps],
  ];
  for (const [file, cps] of jobs) {
    const target = path.join(FA, 'webfonts', file);
    const before = fs.readFileSync(target);
    const after = await subsetFont(before, String.fromCodePoint(...cps), { targetFormat: 'woff2' });
    fs.writeFileSync(target, after);
    console.log(`${file}: ${before.length} -> ${after.length} B (${(after.length / before.length * 100).toFixed(1)}%), 字形 ${cps.length} 个`);
  }
  console.log('完成。记得跑 node tests/offline_test.js 与 site 自检。');
})().catch(e => { console.error('失败: ' + e.message); process.exit(1); });
