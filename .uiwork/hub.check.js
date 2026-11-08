// 结构自检: 打印 hub.html 的关键行号与标记统计
const fs = require('fs');
const p = 'W:/AI Code DSH/game/hub.html';
const raw = fs.readFileSync(p, 'utf8');
const L = raw.split(/\r?\n/);
const re = /<style>|<\/style>|<body>|<noscript>|<script>|<\/script>|<\/main>|<\/head>|<\/html>|id="toast"/;
L.forEach((l, i) => { if (re.test(l)) console.log((i + 1) + '  ' + l.trim().slice(0, 96)); });
console.log('total lines ' + L.length);
console.log('section markers ' + (raw.match(/^\s*\/\/ -{6,}\s*(.+?)\s*-{6,}\s*$/gm) || []).length);
console.log('script blocks ' + (raw.match(/<script/g) || []).length + ', style blocks ' + (raw.match(/<style/g) || []).length);
console.log('map-preview begin/end ' + raw.indexOf('// <map-preview-data:auto>') + ' / ' + raw.indexOf('// </map-preview-data:auto>'));
const ids = ['toast','pts','btnHome','mapPrev','slotBtns','stWins','stLosses','stKills','stStars','stDmg','stPts','stRank','btnRankUp','rankInfo','stAcc','stShots','stLong','stStreak','stGKills','stTime','stWinStreak','stStreet','stBosses','achCount','achFilter','achList','btnWAr','btnWSmg','btnWShotgun','btnWSniper','btnWLmg','btnWDmr','weaponInfo','diffEasy','diffNorm','diffHard','btnMapHouse','btnMapWarehouse','btnMapFactory','btnMapOffice','btnMapParking','upgradeList','dlToday','dailyList','btnGo','btnGame','btnStreet','btnExport','btnImport','btnReset','importFile'];
const missing = ids.filter(x => raw.indexOf('id="' + x + '"') < 0);
console.log('missing ids (' + missing.length + '): ' + JSON.stringify(missing));
console.log('canvas attrs: ' + (raw.match(/<canvas[^>]*mapPrev[^>]*>/) || [''])[0]);
