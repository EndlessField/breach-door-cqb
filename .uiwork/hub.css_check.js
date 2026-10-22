// CSS 契约自检: JS 注入/写入的所有类名与 JS 行内引用的自定义属性必须在 <style> 里有定义
const fs = require('fs');
const raw = fs.readFileSync('W:/AI Code DSH/game/hub.html', 'utf8');
const css = raw.slice(raw.indexOf('<style>'), raw.indexOf('</style>'));
const want = ['toast', 'show', 'weaponInfo', 'mono', 'achFilterRow', 'fbtn', 'sel', 'achRow', 'ac', 'ai', 'an',
  'ad', 'aSt', 'dlRow', 'none', 'dlD', 'dlT', 'slotBtn', 'upRow', 'upIcon', 'upInfo', 'nm', 'ds', 'pips',
  'off', 'upBtn', 'maxed', 'note-i', 'rankInfo', 'rankBtn', 'hidden', 'wbtn', 'wn', 'wi', 'diffBtn', 'dn',
  'upgradeList', 'achList', 'achCount', 'slotBtns', 'dlToday', 'dailyList', 'weaponRow', 'diffRow', 'spread',
  'actions', 'note', 'ico', 'bx', 'btn-block', 'btn-primary', 'btn-accent', 'btn-danger', 'btn-ghost', 'btn-sm',
  'sheet', 'sheet-head', 'sheet-body', 'tb', 'tick', 'tb-i', 'tb-k', 'tb-v', 'xo'];
const missing = want.filter(c => c !== 'xo' && css.indexOf('.' + c) < 0 && css.indexOf('#' + c) < 0);
console.log('CSS missing selectors: ' + JSON.stringify(missing));
const vars = ['--border-strong', '--fg-subtle', '--yellow', '--accent', '--red-2', '--gold', '--txt', '--muted', '--dim', '--panel-top', '--line', '--chip', '--chip-line', '--blue', '--cyan', '--panel-sat', '--ink'];
const missingVars = vars.filter(v => css.indexOf(v + ':') < 0);
console.log('CSS missing vars: ' + JSON.stringify(missingVars));
// 静态标记里的 role / aria
const markup = raw.slice(raw.indexOf('<body>'), raw.indexOf('<script>'));
const roles = [...markup.matchAll(/role="[^"]*"|aria-[a-z]+="[^"]*"/g)].map(m => m[0]);
console.log('role/aria in markup: ' + JSON.stringify(roles));
console.log('noscript verbatim: ' + (markup.indexOf('整备大厅需要启用 JavaScript 才能运行（纯本地，无需联网）。') >= 0));
console.log('daily <b> star structure in JS: ' + (raw.indexOf("'<b>' + '★'.repeat") >= 0 || raw.indexOf("'</span><b>'") >= 0));
console.log('setWeapon JS assignments: ' + (raw.match(/setWeapon\('(ar|smg|shotgun|sniper|lmg|dmr)'\)/g) || []).length);
console.log('section markers: ' + (raw.match(/^\s*\/\/ -{6,}\s*(.+?)\s*-{6,}\s*$/gm) || []).length);
