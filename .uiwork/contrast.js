// 真实浏览器内的对比度探针: 遍历所有带直接文字的元素, 用"自身色 vs 最近的不透明祖先底色"算 WCAG 对比度。
// 用法: node .uiwork/contrast.js <page> [width]
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'W:/AI Code DSH/';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const page = process.argv[2];
const width = Number(process.argv[3] || 1440);

const PAYLOAD = `
(function () {
  function parse(c) {
    var m = String(c).match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    var p = m[1].split(',').map(function (x) { return parseFloat(x); });
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function lum(c) { return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b); }
  function over(fg, bg) {
    var a = fg.a;
    return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
  }
  function ratio(a, b) {
    var l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  function bgOf(el) {
    var node = el, acc = null;
    while (node && node.nodeType === 1) {
      var cs = getComputedStyle(node);
      var c = parse(cs.backgroundColor);
      if (c && c.a > 0) {
        acc = acc ? over(acc, c) : c;
        if (acc.a >= 0.999) return acc;
      }
      node = node.parentElement;
    }
    return acc || { r: 255, g: 255, b: 255, a: 1 };
  }
  var bad = [], checked = 0;
  var all = document.querySelectorAll('body *');
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.15) continue;
    var txt = '';
    for (var k = 0; k < el.childNodes.length; k++) {
      if (el.childNodes[k].nodeType === 3) txt += el.childNodes[k].nodeValue;
    }
    txt = txt.replace(/\\s+/g, ' ').trim();
    if (txt.length < 2) continue;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    var fg = parse(cs.color);
    if (!fg) continue;
    var bg = bgOf(el);
    var eff = fg.a < 1 ? over(fg, bg) : fg;
    var cr = ratio(eff, bg);
    checked++;
    var size = parseFloat(cs.fontSize);
    var bold = parseInt(cs.fontWeight, 10) >= 700;
    var large = size >= 24 || (size >= 18.66 && bold);
    var need = large ? 3 : 4.5;
    if (cr < need) {
      bad.push({
        sel: (el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]),
        txt: txt.slice(0, 16), cr: Math.round(cr * 100) / 100, need: need,
        px: Math.round(size * 10) / 10,
        fg: cs.color, bg: 'rgb(' + Math.round(bg.r) + ',' + Math.round(bg.g) + ',' + Math.round(bg.b) + ')'
      });
    }
  }
  // 去重(同一选择器+同样式只报一次)
  var seen = {}, uniq = [];
  bad.forEach(function (b) { var k = b.sel + b.fg + b.bg + b.px; if (!seen[k]) { seen[k] = 1; uniq.push(b); } });
  return { checked: checked, violations: uniq.length, list: uniq.slice(0, 30) };
})()
`;

const src = fs.readFileSync(path.join(ROOT, page), 'utf8');
const rel = path.dirname(page) === '.' ? '' : path.dirname(page) + '/';
const tmpPath = path.join(ROOT, rel, '_contrast_tmp.html');
const unhide = process.argv[4] === 'overlays' ? `
  document.querySelectorAll('.overlay').forEach(function(o){o.classList.remove('hidden');});
  var es=document.getElementById('endStats');
  if(es) es.innerHTML='<div>用时<b>1:23</b></div><div class="accent">命中率<b>68%</b></div><div class="good">星级<b>3</b></div>';
  var kg=document.getElementById('keyGrid');
  if(kg){var s='';for(var i=1;i<=20;i++){s+='<div class="keyCell">动作'+i+'<span class="kk">Key</span></div>';}kg.innerHTML=s;}
  var bo=document.getElementById('boostOpts');
  if(bo) bo.innerHTML='<button class="boostCard"><b>伤害强化</b><span>+25%</span></button><button class="boostCard"><b>射速强化</b><span>+15%</span></button><button class="boostCard"><b>弹夹扩容</b><span>+50%</span></button>';
  var wp=document.getElementById('weaponInfo');
  if(wp) wp.innerHTML='<span class="mono">突击步枪</span>';
` : '';
const inject = `<script>window.addEventListener('load',function(){setTimeout(function(){try{${unhide}}catch(e){}var r;try{r=${PAYLOAD};}catch(e){r={error:String(e)};}var p=document.createElement('pre');p.id='__C__';p.textContent=JSON.stringify(r);document.body.appendChild(p);},450);});</script>`;
fs.writeFileSync(tmpPath, src.replace(/<\/body>/i, inject + '\n</body>'));
const url = 'file:///' + tmpPath.replace(/\\/g, '/').replace(/ /g, '%20');
let dom = '';
try {
  dom = execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
    '--user-data-dir=' + process.env.TEMP + '\\edge-c-' + width, '--window-size=' + width + ',1200',
    '--virtual-time-budget=3000', '--dump-dom', url],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
} catch (e) { dom = (e.stdout || '').toString(); }
fs.unlinkSync(tmpPath);
const m = dom.match(/<pre id="__C__">([\s\S]*?)<\/pre>/);
if (!m) { console.log(page + ': contrast marker not found'); process.exit(1); }
console.log('=== ' + page + ' @ ' + width + ' ===');
console.log(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
