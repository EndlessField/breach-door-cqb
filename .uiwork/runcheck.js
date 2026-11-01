// 从 .uiwork/UI_CONSTRAINTS.md §7.5 抽出官方自检脚本并运行（避免手抄出错）
const fs = require('fs');
const os = require('os');
const path = require('path');
const md = fs.readFileSync('W:/AI Code DSH/.uiwork/UI_CONSTRAINTS.md', 'utf8');
const i = md.indexOf('// ui_check.js');
const j = md.indexOf('```', i);
if (i < 0 || j < 0) { console.error('cannot locate self-check script'); process.exit(2); }
const js = md.slice(i, j);
const out = path.join(os.tmpdir(), 'ui_check.js');
fs.writeFileSync(out, js);
require(out);
