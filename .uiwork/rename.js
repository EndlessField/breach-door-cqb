// 改名: 《破门而入 · 户型图红蓝对抗》 → 《交火》 / CROSSFIRE
// 只改"显示用"字面量。刻意不动: game/breach.html 文件名、breach_game_* 存档 key、
// backup.app='breach-door-cqb'(均被测试断言)、以及"《破门而入》风格"这类致敬性题材引用。
const fs = require('fs');
const ROOT = 'W:/AI Code DSH/';

function patch(file, rules) {
  let s = fs.readFileSync(ROOT + file, 'utf8');
  for (const [from, to, count] of rules) {
    const want = count == null ? 1 : count;
    const n = s.split(from).length - 1;
    if (n !== want) throw new Error(`${file}: expected ${want} of ${JSON.stringify(from.slice(0, 60))}, found ${n}`);
    s = s.split(from).join(to);
  }
  fs.writeFileSync(ROOT + file, s);
  console.log('renamed in ' + file);
}

patch('index.html', [
  ['<title>破门而入 · 主页</title>', '<title>交火 · 主页</title>'],
  ['   破门而入 · 主页 —— 「突入作业图', '   交火 · 主页 —— 「突入作业图'],
  ['<h1>破门而入<span> · </span>户型图红蓝对抗</h1>', '<h1>交火<span> · </span>户型图红蓝对抗</h1>'],
  ['<div class="hen">Floor-Plan CQB Simulation</div>', '<div class="hen">Crossfire · Floor-Plan CQB</div>'],
  ['<span><b>破门而入 · 户型图红蓝对抗</b>', '<span><b>交火 · 户型图红蓝对抗</b>'],
  ['   破门而入 · 主页(单文件, 纯本地运行, 零网络依赖)', '   交火 · 主页(单文件, 纯本地运行, 零网络依赖)'],
  ["const name = '破门而入存档_档案'", "const name = '交火存档_档案'"],
  ['<p>本作是《破门而入》风格的室内战术射击：', '<p>《交火》是一款《破门而入》风格的室内战术射击：'],
]);

patch('game/hub.html', [
  ['<title>破门而入 · 战前准备与升级</title>', '<title>交火 · 整备大厅</title>'],
  ['   破门而入 · 整备大厅 —— 「突入作业图', '   交火 · 整备大厅 —— 「突入作业图'],
  ['<h1>整备大厅<span> · </span>战前准备</h1>', '<h1>交火<span> · </span>整备大厅</h1>'],
  ['<div class="hen">Loadout Hall · 整备作业图</div>', '<div class="hen">Crossfire · Loadout Hall</div>'],
  ['   破门而入 · 战前准备与升级页(单文件, 纯本地运行, 零网络依赖)', '   交火 · 整备大厅(单文件, 纯本地运行, 零网络依赖)'],
  ["const name = '破门而入存档_'", "const name = '交火存档_'"],
]);

patch('game/breach.html', [
  ['<title>破门而入 · 户型图红蓝对抗</title>', '<title>交火 · 户型图红蓝对抗</title>'],
  ['   破门而入 · 战斗页 UI —— 「突入作业图', '   交火 · 战斗页 UI —— 「突入作业图'],
  ['<h1><i class="fas fa-bullseye"></i>破门而入 · 户型图红蓝对抗</h1>',
   '<h1><i class="fas fa-bullseye"></i>交火 · 户型图红蓝对抗</h1>'],
  ['<h2>Breach &amp; Clear · Indoor Tactical Shooting</h2>', '<h2>Crossfire · Indoor Tactical Shooting</h2>'],
  ['   破门而入 · 户型图红蓝对抗 —— 主游戏页(单文件, 纯本地运行, 零网络依赖)',
   '   交火 · 户型图红蓝对抗 —— 主游戏页(单文件, 纯本地运行, 零网络依赖)'],
]);

patch('game/street.html', [
  ['<title>丧尸围城 · 长街尸潮（独立玩法）</title>', '<title>交火 · 长街尸潮（独立玩法）</title>'],
  ['<h2>Street Siege · Wave Def</h2>', '<h2>Crossfire · Street Siege</h2>'],
  ['【定位】破门而入的独立衍生玩法:', '【定位】《交火》主游戏的独立衍生玩法:'],
]);

patch('AI_README.md', [
  ['# 破门而入 · 户型图红蓝对抗', '# 交火 · 户型图红蓝对抗'],
  ['《破门而入》风格的室内战术射击小游戏。', '《交火》是一款《破门而入》风格的室内战术射击小游戏。'],
  ['破门而入存档_时间戳.json', '交火存档_时间戳.json'],
]);

patch('DESIGN.md', [
  ['# 破门而入 · 设计系统', '# 交火 · 设计系统'],
]);
