// patch.js —— 按设计检测器要求批量修正 street 的令牌与规则(仅改 .uiwork 暂存件)
const fs = require('fs');
const stylePath = 'W:/AI Code DSH/.uiwork/street.style.html';
const bodyPath = 'W:/AI Code DSH/.uiwork/street.body.html';
let css = fs.readFileSync(stylePath, 'utf8');
let body = fs.readFileSync(bodyPath, 'utf8');

const pairs = [
  // 1. --fg-subtle 提亮到 WCAG AA; 2. 新增 --ink
  ['  --fg-subtle:#5c7d92;', '  --fg-subtle:#7c9aab;\n  --ink:#06202f;'],
  // 3. 小字抬到 >=11px
  ['.overline{font-family:var(--latin);font-size:10.5px;', '.overline{font-family:var(--latin);font-size:11px;'],
  ['.tb-i{padding:3px 8px 4px;border-left:1px solid var(--border-strong);min-width:52px;}',
   '.tb-i{padding:5px 9px 6px;border-left:1px solid var(--border-strong);min-width:72px;}'],
  ['.tb-k{display:block;font-family:var(--latin);font-size:8.5px;font-weight:700;line-height:1.5;\n  text-transform:uppercase;letter-spacing:var(--track-overline);color:var(--fg-subtle);}',
   '.tb-k{display:block;font-family:var(--latin);font-size:11px;font-weight:700;line-height:1.35;\n  text-transform:uppercase;letter-spacing:.12em;color:var(--fg-subtle);}'],
  ['.pnl-head .t{font-family:var(--latin);font-size:10.5px;', '.pnl-head .t{font-family:var(--latin);font-size:11px;'],
  ['.barLbl{display:flex;align-items:center;gap:6px;font-family:var(--latin);font-size:10px;',
   '.barLbl{display:flex;align-items:center;gap:6px;font-family:var(--latin);font-size:11px;'],
  ['.chip i{width:13px;text-align:center;color:var(--fg-subtle);font-size:10.5px;}',
   '.chip i{width:13px;text-align:center;color:var(--fg-subtle);font-size:11px;}'],
  ['#help .hico{color:var(--fg-subtle);font-size:10px;margin-right:4px;}',
   '#help .hico{color:var(--fg-subtle);font-size:11px;margin-right:4px;}'],
  ['#fpsTxt{position:absolute;left:14px;top:2px;font-size:10.5px;line-height:12px;letter-spacing:.1em;',
   '#fpsTxt{position:absolute;left:14px;top:2px;font-size:11px;line-height:12px;letter-spacing:.06em;'],
  ['.card h2{margin:0 0 13px;font-family:var(--latin);font-size:10.5px;',
   '.card h2{margin:0 0 13px;font-family:var(--latin);font-size:11px;'],
  ['.diffBtn small{font-size:10px;font-weight:400;color:var(--fg-subtle);letter-spacing:0;}',
   '.diffBtn small{font-size:11px;font-weight:400;color:var(--fg-subtle);letter-spacing:0;}'],
  ['#endStats div,.statGrid div{position:relative;font-size:10.5px;', '#endStats div,.statGrid div{position:relative;font-size:11px;'],
  ['.setRow>span:first-child{font-family:var(--latin);font-size:10.5px;', '.setRow>span:first-child{font-family:var(--latin);font-size:11px;'],
  ['.setHint{display:flex;align-items:flex-start;justify-content:center;gap:7px;font-size:10.5px;',
   '.setHint{display:flex;align-items:flex-start;justify-content:center;gap:7px;font-size:11px;'],
  // 4. 侧边/顶部粗条 3px -> 2px
  ['border-top:3px solid var(--red);', 'border-top:2px solid var(--red);'],
  ['border-top:3px solid var(--border-strong);', 'border-top:2px solid var(--border-strong);'],
  ['border-left:3px solid var(--red);', 'border-left:2px solid var(--red);'],
  // 5. 阴影模糊半径压到 20px 以内
  ['box-shadow:0 6px 26px rgba(2,10,18,.5);', 'box-shadow:0 2px 10px rgba(0,0,0,.5);'],
  ['box-shadow:0 20px 60px rgba(2,8,16,.7);', 'box-shadow:0 10px 30px rgba(0,0,0,.6);'],
  // 2. 硬编码深色前景 -> var(--ink)
  ['color:#06202f', 'color:var(--ink)'],
  ['color:#04141f', 'color:var(--ink)'],
  ['border-right:2px solid #06202f;border-bottom:2px solid #06202f;', 'border-right:2px solid var(--ink);border-bottom:2px solid var(--ink);'],
  ['.diffBtn.sel i,.diffBtn.sel small{color:rgba(6,32,47,.68);}', '.diffBtn.sel i,.diffBtn.sel small{color:var(--ink);opacity:.72;}'],
];
for (const [a, b] of pairs) {
  if (css.indexOf(a) < 0) { console.error('MISS: ' + JSON.stringify(a.slice(0, 70))); process.exitCode = 1; continue; }
  css = css.split(a).join(b);
}
// 7. 拉丁副标题压到 <=26 字符
const h2a = '<h2>Street Siege — Endless Wave Defense</h2>';
const h2b = '<h2>Street Siege · Wave Def</h2>';
if (body.indexOf(h2a) < 0) { console.error('MISS: h2 subtitle'); process.exitCode = 1; } else body = body.split(h2a).join(h2b);
fs.writeFileSync(stylePath, css);
fs.writeFileSync(bodyPath, body);
const left = css.match(/(?:#06202f|#04141f|#00131a|#111\b)/g);
console.log('remaining hardcoded dark fg:', left ? [...new Set(left)] : 'none');
console.log('remaining 3px bars:', (css.match(/border-(?:top|left|right|bottom):3px/g) || []).length);
console.log('subtitle len:', 'Street Siege · Wave Def'.length);
