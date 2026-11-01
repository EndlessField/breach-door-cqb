// street.probe.js —— street.html 视觉/契约探针(截图之外的人工复核)。
// 用法: node .uiwork/street.probe.js game/street.html 1440
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'W:/AI Code DSH/';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const page = process.argv[2];
const width = Number(process.argv[3] || 1440);

const PROBE = `
<script>
window.addEventListener('load', function(){
  setTimeout(function(){
    var out = {};
    var g = function(id){ return document.getElementById(id); };
    var S = function(el){ return el ? getComputedStyle(el) : {}; };
    var box = function(el){ if(!el) return null; var r = el.getBoundingClientRect();
      return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
    out.viewport = [window.innerWidth, window.innerHeight];
    out.cv = { box: box(g('cv')), z: S(g('cv')).zIndex, pe: S(g('cv')).pointerEvents };
    out.stack = { vignette: S(g('vignette')).zIndex, flash: S(g('flash')).zIndex,
      hud: S(g('hud')).zIndex, overlay: S(g('startOverlay')).zIndex };
    out.hudPE = S(g('hud')).pointerEvents;
    out.startBox = box(g('startOverlay'));
    var c = document.querySelector('#startOverlay .card');
    out.card = { box: box(c), borderTop: S(c).borderTopWidth, borderTopColor: S(c).borderTopColor,
      shadow: S(c).boxShadow, radius: S(c).borderTopLeftRadius, overflowX: S(c).overflowX,
      scrollH: c.scrollHeight, clientH: c.clientHeight };
    var tb = document.querySelector('#startOverlay .tb-k');
    out.tbK = { font: S(tb).fontSize, ls: S(tb).letterSpacing, text: tb.textContent };
    out.tbI = { minWidth: S(document.querySelector('#startOverlay .tb-i')).minWidth,
      padding: S(document.querySelector('#startOverlay .tb-i')).padding };
    var h2 = document.querySelector('#startOverlay h2');
    out.h2 = { text: h2.textContent, len: h2.textContent.length, tt: S(h2).textTransform, font: S(h2).fontSize };
    var sel = g('diffNorm');
    out.diffSel = { bg: S(sel).backgroundColor, color: S(sel).color, borderTop: S(sel).borderTopWidth };
    var st = g('btnStart');
    out.btnPrimary = { bg: S(st).backgroundColor, color: S(st).color, radius: S(st).borderTopLeftRadius, box: box(st) };
    out.smallFonts = [];
    var sel2 = '#startOverlay *, #hud #p1 *, #hud #p2 *';
    Array.prototype.forEach.call(document.querySelectorAll(sel2), function(el){
      var cs = S(el);
      if (cs.display === 'none') return;
      var fs2 = parseFloat(cs.fontSize), hasText = false;
      for (var i = 0; i < el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType === 3 && el.childNodes[i].textContent.trim()) hasText = true;
      }
      if (hasText && fs2 < 11) out.smallFonts.push((el.id || el.className || el.tagName) + ' ' + fs2 + 'px ' + el.textContent.trim().slice(0, 16));
    });
    out.thickBorders = [];
    Array.prototype.forEach.call(document.querySelectorAll('body *'), function(el){
      var cs = S(el);
      if (cs.display === 'none') return;
      ['Top','Right','Bottom','Left'].forEach(function(side){
        if (parseFloat(cs['border' + side + 'Width']) >= 3) out.thickBorders.push((el.id || el.className || el.tagName) + '.' + side + ':' + cs['border' + side + 'Width']);
      });
    });
    out.shadows = [];
    Array.prototype.forEach.call(document.querySelectorAll('.card,.panel'), function(el){
      out.shadows.push((el.id || el.className) + ' => ' + getComputedStyle(el).boxShadow);
    });
    out.fgSubtle = S(document.documentElement).getPropertyValue('--fg-subtle').trim();
    out.ink = S(document.documentElement).getPropertyValue('--ink').trim();
    out.faLoaded = document.fonts.check('900 16px "Font Awesome 7 Free"');
    out.iconBoxes = [];
    Array.prototype.forEach.call(document.querySelectorAll('#startOverlay i.fas'), function(el){
      out.iconBoxes.push(el.className.split(' ').pop() + ':' + Math.round(el.getBoundingClientRect().width));
    });
    // 关键 HUD 元素几何(需在游戏开始后才有内容, 这里只看框)
    out.hudBoxes = { p1: box(g('p1')), p2: box(g('p2')), fps: box(g('fpsTxt')), help: box(g('help')) };
    out.p2waveTb = box(document.querySelector('#p2 .tb-wave'));
    out.p1head = box(document.querySelector('#p1 .pnl-head'));
    var pre = document.createElement('pre'); pre.id = '__STREETPROBE__';
    pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
  }, 400);
});
</script>`;

const src = fs.readFileSync(path.join(ROOT, page), 'utf8');
const rel = path.dirname(page) === '.' ? '' : path.dirname(page) + '/';
const tmpPath = path.join(ROOT, rel, '_streetprobe_tmp.html');
fs.writeFileSync(tmpPath, src.replace(/<\/body>/i, PROBE + '\n</body>'));
const url = 'file:///' + tmpPath.replace(/\\/g, '/').replace(/ /g, '%20') + '?p=1';
let dom = '';
try {
  dom = execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
    '--user-data-dir=' + process.env.TEMP + '\\edge-sprobe-' + width, '--window-size=' + width + ',900',
    '--virtual-time-budget=2500', '--dump-dom', url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
} catch (e) { dom = (e.stdout || '').toString(); }
fs.unlinkSync(tmpPath);
const m = dom.match(/<pre id="__STREETPROBE__">([\s\S]*?)<\/pre>/);
if (!m) { console.log('probe marker not found'); process.exit(1); }
console.log(JSON.stringify(JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')), null, 1));
