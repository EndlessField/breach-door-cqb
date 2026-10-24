// 量页面总高 + 关键元素尺寸, 判断截图窗口是否够高
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'W:/AI Code DSH/';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const page = 'game/hub.html';

const PROBE = `
<script>
window.addEventListener('load', function(){
  setTimeout(function(){
    var o = { vw: window.innerWidth, vh: window.innerHeight,
      scrollH: document.documentElement.scrollHeight,
      scrollW: document.documentElement.scrollWidth };
    function box(sel){ var e = document.querySelector(sel); if (!e) return null; var r = e.getBoundingClientRect();
      return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }
    o.sheetHead = box('.sheet-head');
    o.tb = box('.tb');
    o.tbK = box('.tb-k');
    o.firstSheet = box('.sheet');
    o.actions = box('.actions');
    var tk = document.querySelector('.tb-k');
    if (tk) o.tbKOverflow = [tk.scrollWidth, tk.clientWidth];
    var mp = document.getElementById('mapPrev');
    if (mp) o.mapPrev = box('#mapPrev');
    var pre = document.createElement('pre'); pre.id = '__P__'; pre.textContent = JSON.stringify(o);
    document.body.appendChild(pre);
  }, 400);
});
</script>`;

function run(width, height) {
  const src = fs.readFileSync(path.join(ROOT, page), 'utf8');
  const injected = src.replace(/<\/body>/i, PROBE + '\n</body>');
  const tmp = path.join(ROOT, 'game', '_probe_tmp.html');
  fs.writeFileSync(tmp, injected);
  const url = 'file:///' + tmp.replace(/\\/g, '/').replace(/ /g, '%20');
  let dom = '';
  try {
    dom = execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
      '--user-data-dir=' + process.env.TEMP + '\\edge-probe-hub-' + width,
      '--window-size=' + width + ',' + height, '--virtual-time-budget=2000', '--dump-dom', url],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) { dom = (e.stdout || '').toString(); }
  fs.unlinkSync(tmp);
  const m = dom.match(/<pre id="__P__">([\s\S]*?)<\/pre>/);
  if (!m) return { width, error: 'probe marker not found' };
  return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
}
for (const [w, h] of [[1440, 3400], [520, 4200]]) {
  console.log('=== ' + w + 'x' + h + ' ===');
  console.log(JSON.stringify(run(w, h), null, 1));
}
