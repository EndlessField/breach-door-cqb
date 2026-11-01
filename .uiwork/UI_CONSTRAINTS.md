# UI 重写约束报告 / UI Rewrite Constraint Report

> 目标：在**完全重写** `index.html` / `game/hub.html` / `game/breach.html` / `game/street.html`
> 四个页面的 `<style>` 与静态 HTML 标记、**不改 JS** 的前提下，保证 `tests/` 全部 22 个断言脚本不失败。
>
> 本报告由逐行阅读 `W:\AI Code DSH\tests\` 全部 `*_test.js` / `*_probe.js` / `map_render.js` 得出。
> 基线：`node tests/run_all.js` → **22/22 通过, 0 失败, 168.9s**（本报告编写前实测）。
>
> 图例：
> - 🔴 **HARD** —— 测试**直接**断言，改了就红。
> - 🟠 **SOFT/FUNC** —— 测试**不会**抓到（DOM 桩会自动造元素），但真实浏览器里会坏 / 视觉会坏 / 语义会丢。**必须照做**。
> - 🟢 **FREE** —— 无任何测试或 JS 依赖，可自由改。

## ⚠️ 版本快照 / Version snapshot（务必先读）

分析期间**页面正在被重写**，本报告的行号对应下列快照：

| 页面 | 文件大小 | 最后修改 | 报告行号所依据的版本 |
|---|---|---|---|
| `index.html` | 73,199 B | **2026/10/4 15:25:57** | ✅ **已是重写后的新版本**（§2 行号已按新版本校正） |
| `game/hub.html` | 84,395 B | 2026/10/4 11:37:43 | 原版 |
| `game/breach.html` | 276,899 B | 2026/10/4 11:25:22 | 原版 |
| `game/street.html` | 142,388 B | 2026/10/4 11:25:12 | 原版 |

- `index.html` 在本次分析过程中被改动（15:25:57），所有 index 相关行号**已用 Node 重新校准**。
- **新 `index.html` 已通过全部硬约束**（实测）：`<script>`=1、`<style>`=1、`<meta charset="UTF-8">` 在第 4 行、
  `<link>` 仅 2 个且均在白名单内（`.css`×1、`.ico`×1）、`url(`=0、`@import`=0、`font-face`=0、
  `http(s)://`=0、协议相对 `//`=0、emoji 残留=0、7 个 `// ------ 章节 ------`、地图预览块在第 866 行、
  JS 要的 19 个 id 全部在标记里、`slotBtn1..3` 与 `mapTab*` 全部存在。
  且 `node tests/run_all.js` 在这一新版本上跑出 **22/22 通过**。
- 其余三页若随后也被重写，行号同样会漂移 —— **以 id 字符串 / 类名字符串 / 正则为准，行号只作定位线索**。

> 📐 **行号口径**：本报告行号 = `fs.readFileSync(p,'utf8').split('\n')` 的下标 +1，
> 与编辑器、`read` 工具一致（也与测试读文件的方式一致）。
> ⚠️ PowerShell 的 `Get-Content` / `Select-String` 在本项目的
> `breach.html` / `hub.html` / `street.html` 上**会报出偏小的行号**
> （这些文件头部注释里含特殊控制字符；实测 `breach.html` 的 `#cv{` 在编辑器里是第 63 行，
> 而 `Select-String` 报第 58 行）。**校验行号请用编辑器或 Node，不要用 PowerShell。**

---

## 0. 最重要的一个认知 / The single most important fact

**测试里的 DOM 是全自动桩**。每个测试沙箱都是：

```js
document: { getElementById: (id) => els[id] || (els[id] = makeEl()), ... }
```

（`hub_test.js:37`、`tutorial_test.js:37`、`meta_test.js:37`、`protocol_test.js:47`、`render_test.js:119`、
`street_test.js:44`、`smoke_test.js:42`、`perf_test.js:57`、其余同构）

**含义：测试里 `document.getElementById('任意字符串')` 永远返回一个可用的假元素。**
所以 —— 把 `<div id="stWins">` 改名成 `<div id="stWinsNew">`，**测试依然全绿**，但真实页面会静默失效。

因此约束分两层，两层都必须满足：

| 层 | 由谁保证 | 内容 |
|---|---|---|
| **A 层：源码正则层** | 🔴 测试直接失败 | `offline_test.js` / `doc_test.js` / `preview_test.js` / `meta_test.js` 对**原始文件文本**做正则或子串匹配 |
| **B 层：真实 DOM 契约层** | 🟠 测试抓不到，浏览器抓得到 | 页面 JS 里 `getElementById()` 用到的全部 id、JS `classList`/`className` 写入的全部类名、canvas 的 `width/height` 属性 |

**A 层漏一个 → 门禁红。B 层漏一个 → 门禁绿但游戏/页面坏。** 本报告两层都覆盖。

---

# 1. 共享约束 / SHARED（四页都适用）

## 1.1 🔴 脚本块提取契约（最高危 / HIGHEST RISK）

所有脚本型测试都用这**同一行**拿游戏代码：

```js
const h = fs.readFileSync(page, 'utf8');
h.match(/<script>([\s\S]*?)<\/script>/)[1]     // ← 取【第一个】 <script> 块
```

出现位置（全部同类）：

| 文件 | 行 |
|---|---|
| `tests/hub_test.js` | 7–8 |
| `tests/tutorial_test.js` | 7–8 |
| `tests/meta_test.js` | 7–8 |
| `tests/protocol_test.js` | 15–16 |
| `tests/preview_test.js` | 10 |
| `tests/render_test.js` | 19 |
| `tests/smoke_test.js` | 5–6 |
| `tests/street_test.js` | 5–6 |
| `tests/combat_test.js` | 5–6 |
| `tests/feature_test.js` | 5–6 |
| `tests/cover_test.js` | 8 |
| `tests/maps_test.js` | 5 |
| `tests/newfeatures_test.js` | 5 |
| `tests/path_test.js` | 5–6 |
| `tests/fire_acc_test.js` | 5 |
| `tests/shotgun_test.js` | 5 |
| `tests/squad_test.js` | 5 |
| `tests/wall_test.js` | 5 |
| `tests/perf_test.js` | 5 |
| `tests/input_state_test.js` | 5 |
| `tests/fog_probe.js` | 13 |
| `tests/map_probe.js` | 6 |
| `tests/map_render.js` | 20 |
| `tests/offline_test.js` | 57（只断言存在性） |

**由此派生 4 条硬约束：**

1. 🔴 **每页只能有 1 个 `<script>` 块，且它必须是第一个。**
   当前实测：`index.html` script=1、`hub.html` script=1、`breach.html` script=1、`street.html` script=1。
   在它前面插入任何 `<script>`（哪怕是空的、哪怕是 JSON-LD）→ 所有测试去跑那段空代码 → 大面积炸。
2. 🔴 **开标签必须是裸 `<script>`，不能带任何属性。**
   正则里是字面 `<script>`。`<script type="module">` / `<script defer>` / `<script nomodule>` / `<script id="x">`
   都会让 `match()` 返回 `null` → `[1]` 抛 `TypeError`。
3. 🔴 **主脚本内部不能出现字面 `</script>`**（例如写在字符串/注释里）—— 非贪婪匹配会在此截断。
4. 🔴 **`<style>` 可以随意重写**，但**不要**把 CSS 挪进 `<script>`（`<script>` 里写 CSS 会让 JS 语法错误）。

## 1.2 🔴 `offline_test.js` 全量判定逻辑（四页逐字节扫描）

`tests/offline_test.js:5` 的 `FILES`：

```js
const FILES = ['index.html', 'game/hub.html', 'game/breach.html', 'game/street.html'];
```

对**每个文件的完整原始文本** `h` 执行下列断言（`h` 含 `<style>`、注释、JS 字符串 —— 全都在扫描范围内）：

### 1.2.1 网络/外链禁用模式（`offline_test.js:22-38`）

```js
const netPatterns = [
  ['http(s)://',      /https?:\/\//],
  ['协议相对 //',      /(?<!:)\/\/[a-zA-Z0-9.-]/],
  ['@import',         /@import/],
  ['url(...)',        /url\(/],
  ['fetch(',          /fetch\(/],
  ['XMLHttpRequest',  /XMLHttpRequest/],
  ['WebSocket',       /WebSocket/],
  ['<script src=',    /<script[^>]+src=/],
  ['<iframe',         /<iframe/],
  ['<img src=',       /<img[^>]+src=/],
  ['importScripts',   /importScripts/],
  ['Web 字体引用',     /font-face/],
];
for (const [name, re] of netPatterns) assert(!re.test(h), '无 ' + name + ' 引用');
```

**逐条解读成"改 UI 时的禁令"：**

| # | 正则 | 禁令（写 CSS 时必须避免的东西） |
|---|---|---|
| 1 | `https?:\/\/` | 任何 `http://` / `https://` 字样，**包括 HTML 注释、CSS 注释、JS 注释里的举例 URL** |
| 2 | `(?<!:)\/\/[a-zA-Z0-9.-]` | **最阴的一条**：任何 `//` 后面紧跟 ASCII 字母/数字/`.`/`-` 且前面不是 `:` 的地方。**JS/CSS 注释必须写成 `// 说明`（带空格）或 `//中文`**；`//-foo`、`//36 hits`、`//TODO` 都会红。CSS 里 `//` 不是合法语法但写在注释文本里也算 |
| 3 | `@import` | 任何位置的 `@import`（含注释里提到） |
| 4 | `url\(` | **任何 `url(`**。⇢ 不能有 `background-image:url(...)`、`filter:url(...)`、`mask-image:url(...)`、`cursor:url(...)`、`@font-face` 的 `src:url(...)`、data-URI 背景、`content:url(...)`。装饰必须**纯 CSS 渐变 + 伪元素**（与 `AI_README.md:85` 一致） |
| 5 | `fetch\(` | 任何 `fetch(` |
| 6 | `XMLHttpRequest` | 同上 |
| 7 | `WebSocket` | 同上 |
| 8 | `<script[^>]+src=` | 不许任何外链脚本 |
| 9 | `<iframe` | 不许任何 `<iframe`（含被注释掉的） |
| 10 | `<img[^>]+src=` | 不许任何带 `src` 的 `<img>`。**视觉层不得使用任何位图**；图标只能走本地 FontAwesome（`<i class="fas fa-xxx">`） |
| 11 | `importScripts` | 同上 |
| 12 | `font-face` | 任何位置出现 `font-face` 子串（`@font-face` / 注释 / 类名里都算） |

### 1.2.2 `<link href>` 白名单（`offline_test.js:39-46`）

```js
const links = [...h.matchAll(/<link[^>]+href=["']([^"']*)["']/g)].map(m => m[1]).filter(x => x);
const cssLinks  = links.filter(l => /\.css$/i.test(l));
const iconLinks = links.filter(l => /\.ico$/i.test(l));
assert(links.every(l => /^(?:\.\.\/)?(?:fontawesome-free-[^\/]+\/css\/all\.min\.css|photo\.ico)$/.test(l)),
       '仅允许本地 fontawesome 样式表与 photo.ico: ' + JSON.stringify(links));
assert(cssLinks.length === 1,  '恰好引入一个本地样式表 (css=' + cssLinks.length + ')');
assert(iconLinks.length <= 1,  '图标声明至多 1 个 (icons=' + iconLinks.length + ')');
```

**含义（每一条都是 🔴 硬约束）：**

- 四页每一页里，**所有** `<link ... href="...">` 的 href 必须**逐字符**匹配
  `^(?:\.\.\/)?(?:fontawesome-free-[^\/]+\/css\/all\.min\.css|photo\.ico)$`
  → 只允许「一个 FontAwesome 样式表」+「一个 `photo.ico`」，**多一个都不行**。
- 🔴 **不得新增** `<link rel="preconnect">` / `rel="preload"` / `rel="manifest"` / `rel="apple-touch-icon"` /
  `<link rel="icon" sizes=...>` / **内联 `<style>` 之外的任何第二个样式表**。
- 🔴 `.css` 链接**恰好 1 个**。
- 🔴 `.ico` 链接**至多 1 个**。
- 🔴 目录名必须仍是 `fontawesome-free-<某段不含 / 的名字>`（磁盘实测存在：`W:\AI Code DSH\fontawesome-free-7.3.1-web`）。
- 当前四页的实际值（必须原样保留）：
  - `index.html:7` → `fontawesome-free-7.3.1-web/css/all.min.css`
  - `index.html:8` → `photo.ico`
  - `game/hub.html:7,8` / `game/breach.html:7,8` / `game/street.html:7,8` → `../fontawesome-free-7.3.1-web/css/all.min.css`、`../photo.ico`
- 注意 `[^>]+` 要求 `<link` 与 `href` 之间**至少 1 个字符**（通常就是空格）—— `<linkhref=...>` 不会被匹配到（也不会因此失败，但别这么写）。

### 1.2.3 跳转文件名（`offline_test.js:47-49`）

```js
const jumps = [...h.matchAll(/href\s*=\s*'([^']*\.html[^']*)'/g)].map(m => m[1]);
assert(jumps.every(j => !/^[a-z]+:/i.test(j) && !j.startsWith('//')), '本地相对跳转: ' + JSON.stringify(jumps));
```

- 只扫**单引号**的 `href='...html...'`（实际命中的是 JS 里的 `location.href='xxx.html'`）。
- 必须是相对路径，不能带协议头、不能以 `//` 开头。
- 🟠 建议：**跳转字符串继续用单引号**，这样这条断言仍然**真的在保护你**；如果改成双引号，这条会变成空集（静默失去保护，但不报错）。

### 1.2.4 编码与结构（`offline_test.js:55-57`）

```js
assert(/<meta charset="UTF-8">/.test(h), 'UTF-8 声明存在');       // 必须逐字符
assert(/<script>([\s\S]*?)<\/script>/.test(h), '脚本完整');
```

- 🔴 `<meta charset="UTF-8">` 必须**逐字符**出现（当前四页都在第 4 行）。
  **不能**改成 `<meta charset="utf-8">`、不能加属性、不能改成 `<meta http-equiv=...>`。

## 1.3 🔴 Emoji / Unicode 符号白名单（`offline_test.js:8-9, 51-53`）

```js
// 允许保留的基础 Unicode 符号(所有系统字体均包含, 非 emoji 依赖)
const ALLOWED = new Set(['★','☆','●','○','■','□','◆','▲','►','▶','→','×','·','｜','↔','—','…','—','✔']);
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2764}]/gu;
...
const emoji = [...h.matchAll(EMOJI_RE)].map(m => m[0]).filter(c => !ALLOWED.has(c));
assert(emoji.length === 0, '无 emoji 字体依赖 (残留: ' + JSON.stringify([...new Set(emoji)])));
```

**禁用码点区间（四页任何位置，含 CSS `content:"..."`、HTML 文本、JS 字符串）：**

| 区间 | 内容 | 例子 |
|---|---|---|
| `U+1F000–U+1FAFF` | Emoji / 绘文字 / 补充符号 | 🎯 🔒 🀀 🧱 |
| `U+2600–U+27BF` | Misc Symbols + Dingbats | ✓(2713) ✔(2714) ✗(2717) ✕(2715) ⚠(26A0) ⚡(26A1) ☐(2610) ☑(2611) ♠♣♥♦(2660/63/65/66) ➡(27A1) ✅ ❤(2764) |
| `U+2B00–U+2BFF` | Misc Symbols and Arrows | ⬅ ⬆ ⬇ ⬛ ⬜ ⭐ |
| `U+FE0F` | Variation Selector-16 | 任何 `…️`（如 `✔️` `⚠️`） |
| `U+2764` | Heavy Black Heart | ❤ |

**白名单（唯一可从上面区间使用的 18 个符号）**：
`★ ☆ ● ○ ■ □ ◆ ▲ ► ▶ → × · ｜ ↔ — … ✔`

**反直觉但重要的两条：**
- `★`(2605) / `☆`(2606) / `✔`(2714) **在白名单里**，可以用；但 `✓`(2713) / `✗`(2717) **不在**，**禁用**。
  要打勾请**只用 `✔`，且绝不能带 `U+FE0F`**。
- **安全区（不在上述任何禁用区间内，正则不会命中）**：
  `U+2190–U+2193`（← ↑ → ↓）、`U+25A0–U+25FF`（几何图形整块：▲▼◀▶■□●○◆◇◈▪▫ 等）、
  `U+2000–U+206F`（— – … · 等标点）、`U+00D7 ×`、`U+00B7 ·`、`U+FF00–U+FFEF`（全角，如 `｜`）。
  → **新符号优先从这些区里挑**（例：`▶ / ◀ / ▼ / ◈ / ▪ / ⇢` 需自查 `⇢`=21E2 安全）。
- 四页现有的 `★ ☆ ● ○ × · ｜ — … ✔` 全部合规；`hub.html:1162` 的 `●`/`○` 与 `hub.html:1090` 的 `★` 都安全。

## 1.4 🔴 章节标记与文件头 TOC（`doc_test.js`）

`doc_test.js:16-18` 只校验 **`game/breach.html`** 一个文件：

```js
const PAGES = [ ['game/breach.html', '【目录 TABLE OF CONTENTS】', '============================================================================ */'] ];
const SECTION_RE = /^\s*\/\/ -{6,}\s*(.+?)\s*-{6,}\s*$/gm;
```

**断言链（逐条）：**

| 行 | 断言 | 现状 |
|---|---|---|
| 29 | `raw.indexOf('【目录 TABLE OF CONTENTS】') >= 0` | 存在（`breach.html:493`） |
| 30 | `raw.indexOf('====……==== */', i0)` —— 结束标记 = **76 个 `=` + 空格 + `*/`** | 存在（`breach.html:543`） |
| 32 | TOC 块非空 | ok |
| 43 | `sections.length >= 40` —— `// ------ 名称 ------` 标记数 | **47** |
| 44 | TOC 覆盖全部章节名（含中文名逐字一致） | ok |
| 45 | TOC 顺序与代码顺序一致 | ok |
| 58 | TOC 可解析出 `>= 40` 条章节名 | **47** |
| 60 | TOC 无已失效条目 | ok |
| 62 | **目录条数 === 实际章节数** | 47 vs 47 |

**TOC 行格式必须匹配** `doc_test.js:52`：
```js
const mm = t.match(/^\d+\s+(.+?)(?:\s*\.{3,}.*)?$/);
```
即 `  12  章节名 .......... 1397` 或 `  12  章节名 ............`；
名字中含 `【` 的行会被跳过（`doc_test.js:55`）。

**⚠️ 对"重写 `<style>`"的直接后果（这条最容易被忽略）：**
1. 🔴 `breach.html` 的 JS 文件头注释块（当前 `breach.html:480–543`，含 `【目录 TABLE OF CONTENTS】` … 76×`=` + ` */`）
   **必须原样保留**，包括每一条 `  序号  章节名 .......  行号` 与那 47 个 `// ---------- 章节名 ----------`。
   注意：**行号数字可以漂移**（`doc_test.js:494` 的注释明确说明只校验"包含 + 顺序 + 条数"），
   但**章节名与条数不能变**。
2. 🔴 **不要在 TOC 起止之间插入任何新的 `76 个 = + 空格 + */` 行** ——
   `raw.indexOf(tocEnd, i0)` 会提前截断 TOC 块 → 条数对不上 → 失败。
   （当前 CSS 头部注释 `breach.html:18` 也是 76 个 `=`，但它在 `i0` 之前，安全；
   若重写后把它挪到 TOC 之后，就会踩雷。）
3. 🔴 **不要新增/删除** `breach.html` 里的 `// ---------- xxx ----------` 行。
4. 🟠 另外三页（`index.html` 7 个、`hub.html` 7 个、`street.html` 33 个同类标记）**没有被任何测试校验**
   （`doc_test.js:16-18` 只列了 breach），但 `AI_README.md:90` 要求全部保留 —— 保留成本为零，建议照做。

## 1.5 🔴 地图预览自动数据块（`preview_test.js`）

`preview_test.js:94-101`：

```js
const BEGIN = '// <map-preview-data:auto>';
const END   = '// </map-preview-data:auto>';
const FILES = ['index.html', path.join('game', 'hub.html')];
...
const cur = extract(raw, rel);                 // 取 BEGIN..END（含两端标记）
if (cur === want) { ok } else { FAIL }          // want = 由 breach.html 地图数据重新生成
```

**约束：**
1. 🔴 `index.html` 与 `game/hub.html` 必须**同时**含 `// <map-preview-data:auto>` 与 `// </map-preview-data:auto>`。
2. 🔴 从 BEGIN 到 END（**含两端标记本身**）的整段文本必须与生成结果**逐字节相等**。
   → 段落里所有缩进（4 空格）、换行、`[x,y,w,h,'#rrggbb','名称']` 格式、`wrapEntries` 的 150 字符折行**都不能动**。
3. 🔴 **BEGIN 那一行的尾随注释也参与比较**（`preview_test.js:75`）：
   ```
   // <map-preview-data:auto> —— 由 node tests/preview_test.js --write 从 game/breach.html 构建器自动生成, 请勿手改:
   //   房间 / 墙体 / 掩体 / 出生点全部取自游戏内同一份地图数据, 改完地图重跑该命令即可同步预览。
   const PREVIEW_MAPS = {
   ```
   → 这两行注释的**一个字都不能改**（连 `——`、`,` 都是半/全角敏感）。
4. 🔴 该块内部键名固定：`name:` / `note:` / `rooms:` / `walls:` / `blocks:` / `spawns:`，地图键顺序
   `house, warehouse, factory, office, parking`（`preview_test.js:32`）。
5. 🟠 修好之后再改回：如果重写导致不一致，跑 `node tests/preview_test.js --write` 会用游戏数据**重写**这两页
   —— 但因为生成逻辑不含 UI，正常情况**不应该需要**。
6. ⚠️ 该数据块位于 `<script>` 内部（`index.html` / `hub.html` 的脚本）。**只改 `<style>` + body 标记不会碰到它。**

## 1.6 🔴 `meta_test.js` 对 `breach.html` 原始文本的子串断言

| `tests/meta_test.js` 行 | 断言 | 说明 |
|---|---|---|
| 85 | `raw.indexOf('蓝方5人') >= 0 && raw.indexOf('蓝方6人') >= 0` | 🔴 `breach.html` 必须**同时**含这两个串。当前在 `breach.html:381`(`蓝方5人`) 与 `breach.html:382`(`蓝方6人 · 更准更快`) |
| 86 | `raw.indexOf('蓝方7人') < 0 && raw.indexOf('蓝方8人') < 0` | 🔴 **禁止**出现 `蓝方7人` / `蓝方8人` 子串（旧文案） |

> ⚠️ 这两个串在 **difficulty 按钮的 `<small>` 文案**里。重写开局界面时，简单/标准/困难三档的
> `<small>` 必须至少让 `蓝方5人` 与 `蓝方6人` 出现在 `breach.html` 中（建议原样保留三档文案）。
> `hub.html:466/467` 也有同样文案，但 meta 只查 breach。

## 1.7 🔴 `meta_test.js` 对页面脚本形状的原始源码正则（H2–H5b 段）

这些断言把四页**当成文本**正则匹配（不是把标记），所以 **JS 不能被重排/改名/改格式**：

| `tests/meta_test.js` 行 | 正则 / 子串 | 涉及页面 |
|---|---|---|
| 278 | `h.indexOf('const ' + key + ' = [')` + `h.indexOf('\n];', i)`，`key ∈ {RANK_TITLES, UPGRADE_DEFS}` | 四页全部 |
| 280-281 | `RANK_TITLES` 去空白后四页**必须相等** | 四页 |
| 286-291 | `UPGRADE_DEFS` 条目正则 `/\{ id: '(\w+)',[^{}]*?max: (\d+)(?:, cost: \[([^\]]+)\])?[^{}]*?\}/g`，hub 与 breach **逐项相等**（含 `name`、数组顺序） | hub + breach |
| 302-303 | `hubRaw.match(/const MAP_KEYS = \[([^\]]+)\]/)`，须含全部 5 张图 id | hub |
| 304-311 | `brRaw.match(/const DAILY_RULES = \[([\s\S]*?)\n\];/)` 抽 `name: '...'`；`hubRaw.match(/const RULES = \[([^\]]+)\]/)` 抽 `'...'`；**数量 7 且逐项同序** | breach + hub |
| 313-316 | `raw4[3].match(/const names = \{([^}]*)\}/)`，street 升级短名表须覆盖 breach 全部升级 id（除 `vision`/`med`） | street |
| 318-328 | `ACHIEVEMENT_DEFS` / `ACH_LIST`：`{ id: '(\w+)'` 数量 **15** 且逐项一致；再用 `/\{ id: '(\w+)', name: '([^']*)', desc: '([^']*)'/g` 比对 **name/desc 文本逐项一致** | breach + hub |
| 330-333 | `brRaw.match(/const WEAPON_DEFS = \{([\s\S]*?)\n\};/)`，条目 `^\s{2}(\w+): \{ name:`，共 **6** 把；且 `hubRaw.indexOf("setWeapon('" + w + "')") >= 0` 对每把武器成立 | breach + hub |
| 337-348 | street `WEAPON_DEFS` 与 breach **同 id 同顺序同数值** | street + breach |

> 结论：**不要动任何 `const X = ...` 定义表的书写形态、名字、顺序、缩进。**
> （`setWeapon('ar'|'smg'|'shotgun'|'sniper'|'lmg'|'dmr')` 现在位于 `hub.html:1237-1242`，是 JS 赋值，
> 不在 HTML 属性里 —— 别改成 `onclick="setWeapon('ar')"` 之后删掉 JS 那几行。）

## 1.8 🟠 JS 注入 `innerHTML` / `className` 的类名契约（CSS 必须保留这些选择器）

这些类名**只出现在 JS 生成的 HTML 片段里**（不在静态标记里），但它们的**样式必须继续存在**，
否则 UI 会塌。`AI_README.md:90` 明确把它们列为"红线"。

| 页面 | 生成点 | 注入的类名（含状态类） |
|---|---|---|
| `hub.html` | `renderAch()` `hub.html:1037` | `.fbtn`（+ `.sel`）、`data-f` |
| `hub.html` | `renderAch()` `hub.html:1048` | `.achRow`（+ `.on`）、`.ac`、`.ai`、`.an`、`.ad`、`.aSt` |
| `hub.html` | `renderDaily()` `hub.html:1090,1092` | `.dlRow`（+ `.none`）、`.dlD`、`.dlT`，星级包在 **`<b>`** 里（见 §3 的 `★★` 断言） |
| `hub.html` | `renderUpgrades()` `hub.html:1161-1167` | `.upRow`（+ `.max`）、`.upIcon`、`.upInfo`、`.nm`、`.ds`、`.pips`、`.pips .off`、`.upBtn`（+ `.maxed`、`disabled`） |
| `hub.html` | `renderSlots()` `hub.html:1131-1140` | `.slotBtn`（+ `.sel`）、`data-slot` |
| `hub.html` | `toast()` `hub.html:962,966` | `.toast`（+ `.show`） |
| `hub.html` | `renderWeaponInfo()` | `.weaponInfo` |
| `breach.html` | `updateHelpKeys()` `breach.html:5035-5041` | `.hl`、`.hico`、`.cmd` |
| `breach.html` | `renderKeyGrid()` `breach.html:5050-5052` | `.keyCell`、`.kbtn`（+ `.wait`）、`data-k` |
| `breach.html` | `showEnd()` `breach.html:4951-4958` | `.accent`、`.good` |
| `breach.html` | 工具条 `syncAutoDoorBtn()` `breach.html:5029` | `#toolbar button.on` |
| `breach.html` | `updateHUD()` `breach.html:4745` | `.hpbar.low` |
| `breach.html` | HUD 防遮挡 `breach.html:4846` | `.panelhide`（**唯一被测试断言的类名**，见 §4.4） |
| `breach.html` | 覆盖层显隐（多处） | `.hidden`（`startOverlay`/`endOverlay`/`pauseOverlay`/`tutOverlay`） |
| `breach.html` | 难度/地图按钮 `breach.html:4981-4991` | `.diffBtn.sel`、`#btnMap*.sel` |
| `street.html` | `showBoost()` `street.html:1240-1241` | `.boostCard`（`b` / `span` 子结构） |
| `street.html` | `updateHUD()` `street.html:2480` | `.hpbar.low` |
| `street.html` | 覆盖层显隐 | `.hidden`（`startOverlay`/`endOverlay`/`pauseOverlay`/`boostOverlay`/`#fpsTxt`） |
| `street.html` | 难度按钮 `street.html:1953` | `.diffBtn.sel` |
| `index.html` | `renderSlots()` `index.html:847` | `.slot`（**状态类是 `.on`，不是 `.sel`**）：`el.className = 'slot' + (n === cur ? ' on' : '')` |
| `index.html` | `syncMapTabs()` `index.html:1124` | `.mtab`（**状态类 `.on`**）：`b.className = 'mtab' + (k === id ? ' on' : '')` |
| `index.html` | `setHint()` `index.html:761` | `.hintline` + 状态类 **`.ok` / `.bad`**：`el.className = 'hintline' + (okCls ? ' ' + okCls : '')`，`okCls ∈ {'ok','bad'}`（`index.html:762` 决定图标 `fa-circle-check` / `fa-triangle-exclamation` / `fa-circle-info`） |
| `index.html` | 静态标记 | `.mapTag`（`#mapTag`） |

**🔴 必须存在 `.hidden{display:none}` 规则**（四页都有覆盖层用它）。
测试抓不到（桩的 `classList` 是空函数），但删掉它游戏一开始就被开始界面永久盖住。

**🟠 `.panelhide` 建议保留 `opacity` 变化而非 `display:none`**（`breach.html:126` 现在是
`#p1.panelhide,#p2.panelhide{opacity:.08;transform:translateY(-4px);}`）—— JS 每帧 toggle，用 `display:none` 会导致布局抖动。

## 1.9 🟠 测试钩子 `window.__game`（不要改，也不要在重写时被覆盖）

全部测试通过 `sb.window.__game` 访问内部状态。**页面末尾必须仍然挂 `window.__game`。**

| 页面 | 测试文件 | 用到的钩子成员（节选，全部必须保留） |
|---|---|---|
| `breach.html` | `hub_test/tutorial_test/meta_test/protocol_test/render_test/perf_test/cover_test/smoke_test/street?` 等 | `mapId, player, units, cam, result(), selectMap(), spawnCfg, rooms, walls, lowCovers, settings, teamColors, slot, setSlot(), saveKeyFor(), cfgKeyFor(), saveResult(), keyBinds, defKeys, dailyRules, achDefs, weaponDefs, upgradeDefs, coverSegs, coverHash, pickups, doors, grenades, noises, mouseW, particles, bullets, decals, tutorial, tut, pendingThrow, dailyRule, setRandom()` |
| `street.html` | `street_test/protocol_test/meta_test` | `start(), player, units, killUnit(), result, waveClearedCount, weaponName, slot, saveKey(), cfgKey(), readBest(), keyBinds, settings, countAttackers(), buildingRects, covers, score, pickups` |
| `hub.html` | `protocol_test/meta_test` | `setSlot(), loadAll(), points(), upgradeLv(), lastToast(), applyBackup(), importBackupFile(), persistCfg(), persistSave(), renderAll()` —— `protocol_test.js:171-185, 236-259`；另外 `meta_test.js:220-266` 用 `sbA.buildBackup() / sbB.applyBackup() / sbB.loadAll() / sbB.renderAll() / sbH.persistCfg() / sbH.persistSave()`（**直接挂在沙箱全局上，非 `__game`**） |
| `index.html` | `protocol_test.js:266-269` | `window.__game.applyBackup`；`meta_test.js:249` 用 `sbD.buildBackup()`（沙箱全局） |

> 🔴 `index.html` 与 `hub.html` 必须同时暴露：`window.__game.applyBackup` &&
> 沙箱全局 `buildBackup` / `applyBackup` / `loadAll` / `renderAll` / `persistCfg` / `persistSave`。

## 1.10 🟢 测试**没有**检查的东西（可以放心改）

- ❌ 没有任何测试读 CSS 文本、做 `getComputedStyle`、`matchMedia`、`prefers-reduced-motion`、
  元素几何（`getBoundingClientRect` **从未**被任何测试桩提供）。
- ❌ 没有任何测试断言 `role=` / `aria-*` / `aria-live` / `<noscript>` / `<title>` / `<html lang>` / `data-*`。
- ❌ 没有任何测试断言颜色值、字号、间距、布局。
- ❌ 没有任何测试用 `document.querySelector` 查页面（只有页面 JS 自己用 `querySelectorAll`，
  且在桩里被 `xx.querySelectorAll ? ... : []` 保护）。
- ⚠️ `render_test.js` 的 canvas 几何断言（家具精灵 4px 边距）是**纯 canvas 绘制**的几何，
  与 CSS 无关，不要试图通过改 canvas 的 HTML `width/height` 属性去"修复"它。
- ⚠️ `perf_test.js:116-121` 断言 `createRadialGradient/帧 ≤ 2.5`、`fillRect/帧 ≤ 120`、
  `mmFog.fillRect === 0` —— 也是纯 canvas 计数，与 CSS 无关。
  （`perf_test.js:118` 的 `mmFog` 标签只在 `document.getElementById('mmFog')` 被调用时才产生；
  桩会按需造元素，所以这条实际是"即使 0 次也通过"。）

## 1.11 🟠 `prefers-reduced-motion`

**没有任何测试校验它。** 但 `AI_README.md:87` 把它当作无障碍要求列出，
且四页现有 CSS 已包含：
`index.html:407`、`hub.html:338`、`breach.html:307`、`street.html:258`（各有一个
`@media (prefers-reduced-motion: reduce)` 块，内部做 `animation:none;transition:none` 兜底）。
🟠 重写后**必须保留**一个 `@media (prefers-reduced-motion: reduce)` 块（或等效的
全局 `animation:none;transition:none` 兜底）。

## 1.12 🟠 画布尺寸属性是**功能性**依赖（JS 直接读 `canvas.width`）

| 画布 | HTML 属性 | JS 用途 | 风险 |
|---|---|---|---|
| `#cv`（breach/street） | 当前无属性：`<canvas id="cv"></canvas>`（`breach.html:316`、`street.html:267`） | `breach.html:816` / `street.html:579` 每帧 `cv.width = cw; cv.height = ch;`（由 `window.innerWidth/innerHeight` 算） | 🟠 **不要**在 HTML 上加 `width=`/`height=`（会被覆盖，无害但误导）；**CSS 必须保持 `width:100%;height:100%` + `position:absolute;inset:0`**（`breach.html:63`、`street.html:61`），否则画布被拉伸 |
| `#mm`（breach） | `<canvas id="mm" width="192" height="80">`（HUD 精简后） | `mmS = mm.width / MAP.W`；缓存画布尺寸；渲染/批注换算都用 `mm.width/height` | 🟠 缩放基准是 `mm.width`，**height 必须 = `MAP.H × (mm.width/MAP.W)`**（192 → 80），否则小地图被拉伸。测试桩给的是 `300x125`（`render_test.js:102`），**测试不会报错**；改尺寸后要用真实浏览器复核 |
| `#mapPrev`（index） | `<canvas id="mapPrev" width="560" height="233">`（`index.html:519`） | `index.html:1043` `const s = cv2.width / MAP.W`（缩放基准） | 🟠 测试桩 `width=0`（`makeEl()` 默认），所以**测试完全不校验**。改尺寸会改变预览缩放，请原样保留 |
| `#mapPrev`（hub） | `<canvas id="mapPrev" width="480" height="200">`（`hub.html:382`） | `hub.html:902` `const s = cv2.width / 2400` | 同上 |
| `#mmWrap` | `<div id="mmWrap" class="panel hidden" style="padding:5px;">`（**默认收起**, 由 `#btnMinimap` 按需展开） | 容器 + `classList.toggle('hidden')`(`syncMmBtn()`) | 🟠 保留 id；收起时 `renderMinimap()` 整段跳过（连小地图迷雾层 `redrawMinimapFog()` 一起省掉） |

> 🟠 `hub.html` / `index.html` 的地图预览用 `ctx.measureText(...)` 量出生点标签宽度再垫底色；
> 测试桩的 2D 上下文**没有**返回值，页面必须 `try/catch` + 估算宽度回退（见 `AI_README.md:88`）。
> 重写**不要动这段 JS**；不要把 `#mapPrev` 从 DOM 里删掉（否则真实浏览器 `cv2.getContext` 抛错）。

---

# 2. `index.html`（主页 / Home）

## 2.1 🔴 测试直接断言的 ID（读 `textContent` / `onclick` / 导航）

| id | 断言 | tests 文件:行 |
|---|---|---|
| `stWins` | `textContent === '2'` | `tutorial_test.js:152` |
| `stPts` | `textContent === '12'` | `tutorial_test.js:153` |
| `stStars` | `textContent === '★★☆'`（注意是 **★ U+2605 / ☆ U+2606**） | `tutorial_test.js:154` |
| `stRank` | `textContent === '军士长'`（rank 5）；`'列兵'`（无 rank 旧档） | `meta_test.js:202`、`meta_test.js:208` |
| `btnStart` | `onclick()` → `location.href === 'game/breach.html'` | `tutorial_test.js:155-156` |
| `btnPrep` | `onclick()` → `'game/hub.html'` | `tutorial_test.js:157-158` |
| `btnTutGo` | `onclick()` → `'game/breach.html?tutorial=1'` | `tutorial_test.js:159-160` |
| `btnTut` | `onclick()` 不得抛错（内部 `getElementById('tutorial').scrollIntoView()`） | `tutorial_test.js:161` |

> 🔴 `tutorial_test.js:156/158/160` 的三条跳转文件名是**精确字符串**：
> `game/breach.html`、`game/hub.html`、`game/breach.html?tutorial=1`
> （来自 `index.html:717-719` 的 `const GAME_FILE / HUB_FILE / STREET_FILE = '....html'`，
> 经 `index.html:723` `function go(url){ location.href = url; }` 与 `index.html:1138` 附近的
> `go(GAME_FILE + '?tutorial=1')` 生效）。
> ⚠️ 新版本里已**没有** `href='xxx.html'` 这种单引号写法（`offline_test.js:48` 的 jumps 集合现在是空集），
> 导航仍然正确、测试仍绿 —— 但这也意味着那条"本地相对跳转"保护**已经失效**，
> 改 `GAME_FILE/HUB_FILE/STREET_FILE` 的**值**时请自己小心。

## 2.2 🟠 JS 需要的 ID（`index.html` 的 `getElementById` 全集）

静态：`stRank` `stWins` `stLosses` `stKills` `stPts` `stStars` `btnStart` `btnPrep` `btnStreet` `btnTut` `btnTutGo`
`btnExport` `btnImport` `btnResetData` `importFile` `mapPrev` `mapTag` `shareHint` `tutorial`
v3.1 追加：`chkEncExport`（加密导出勾选框）`encToggleWrap`（它的 label 外壳，只切 `.on` 类）
v3.2 追加：`btnAcct`（账户按钮）。账户界面由模块**动态创建**（`#acctOverlay` / `#acctStat` / `#acctMsg` /
`#acctBody` / `#acctUser_<id>` / `#acctPw` / `#acctGo` / `#acctGuest` / `#acctNew` / `#acctNewUser` /
`#acctNewPw` / `#acctNewPw2` / `#acctCreate` / `#acctChpw` / `#acctChOld` / `#acctChNew` / `#acctChNew2` /
`#acctChGo` / `#acctDel` / `#acctDelPw` / `#acctDelGo` / `#acctSwitch` / `#acctClose` / `#acctBack`），
页面里没有对应静态标记 —— 改样式请用 `.acct*` 类，别指望在 HTML 里搜到这些 id。
v3.2 追加（排行榜）：静态 `boardSheet`（section）#boardPanel（榜单容器，JS 写 innerHTML）
#btnBoardClear（清空按钮）。

动态拼接：
- `'slotBtn' + n`，n = 1..3 → **`slotBtn1` `slotBtn2` `slotBtn3`**（`index.html:844`、`index.html:1163`）
- `'mapTab' + Name` → **`mapTabHouse` `mapTabWarehouse` `mapTabFactory` `mapTabOffice` `mapTabParking`**（`index.html:1036`）

✅ 实测：以上 19 个静态 id **在新 `index.html` 标记里全部存在**，动态的 `slotBtn1..3` 与 `mapTab*` 也全部存在。

另外 `index.html:689` 的文件头注释已经写明 DOM 契约：
```
DOM 契约保持不变(#shareHint / #slotBtnN / #mapTab* / #mapTag / #st*)。
```
→ 🟠 `#statsBar`（第 471 行）、`#slotRow`（第 480 行）、`#tutorial`
（第 561 行 `<section class="panel" id="tutorial">`）、`#shareHint`（第 499 行）等容器建议保留
（部分被 JS 直接查）。

## 2.3 🔴 `index.html` 的头部 `<link>` 必须精确

`index.html:7` `<link rel="stylesheet" href="fontawesome-free-7.3.1-web/css/all.min.css">`
`index.html:8` `<link rel="icon" href="photo.ico" type="image/x-icon">`
`index.html:4` `<meta charset="UTF-8">`

✅ 实测新版本：links = `["fontawesome-free-7.3.1-web/css/all.min.css","photo.ico"]`，白名单通过，`.css`×1、`.ico`×1。
**不允许第三条 `<link>`。** 详见 §1.2.2。

## 2.4 🔴 `index.html` 必须含地图预览自动数据块

`// <map-preview-data:auto>`（新版本第 **866** 行）… `// </map-preview-data:auto>`
（`preview_test.js:94-101, 106-110`）。详见 §1.5。

## 2.5 🟠 `index.html` 的 `<noscript>`（不被断言，但建议保留）

新版本第 **413** 行：`<noscript><p style="margin:16px;font-size:14px;">本页面需要启用 JavaScript 才能运行（纯本地，无需联网）。</p></noscript>`
🟢 测试不检查，可自由改写文案/样式。

## 2.6 🟠 视觉 token（`index.html` 文件头 `:root`，新版本第 23 行起）

`AI_README.md:83` 要求每页 `:root` 同时保留旧变量别名
（`--gold` / `--txt` / `--muted` / `--dim` / `--panel-top` / `--line` / `--chip` / `--blue` / `--cyan` …）。
🟢 **测试不校验**，但 JS 未引用这些变量，风险仅限于"某处在 CSS 里引用了旧别名"。建议保留别名。

## 2.7 🟠 `index.html` 使用的 FontAwesome 图标（47 个，实测清单）

`fa-arrows-up-down fa-bolt fa-bomb fa-box-open fa-building fa-bullseye fa-calendar-day fa-chevron-down fa-chevron-right fa-circle-check fa-circle-info fa-clipboard-list fa-cloud fa-coins fa-couch fa-crosshairs fa-door-closed fa-door-open fa-explosion fa-eye fa-eye-slash fa-file-export fa-file-import fa-folder fa-folder-open fa-gun fa-hand-fist fa-house fa-industry fa-lightbulb fa-map-location-dot fa-person-chalkboard fa-person-walking fa-play fa-plug fa-ranking-star fa-robot fa-satellite-dish fa-screwdriver-wrench fa-skull fa-square-parking fa-star fa-trash-can fa-triangle-exclamation fa-trophy fa-volume-high fa-warehouse`

> 🟢 换图标不违反任何测试，但**只能用 `fontawesome-free-7.3.1-web` 里真实存在的名字**
> （写错名字时图标静默消失，测试不报错）。

---

# 3. `game/hub.html`（战前准备 / Loadout Hall）

## 3.1 🔴 测试直接断言的 ID

| id | 断言（精确） | tests 文件:行 |
|---|---|---|
| `stWins` | `textContent === '3'` | `hub_test.js:106` |
| `pts` | `textContent` **包含** `'10'` | `hub_test.js:107` |
| `upBtn_hp` | `.disabled === false` → `.onclick()` 调用 2 次 | `hub_test.js:108,110,116`；`protocol_test.js:179` |
| `btnWSmg` | `.onclick()` → `cfg.weapon === 'smg'` | `hub_test.js:120` |
| `weaponInfo` | `innerHTML` 包含 `'冲锋枪'` / `'狙击枪'` / `'突击步枪'` | `hub_test.js:123`；`meta_test.js:237`、`meta_test.js:262` |
| `diffHard` | `.onclick()` → `cfg.diff === 'hard'` | `hub_test.js:124` |
| `btnMapWarehouse` | `.onclick()` → `cfg.map === 'warehouse'` | `hub_test.js:127` |
| `btnMapFactory` | `.onclick()` → `cfg.map === 'factory'` | `hub_test.js:130` |
| `btnGo` | `.onclick()` → `location.href === 'breach.html'` | `hub_test.js:133-134` |
| `btnReset` | `.onclick()` → 清空 `breach_game_cfg` / `breach_game_save` | `hub_test.js:136-137` |
| `achCount` | `textContent` 包含 `'2/15'` / `=== '0/15'` | `meta_test.js:110`、`meta_test.js:467` |
| `achList` | `innerHTML` 包含 `'首战告捷'` `'已解锁'` `'闪电行动'` | `meta_test.js:111-113` |
| `dailyList` | `innerHTML` 包含 `'★★★'`、**`'<b>★★</b>'`（字面 `<b>` 标签）**、`'未挑战'` | `meta_test.js:114-117` |
| `achFilter` | `innerHTML` 包含 `'全部'` `'已解锁'` `'未解锁'` | `meta_test.js:465-466` |
| `stRank` | `textContent === '列兵'` / `'上等兵'` / `'军士长'` / `'中尉'` | `meta_test.js:189,193,236,263,415` |
| `btnRankUp` | `.onclick()` 扣点晋升 | `meta_test.js:190,194` |
| `stPts` | `textContent === '105'` | `meta_test.js:414` |
| `stStars` | `textContent === '★★★'` | `meta_test.js:264` |
| `dlToday` | `textContent` 包含当日 `DAILY_RULES` 的 `name` | `meta_test.js:581-583` |
| `toast` | `textContent` 匹配 `/保存失败|本地存储/`；导入超限时匹配 `/过大|256/` | `protocol_test.js:183`、`protocol_test.js:257-259` |

> 🔴 **`dailyList` 的 `'<b>★★</b>'`** 是唯一要求"内部 HTML 结构"的断言：
> 每日历史里 2 星那行必须把星级渲染在 `<b>` 元素内（当前 `hub.html:1090`：
> `html += '<div class="dlRow"><span class="dlD">' + lbl + '</span><b>' + '★'.repeat(...) + '</b><span class="dlT">...`）。
> **不要动这段 JS**，也不要删掉 `.dlRow b` 的样式。
>
> 🔴 `protocol_test.js:257` 是 `(els['hint'] || els['toast'] || {}).textContent` ——
> `hub.html` 里**没有** `#hint`，所以实际落到 **`#toast`**。`#toast` 必须存在。

## 3.2 🟠 JS 需要的 ID（`hub.html` 的 `getElementById` 全集，v3.1 起 44 个）

`achCount achFilter achList btnExport btnGame btnGo btnHome btnImport btnMapFactory btnMapHouse btnMapOffice btnMapParking btnMapWarehouse btnRankUp btnReset btnStreet btnWAr btnWDmr btnWLmg btnWShotgun btnWSmg btnWSniper chkEncExport dailyList diffEasy diffHard diffNorm dlToday encToggleWrap importFile mapPrev pts rankInfo slotBtns stDmg stKills stLosses stPts stRank stStars stWins toast upgradeList weaponInfo`

> v3.1 追加：`chkEncExport`（加密导出勾选框）与 `encToggleWrap`（它的 label 外壳）。
> 加密导出的加解密是**纯函数**（`encryptBackup` / `decryptBackup`），不碰 DOM；勾选框只影响导出分支。
> v3.2 追加：`btnAcct`（账户按钮，与主页同一套动态账户界面 —— 见 §2.2 的 id 清单）
> 与 `boardSheet` / `boardPanel` / `btnBoardClear`（本地排行榜面板）。

动态拼接：
- `'upBtn_' + d.id` → **`upBtn_hp` `upBtn_dmg` `upBtn_rate` `upBtn_reload` `upBtn_med` `upBtn_speed` `upBtn_aim` `upBtn_vision` `upBtn_ammo` `upBtn_frag` `upBtn_flash` `upBtn_robHp` `upBtn_robDmg` `upBtn_robSpd` `upBtn_throwRng` `upBtn_quiet` `upBtn_scavenge`** 等 18 个（`hub.html:1167`、`hub.html:1173`）
- `'slotBtn' + n` 与 `data-slot`（`hub.html:1131-1140`）
- `button[data-f]` 在 `#achFilter` 内（`hub.html:1040`）

**`set()` 按字符串查的 id（`hub.html:1108`）** —— 这些**不在**静态 `getElementById` 列表里，但同样必须存在：
`stAcc` `stShots` `stLong` `stStreak` `stGKills` `stTime` `stWinStreak` `stStreet` `stBosses`
（当前在 `hub.html:409-417`）。
🟠 `hub.html:19-24` 的文件头注释已列出完整契约，照抄即可。

## 3.3 🔴 `hub.html` 的头部 `<link>` 与 `<meta charset="UTF-8">`

`hub.html:7` → `../fontawesome-free-7.3.1-web/css/all.min.css`
`hub.html:8` → `../photo.ico`
`hub.html:4` → `<meta charset="UTF-8">`
**不允许第三条 `<link>`。** 详见 §1.2.2。

## 3.4 🔴 `hub.html` 必须含地图预览自动数据块

同 §1.5（`preview_test.js:101, 106-110`）。

## 3.5 🔴 `hub.html` 的难度文案（间接被 meta 校验）

`hub.html:465-467`：
```
简单  <small>蓝方4人 · 反应慢</small>
标准  <small>蓝方5人</small>
困难  <small>蓝方6人 · 更准更快</small>
```
🟠 hub 页本身没有原始子串断言，但 `meta_test.js:85-86` 查的是 `breach.html`。
两页文案一致最省事。

## 3.6 🟠 `hub.html` 视觉 token / 类名清单

静态 `class=` 实测（用于自查是否有遗漏样式）：
`achFilterRow achRow ac ad ai an aSt actions brief btn btn-accent btn-danger btn-ghost btn-primary
col crumb diffBtn diffRow dlD dlRow dlT dn ds fbtn gold hi ico k kv layout logo mapframe mono nm
note off panel panel-body panel-head panel-note pips pk purse pv rankBtn rankInfo side-blue side-red
slotBtn spread sten sub subhead t title toast topbar topright upBtn upIcon upInfo wbtn weaponInfo
weaponRow wn`

`.toast` 的 `.show` 状态、`.diffBtn.sel`、`.wbtn.sel`、`.slotBtn.sel`、`.fbtn.sel`、
`.achRow.on`、`.dlRow.none`、`.upRow.max`、`.upBtn.maxed` 全部由 JS 写入，CSS 必须保留。
FontAwesome 图标 58 个（实测），换图标时只用真实存在的名字。

---

# 4. `game/breach.html`（主游戏 / Main Game）

## 4.1 🔴 测试直接断言的 ID

| id | 断言 | tests 文件:行 |
|---|---|---|
| `cv` | 所有鼠标事件的目标：`els['cv']._fire('mousemove'|'mousedown'|'mouseup', ...)` | `tutorial_test.js:57,59`；`render_test.js:140`；`perf_test.js:67,68`；`combat_test.js:48,50`；`fire_acc_test.js:43,44`；`input_state_test.js:42`；`meta_test.js:139,506`；`newfeatures_test.js:29,50,57,61,118`；`shotgun_test.js:43,44,60,72`；`squad_test.js:42,91,134,140`；`feature_test.js:74,80`；`fog_probe.js:49` |
| `btnStart` | `.onclick()` 开局 | `hub_test.js:69`；`meta_test.js:91,134,164,383,407,424,476,486,504,522,602`；`protocol_test.js:113,194,202`；`render_test.js:134`；`smoke_test.js:75`；`cover_test.js:47`；`feature_test.js:49,105`；`fire_acc_test.js:41`；`input_state_test.js:46`；`maps_test.js:32,93`；`map_probe.js:34`；`newfeatures_test.js:33`；`path_test.js:46`；`perf_test.js:73`；`shotgun_test.js:44`；`squad_test.js:45`；`wall_test.js:49` |
| `btnRestart` | `.onclick()` 重开 | `smoke_test.js:111`；`feature_test.js:103` |
| `btnRange` | `.onclick()` 训练场 | `maps_test.js:77`；`map_render.js:94` |
| `endOverlay` | classList 被日志打印（不断言） | `smoke_test.js:98` |
| `p1` | **`.classList.toggle/remove('panelhide', ...)` 的语义断言** | `meta_test.js:127-130, 143, 148, 152` |
| `volRange` | `.value` 回读 `60` / `100`（无存档默认） | `meta_test.js:62,71,78` |
| `chkShake` | `.checked` 回读 `false` / 默认 `true` | `meta_test.js:63,72,73,78` |
| `chkFps` | `.checked` 回读 `true` | `meta_test.js:64,72` |
| `chkAdsHold` | `.checked` 回读 `true` / 默认 `false` | `meta_test.js:65,72,78` |
| `chkCb` | `.checked === true`（色觉友好） | `protocol_test.js:92,102` |
| `sensRange` | `.value` 输入 `150` | `meta_test.js:358` |
| `crossRange` | `.value` 输入 `140` | `meta_test.js:360` |
| `chkHit` | `.checked = false` | `meta_test.js:361` |
| `btnCross` | `.onclick()`；`textContent` 包含 **`'纯十字'`** | `meta_test.js:359, 371` |
| `sensVal` | `textContent` 包含 **`'1.50'`** | `meta_test.js:372` |
| `btnKeyReset` | `.onclick()` 恢复默认键位 | `meta_test.js:391` |
| `btnAutoDoor` | `.onclick()`；`innerHTML` 包含 **`'自动开门：开'`（全角冒号 `：`）** | `meta_test.js:592, 596` |
| `btnDaily` | `.onclick()` 每日挑战 | `meta_test.js:576`；`newfeatures_test.js:106` |
| `diffEasy` | `.onclick()` 简单难度 | `feature_test.js:104` |
| `diffHard` | `.onclick()` 困难难度 | `feature_test.js:48` |
| `loadoutInfo` | `textContent` 包含 `'霰弹枪'` | `hub_test.js:85` |
| `tutAcc` | `textContent` 包含 `'%'` | `tutorial_test.js:141` |
| `mm` | 桩默认尺寸 `300x125`（`render_test.js:102`）；`perf_test.js` 用它归类 draw call | 无直接断言 |
| `mmFog` | `perf_test.js:118-119` 断言 `per('mmFog.fillRect') === 0` | 见 §1.10 说明 |

## 4.2 🟠 JS 需要的 ID（`breach.html` 的 `getElementById` 全集，78 个）

`ammo ammoBar banner bluebots btnAutoDoor btnCross btnDaily btnHub btnHub2 btnHub3 btnHubT btnKeyReset
btnMapFactory btnMapHouse btnMapOffice btnMapParking btnMapWarehouse btnRange btnReset btnRestart
btnRestart2 btnResume btnStart btnTutHome btnTutHub btnZoomIn btnZoomOut c4s chkAdsHold chkCb chkFps
chkHit chkShake crossRange cv dailyInfo diffEasy diffHard diffNorm endOverlay endStars endStats endSub
endTitle feed flash flashes frags help hpbar keyGrid kills loadoutInfo mm p1 p2 pauseOverlay pstate
redbots reloadProg sensRange sensVal smokes startOverlay streak timer tutAcc tutBarFill tutCur tutDesc
tutKills tutOverlay tutPanel tutTime tutTitle vignette volRange weaponName`

外加 `ID 表`（`breach.html:4725-4740` 的 `el = {...}`）与 `breach.html:4573` 的 `mm`、
`breach.html:811` 的 `cv`、`breach.html:772` 的 `loadoutInfo`。
动态：`button[data-k]` 在 `#keyGrid` 内（`breach.html:5055`）。

## 4.3 🔴 `breach.html` 的头部与章节结构（本页是 doc_test 唯一对象）

- 🔴 `<meta charset="UTF-8">`（`breach.html:4`）
- 🔴 `<link rel="stylesheet" href="../fontawesome-free-7.3.1-web/css/all.min.css">`（`:7`）
- 🔴 `<link rel="icon" href="../photo.ico" type="image/x-icon">`（`:8`）
- 🔴 **47 个** `// ---------- 章节名 ----------` 标记（marker 数 ≥ 40，且 `doc_test.js:62` 要求
  **目录条数 === 章节数**）
- 🔴 文件头 `/* ... 【目录 TABLE OF CONTENTS】 ... 76×'=' + ' */'` 块必须保留（`breach.html:480-543`）
- 🔴 不得插入新的 76-`=`+` */` 行到 TOC 区间内

## 4.4 🔴 HUD 防遮挡 / 面板几何（唯一被断言的 CSS 相邻行为）

`meta_test.js:120-153`（D 段）与 `tutorial_test.js` 的 A2 段：

```js
const rec = { hide: null, n: 0 };
const p1El = makeEl();
p1El.classList = {
  add(cls)    { if (cls === 'panelhide') { rec.hide = true;  rec.n++; } },
  remove(cls) { if (cls === 'panelhide') { rec.hide = false; rec.n++; } },
  toggle(cls, on) { if (cls === 'panelhide') { rec.hide = !!on; rec.n++; } }
};
sb._els['p1'] = p1El;
...
ok(rec.hide === false, '开局 p1 正常显示');      // 单位在中部
rA.x = 70; rA.y = 70;  t = step(sb, 6, t);
ok(rec.hide === true,  '单位进入左上角后面板淡出');
rA.x = 300; rA.y = 820; t = step(sb, 6, t);
ok(rec.hide === false, '单位离开后 p1 恢复');
```

`tutorial_test.js` A2 段用同一套路测 `#tutPanel`：开局（单位在中部）不淡出 →
玩家走进面板矩形中心 → `.panelhide` → 移开恢复。

**关键：测试桩的 `makeEl()` 没有 `getBoundingClientRect`**（`meta_test.js:17-27`），
于是 `breach.html` 的 `typeof node.getBoundingClientRect !== 'function'` 成立 → `continue`
→ 该面板落到 **`PANEL_FALLBACK`**：

```js
const PANEL_FALLBACK = [
  { elId: 'p1',       x: 14,   y: 14,   w: 219, h: 92 },
  { elId: 'p2',       x: null, y: 14,   w: 223, h: 29 },   // x 由右侧固定: cw-14-w
  { elId: 'tutPanel', x: 14,   y: 158,  w: 317, h: 49 },   // 两行版式: 290+24+3 × 49
  { elId: 'help',     x: 14,   y: null, w: 0,   h: 0 },    // y 由底部固定; 宽度按文本实测
];
```

`PANEL_FALLBACK` 现在**为每个 id 都返回一条**（`panelHitRects()` 逐个 `byId[fb.elId] || 副本`），
所以 `__game.panelRects` 的长度恒等于 `PANEL_FALLBACK.length`，顺序也一致。
`#help` 的回退宽高是 0 → `hitPanel` 直接返回 `false`（几何未知就不误判），
真实浏览器里每 30 帧实测一次宽度（改键/展开提示条会调 `panelCacheClear()` 重新实测）。

**结论：**
- 🟠 **测试不断言 CSS 尺寸**，但 `PANEL_FALLBACK` 是**按当前 CSS 反推的**
  （`#p1` = 196 内容宽 + 20 内边距 + 3 边框 = 219、高 92；`#p2` 已精简成单行战况条 = 223×29；
  `#tutPanel` 两行版式 = 290 + 24 + 3 = 317、高 49）。
  **如果重写后实际尺寸变化超过 ~8px（`rr = 8`），
  真实浏览器里的淡出判定会比测试所保证的偏，但测试仍然全绿。**
  → 建议：改完 HUD 就**同步更新 `PANEL_FALLBACK`**（`meta_test.js` 的防遮挡断言通过
  `__game.panelRects` 读取回退几何，因此面板再变也不用手改测试的坐标；
  `tutorial_test.js` A2 段同理，只断言 `x/y/下限`，不写死宽高）。
- 🔴 `#p1` / `#p2` / `#tutPanel` / `#help` 的 id 与类必须保留，且必须是**画布上的浮层**
  （不能 `display:none`，否则 rect 为 0 会走 fallback，且 UI 消失）。
- 🔴 **`#tutPanel` 是教程模式的"内容框"**：教程全程在左户活动，而它固定在左上（14/158）。
  因此它必须留在 `PANEL_IDS` 里，否则会重新出现"教官面板挡住该看的点"。
  教程目标圈的遮挡判定也挂在 `r.elId === 'tutPanel'` 这一支上（见 `updatePanelFade`）。

## 4.5 🔴 `breach.html` 的难度文案（原始子串断言）

`breach.html:381-382`：
```
<button class="diffBtn sel" id="diffNorm">...标准<small>蓝方5人</small></button>
<button class="diffBtn" id="diffHard">...困难<small>蓝方6人 · 更准更快</small></button>
```
- 🔴 必须含 `蓝方5人`、`蓝方6人`（`meta_test.js:85`）
- 🔴 必须**不含** `蓝方7人`、`蓝方8人`（`meta_test.js:86`）

## 4.6 🟠 `breach.html` 的 `role="dialog"` / `aria-*` / `<noscript>`（不被断言，建议保留）

当前（🟢 可自由改写，但语义价值高）：
- `breach.html:315` `<noscript>…本游戏需要启用 JavaScript…</noscript>`
- `:327` `#feed` `role="status" aria-live="polite" aria-atomic="false"`
- `:329` `#banner` `role="status" aria-live="polite"`
- `:367` `#startOverlay` `role="dialog" aria-modal="true" aria-label="开始游戏"`
- `:401` `#endOverlay` `role="dialog" aria-modal="true" aria-label="战斗结算"`
- `:415` `#pauseOverlay` `role="dialog" aria-modal="true" aria-label="暂停菜单"`
- `:444` `#tutOverlay` `role="dialog" aria-modal="true" aria-label="训练提示"`

## 4.7 🟠 `breach.html` 的 31 个 FontAwesome 图标（实测）

`fa-arrow-right-from-bracket fa-bolt fa-bomb fa-box-open fa-building fa-bullseye fa-calendar-day
fa-cloud fa-crosshairs fa-door-open fa-equals fa-explosion fa-graduation-cap fa-gun fa-heart-pulse
fa-house fa-industry fa-keyboard fa-magnifying-glass-minus fa-magnifying-glass-plus fa-minus fa-pause
fa-person-walking fa-play fa-plus fa-radio fa-rotate-left fa-rotate-right fa-screwdriver-wrench
fa-square-parking fa-warehouse`

## 4.8 🟠 `breach.html` 的 `#hud{pointer-events:none}`（关键功能约束）

当前 `breach.html:64` `#hud{position:absolute;inset:0;pointer-events:none;z-index:5;}`，
各覆盖层/工具条再单独 `pointer-events:auto`。
🟠 **必须保留这个模式**：`#cv` 是唯一接收鼠标事件的元素（JS 只对 `#cv` 绑 `mousemove/mousedown`）。
如果 HUD 层吃掉指针事件，真实浏览器里**无法瞄准/射击**（测试桩直接对 `els['cv']` 派发事件，抓不到）。

## 4.9 🟠 `#cv` 的定位（关键功能约束）

当前 `breach.html:63` `#cv{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:none;}`
（`street.html:61` 同款）
🟠 保持 `position:absolute; inset:0; width:100%; height:100%`。
不要给 `#cv` 加 `width`/`height` HTML 属性（JS 每帧覆盖），也不要用固定 px 尺寸。

---

# 5. `game/street.html`（长街尸潮 / Street Survival）

## 5.1 🔴 测试直接断言的 ID

| id | 断言 | tests 文件:行 |
|---|---|---|
| `btnStart` | `.onclick()` 开始坚守 | `street_test.js:85`；`meta_test.js:564` |
| `endTitle` | `textContent` 包含 **`'丧尸'`** | `street_test.js:274` |
| `volRange` | `.value === '40'`（从共享设置回读） | `meta_test.js:546` |

> ⚠️ `street_test.js:274` 是 `(els['endTitle'] ? els['endTitle'].textContent : '')` ——
> 用了 `?.` 式保护。即使元素不存在也会失败（空串不含 `丧尸`）。
> 当前 `street.html:358` 静态文案就是 `你被丧尸掩埋了…`，且 `street.html:2062` JS 也会写 `'你被丧尸掩埋了…'`。
> **重写时不要动 `#endTitle` 的 id 和初始文案。**

## 5.2 🟠 JS 需要的 ID（`street.html` 的 `getElementById` 全集，B9 起 49 个）

`ammo ammoBar banner bestTxt boostOpts boostOverlay boostTitle btnHome2 btnHome3 btnHub btnHub2
btnRestart btnRestart2 btnResume btnStart buffs chkFps chkShake cmdInfo cv diffEasy diffHard diffNorm
endOverlay endStats endSub endTitle feed flash flashes fpsTxt frags help hpbar kills loadoutInfo magCap
pauseHint pauseOverlay reloadProg score startOverlay streak timer vignette volRange waveInfo
weaponName zleft`

> **B9 追加**：`cmdInfo`（`#p2` 内指挥点读数）。`buildInfo` / `squadInfo` / `evacInfo` / `recruitRow`
> 是 B6 追加的 id，本节快照早于 B6；以源码为准。该处 JS 均有 null 守卫。
> **v3.2 追加**：`#acctLockOverlay`（未解锁时的拦截层，由 `acctShowLockIfNeeded()` 动态插入，
> 内含 `#acctLockGo`）；**游戏页不内嵌账户界面**（登录/建账户只在主页与整备大厅）。

> 🔴 注意 `street.html` **没有** `#btnReset` / `#btnAutoDoor` / `#keyGrid` —— 与 breach 不同，别混用。

## 5.3 🔴 `street.html` 的头部

- 🔴 `<meta charset="UTF-8">`（`street.html:4`）
- 🔴 `<link rel="stylesheet" href="../fontawesome-free-7.3.1-web/css/all.min.css">`（`:7`）
- 🔴 `<link rel="icon" href="../photo.ico" type="image/x-icon">`（`:8`）
- 🟠 33 个 `// ---------- 章节名 ----------` 标记（**不被任何测试校验**，保留成本为零）

## 5.4 🟠 `street.html` 的文件头 DOM 契约（`street.html:15-16` 原文）

```
· DOM 契约不变: #hpbar(.low)/#ammoBar/#reloadProg/#streak/#banner/#feed/
  #boostTitle/#boostOpts/.boostCard/#endStats/#fpsTxt(.hidden)/#help 等
  id 与 JS 生成的类名保持原样。
```
→ 照抄。

## 5.5 🟠 `street.html` 的 `role="dialog"` / `aria-*` / `<noscript>`（不被断言，建议保留）

- `:266` `<noscript>…本游戏需要启用 JavaScript…</noscript>`
- `:272` `#feed` `role="status" aria-live="polite" aria-atomic="false"`
- `:274` `#banner` `role="status" aria-live="polite"`
- `:304` `#startOverlay` `role="dialog" aria-modal="true" aria-label="开始游戏"`
- `:328` `#pauseOverlay` `role="dialog" aria-modal="true" aria-label="暂停菜单"`
- `:347` `#boostOverlay` `role="dialog" aria-modal="true" aria-label="强化选择"`
- `:356` `#endOverlay` `role="dialog" aria-modal="true" aria-label="战斗结算"`

## 5.6 🟠 `street.html` 的 FontAwesome 图标（实测：静态标记 21 个 + JS 注入若干）

静态标记（21，`grep` 脚本之前的部分）：
`fa-arrow-right-from-bracket fa-arrow-trend-up fa-bolt fa-bomb fa-coins fa-equals fa-gun fa-house
fa-layer-group fa-minus fa-pause fa-people-group fa-person-walking fa-play fa-plus fa-rotate-left
fa-rotate-right fa-screwdriver-wrench fa-skull fa-trowel fa-truck-fast`

JS 注入：`syncHelp()` → `fa-person-walking/fa-bomb/fa-trowel/fa-arrows-rotate`(B9)；
`BOOST_POOL` → `fa-fire fa-forward fa-heart-pulse fa-person-running fa-rotate-right fa-box-open
fa-layer-group fa-crosshairs`；`SQUAD` 职业 → `fa-gun fa-briefcase-medical fa-crosshairs
fa-screwdriver-wrench`。

> **B9 新增两个图标**：`fa-coins`（HUD 指挥点行）与 `fa-arrows-rotate`（操作提示里的旋转键）。
> 二者都必须在本地 `fontawesome-free-7.3.1-web/css/all.min.css` 免费集里存在（已核对）。

## 5.7 🔴 `street.html` 的 `WEAPON_DEFS` / `names` 短名表（原始源码正则）

见 §1.7：`meta_test.js:313-316`（`const names = {\w+: '...'}` 形态）与
`meta_test.js:337-348`（`const WEAPON_DEFS = {` … `\n};` 形态）。
🔴 `street.html` 的 `WEAPON_DEFS` 必须与 `breach.html` **同 id、同顺序、同全部字段数值**（6 把）。
🔴 升级短名表 `const names = {` 必须覆盖 breach 的全部升级 id（**有意缺 `vision` 与 `med`**，见 `meta_test.js:293`）。

---

# 6. Top 15 最高风险清单 / Top 15 highest-risk items

按"最容易踩 + 后果最重"排序：

| # | 风险 | 为什么致命 | 出处 |
|---|---|---|---|
| 1 | **CSS 里用了 `url(...)`** | `offline_test.js:26` 全文件正则，`background-image/mask/cursor/filter` 用了就红。所有装饰必须是纯渐变 + 伪元素 | `offline_test.js:26` |
| 2 | **CSS/JS 注释里出现 `//` + ASCII 字母数字或 `-`** | `offline_test.js:24` 的 `(?<!:)\/\/[a-zA-Z0-9.-]`，如 `//-foo`、`//36`、`//TODO` 一律红。注释必须 `// ` 带空格或 `//中文` | `offline_test.js:24` |
| 3 | **新增任何 `<link>`**（preload/preconnect/apple-touch-icon/manifest/第二个 css） | `offline_test.js:44` 的 `every()` 白名单只允许 1 个 fontawesome css + 1 个 `photo.ico`；`:45` 要求 `.css` 恰好 1 个 | `offline_test.js:41-46` |
| 4 | **在第一个 `<script>` 之前插入任何 `<script>`**（哪怕空块） | 23 个测试都取 `match(/<script>...<\/script>/)[1]`；插一个就全线炸 | `hub_test.js:8` 等 23 处 |
| 5 | **给主 `<script>` 加属性**（`type="module"` / `defer` / `id=`） | 正则是字面 `<script>` → `match` 返回 `null` → `TypeError` | 同上 |
| 6 | **改动 `breach.html` 的 TOC 块或章节标记** | `doc_test.js` 三重校验：≥40 章节、TOC 顺序一致、**条数 === 章节数**（47 vs 47） | `doc_test.js:19, 43-62` |
| 7 | **改动/移动 `<map-preview-data:auto>` 块**（index + hub） | `preview_test.js:110` 逐字节比较，含 BEGIN 行尾注释 | `preview_test.js:75, 94-110` |
| 8 | **在 `breach.html` 删掉 `蓝方5人` / `蓝方6人` 文案**，或引入 `蓝方7人`/`蓝方8人` | `meta_test.js:85-86` 原始子串断言，精确到字 | `meta_test.js:85-86` |
| 9 | **删掉 `.hidden{display:none}`** | 测试抓不到（桩的 classList 是空函数），但真实页面被覆盖层永久盖住 | 🟠 四页 |
| 10 | **破坏 `#hud{pointer-events:none}` + `#cv` 收事件的模式** | 真实浏览器无法瞄准/射击；测试直接对 `els['cv']` 派发事件，抓不到 | 🟠 `breach.html:58-59` |
| 11 | **删掉 JS 注入片段的类名样式**（`.upRow/.upIcon/.pips/.upBtn/.fbtn/.achRow/.dlRow/.hl/.keyCell/.kbtn/.boostCard/…`） | 测试全绿但升级/成就/每日/键位/强化面板全塌 | 🟠 `hub.html:1037-1167`、`breach.html:5035-5052`、`street.html:1240` |
| 12 | **`#dailyList` 的相对 `<b>` 结构变了** | `meta_test.js:116` 断言字面 `'<b>★★</b>'` | `meta_test.js:116` |
| 13 | **`#p1`/`#p2` 尺寸大幅变化却不同步 `PANEL_FALLBACK`** | 测试绿（桩无 `getBoundingClientRect`，走 fallback），真实浏览器 HUD 防遮挡误判 | `breach.html:4801-4809`、`meta_test.js:120-153` |
| 14 | **改 `#mm` (240×100) 或 `#mapPrev` (560×233 / 480×200) 的 width/height 属性** | 测试桩给 0/固定值 → 测试抓不到；真实小地图/预览缩放错乱 | 🟠 §1.12 |
| 15 | **引入 emoji 或禁用符号（`✓` `⚠` `⚡` `✅` `✔️`）** | `offline_test.js:9` 码点区间 + `:52` 白名单；`✔️` 因 `U+FE0F` 也会红 | `offline_test.js:8-9, 51-53` |

**并列第 15（同样高危）**：
- 🔴 改 `breach.html` 的 `#btnAutoDoor` 文案少了全角冒号：断言是 `'自动开门：开'`（`:596`）。
- 🔴 改 `#btnCross` 文案少了 `'纯十字'`（`:371`）或 `#sensVal` 少了 `'1.50'`（`:372`）。
- 🔴 把 `hub.html` 的 `setWeapon('ar')` 等 6 处从 JS 挪进 HTML `onclick` 属性并删掉 JS 行 →
  `meta_test.js:332` 的 `hubRaw.indexOf("setWeapon('" + w + "')") >= 0` 失败。

---

# 7. 重写后的验证流程 / Verification workflow

```powershell
# 1) 快链（<1s，最先跑，能第一时间拦住 A 层犯规）
cd 'W:\AI Code DSH'
node tests/offline_test.js      # 网络 / emoji / link / charset / <script>
node tests/doc_test.js          # breach TOC 章节
node tests/preview_test.js      # index + hub 地图预览数据块

# 2) 标记相关重点
node tests/meta_test.js         # 蓝方N人文案 / 代码形状 / panelhide / 各 UI 文案
node tests/tutorial_test.js     # index 导航 + 战绩显示
node tests/hub_test.js          # hub 交互 + breach loadoutInfo
node tests/protocol_test.js     # 设置/存档槽位 + toast 文案

# 3) 全量门禁（~170s，唯一权威）
node tests/run_all.js           # 期望：22/22 通过, 0 失败
node tests/run_all.js -v        # 失败时打印 FAIL/Error 明细
```

**如果 `preview_test.js` 报 `预览数据与游戏地图不一致`**：说明动到了数据块（不该发生）。
先 `git diff` 确认，**不要**直接跑 `--write` 掩盖问题。

---

## 7.5 附录：一键硬约束自检脚本 / One-shot hard-constraint self-check

把下面这段存成**临时**文件（例如 `%TEMP%\ui_check.js`，**不要**放进项目目录），
在工作区根目录执行 `node %TEMP%\ui_check.js`，即可在你每次改完一页后 1 秒内
拿到全部 🔴 硬约束的通过/失败清单（比跑全量门禁快 170 倍）：

```js
// ui_check.js —— 四页 UI 硬约束自检（只读，不修改任何文件）
const fs = require('fs');
const PAGES = ['index.html', 'game/hub.html', 'game/breach.html', 'game/street.html'];
const ALLOWED = new Set(['★','☆','●','○','■','□','◆','▲','►','▶','→','×','·','｜','↔','—','…','✔']);
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2764}]/gu;
const NET = [
  ['http(s)://',      /https?:\/\//],
  ['协议相对 //',      /(?<!:)\/\/[a-zA-Z0-9.-]/],
  ['@import',         /@import/],
  ['url(...)',        /url\(/],
  ['fetch(',          /fetch\(/],
  ['XMLHttpRequest',  /XMLHttpRequest/],
  ['WebSocket',       /WebSocket/],
  ['<script src=',    /<script[^>]+src=/],
  ['<iframe',         /<iframe/],
  ['<img src=',       /<img[^>]+src=/],
  ['importScripts',   /importScripts/],
  ['font-face',       /font-face/],
];
let bad = 0;
const ck = (c, m) => { if (!c) { bad++; console.log('  FAIL  ' + m); } else console.log('  ok    ' + m); };
for (const f of PAGES) {
  const h = fs.readFileSync(f, 'utf8');
  console.log('=== ' + f + ' ===');
  for (const [n, re] of NET) ck(!re.test(h), 'no ' + n + (re.test(h) ? '  <-- ' + JSON.stringify((h.match(new RegExp(re.source,'g'))||[]).slice(0,4)) : ''));
  const links = [...h.matchAll(/<link[^>]+href=["']([^"']*)["']/g)].map(m => m[1]).filter(Boolean);
  ck(links.every(l => /^(?:\.\.\/)?(?:fontawesome-free-[^\/]+\/css\/all\.min\.css|photo\.ico)$/.test(l)), 'link whitelist ' + JSON.stringify(links));
  ck(links.filter(l => /\.css$/i.test(l)).length === 1, 'exactly 1 css link');
  ck(links.filter(l => /\.ico$/i.test(l)).length <= 1, '<=1 ico link');
  ck(/<meta charset="UTF-8">/.test(h), 'exact <meta charset="UTF-8">');
  ck((h.match(/<script/g) || []).length === 1 && /<script>/.test(h), 'exactly 1 <script>, literal tag, and it is the 1st');
  ck(/<script>([\s\S]*?)<\/script>/.test(h), 'script extractable');
  ck((h.match(/<style/g) || []).length === 1, 'exactly 1 <style>');
  const em = [...new Set([...h.matchAll(EMOJI_RE)].map(m => m[0]).filter(c => !ALLOWED.has(c)))];
  ck(em.length === 0, 'no emoji/dingbat residue ' + JSON.stringify(em));
  ck(h.indexOf('prefers-reduced-motion') >= 0, 'prefers-reduced-motion block present (soft)');
  const secs = (h.match(/^\s*\/\/ -{6,}\s*(.+?)\s*-{6,}\s*$/gm) || []).length;
  console.log('  info  // ------ section markers: ' + secs);
}
// index + hub: map preview block presence
for (const f of ['index.html', 'game/hub.html']) {
  const h = fs.readFileSync(f, 'utf8');
  ck(h.indexOf('// <map-preview-data:auto>') >= 0 && h.indexOf('// </map-preview-data:auto>') >= 0,
     f + ': map-preview-data block markers');
}
// breach only: TOC + 蓝方N人文案 + 章节条数
{
  const h = fs.readFileSync('game/breach.html', 'utf8');
  const i0 = h.indexOf('【目录 TABLE OF CONTENTS】');
  const END = '============================================================================ */';
  const iEnd = i0 >= 0 ? h.indexOf(END, i0) : -1;
  ck(i0 >= 0 && iEnd > i0, 'breach: TOC block bound by 76 x "=" + " */"');
  const secs = [...h.matchAll(/^\s*\/\/ -{6,}\s*(.+?)\s*-{6,}\s*$/gm)].map(m => m[1]);
  ck(secs.length >= 40, 'breach: >=40 section markers (' + secs.length + ')');
  const toc = i0 >= 0 && iEnd > i0 ? h.slice(i0, iEnd) : '';
  const names = toc.split('\n').map(l => l.trim().match(/^\d+\s+(.+?)(?:\s*\.{3,}.*)?$/)).filter(Boolean)
                   .map(m => m[1].trim()).filter(n => n && n.indexOf('【') < 0);
  ck(names.length === secs.length, 'breach: TOC entries === section count (' + names.length + ' vs ' + secs.length + ')');
  let cur = 0, ooo = [], miss = [];
  for (const n of secs) { const at = toc.indexOf(n, cur); if (at < 0) (toc.indexOf(n) >= 0 ? ooo : miss).push(n); else cur = at + n.length; }
  ck(miss.length === 0 && ooo.length === 0, 'breach: TOC covers all sections in order ' + JSON.stringify({ miss, ooo }));
  ck(h.indexOf('蓝方5人') >= 0 && h.indexOf('蓝方6人') >= 0, "breach: contains '蓝方5人' + '蓝方6人'");
  ck(h.indexOf('蓝方7人') < 0 && h.indexOf('蓝方8人') < 0, "breach: no '蓝方7人' / '蓝方8人'");
}
console.log(bad ? '\nUI CHECK FAILED (' + bad + ')' : '\nUI CHECK PASSED (all hard constraints)');
process.exit(bad ? 1 : 0);
```

**用法建议**：每改完一页就跑一次本脚本（毫秒级），
最后再跑 `node tests/run_all.js` 做权威验收（~170s）。

---

# 8. 一句话总结 / TL;DR

> 只要满足这 6 条，四页 `<style>` + body 标记可以从零重写而**不破任何测试**：
>
> 1. `<script>` 仍是**唯一且第一个**、无属性、之前不插任何脚本；
> 2. `<meta charset="UTF-8">` + **恰好 1 个** FontAwesome `<link>` + **至多 1 个** `photo.ico`，无其他 `<link>`；
> 3. CSS 里**没有** `url(` / `@import` / `font-face` / `http://` / `//字母`；
> 4. 字符只用 `★ ☆ ● ○ ■ □ ◆ ▲ ► ▶ → × · ｜ ↔ — … ✔` + 安全 Unicode 区（箭头/几何图形/全角），**零 emoji、零 U+FE0F**；
> 5. `breach.html` 的 47 个 `// ------ 章节 ------` 与文件头 TOC、`index.html`/`hub.html` 的 `<map-preview-data:auto>` 块、
>    `蓝方5人`/`蓝方6人` 文案 **一字不动**；
> 6. 全部 JS 用到的 `id` / 类名 / `data-*` / canvas `width,height` 属性保留原样
>    （测试桩抓不到，但这是真实页面的命脉）。
