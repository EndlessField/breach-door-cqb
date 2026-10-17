// 霰弹枪: 每发 6 颗弹丸验证
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const code = fs.readFileSync(path.join(__dirname, '..', 'game', 'breach.html'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function makeCtx() {
  const t = {
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  return new Proxy(t, { get(ta, p) { if (!(p in ta)) ta[p] = () => {}; return ta[p]; }, set(ta, p, v) { ta[p] = v; return true; } });
}
function makeEl() {
  const ls = {};
  return {
    style: {}, classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(ev, fn) { (ls[ev] = ls[ev] || []).push(fn); },
    _fire(ev, obj) { for (const fn of ls[ev] || []) fn(obj); },
    appendChild() {}, className: '', disabled: false,
    textContent: '', innerHTML: '', width: 0, height: 0,
    getContext: () => makeCtx(), onclick: null
  };
}
const els = {}; let rafCb = null; const listeners = {};
const store = {};
const sb = {
  console, performance: { now: () => Date.now() },
  requestAnimationFrame: (fn) => { rafCb = fn; return 1; },
  // 预设配置: 霰弹枪(必须在 vm 创建前注入, 游戏内 typeof localStorage 判定)
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  window: { innerWidth: 1280, innerHeight: 800, addEventListener: (ev, fn) => { (listeners['window:' + ev] = listeners['window:' + ev] || []).push(fn); }, AudioContext: undefined, webkitAudioContext: undefined },
  document: {
    getElementById: (id) => els[id] || (els[id] = makeEl()),
    createElement: () => makeEl(),
    addEventListener: (ev, fn) => { (listeners['doc:' + ev] = listeners['doc:' + ev] || []).push(fn); }
  },
  location: { href: '' }, setTimeout, clearTimeout
};
store['breach_game_cfg'] = JSON.stringify({ diff: 'norm', weapon: 'shotgun', upgrades: {} });
sb.globalThis = sb; sb.window.window = sb.window;
vm.runInNewContext(code, sb);

function aimAt(wx, wy) { const z = 1280 / 2400 * 0.96, camx = 1200, camy = 500; els['cv']._fire('mousemove', { clientX: (wx - camx) * z + 640, clientY: (wy - camy) * z + 400 }); }
els['btnStart'].onclick();
const G = sb.window.__game;
const p = G.player;
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('ok: ' + msg); } else { fail++; console.log('FAIL: ' + msg); } }

ok(p.weapon.magSize === 6 && p.weapon.mag === 6, '霰弹枪弹匣 6');
ok(G.weaponName === '霰弹枪', '配置读取为霰弹枪');
ok(p.weapon.pellets === 6, 'pellets=6');

// 靶子: 高血蓝机放在玩家面前 60px(无家具的过道), 玩家开一枪
const target = G.units.find(u => u.team === 'blue');
target.x = p.x + 60; target.y = p.y;
target.hp = 9999; target.maxHp = 9999;
target.train = true;   // 固定为训练靶: 无 AI 完全静止, 否则交战中移动会让弹丸偶发落空
aimAt(target.x, target.y);
els['cv']._fire('mousedown', { button: 0 });
let t = performance.now();
let peakPellets = 0, peakAngs = null;
const hp0 = target.hp;
for (let f = 0; f < 60; f++) {
  t += 16; rafCb(t);
  const mine = G.bullets.filter(b => b.owner === p);
  if (mine.length > peakPellets) {
    peakPellets = mine.length;
    peakAngs = mine.map(b => Math.atan2(b.y - p.y, b.x - p.x)).sort((a, b) => a - b);
  }
}
els['cv']._fire('mouseup', { button: 0 });

ok(peakPellets === 6, '一枪生成 6 颗弹丸 (峰值 ' + peakPellets + ')');
if (peakAngs && peakAngs.length === 6) {
  const span = peakAngs[peakAngs.length - 1] - peakAngs[0];
  ok(span > 0.05 && span < 0.2, '弹丸扇形展开合理 (' + span.toFixed(3) + ' rad)');
} else ok(false, '扇形检查需 6 颗弹丸');
ok(p.weapon.mag === 5, '一枪消耗 1 发弹药 (剩余 ' + p.weapon.mag + ')');
const dmgTaken = hp0 - target.hp;
ok(dmgTaken >= 30, '贴脸命中伤害充足 (' + dmgTaken + ' ≥ 30, 6×9=54 全中)');

// 弹丸全部消失(飞行 1.1s 内)
for (let f = 0; f < 120 && G.bullets.filter(b => b.owner === p).length > 0; f++) { t += 16; rafCb(t); }
ok(G.bullets.filter(b => b.owner === p).length === 0, '弹丸飞行结束全部消失');

console.log(pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
