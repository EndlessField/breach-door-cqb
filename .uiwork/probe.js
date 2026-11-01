// 通用探针: 在页面里执行一段表达式, 用 headless Edge 取回结果。
// 用法: node .uiwork/probe.js <page> [width] "<js expression returning JSON-able>"
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.env.UIAUDIT_ROOT || 'W:/AI Code DSH/';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const page = process.argv[2];
const width = Number(process.argv[3] || 1440);
const expr = process.argv[4];

const inject = `
<script>
window.addEventListener('load', function(){
  try { ${process.argv[5] || ''} } catch (e) {}
  setTimeout(function(){
    var r;
    try { r = (function(){ ${expr} })(); } catch (e) { r = 'ERR: ' + e.message; }
    var pre = document.createElement('pre');
    pre.id = '__PROBE__';
    pre.textContent = JSON.stringify(r);
    document.body.appendChild(pre);
  }, ${Number(process.argv[6] || 400)});
});
</script>
`;

const src = fs.readFileSync(path.join(ROOT, page), 'utf8');
const rel = path.dirname(page) === '.' ? '' : path.dirname(page) + '/';
const tmpPath = path.join(ROOT, rel, '_probe_tmp.html');
fs.writeFileSync(tmpPath, src.replace(/<\/body>/i, inject + '\n</body>'));
const url = 'file:///' + tmpPath.replace(/\\/g, '/').replace(/ /g, '%20');
let dom = '';
try {
  dom = execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
    '--user-data-dir=' + process.env.TEMP + '\\edge-probe-' + width,
    '--window-size=' + width + ',900',
    '--virtual-time-budget=2500',
    '--dump-dom', url,
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
} catch (e) { dom = (e.stdout || '').toString(); }
fs.unlinkSync(tmpPath);
const m = dom.match(/<pre id="__PROBE__">([\s\S]*?)<\/pre>/);
if (!m) { console.log('probe marker not found'); process.exit(1); }
const json = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
console.log(json);
