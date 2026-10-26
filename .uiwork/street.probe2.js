// street.probe2.js —— 强制显示三个隐藏覆盖层(暂停/强化/结算)并注入合成内容, 复核布局。
// 用法: node .uiwork/street.probe2.js game/street.html 1440
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
  var g = function(id){ return document.getElementById(id); };
  // 合成内容: 强化三选一 + 结算尺寸链(与 JS 注入的片段同构)
  var opts = g('boostOpts'); opts.innerHTML = '';
  var bd = [['fa-fire','伤害强化','+20% 武器伤害'],['fa-forward','疾行','+12% 移动速度'],['fa-bolt','弹夹扩容','弹夹容量 +50%']];
  for (var i = 0; i < 3; i++) {
    var d = document.createElement('div'); d.className = 'boostCard';
    d.innerHTML = '<b><i class="fas ' + bd[i][0] + '"></i>' + bd[i][1] + '</b><span>' + bd[i][2] + '</span>';
    opts.appendChild(d);
  }
  g('endStats').innerHTML =
    '<div class="accent">撑过波数<b>12</b></div><div class="accent">得分<b>18420</b></div>' +
    '<div>击杀丧尸<b>516</b></div><div>用时<b>13:42</b></div><div>命中率<b>63%</b></div><div>误伤队友<b>0</b></div>';
  g('endSub').textContent = '战至第 13 波阵亡（肃清完整波次 12） ｜ 得分 18420 ｜ 军功点 +13 ｜ 本玩法最佳 18420分 / 12波 ｜ 本局强化：伤害强化/疾行/弹夹扩容';
  g('loadoutInfo').textContent = '装备：霰弹枪 ｜ 难度：标准 ｜ 生命+2 弹药+1 手雷+1';
  var ids = ['pauseOverlay','boostOverlay','endOverlay'];
  ids.forEach(function(id){ g(id).classList.remove('hidden'); });
  setTimeout(function(){
    var out = {};
    var S = function(el){ return getComputedStyle(el); };
    var box = function(el){ var r = el.getBoundingClientRect();
      return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
    out.viewport = [window.innerWidth, window.innerHeight];
    out.overlays = {};
    ids.forEach(function(id){
      var ov = g(id), card = ov.querySelector('.card');
      out.overlays[id] = { box: box(card), sw: card.scrollWidth, cw: card.clientWidth,
        sh: card.scrollHeight, ch: card.clientHeight, right: Math.round(card.getBoundingClientRect().right) };
    });
    out.boostCards = [];
    Array.prototype.forEach.call(document.querySelectorAll('.boostCard'), function(el){
      out.boostCards.push({ box: box(el), pe: S(el).pointerEvents, width: S(el).width, radius: S(el).borderTopLeftRadius });
    });
    out.diffBtns = [];
    Array.prototype.forEach.call(document.querySelectorAll('.diffBtn'), function(el){
      out.diffBtns.push({ id: el.id, pe: S(el).pointerEvents, box: box(el) });
    });
    out.setControls = [];
    ['volRange','chkShake','chkFps'].forEach(function(id){
      var el = g(id); out.setControls.push(id + ' pe=' + (el ? S(el).pointerEvents : 'MISSING') + ' box=' + box(el));
    });
    out.smallFonts = [];
    Array.prototype.forEach.call(document.querySelectorAll('#pauseOverlay *, #boostOverlay *, #endOverlay *'), function(el){
      var cs = S(el);
      if (cs.display === 'none') return;
      var fs2 = parseFloat(cs.fontSize), hasText = false;
      for (var i2 = 0; i2 < el.childNodes.length; i2++) {
        if (el.childNodes[i2].nodeType === 3 && el.childNodes[i2].textContent.trim()) hasText = true;
      }
      if (hasText && fs2 < 11) out.smallFonts.push((el.id || el.className || el.tagName) + ' ' + fs2 + 'px ' + el.textContent.trim().slice(0, 14));
    });
    out.overflow = [];
    Array.prototype.forEach.call(document.querySelectorAll('body *'), function(el){
      var cs = S(el);
      if (cs.display === 'none') return;
      var r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      if (r.right > window.innerWidth + 1.5 || r.left < -1.5) {
        out.overflow.push((el.id || el.className || el.tagName) + ' [' + Math.round(r.left) + ',' + Math.round(r.right) + ']');
      }
    });
    var pre = document.createElement('pre'); pre.id = '__STREETPROBE2__';
    pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
  }, 300);
});
</script>`;

const src = fs.readFileSync(path.join(ROOT, page), 'utf8');
const rel = path.dirname(page) === '.' ? '' : path.dirname(page) + '/';
const tmpPath = path.join(ROOT, rel, '_streetprobe2_tmp.html');
fs.writeFileSync(tmpPath, src.replace(/<\/body>/i, PROBE + '\n</body>'));
const url = 'file:///' + tmpPath.replace(/\\/g, '/').replace(/ /g, '%20') + '?p=2';
let dom = '';
try {
  dom = execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
    '--user-data-dir=' + process.env.TEMP + '\\edge-sprobe2-' + width, '--window-size=' + width + ',900',
    '--virtual-time-budget=2500', '--dump-dom', url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
} catch (e) { dom = (e.stdout || '').toString(); }
fs.unlinkSync(tmpPath);
const m = dom.match(/<pre id="__STREETPROBE2__">([\s\S]*?)<\/pre>/);
if (!m) { console.log('probe marker not found'); process.exit(1); }
console.log(JSON.stringify(JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')), null, 1));
