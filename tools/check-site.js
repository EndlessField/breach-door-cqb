#!/usr/bin/env node
// 站点自检：页面引用的每一个本地资源，在"要上传的那份目录里"必须真实存在，且**大小写完全一致**。
//
// 为什么需要它：GitHub Pages 跑在 Linux 上，文件系统大小写敏感；Windows 本地双击测试时
// `FontAwesome/` 写成 `fontawesome/` 照样能打开，推上去就是 404。CI 里部署前先跑一遍。
//
//   node tools/check-site.js            # 检查仓库根目录（本地双击/直接托管的那份）
//   node tools/check-site.js _site      # 检查 CI 组装出来的站点目录
'use strict';

const fs = require('fs');
const path = require('path');

const BASE = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const PAGES = ['index.html', 'game/hub.html', 'game/breach.html', 'game/street.html'];

let pass = 0;
const fails = [];
function ok(msg) { pass++; console.log('ok: ' + msg); }
function bad(msg) { fails.push(msg); console.log('FAIL: ' + msg); }

// 大小写敏感的存在性检查：逐段与磁盘上的真实文件名比对
function resolveCI(relPath) {
  const segs = relPath.replace(/\\/g, '/').split('/').filter(s => s && s !== '.');
  let cur = BASE;
  for (const seg of segs) {
    if (seg === '..') { cur = path.dirname(cur); continue; }
    let entries;
    try { entries = fs.readdirSync(cur); } catch (e) { return { ok: false, reason: '目录不存在: ' + cur }; }
    if (!entries.includes(seg)) {
      const ci = entries.find(e => e.toLowerCase() === seg.toLowerCase());
      return { ok: false, reason: ci ? '大小写不一致: 期望 "' + seg + '", 磁盘上是 "' + ci + '"' : '不存在: ' + seg };
    }
    cur = path.join(cur, seg);
  }
  let st;
  try { st = fs.statSync(cur); } catch (e) { return { ok: false, reason: '不存在: ' + relPath }; }
  return { ok: st.isFile(), reason: st.isFile() ? '' : '不是文件: ' + relPath, abs: cur };
}

function checkRef(fromFile, ref, kind) {
  if (!ref || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) return;   // 协议/锚点/外链由 offline_test 管
  const clean = ref.split('?')[0].split('#')[0];
  if (!clean) return;
  const fromDir = path.dirname(path.join(BASE, fromFile));
  const abs = path.resolve(fromDir, clean);
  const rel = path.relative(BASE, abs).replace(/\\/g, '/');
  if (rel.startsWith('..')) { bad(fromFile + ' 引用了站点目录之外的文件: ' + ref); return; }
  const r = resolveCI(rel);
  if (r.ok) ok(fromFile + ' → ' + rel + ' (' + kind + ')');
  else bad(fromFile + ' → ' + ref + '  ' + r.reason);
}

// ---------- 1. 页面里的 <link href> 与本地 .html 跳转 ----------
const cssFiles = new Set();
for (const page of PAGES) {
  const file = path.join(BASE, page);
  if (!fs.existsSync(file)) { bad('缺少页面: ' + page); continue; }
  const html = fs.readFileSync(file, 'utf8');

  const links = [...html.matchAll(/<link[^>]+href=["']([^"']+)["']/g)].map(m => m[1]);
  if (!links.length) bad(page + ' 没有任何 <link href>（图标字体丢了？）');
  for (const href of links) {
    checkRef(page, href, 'link');
    if (/\.css$/i.test(href)) cssFiles.add(path.resolve(path.dirname(file), href.split('?')[0]));
  }

  // JS 里的相对跳转（'hub.html' / '../index.html' 这类单引号字面量）
  for (const m of html.matchAll(/href\s*=\s*'([^']*\.html[^']*)'/g)) checkRef(page, m[1], '跳转');
}

// ---------- 2. 样式表里 url(...) 引用的字体文件 ----------
if (!cssFiles.size) bad('没有解析到任何本地样式表');
for (const cssAbs of cssFiles) {
  const rel = path.relative(BASE, cssAbs).replace(/\\/g, '/');
  const r = resolveCI(rel);
  if (!r.ok) { bad('样式表 ' + rel + ' ' + r.reason); continue; }
  const css = fs.readFileSync(cssAbs, 'utf8');
  const urls = [...css.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/g)].map(m => m[2]);
  const local = urls.filter(u => !/^(?:data:|[a-z][a-z0-9+.-]*:|\/\/)/i.test(u));
  if (!local.length) bad(rel + ' 里没有 url() 引用（字体文件可能没打进去）');
  for (const u of local) {
    const abs = path.resolve(path.dirname(cssAbs), u.split('?')[0].split('#')[0]);
    const relU = path.relative(BASE, abs).replace(/\\/g, '/');
    const rr = resolveCI(relU);
    if (rr.ok) ok(rel + ' → ' + relU + ' (font)');
    else bad(rel + ' → ' + u + '  ' + rr.reason);
  }
}

// ---------- 3. 入口文件 ----------
for (const must of ['index.html', 'photo.ico']) {
  const r = resolveCI(must);
  if (r.ok) ok('入口文件 ' + must);
  else bad('入口文件 ' + must + ' ' + r.reason);
}

// ---------- 4. 反向检查：Pages 上会 404 的隐藏依赖 ----------
// 页面里不许出现指向 tests/ 或 .uiwork/ 的**资源引用**（这些目录不会部署）。
// 只查 href/src 属性，源码注释里提到 "由 tests/xxx.js 守护" 是正常的。
const HIDDEN_REF = /^(?:\.\.\/)?(?:tests|\.uiwork)\//;
for (const page of PAGES) {
  const file = path.join(BASE, page);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  for (const m of html.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/g)) {
    if (HIDDEN_REF.test(m[1])) bad(page + ' 运行时引用了不会部署的目录: ' + m[1]);
  }
}

if (fails.length) {
  console.log('\nSITE CHECK FAILED: ' + fails.length + ' 项问题 / ' + pass + ' 项通过');
  for (const f of fails) console.log('  - ' + f);
  process.exit(1);
}
console.log('\nSITE CHECK PASSED: ' + pass + ' 项通过 —— 所有本地引用都能在 ' + BASE + ' 里按原样找到');
