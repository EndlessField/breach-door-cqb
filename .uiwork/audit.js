// 布局审计: 把一段自检脚本注入页面的临时副本, 用 headless Edge --dump-dom 取回 JSON 结果。
// 用法: node .uiwork/audit.js index.html 1440 420
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.env.UIAUDIT_ROOT || 'W:/AI Code DSH/';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const page = process.argv[2];
const widths = process.argv.slice(3).map(Number);

const AUDIT = `
<script>
window.addEventListener('load', function(){
  setTimeout(function(){
    var out = {};
    var vw = window.innerWidth;
    out.viewport = vw;
    out.docScrollW = document.documentElement.scrollWidth;
    out.docClientW = document.documentElement.clientWidth;
    out.hOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    var over = [], clipped = [], radius = [];
    var all = document.querySelectorAll('body *');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      var r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right > vw + 1.5 || r.left < -1.5) {
        over.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]) +
          ' [' + Math.round(r.left) + ',' + Math.round(r.right) + ']');
      }
      if (el.scrollWidth > el.clientWidth + 4 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll' && el.children.length === 0) {
        clipped.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]) +
          ' sw' + el.scrollWidth + '>cw' + el.clientWidth + ' "' + (el.textContent || '').slice(0, 24) + '"');
      }
      if (parseFloat(cs.borderTopLeftRadius) > 0) radius.push(el.tagName + '.' + String(el.className).split(' ')[0]);
    }
    out.overflowing = over.slice(0, 14);
    out.overflowCount = over.length;
    out.clipped = clipped.slice(0, 14);
    out.clippedCount = clipped.length;
    out.rounded = radius.slice(0, 10);
    out.counts = {};
    ['.sheet', '.go-card', '.stat', '.slot', '.step', '.tip', '.krow', '.kb', '.tb', '.tab', '.panel'].forEach(function(sel){
      out.counts[sel] = document.querySelectorAll(sel).length;
    });
    out.bodyBg = getComputedStyle(document.body).backgroundColor;
    out.fg = getComputedStyle(document.body).color;
    out.radiusProbe = getComputedStyle(document.querySelector('.btn') || document.body).borderTopLeftRadius;
    // 图标字体是否**真的**加载了。
    // 旧实现用 document.fonts.check('900 16px "Font Awesome 7 Free"') —— 这个 API 在字体族**根本没被声明**时
    // 同样返回 true(没有"需要加载的字体"就算通过), 于是样式表 404 时它照样报 true。
    // 实测踩过: 图标全空、faLoaded 却是 true。现在改成两条硬证据:
    //   ① document.fonts 里存在 family 含 Font Awesome 且 status==='loaded' 的面;
    //   ② 真实插入一个 <i class="fas fa-trophy">, 其字形宽度 > 0 且 font-family 落到 Font Awesome。
    try {
      var faFaces = [];
      document.fonts.forEach(function (f) { if (/Font Awesome/i.test(f.family)) faFaces.push(f.family + '|' + f.status); });
      out.faFaces = faFaces;
      var ic = document.createElement('i');
      ic.className = 'fas fa-trophy';
      ic.style.fontSize = '16px';
      document.body.appendChild(ic);
      var icw = ic.getBoundingClientRect().width;
      var icf = getComputedStyle(ic).fontFamily || '';
      ic.remove();
      out.faIconWidth = Math.round(icw * 100) / 100;
      out.faIconFont = icf.slice(0, 40);
      out.faLoaded = faFaces.indexOf('Font Awesome 7 Free|loaded') >= 0 && icw > 0 && /Font Awesome/i.test(icf);
    } catch (e) { out.faLoaded = 'n/a'; }
    var pre = document.createElement('pre');
    pre.id = '__AUDIT__';
    pre.textContent = JSON.stringify(out);
    document.body.appendChild(pre);
  }, 350);
});
</script>
`;

function run(width) {
  const src = fs.readFileSync(path.join(ROOT, page), 'utf8');
  const injected = src.replace(/<\/body>/i, AUDIT + '\n</body>');
  const tmpName = '_audit_tmp.html';
  // 放到页面同目录, 保证相对路径(fontawesome/图标)仍可解析
  const rel = path.dirname(page) === '.' ? '' : path.dirname(page) + '/';
  const tmpPath = path.join(ROOT, rel, tmpName);
  fs.writeFileSync(tmpPath, injected);
  const url = 'file:///' + tmpPath.replace(/\\/g, '/').replace(/ /g, '%20') + '?audit=1';
  let dom = '';
  try {
    dom = execFileSync(EDGE, [
      '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
      '--user-data-dir=' + process.env.TEMP + '\\edge-audit-' + width,
      '--window-size=' + width + ',900',
      '--virtual-time-budget=2500',
      '--dump-dom', url,
    ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    dom = (e.stdout || '').toString();
  }
  fs.unlinkSync(tmpPath);
  const m = dom.match(/<pre id="__AUDIT__">([\s\S]*?)<\/pre>/);
  if (!m) return { width, error: 'audit marker not found (page may not have rendered)' };
  const json = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return JSON.parse(json);
}

for (const w of widths) {
  console.log('=== ' + page + ' @ ' + w + 'px ===');
  console.log(JSON.stringify(run(w), null, 1));
}
