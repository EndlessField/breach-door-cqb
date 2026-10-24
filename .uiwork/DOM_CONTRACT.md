# DOM Contract Report — 破门而入 (4 pages)

Generated for a **complete rewrite of the `<style>` block and static markup** with the
JavaScript left untouched.

Project root: `W:\AI Code DSH`

| Page | File | `<style>` | markup region | `<script>` |
|---|---|---|---|---|
| Home | `index.html` | 9–410 | 411–667 | 668–1182 |
| Loadout hall | `game/hub.html` | 9–342 | 343–544 | 545–1364 |
| Main game | `game/breach.html` | 9–312 | 313–460 | 461–5253 |
| Street mode | `game/street.html` | 9–263 | 264–368 | 369–2650 |

> **Line numbers verified by locating `</style>` / `<script>` directly** (grep). Note:
> `Get-Content` in this shell mis-decodes these UTF-8-no-BOM files and drops ~370 "lines";
> all line numbers here come from `File.ReadAllLines(path, UTF8)` and match the editor/grep view.

> **v3.1 / v3.2 追加区块（本文件的页码快照早于它们）**：四个页面在"档案槽位协议"之前各插入了三块
> **逐字节一致**的共享代码，用哨兵注释圈定：
> `// >>> ACCT-CRYPTO-BEGIN … // <<< ACCT-CRYPTO-END`（v3.1 加密原语，四页一致）、
> `// >>> ACCT-CORE-BEGIN … // <<< ACCT-CORE-END`（v3.2 账户与本地加密存储，四页一致）、
> `// >>> ACCT-UI-BEGIN … // <<< ACCT-UI-END`（v3.2 账户界面，仅主页/整备大厅，两页一致）。
> 三个区块内部的 `/* ---------- 小标题 ---------- */` 刻意用块注释：`breach.html` 的
> `// ---------- 章节 ----------` 标记被 `doc_test.js` 与 TOC 强绑定，模块内小标题不能写成那种形式。
> `tests/account_test.js` 会逐字节比对这三块副本（改一页忘改另一页 → 直接红）。
> **v3.2 排行榜**再追加第四块：`// >>> BOARD-BEGIN … // <<< BOARD-END`（本地排行榜，四页一致，
> `tests/board_test.js` 守护）—— 榜单是**机器级明文**（键 `breach_game_board`），故意不走账户加密；
> 主页/整备大厅各有一个静态面板 `#boardSheet` / `#boardPanel` / `#btnBoardClear`，游戏页只用它的写入函数。
> **图标**：星级、升级等级圆点、榜单名次/撤离/尸王标记从 v3.2 起一律用本地 FontAwesome 图标
> （`fas fa-star` / `far fa-star` / `fas fa-circle` / `fa-trophy` 等），页面里不再出现 ★☆●○ 字符。
> 这两版之后各页面还多了：主页/整备大厅的账户界面（动态 DOM，无静态标记）与游戏页的
> `#acctLockOverlay` 拦截层；`lsGet` / `lsSet` 已改为走 `vaultRead` / `vaultWrite`。

> ⚠ **Live edit in progress:** during this analysis `index.html` was rewritten by another process
> (mtime 15:25:57; style 9–319→9–410, markup 320–541→411–667, script 542–1023→668–1182).
> **Its 29 ids and its complete JS id-lookup set are unchanged**, so the contract below is still
> accurate; the §1.1 line numbers, §1.7 markup-class names and §1.8 icon list were re-verified
> against the post-rewrite file. `hub.html`, `breach.html` and `street.html` were untouched
> (mtimes 11:37 / 11:25 / 11:25) — if they change later, re-run the same scan before trusting §2–§4.

---

## 0. Global invariants (apply to every page)

### 0.1 Hard rules enforced by `tests/offline_test.js` (your rewrite WILL be tested against these)

The test reads the **raw HTML text** of all four files and asserts:

1. **No `https?://`** anywhere (CSS comments included).
2. **No protocol-relative `//…`** (regex `(?<!:)\/\/[a-zA-Z0-9.-]` — this also catches `//` comments
   that start with a letter/digit! Use `/* */` or `//` never followed by `[a-zA-Z0-9.-]`).
3. **No `@import`, no `url(`, no `font-face`** — i.e. **no CSS `background-image`, no `@font-face`,
   no data-URI images, no `cursor: url(...)`.** Backgrounds must be gradients/`border-image`/shapes.
4. **No `fetch(`, `XMLHttpRequest`, `WebSocket`, `importScripts`, `<script … src=…>`, `<iframe`,
   `<img … src=…`.**
5. `<link href>` values must match exactly `^(?:\.\.\/)?(?:fontawesome-free-[^\/]+\/css\/all\.min\.css|photo\.ico)$`
   — exactly **one** `.css` link and **at most one** `.ico` link.
6. **No emoji characters.** Allowed Unicode: `★ ☆ ● ○ ■ □ ◆ ▲ ► ▶ → × · ｜ ↔ — … ✔`.
7. `/<meta charset="UTF-8">/` must be present **verbatim**.
8. `/<script>([\s\S]*?)<\/script>/` must match → **the script tag must be exactly `<script>`
   with no attributes** (all game tests extract the JS with this regex; adding `defer`, `type`, or an
   `id` to the tag breaks 20+ tests).

### 0.2 `tests/meta_test.js` raw-text assertions

* `breach.html` raw text **must contain the literal strings `蓝方5人` and `蓝方6人`**, and must **not**
  contain `蓝方7人` / `蓝方8人`. (Currently in the start-overlay difficulty buttons' `<small>`.)
* hub/breach/street are grepped for JS constant blocks (`const X = [`) — JS must keep its shape.

### 0.3 Structural conventions JS depends on

* **`#hud` is `pointer-events:none`**; every interactive descendant inside it must re-enable
  `pointer-events:auto` (currently `#toolbar`, `.diffBtn`, `#keyGrid`, `.kbtn`, `.bigbtn` do).
* **Overlays are siblings of `#hud`** (`.overlay` + `.card`), used with class `hidden`
  (`display:none!important`) and `classList.toggle('hidden', …)`.
* JS writes element **text via `textContent`** and **content via `innerHTML`** — markup inner
  placeholders are disposable, **but the element itself and its wrapper structure must survive**.
* JS frequently does `el.className = '<base>' + (cond ? ' <mod>' : '')`, which **wipes any extra
  classes you put on that element in markup**. Affected elements are flagged per page.

---

## 1. `index.html` — home page (post-rewrite: style 9–410, markup 411–667, script 668–1182)

### 1.1 Static element ids (29)

> **Post-rewrite positions (same 29 ids, same roles):**
> `btnTut`@437, `btnPrep`@445, `btnStart`@453, `btnStreet`@461, `statsBar`@471, `stRank`@472,
> `stWins`@473, `stLosses`@474, `stKills`@475, `stStars`@476, `stPts`@477, `slotRow`@480,
> `slotBtn1`@485, `slotBtn2`@486, `slotBtn3`@487, `btnExport`@494, `btnImport`@495,
> `btnResetData`@496, `importFile`@497, `shareHint`@499, `mapPrev`@519, `mapTabHouse`@526,
> `mapTabWarehouse`@527, `mapTabFactory`@528, `mapTabOffice`@529, `mapTabParking`@530,
> `mapTag`@532, `tutorial`@561, `btnTutGo`@625.
> The `line` column below is from the **pre-rewrite** file (320–541); content/roles are unchanged.

| id | line | what it is (role / visible label) | Referenced by JS? |
|---|---|---|---|
| `btnTut` | 342 | Entry button “新手教程 · 10 张图文卡片” (scrolls to `#tutorial`) | **yes** — `onclick` → `scrollIntoView` |
| `btnPrep` | 347 | Entry button “战前准备与升级” → `game/hub.html` | **yes** — `onclick` → `go(HUB_FILE)` |
| `btnStart` | 352 | Entry button “开始游戏” → `game/breach.html` | **yes** — `onclick` → `go(GAME_FILE)` |
| `btnStreet` | 357 | Entry button “丧尸围城 · 长街尸潮” → `game/street.html` | **yes** — `onclick` → `go(STREET_FILE)` |
| `statsBar` | 364 | Status strip container (rank / wins / losses / kills / stars / points) | no — layout only |
| `stRank` | 365 | Rank value cell (default `列兵`) | **yes** — `textContent` |
| `stWins` | 366 | Wins value cell | **yes** — `textContent` |
| `stLosses` | 367 | Losses value cell | **yes** — `textContent` |
| `stKills` | 368 | Total kills cell | **yes** — `textContent` |
| `stStars` | 369 | Best stars cell (`☆` / `★★☆`) | **yes** — `textContent` |
| `stPts` | 370 | Military points cell | **yes** — `textContent` |
| `slotRow` | 373 | “Data Vault / 档案槽位” row wrapper | no — layout only |
| `slotBtn1` | 378 | Archive slot 1 button (empty in markup) | **yes** — `'slotBtn'+n`, `className` + `innerHTML` rewritten |
| `slotBtn2` | 379 | Archive slot 2 button (empty in markup) | **yes** — same |
| `slotBtn3` | 380 | Archive slot 3 button (empty in markup) | **yes** — same |
| `btnExport` | 387 | Button “导出存档 (json)” | **yes** — `onclick` |
| `btnImport` | 388 | Button “导入存档” (clicks `#importFile`) | **yes** — `onclick` |
| `btnResetData` | 389 | Button “重置进度” (confirm + reset) | **yes** — `onclick` |
| `importFile` | 390 | Hidden `<input type=file id=importFile accept=".json…">` | **yes** — `addEventListener('change')`, `.click()`, `.value=''` |
| `shareHint` | 392 | Hint line, `role="status" aria-live="polite"`, icon + `<span>` | **yes** — `className` + `innerHTML` rewritten |
| `mapPrev` | 406 | `<canvas id="mapPrev" width="560" height="233">` map preview | **yes** — `getContext('2d')`, `.width/.height` read |
| `mapTabHouse` | 408 | Preview tab “户型图” | **yes** — `'mapTab'+Cap`, `className` rewritten |
| `mapTabWarehouse` | 409 | Preview tab “仓库” | **yes** — same |
| `mapTabFactory` | 410 | Preview tab “工厂” | **yes** — same |
| `mapTabOffice` | 411 | Preview tab “写字楼” | **yes** — same |
| `mapTabParking` | 412 | Preview tab “地下车库” | **yes** — same |
| `mapTag` | 414 | Map name / note line (`<span id="mapTag">户型图</span>`) | **yes** — `innerHTML` replaced with `<b>name</b><span class="slash">/</span>note` |
| `tutorial` | 443 | `<section class="panel" id="tutorial">` — 10 tutorial cards | **yes** — `scrollIntoView({behavior:'smooth'})` |
| `btnTutGo` | 503 | Button “进入互动教程” → `breach.html?tutorial=1` | **yes** — `onclick` |

### 1.2 ids JS looks up that are NOT in static markup

**None.** All 19 literal `getElementById` ids resolve; the two dynamic patterns also resolve:

| dynamic pattern | resolves to | exists? |
|---|---|---|
| `getElementById('slotBtn' + n)` n=1..3 | `slotBtn1..3` | yes |
| `getElementById('mapTab' + Capitalize(id))` | `mapTabHouse/Warehouse/Factory/Office/Parking` | yes |

### 1.3 ids created dynamically by JS

None (the only `createElement` is a throw-away `<a download>` appended to `document.body` for the
JSON export — line 648–651, no id).

### 1.4 CSS classes referenced by JS

| class | where | fragment / variable | notes |
|---|---|---|---|
| `hintline` | `setHint()` line 632 | `el.className = 'hintline' + (okCls ? ' ' + okCls : '')` | **base class is re-written from JS** — must stay defined |
| `ok` / `bad` | same | modifier appended to `hintline` | `.hintline.ok`, `.hintline.bad` must exist |
| `mtab` | `selectMapPrev()` line 965 | `b.className = 'mtab' + (k === id ? ' on' : '')` | **`className` fully replaced** — extra markup classes on tabs are wiped |
| `on` | same | selected-tab modifier | `.mtab.on` |
| `slot` | `renderSlots()` line 718 | `el.className = 'slot' + (n === cur ? ' on' : '')` | **`className` fully replaced** |
| `on` | same | selected-slot modifier | `.slot.on` |
| `sn`, `sv`, `sm` | `renderSlots()` lines 719–723 | injected `innerHTML` into each `#slotBtn{n}` | 3 lines of slot text |
| `slash` | `selectMapPrev()` line 970 | injected `innerHTML` into `#mapTag` | separator span |
| (icons in fragments) | `setHint` / `renderSlots` | `fa-circle-info`, `fa-circle-check`, `fa-triangle-exclamation`, `fa-folder`, `fa-folder-open` | see §1.8 |

### 1.5 Cosmetic / timing coupling

* `#slotBtn{n}` — markup content is thrown away at load (`renderSlots()` runs immediately);
  `className` is reset to `slot[ on]`, so **any decorative class you add in markup is lost**.
* `#mapTag` — inner HTML replaced at load by `selectMapPrev('house')`. Its child `<span id="mapTag">`
  must stay an inline text holder.
* `#shareHint` — first child must be the icon `<i>`, text in a trailing `<span>` (comment at line 626
  states this explicitly); `className` replaced, `innerHTML` replaced, and a 4 s timer restores the
  default. Height changes must not reflow the button row badly (it sits between `.tools` and `<main>`).
* `#mapPrev` — `drawMap()` uses the **attribute** size (`cv2.width = 560`, `cv2.height = 233`) and the
  shared `2400×1000` world coordinate system (`s = cv2.width / MAP.W`). CSS keeps `width:100%`; if you
  change the CSS box you **must keep the 560:233 aspect ratio** or the map preview distorts.
  It also reads `cv2.width` for scale, so do **not** set a CSS-only size without attributes.
* `#tutorial` must be a normal in-flow block (scroll target), not a fixed overlay.
* Note: a `RangeError` guard comment at line 695 says a crash in `drawMap()` used to abort the script —
  `rstats`/`drawMap` run at boot, so **anything that throws at load kills the whole page**.

### 1.6 Navigation & resource links

| kind | value |
|---|---|
| `<link rel="stylesheet" href>` | `fontawesome-free-7.3.1-web/css/all.min.css` (line 7, relative to root) |
| `<link rel="icon" href>` | `photo.ico` (line 8) |
| `<script src>` | none (inline) |
| JS navigation | `GAME_FILE = 'game/breach.html'`, `HUB_FILE = 'game/hub.html'`, `STREET_FILE = 'game/street.html'`; `go(url){ location.href = url }`; tutorial → `game/breach.html?tutorial=1` |
| `<a href>` in markup | none |

### 1.7 Canvas & overlays

* **Canvas:** `#mapPrev` — `<canvas id="mapPrev" width="560" height="233">` inside
  `<div class="mapframe">`; CSS `#mapPrev{display:block;width:100%;background:#0a0a0b}`,
  `.mapframe` adds padding + corner brackets via `::before/::after`.
  Post-rewrite the frame also contains decorative `.north` and is followed by `.scalewrap`
  (`.scalebar` + `.sc`) — pure decoration, no JS.
* **Overlays / modals:** none. `#tutorial` is an inline sheet (`section.sheet`, post-rewrite;
  `section.panel` pre-rewrite) used as a scroll target. No dialogs on this page.
* **Post-rewrite structural class names** (for reference, all JS-irrelevant):
  `header.board > .masthead(.mark,.htxt,.hmeta,.tb>.tb-i>.tb-k/.tb-v)`, `nav.entry > button.go-card`
  (`.xref`, `.gx > .gt/.gs`, `.go`, modifiers `.is-primary`/`.is-danger`), `.statusbar > .stat`,
  `.vault > .vault-label/.vault-util + button.slot`, `.tools`, `.hintline`,
  `main > section.sheet > .sheet-head(.tick,.t,.tb) + .sheet-body`, `.brief-row > .mapcol/.briefcol`,
  `.krow > .kk + .kv`, `.steps > .step`, `.tips > .tip`, `.mapTabs > button.mtab`,
  `.mapTag`, `.mapframe`, `.scalewrap`, `footer > .foot(.dia,.slash,.right)`.

### 1.8 Icon inventory (markup, 41 — post-rewrite)

```
fa-arrow-down, fa-arrow-right, fa-arrows-up-down, fa-bolt, fa-bomb, fa-box-open, fa-building,
fa-bullseye, fa-calendar-day, fa-circle-info, fa-clipboard-list, fa-cloud, fa-coins, fa-couch,
fa-crosshairs, fa-door-closed, fa-door-open, fa-explosion, fa-eye, fa-eye-slash, fa-file-export,
fa-file-import, fa-gun, fa-hand-fist, fa-house, fa-industry, fa-lightbulb, fa-map-location-dot,
fa-person-chalkboard, fa-person-walking, fa-plug, fa-ranking-star, fa-robot, fa-satellite-dish,
fa-skull, fa-square-parking, fa-star, fa-trash-can, fa-trophy, fa-volume-high, fa-warehouse
```

> The rewrite replaced the entry-button icons: `fa-chevron-down`/`fa-chevron-right`/`fa-play`/
> `fa-screwdriver-wrench` → `fa-arrow-down` / `fa-arrow-right`. (Pre-rewrite list had 43 icons.)

Additional icons injected by JS (`innerHTML`): `fa-circle-info`, `fa-circle-check`,
`fa-triangle-exclamation`, `fa-folder`, `fa-folder-open`.
(all prefixed `fas` in markup: `class="fas fa-xxx"`.)

---

## 2. `game/hub.html` — loadout hall (markup 343–544, script 545–1364)

### 2.1 Static element ids (51)

| id | line | what it is | Referenced by JS? |
|---|---|---|---|
| `toast` | 346 | Fixed toast notification (`role="status"`), top-center | **yes** — `textContent`, `classList.add/remove('show')`, `style.opacity` |
| `pts` | 364 | Top-bar military points readout (`军功点 0`) | **yes** — `textContent` |
| `btnHome` | 366 | Button “返回主页” → `../index.html` | **yes** — `onclick` |
| `mapPrev` | 382 | `<canvas id="mapPrev" width="480" height="200">` map preview | **yes** — `getContext('2d')`, `.width/.height` |
| `slotBtns` | 398 | Container `<b id="slotBtns">` for 3 archive buttons | **yes** — `innerHTML` replaced, then `querySelectorAll('button[data-slot]')` |
| `stWins` | 399 | 胜利 value | **yes** — `textContent` |
| `stLosses` | 400 | 失败 value | **yes** — `textContent` |
| `stKills` | 401 | 总击杀 value | **yes** — `textContent` |
| `stStars` | 402 | 最高星级 value | **yes** — `textContent` |
| `stDmg` | 403 | 累计伤害 value | **yes** — `textContent` |
| `stPts` | 404 | 军功点 value | **yes** — `textContent` |
| `stRank` | 405 | 军衔 value | **yes** — `textContent` |
| `btnRankUp` | 405 | Button “晋升” (rank-up) | **yes** — `disabled`, `onclick` |
| `rankInfo` | 406 | Line “晋升消耗 4 军功点 → 上等兵” | **yes** — `innerHTML` replaced (icon + text) |
| `stAcc` | 409 | 总命中率 | **yes** — via `set('stAcc', …)` `textContent` |
| `stShots` | 410 | 累计开枪 / 命中 | **yes** — `set('stShots', …)` |
| `stLong` | 411 | 最远击杀 | **yes** — `set('stLong', …)` |
| `stStreak` | 412 | 最长连杀 | **yes** — `set('stStreak', …)` |
| `stGKills` | 413 | 投掷物击杀 | **yes** — `set('stGKills', …)` |
| `stTime` | 414 | 累计战斗时长 | **yes** — `set('stTime', …)` |
| `stWinStreak` | 415 | 当前 / 最高连胜 | **yes** — `set('stWinStreak', …)` |
| `stStreet` | 416 | 长街尸潮最佳 | **yes** — `set('stStreet', …)` |
| `stBosses` | 417 | 击败尸王 | **yes** — `set('stBosses', …)` |
| `achCount` | 426 | Panel-head counter `0/15` | **yes** — `textContent` |
| `achFilter` | 429 | Filter row container (`class="achFilterRow"`) | **yes** — `className` reset + `innerHTML` replaced |
| `achList` | 430 | Achievement list container | **yes** — `innerHTML` replaced |
| `btnWAr` | 446 | Weapon button 突击步枪 (has `sel` in markup) | **yes** — `classList.toggle('sel')`, `onclick` |
| `btnWSmg` | 447 | Weapon button 冲锋枪 | **yes** — same |
| `btnWShotgun` | 448 | Weapon button 霰弹枪 | **yes** — same |
| `btnWSniper` | 449 | Weapon button 狙击枪 | **yes** — same |
| `btnWLmg` | 450 | Weapon button 轻机枪 | **yes** — same |
| `btnWDmr` | 451 | Weapon button 精确射手 | **yes** — same |
| `weaponInfo` | 453 | `<div class="weaponInfo">` stat readout | **yes** — `innerHTML` replaced (`meta_test` asserts it contains the weapon name) |
| `diffEasy` | 465 | Difficulty button 简单 | **yes** — `classList.toggle('sel')`, `onclick` |
| `diffNorm` | 466 | Difficulty button 标准 (has `sel`) | **yes** — same |
| `diffHard` | 467 | Difficulty button 困难 | **yes** — same |
| `btnMapHouse` | 480 | Map button 户型图 (has `sel`) | **yes** — `classList.toggle('sel')`, `onclick` |
| `btnMapWarehouse` | 481 | Map button 仓库 | **yes** — same |
| `btnMapFactory` | 482 | Map button 工厂 | **yes** — same |
| `btnMapOffice` | 485 | Map button 写字楼 | **yes** — same |
| `btnMapParking` | 486 | Map button 地下车库 | **yes** — same |
| `upgradeList` | 499 | Upgrade list container | **yes** — `innerHTML=''` then `appendChild` rows |
| `dlToday` | 512 | `<p id="dlToday">` today's daily-rule line | **yes** — `textContent` |
| `dailyList` | 513 | 7-day daily record container | **yes** — `innerHTML` replaced |
| `btnGo` | 520 | Button “开始行动” → breach | **yes** — `onclick` |
| `btnGame` | 524 | Button “直接进入游戏” → breach | **yes** — `onclick` |
| `btnStreet` | 528 | Button “丧尸围城 · 长街” → street | **yes** — `onclick` |
| `btnExport` | 534 | Button “导出存档” | **yes** — `onclick` |
| `btnImport` | 535 | Button “导入存档” | **yes** — `onclick` |
| `btnReset` | 536 | Button “重置全部进度” | **yes** — `onclick` |
| `importFile` | 539 | Hidden `<input type=file>` | **yes** — `addEventListener('change')`, `.click()` |

### 2.2 ids JS looks up that are NOT in static markup

**None statically-missing.** But two dynamic patterns need the containers above:

| dynamic pattern | resolves to | exists? |
|---|---|---|
| `document.getElementById(WEAPON_BTN_ID[id])` (line 974) | `btnWAr / btnWSmg / btnWShotgun / btnWSniper / btnWLmg / btnWDmr` | yes (all 6 in markup) |
| `document.getElementById('upBtn_' + d.id)` (line 1173) | `upBtn_hp`, `upBtn_speed`, `upBtn_aim`, `upBtn_vision`, `upBtn_ammo`, `upBtn_frag`, `upBtn_flash`, `upBtn_robHp`, `upBtn_robDmg`, `upBtn_reload`, `upBtn_dmg`, `upBtn_rate`, `upBtn_armor`, `upBtn_med`, `upBtn_robSpd`, `upBtn_throwRng`, `upBtn_quiet`, `upBtn_scavenge` | **created by JS** — see §2.3 |
| `set(id, txt)` helper line 1108 (`getElementById(id)`) | `stAcc, stShots, stLong, stStreak, stGKills, stTime, stWinStreak, stStreet, stBosses` | yes (all in markup) |

Note the helper is null-safe (`if (n)`), so a missing stat cell silently renders nothing.

### 2.3 ids created dynamically by JS

`renderUpgrades()` (lines 1152–1188) builds one `<div class="upRow">` per `UPGRADE_DEFS` entry and
appends it to **`#upgradeList`**; inside it a `<button class="upBtn…" id="upBtn_<id>">`:

```html
<div class="upRow[max]">
  <div class="upIcon"><i class="fas <d.fa>"></i></div>
  <div class="upInfo"><span class="nm">name</span><div class="ds">desc</div></div>
  <div class="pips">●●<span class="off">○</span></div>
  <button class="upBtn[maxed]" id="upBtn_<id>" [disabled]>+cost|已满</button>
</div>
```

18 upgrade ids: `hp, speed, aim, vision, ammo, frag, flash, robHp, robDmg, reload, dmg, rate, armor,
med, robSpd, throwRng, quiet, scavenge`.

`renderSlots()` (lines 1130–1151) builds 3 buttons into **`#slotBtns`**:
`<button class="slotBtn[ sel]" data-slot="1|2|3" title="…">档案N</button>` — then binds
`querySelectorAll('button[data-slot]')` (`data-slot` attribute is a hard contract).

`renderAch()` (lines 1026–1057) builds filter buttons into **`#achFilter`**:
`<button class="fbtn[ sel]" data-f="all|on|off">…</button>` — then binds
`querySelectorAll('button[data-f]')` (`data-f` is a hard contract).

`renderAch()` also rewrites `#achList` with repeated:
```html
<div class="achRow[ on]">
  <div class="ac"><i class="fas fa-xxx"></i></div>
  <div class="ai"><span class="an">name</span><div class="ad">desc</div></div>
  [<span class="aSt">已解锁</span>]
</div>
```

`renderDaily()` (lines 1062–1096) rewrites `#dailyList` with:
```html
<div class="dlRow[ none]"><span class="dlD">M/D(今)</span><b>★★★</b><span class="dlT">m:ss</span></div>
```

`renderWeapons()` (lines 972–990) rewrites `#weaponInfo` with `<b><i class="fas …"></i> name</b><br>`
plus `<span class="mono">DMG</span> …` etc.

### 2.4 CSS classes referenced by JS

| class | source | fragment / variable | notes |
|---|---|---|---|
| `show` | `toast()` 962/966 | `el.toast.classList.add/remove('show')` | `.toast.show` |
| `weaponInfo` | markup only (line 453) | comment line 969: *“class="weaponInfo" 保持不变”* | **must keep the class name on `#weaponInfo`** |
| `mono` | `renderWeapons()` 981–983 | `<span class="mono">DMG</span>` | ⚠ **`mono` is NOT defined in the current `<style>` block** — latent bug; either define it or expect default mono-less fallback |
| `achFilterRow` | `renderAch()` 1038 | `fb.className = 'achFilterRow'` | **className fully replaced**; also the markup already has `class="achFilterRow"` on `#achFilter` |
| `fbtn` + `sel` | `renderAch()` 1037 | injected into `#achFilter` | `.fbtn`, `.fbtn.sel` |
| `achRow` + `on` | `renderAch()` 1048 | injected into `#achList` | `.achRow`, `.achRow.on` |
| `ac`, `ai`, `an`, `ad`, `aSt` | `renderAch()` 1049–1051 | injected | icon box / info / name / desc / “已解锁” badge |
| `dlRow` + `none`, `dlD`, `dlT` | `renderDaily()` 1090/1092 | injected into `#dailyList` | `.dlRow.none` = empty-day variant |
| `slotBtn` + `sel` | `renderSlots()` 1136 | injected into `#slotBtns` | `.slotBtn`, `.slotBtn.sel` |
| `upRow` + `max` | `renderUpgrades()` 1161 (`row.className = …`) | appended to `#upgradeList` | `.upRow`, `.upRow.max` |
| `upIcon`, `upInfo`, `nm`, `ds`, `pips`, `off`, `upBtn` + `maxed` | `renderUpgrades()` 1163–1167 | injected row content | `.pips .off` = un-owned level dots; `.upBtn.maxed` = maxed state |
| `note-i` | `renderRank()` 1208 | `rankInfo.innerHTML = '<i class="fas fa-circle-info note-i">…'` | muted-info icon; also used in markup |
| `sel` | `renderWeapons/setDiff/setMapSel` | `classList.toggle('sel', …)` on 6 weapon + 3 diff + 5 map buttons | selection state for 14 buttons |

### 2.5 Cosmetic / timing coupling

* **`renderWeapons()` toggles `sel` on all 6 weapon buttons**, so the markup `class="wbtn sel"` on
  `btnWAr` is redundant but harmless — however **`className` is never rewritten** here (only
  `classList.toggle`), so extra classes on `.wbtn`/`.diffBtn` survive. Same for difficulty and map
  buttons (`classList.toggle('sel')`).
* `#achFilter` — `className` **is** fully replaced with `'achFilterRow'`, so any extra class you put
  on it in markup is destroyed.
* `#slotBtns` — `innerHTML` fully replaced: the markup `<b id="slotBtns">` must remain an empty
  container whose children are `<button>` (JS binds `button[data-slot]`).
* `#upgradeList` — `innerHTML=''` + `appendChild`; the markup element must be a block container;
  the JS row layout is `.upRow > .upIcon + .upInfo(.nm,.ds) + .pips + .upBtn`, i.e. **a 4-column
  flex/grid row**. If you change the container to a grid, mind that rows are appended as
  independent `div.upRow`s (do not rely on the container being a grid).
* `#toast` uses `style.opacity` **and** the `show` class → CSS must define both the transition target
  and `.toast` base visibility; `pointer-events:none` required so it never blocks clicks.
* `#rankInfo` `innerHTML` replaced → must be able to hold an `<i>` + text inline.
* `#dailyList` rows include an inline `style="color:var(--border-strong);"` for the “—” empty day →
  `--border-strong` must remain a defined custom property.
* `#weaponInfo` fragment uses `var(--fg-subtle)` inline → keep the custom property.
* `#achCount`, `#pts`, all `st*` cells are pure text targets — safe to restructure visually.
* Hub has **no canvas-dependent JS beyond `#mapPrev`** (see §2.7).

### 2.6 Navigation & resource links

| kind | value |
|---|---|
| `<link rel="stylesheet">` | `../fontawesome-free-7.3.1-web/css/all.min.css` (line 7) |
| `<link rel="icon">` | `../photo.ico` (line 8) |
| `<script src>` | none |
| JS navigation | `GAME_FILE='breach.html'`, `STREET_FILE='street.html'`, `HOME_FILE='../index.html'`; `location.href = GAME_FILE / STREET_FILE / HOME_FILE` — note `persistCfg()` runs **before** the home jump |
| `<a href>` in markup | none |

### 2.7 Canvas & overlays

* **Canvas:** `#mapPrev`, `<canvas id="mapPrev" width="480" height="200">` inside `.mapframe`.
  ⚠ **The hub canvas is 480×200 but `drawMap()` uses the same formula as index** (`s = cv2.width / MAP.W`)
  — the attribute size drives the scale, so if you change the attributes, redraw geometry changes.
  CSS `#mapPrev{display:block;width:100%;background:#0a0a0b}`; keep the aspect ratio.
* **Overlays/modals:** none. Only `#toast` (fixed, top-center, `z-index:9`, `pointer-events:none`).
* Page structure: `header.topbar` → `main > .layout > two .col` columns; each panel is
  `section.panel > .panel-head(.bi + .t + .sten) + .panel-body`. Action area is
  `.actions > .spread` rows of `.btn.btn-block`.

### 2.8 Icon inventory (markup, 40)

```
fa-arrow-trend-up, fa-bars-progress, fa-bomb, fa-building, fa-bullseye, fa-burst, fa-calendar-day,
fa-chart-line, fa-chevron-right, fa-circle-info, fa-clipboard-list, fa-coins, fa-crosshairs,
fa-crown, fa-equals, fa-file-export, fa-file-import, fa-fire, fa-folder-tree, fa-forward-fast,
fa-gauge-high, fa-gun, fa-helmet-safety, fa-house, fa-industry, fa-location-crosshairs, fa-map,
fa-map-location-dot, fa-minus, fa-play, fa-plus, fa-ranking-star, fa-skull, fa-square-parking,
fa-star, fa-stopwatch, fa-trash-can, fa-trophy, fa-user-shield, fa-warehouse
```

Icons additionally needed by JS-injected fragments (upgrade rows / achievements / weapon panel):
`fa-heart-pulse, fa-person-running, fa-crosshairs, fa-eye, fa-box-open, fa-bomb, fa-bolt,
fa-shield-halved, fa-gun, fa-rotate-right, fa-fire, fa-forward, fa-shield, fa-kit-medical,
fa-person-walking, fa-paper-plane, fa-volume-low, fa-hand-holding` (upgrades) and
`fa-trophy, fa-bolt-lightning, fa-box-open, fa-crosshairs, fa-shield-halved, fa-fire, fa-bomb,
fa-location-crosshairs, fa-heart-pulse, fa-fire-flame-curved, fa-stopwatch, fa-bullseye,
fa-hand-fist, fa-gun, fa-map-location-dot, fa-star` (achievements/filter icons).
Also `fa-circle-info` in `#rankInfo`.

> `.wbtn>.fa-solid, .wbtn>.fas` is styled in CSS (line 220) — icon size/colour for weapon buttons.

---

## 3. `game/breach.html` — main game + in-game HUD (markup 313–460, script 461–5253)

### 3.1 Static element ids (85 occurrences / 83 unique — **2 duplicated ids**)

| id | line | what it is | Referenced by JS? |
|---|---|---|---|
| `cv` | 316 | `<canvas id="cv">` full-screen game canvas | **yes** — `getContext('2d')`, `.width/.height` set from `window.innerWidth/Height`, mouse events |
| `vignette` | 317 | Full-screen red vignette overlay (`opacity` driven) | **yes** — `style.opacity` |
| `flash` | 318 | Full-screen white/blind flash overlay | **yes** — `style.opacity` |
| `hud` | 319 | HUD root (`pointer-events:none; z-index:5`) | no — CSS/structure only |
| `toolbar` | 320 | Top-center button bar | no — CSS only (JS touches its child buttons) |
| `btnZoomIn` | 321 | Button 放大 | **yes** — `onclick` |
| `btnZoomOut` | 322 | Button 缩小 | **yes** — `onclick` |
| `btnReset` | 323 | Button 复位视角 | **yes** — `onclick` |
| `btnAutoDoor` | 416 | Toggle 自动开门 (text `自动开门：关`) | **yes** — `onclick`, `innerHTML` rewritten, `title` set, `classList.toggle('on')` |
| `btnAnnotate` | 417 | Toggle 批注模式 (text `批注：关`; 会话级, 不进存档) | **yes** — `onclick`, `innerHTML` rewritten, `classList.toggle('on')` |
| `btnHelp` | 419 | Toggle 操作提示条 (text `操作提示：简`; 会话级, `#help` 折叠成一行) | **yes** — `onclick`, `innerHTML` rewritten, `classList.toggle('on')` |
| `btnMinimap` | 420 | Toggle 索引图 (图标按钮; 会话级, `#mmWrap` 默认带 `hidden`) | **yes** — `onclick`, `classList.toggle('on')` / `syncMmBtn()` 切 `#mmWrap.hidden` |
| `btnHubT` | 325 | Button 准备页 → hub | **yes** — `onclick` |
| `feed` | 327 | Kill-feed container (`role="status" aria-live="polite"`) | **yes** — `innerHTML` rebuilt (change-guarded) |
| `streak` | 328 | Kill-streak banner (`opacity` driven, text set) | **yes** — `style.opacity`, `textContent` |
| `banner` | 329 | Center banner (tutorial/range/daily text) | **yes** — `textContent`, `style.opacity` |
| `tutPanel` | 332 | Tutorial step panel in HUD, `class="hidden"` | **yes** — `classList.remove/add('hidden')` |
| `tutCur` | 333 | “第 N / 7 步” number | **yes** — `textContent` |
| `tutTitle` | 334 | Step title | **yes** — `textContent` |
| `tutDesc` | 335 | Step description | **yes** — `textContent` |
| `tutBar` | 336 | Progress bar track | no — CSS only |
| `tutBarFill` | 336 | Progress bar fill | **yes** — `style.width` = `(step/7*100)%` |
| `p1` | 340 | Left-top player panel (`.panel`) | **yes** — `getBoundingClientRect()` measured; `classList.toggle('panelhide')` |
| `hpbar` | 342 | Health bar fill | **yes** — `style.width`, `classList.toggle('low')` |
| `weaponName` | 343 | Current weapon name | **yes** — `textContent` |
| `ammo` | 344 | Ammo readout `30 / 150` | **yes** — `textContent` |
| `ammoWrap` | 345 | Ammo bar wrapper | no — CSS only |
| `reloadProg` | 345 | Reload progress fill | **yes** — `style.width`, `style.opacity` |
| `ammoBar` | 345 | Magazine fill | **yes** — `style.width` |
| `frags` | 346 | Grenade count `×3` | **yes** — `textContent` |
| `flashes` | 347 | Flashbang count | **yes** — `textContent` |
| `smokes` | 348 | Smoke count | **yes** — `textContent` |
| `c4s` | 349 | C4 count | **yes** — `textContent` |
| `pstate` | 350 | Status text (正常/换弹中/致盲!/精确瞄准) | **yes** — `textContent` |
| `p2` | 354 | Right-top objective panel (`.panel`) | **yes** — measured by `getBoundingClientRect()`, `classList.toggle('panelhide')` |
| `timer` | 356 | Elapsed time `m:ss` | **yes** — `textContent` |
| `kills` | 357 | Kill count | **yes** — `textContent` |
| `redbots` | 358 | Red bots alive `2/2` | **yes** — `textContent` |
| `bluebots` | 359 | Blue bots alive `5/5` | **yes** — `textContent` |
| `mmWrap` | 464 | Minimap panel wrapper (`.panel`, bottom-right; **默认 `hidden`, 由 `#btnMinimap` 按需展开**) | **yes** — `classList.toggle('hidden')` |
| `mm` | 448 | `<canvas id="mm" width="192" height="80">` minimap | **yes** — `getContext('2d')`, `.width/.height` |
| `help` | 449 | Bottom-left key-hint strip (rich HTML; 默认只显示第一行, 其余在 `.more` 里由 `#help.open` 展开) | **yes** — `innerHTML` fully rewritten by `updateHelpKeys()`; `classList.toggle('open')` by `syncHelpBtn()` |
| `startOverlay` | 367 | Start screen overlay (**visible by default**) | **yes** — `classList.add('hidden')` |
| `loadoutInfo` | 377 | `<p id="loadoutInfo">` loadout summary | **yes** — `textContent` |
| `dailyInfo` | 378 | `<p id="dailyInfo">` daily-challenge rule | **yes** — `textContent` |
| `diffEasy` | 380 | Difficulty button 简单 | **yes** — `classList.toggle('sel')`, `onclick` |
| `diffNorm` | 381 | Difficulty button 标准 (`sel`) | **yes** — same |
| `diffHard` | 382 | Difficulty button 困难 | **yes** — same |
| `btnMapHouse` | 385 | Map button 户型图 (`sel`) | **yes** — `classList.toggle('sel')`, `onclick` |
| `btnMapWarehouse` | 386 | Map button 仓库 | **yes** — same |
| `btnMapFactory` | 387 | Map button 工厂 | **yes** — same |
| `btnMapOffice` | 388 | Map button 写字楼 | **yes** — same |
| `btnMapParking` | 389 | Map button 地下车库 | **yes** — same |
| `btnStart` | 392 | Button 开始游戏 | **yes** — `onclick` |
| `btnDaily` | 393 | Button 每日挑战 | **yes** — `onclick` |
| `btnRange` | 394 | Button 训练场 | **yes** — `onclick` |
| `btnHub` | 395 | Button 战前准备 | **yes** — `onclick` |
| `endOverlay` | 401 | Results overlay, `class="overlay hidden"` | **yes** — `classList.remove('hidden')` |
| `endTitle` | 403 | Result headline (红队胜利! / 你阵亡了… / 红队全军覆没) | **yes** — `textContent` |
| `endStars` | 404 | Star row `★★☆` | **yes** — `textContent` ⚠ **duplicate id, see §3.2** |
| `endSub` | 405 | Result subtitle line | **yes** — `textContent` ⚠ **duplicate id** |
| `endStats` | 406 | Result stat grid container | **yes** — `innerHTML` replaced |
| `btnRestart` | 408 | Button 再来一局 | **yes** — `onclick` |
| `btnHub2` | 409 | Button 返回准备页 | **yes** — `onclick` |
| `pauseOverlay` | 415 | Pause/settings overlay (`hidden`) | **yes** — `classList.toggle('hidden')` |
| `volRange` | 419 | `<input type=range id=volRange>` volume | **yes** — `value`, `addEventListener('input')` |
| `sensRange` | 420 | Range slider sensitivity | **yes** — `value`, `input` |
| `sensVal` | 420 | `<b id="sensVal">1.00×</b>` sensitivity readout | **yes** — `textContent` |
| `btnCross` | 421 | Crosshair-style cycling button | **yes** — `textContent`, `onclick` |
| `crossRange` | 422 | Range slider crosshair size | **yes** — `value`, `input` |
| `chkShake` | 424 | Checkbox 屏幕震动 | **yes** — `checked`, `change` |
| `chkFps` | 425 | Checkbox 显示 FPS | **yes** — `checked`, `change` (FPS itself is drawn on the canvas — see §3.5) |
| `chkHit` | 426 | Checkbox 命中提示 | **yes** — `checked`, `change` |
| `chkCb` | 429 | Checkbox 色觉友好配色 | **yes** — `checked`, `change` |
| `chkAdsHold` | 430 | Checkbox 按住右键开镜 | **yes** — `checked`, `change` |
| `keyGrid` | 433 | Key-binding grid container | **yes** — `innerHTML` replaced, then `querySelectorAll('button[data-k]')` |
| `btnKeyReset` | 434 | Button 恢复默认键位 | **yes** — `onclick` |
| `btnResume` | 436 | Button 继续游戏 | **yes** — `onclick` |
| `btnRestart2` | 437 | Button 重新开始 (pause) | **yes** — `onclick` |
| `btnHub3` | 438 | Button 返回战前准备 (pause) | **yes** — `onclick` |
| `tutOverlay` | 444 | Tutorial-complete overlay (`hidden`) | **yes** — `classList.remove('hidden')` |
| `endStars` | 448 | Static `★★★` inside tutOverlay | ⚠ **duplicate — never reached by `getElementById`** |
| `endSub` | 449 | Static tutorial text inside tutOverlay | ⚠ **duplicate — never reached by `getElementById`** |
| `tutTime` | 451 | Tutorial time cell | **yes** — `textContent` |
| `tutAcc` | 452 | Tutorial accuracy cell | **yes** — `textContent` |
| `tutKills` | 453 | Tutorial kills cell | **yes** — `textContent` |
| `btnTutHome` | 456 | Button 返回主页 | **yes** — `onclick` |
| `btnTutHub` | 457 | Button 进入战前准备 | **yes** — `onclick` |

### 3.2 ⚠ Duplicate ids (must be fixed or preserved deliberately)

`id="endStars"` and `id="endSub"` appear **twice**:

* #404 / #405 inside `#endOverlay`
* #448 / #449 inside `#tutOverlay` (static `★★★` and a static sentence)

`document.getElementById('endStars')` / `('endSub')` therefore always resolve to the **first**
(endOverlay) copies; the tutOverlay copies are dead text that a rewrite must keep **only** if it
wants the static tutorial congratulation text. **Recommendation:** give the tutOverlay copies new
ids (e.g. `tutStars`, `tutSub`) — no JS reads them — or drop them. Keeping duplicate ids is valid
HTML-wise for browsers but breaks `querySelector('#endStars')` semantics and any future work.

### 3.3 ids JS looks up that are NOT in static markup

**None.** All 78 literal `getElementById` ids exist in markup.

Notable *latent* items (not id lookups, but worth knowing):

* The `<style>` comment at line 187 says *“FPS 由 JS 写入页面左上角 `#fpsTxt`(本页无此元素时忽略)”* —
  **`#fpsTxt` does not exist in breach.html** and no JS looks it up. In breach the FPS overlay is
  drawn **on the canvas** (`ctx.fillText('FPS …', cw/2, 52)`). The comment is stale; ignore it.
* Structural ids never queried by JS (safe to restructure, but they are CSS anchors):
  `ammoWrap`, `hud`, `mmWrap`, `toolbar`, `tutBar`.

### 3.4 ids created dynamically by JS

**None.** All `createElement` calls in breach create **off-screen canvases** (fog canvas, minimap
caches, sprite caches) that are never inserted into the DOM:
`fogCanvas` (3684), anonymous `cv2` (3779), `sp` sprites (3804/3971), `mmCache` (4578), `mmFog` (4587).

### 3.5 CSS classes referenced by JS

| class | source | notes |
|---|---|---|
| `hidden` | overlays + `tutPanel` | `.hidden{display:none!important}` — used 12× |
| `panelhide` | `updatePanelFade()` 4846 | added to **`#p1` / `#p2`**; CSS `#p1.panelhide,#p2.panelhide{opacity:.08;transform:translateY(-4px)}` |
| `low` | `classSet(el.hpbar,'low',…)` 4745 | `.hpbar.low` low-HP state |
| `sel` | `setDiff()` 4981–4983, `syncMapBtns()` 4987–4991 | 3 difficulty + 5 map buttons |
| `on` | `syncAutoDoorBtn()` 5029 | `#btnAutoDoor.on` → CSS `#toolbar button.on` |
| `keyCell` | `renderKeyGrid()` 5050 | injected into `#keyGrid` |
| `kbtn` + `wait` | `renderKeyGrid()` 5051 | `<button class="kbtn[ wait]" data-k="…">`; `.kbtn.wait` = capture state; `data-k` attribute is a hard contract for `querySelectorAll('button[data-k]')` |
| `accent` | `showEnd()` 4953/4958 | `<div class="accent">` inside `#endStats` |
| `good` | `showEnd()` 4955 | `<div class="good">` inside `#endStats` |
| `hico`, `hl`, `cmd` | `updateHelpKeys()` 5037–5041 | icon span / highlighted key / command span inside `#help` |

`#endStats` fragment (4951–4958):
```html
<div>用时<b>m:ss</b></div>
<div class="accent">命中率<b>N%</b></div>
<div>击杀<b>N</b></div>
<div class="good">造成伤害<b>N</b></div>
<div>剩余弹药<b>N</b></div>
<div>误伤队友<b>N</b></div>
[<div class="accent">新成就<b>+N</b></div>]
```
→ `.card #endStats` must be a grid of `div > b` cells; classes `accent`/`good` are colour modifiers.

`#keyGrid` fragment (5047–5054):
```html
<div class="keyCell"><span>动作名</span><button type="button" class="kbtn[ wait]" data-k="action">键位</button></div>
```

`#feed` fragment (4771): repeated `<div style="opacity:…;color:#rrggbb;">text</div>`
→ CSS `#feed div` styles the pill; inline colour is set by JS.

### 3.6 Cosmetic / timing coupling (highest-risk section of the whole project)

1. **`#p1` / `#p2` are measured with `getBoundingClientRect()` once and cached**
   (`panelHitRects()`, lines 4804–4824). The fallback constants, used when the DOM has no layout
   (automated tests), are:
   * `p1`: `x:14, y:14, w:258, h:200`
   * `p2`: `y:14, w:206`, **`x = cw - 14 - w`** → `#p2` **must stay anchored to the top-right**
     with `right:14px; top:14px`.
   The HUD-fade logic (`.panelhide`) triggers when a unit or the crosshair enters these rects ±8 px.
   **If your CSS moves/changes the size of `#p1`/`#p2`, the fade rectangles are recomputed from the
   real rect on the first frame — but only once. Any later resize/reflow does NOT re-measure**
   (`panelRects` cache is never invalidated). Keep panels small and in the corners.
   The original author's note (lines 4801–4803) records that hand-written pixel widths already
   drifted from CSS because the project has **no `box-sizing:border-box`** — if you introduce
   `box-sizing:border-box` globally, the measured rects change (that is fine, they are measured),
   but the fallback constants become wrong for tests.
2. **`#cv` must fill the viewport at (0,0).** `resize()` sets `cv.width = window.innerWidth`,
   `cv.height = window.innerHeight`. Mouse coords are raw `e.clientX/e.clientY` compared against
   `cw`/`ch` (lines 874–878) **and** `screenToWorld()`/camera math assumes the canvas origin is the
   viewport origin. CSS must keep `#cv{position:absolute;inset:0;width:100%;height:100%}`.
   Any margin/border/offset on `#cv` desynchronises aim.
3. **`#toolbar`, `#p1`, `#p2`, `#mmWrap`, `#help`, `#feed`, `#streak`, `#banner`, `#tutPanel` are
   absolutely positioned children of `#hud`** (`position:absolute; inset:0; pointer-events:none;
   z-index:5`). Each interactive element inside `#hud` must restore `pointer-events:auto`
   (`#toolbar` does; `.diffBtn`, `#keyGrid`, `.kbtn`, `.bigbtn` do).
4. **z-order contract:** `#vignette` z-index **3**, `#flash` z-index **4**, `#hud` z-index **5**,
   `.overlay` z-index **10**. `#cv` must be below all of them (default, no z-index). Keep this
   stacking or the flash/vignette will cover the HUD (it happened by design: vignette/flash are
   *below* the HUD).
5. **`cursor:none`** on `#cv` — the crosshair is drawn on the canvas. Don't let a rewrite introduce a
   visible cursor or hide the canvas.
6. **`#feed` is change-guarded** (`if (_hudPrev.feed !== html)`), and `#streak`/`#banner` are driven
   purely by `style.opacity` (with CSS `transition:opacity 1s`). If you animate them with
   `display`, the game will show them permanently or never.
7. **`#hpbar`, `#ammoBar`, `#reloadProg`, `#tutBarFill` are width-driven fills**
   (`style.width = 'N%'`). They must be block elements inside a track whose width defines 100 %.
   `#reloadProg` also uses `style.opacity` 1/0. The HUD writer **caches last values**
   (`textSet/styleSet/classSet` + `_hudPrev`), so if two properties are set on the same node in a way
   that changes layout, stale values will not be re-applied.
8. **`#help` is fully re-rendered** (`innerHTML`) at boot and after each key rebind — any markup
   children you add there are destroyed. Same for `#keyGrid` and `#endStats` and `#feed`.
9. **`#tutPanel` `.hidden` toggling is cached** (`_hudPrev.tutHidden`) — it is only removed/added on
   state change; the element must start with `class="hidden"` in markup. The same branch calls
   `panelCacheClear()`, because a `display:none` panel measures as 0×0: it must be re-measured the
   frame it becomes visible (see §4.4). Its **first child must keep `id="tutTitle"` inside
   `.tutHead`** and the counter span `id="tutCur"` inside that head — the writer sets both by text.
10. **Start overlay has no `.hidden` class** in markup (it is visible until `initGame()` hides it);
    `#endOverlay`, `#pauseOverlay`, `#tutOverlay` start `hidden`.
11. `#endStars`/`#endSub` duplicate ids (see §3.2).

### 3.7 Navigation & resource links

| kind | value |
|---|---|
| `<link rel="stylesheet">` | `../fontawesome-free-7.3.1-web/css/all.min.css` (line 7) |
| `<link rel="icon">` | `../photo.ico` (line 8) |
| `<script src>` | none |
| JS navigation | `goHub(){ location.href='hub.html' }`; `goIndex(){ location.href='../index.html' }`; bound to `btnHubT, btnHub, btnHub2, btnHub3, btnTutHub` (hub) and `btnTutHome` (index) |
| Query params | `location.search` — `detectTutorial()` (``tutorial``), `detectRange()` (`range`) |
| `<a href>` in markup | none |

### 3.8 Canvas & HUD overlays

* **Canvas `#cv`** — fullscreen, size set by JS to `window.innerWidth × window.innerHeight`;
  CSS `position:absolute;inset:0;width:100%;height:100%;display:block;cursor:none`.
* **Canvas `#mm`** — minimap, `<canvas id="mm" width="240" height="100">` inside
  `<div id="mmWrap" class="panel">` (bottom-right, `right:14px;bottom:14px`, custom `::after` bracket).
  CSS `#mm{display:block;background:#0a0a0b;border:1px solid var(--border-strong)}`.
  Attribute size (240×100) is the render target — do not change it without touching JS.
* **HUD panes over the canvas** (all inside `#hud`):
  * `#toolbar` (top-center: 放大 / 缩小 / 复位视角 / 自动开门 / 准备页)
  * `#p1` (top-left: life bar, weapon, ammo + reload/mag bars, grenade/flash/smoke/C4, status)
  * `#p2` (top-right: objective header, time, kills, red bots, blue bots)
  * `#mmWrap`/`#mm` (bottom-right minimap)
  * `#help` (bottom-left key hints, 3 lines)
  * `#tutPanel` (tutorial step card), `#feed` (kill feed), `#streak`, `#banner`
* **Overlays (`.overlay > .card`)**, siblings of `#hud`:
  1. `#startOverlay` (visible at load) — h1/h2, 6 `.brief` paragraphs, `#loadoutInfo`, `#dailyInfo`,
     two `.diffRow` (3 difficulty buttons, 5 map buttons), 4 `.bigbtn` (开始游戏 / 每日挑战 /
     训练场 / 战前准备).
  2. `#endOverlay` (`hidden`) — `#endTitle`, `#endStars`, `#endSub`, `#endStats`, 再来一局 / 返回准备页.
  3. `#pauseOverlay` (`hidden`) — 音量/灵敏度/准星 `setRow`s, 色觉/开镜 checkboxes,
     `.keyhdr`, `#keyGrid`, `#btnKeyReset`, 继续游戏 / 重新开始 / 返回战前准备.
  4. `#tutOverlay` (`hidden`) — 教程完成, `.statGrid` with `#tutTime`/`#tutAcc`/`#tutKills`,
     返回主页 / 进入战前准备.

### 3.9 Icon inventory (markup, 31 — complete for this page)

```
fa-arrow-right-from-bracket, fa-bolt, fa-bomb, fa-box-open, fa-building, fa-bullseye,
fa-calendar-day, fa-cloud, fa-crosshairs, fa-door-open, fa-equals, fa-explosion,
fa-graduation-cap, fa-gun, fa-heart-pulse, fa-house, fa-industry, fa-keyboard,
fa-magnifying-glass-minus, fa-magnifying-glass-plus, fa-minus, fa-pause, fa-person-walking,
fa-play, fa-plus, fa-radio, fa-rotate-left, fa-rotate-right, fa-screwdriver-wrench,
fa-square-parking, fa-warehouse
```

No additional icons are injected by JS (the JS-generated fragments reuse `fa-door-open`,
`fa-person-walking`, `fa-bomb`, `fa-radio`).

---

## 4. `game/street.html` — street mode (markup 264–368, script 369–2650)

### 4.1 Static element ids (53)

| id | line | what it is | Referenced by JS? |
|---|---|---|---|
| `cv` | 267 | `<canvas id="cv">` fullscreen game canvas | **yes** — `getContext('2d')`, `.width/.height`, `mousemove` |
| `vignette` | 268 | Red vignette overlay | **yes** — `style.opacity` |
| `flash` | 269 | Blind/flash overlay | **yes** — `style.opacity` |
| `hud` | 270 | HUD root (`pointer-events:none;z-index:5`) | no |
| `fpsTxt` | 271 | `<div id="fpsTxt" class="hidden">FPS 60</div>` top-left FPS readout | **yes** — `classList.toggle('hidden')`, `textContent` |
| `feed` | 272 | Kill feed (`role="status"`) | **yes** — `innerHTML` rebuilt |
| `streak` | 273 | Kill-streak banner | **yes** — `style.opacity`, `textContent` |
| `banner` | 274 | Center banner | **yes** — `textContent`, `style.opacity` |
| `p1` | 277 | Left-top player panel (`.panel`) | no — CSS only (**no `panelhide` logic in street**) |
| `hpbar` | 279 | Health bar fill | **yes** — `style.width`, `classList.toggle('low')` |
| `weaponName` | 280 | Weapon name | **yes** — `textContent` |
| `ammo` | 281 | Ammo readout | **yes** — `textContent` |
| `magCap` | 282 | Magazine capacity line (“30 发（扩容 +…）”) | **yes** — `textContent` |
| `ammoWrap` | 283 | Ammo bars wrapper | no |
| `reloadProg` | 283 | Reload progress fill | **yes** — `style.width`, `style.opacity` |
| `ammoBar` | 283 | Magazine fill | **yes** — `style.width` |
| `frags` | 284 | Grenade count | **yes** — `textContent` |
| `flashes` | 285 | Flashbang count | **yes** — `textContent` |
| `buffs` | 286 | This-run boost log (“无” or `名称 名称`) | **yes** — `textContent` |
| `p2` | 290 | Right-top objective panel | no — CSS only |
| `timer` | 292 | Elapsed time | **yes** — `textContent` |
| `kills` | 293 | Kill count | **yes** — `textContent` |
| `waveInfo` | 294 | Wave state text (首波前 / 第 N 波 / 下一波倒计时) | **yes** — `textContent` |
| `zleft` | 295 | Zombies remaining | **yes** — `textContent` |
| `score` | 296 | Score | **yes** — `textContent` |
| `bestTxt` | 297 | Historical best (`0分` / `score分/waves波` / `尚无`) | **yes** — `textContent` |
| `help` | 300 | Bottom-left key-hint strip | **yes** — `innerHTML` rewritten by `updateHelpKeys()` |
| `startOverlay` | 304 | Start overlay (**visible by default**) | **yes** — `classList.add('hidden')` |
| `loadoutInfo` | 314 | `<p id="loadoutInfo">` loadout summary | **yes** — `textContent` |
| `diffEasy` | 316 | Difficulty 简单 | **yes** — `classList.toggle('sel')`, `onclick` |
| `diffNorm` | 317 | Difficulty 标准 (`sel`) | **yes** — same |
| `diffHard` | 318 | Difficulty 困难 | **yes** — same |
| `btnStart` | 321 | Button 开始坚守 | **yes** — `onclick` |
| `btnHub` | 322 | Button 战前准备 (**from the start overlay**) | **yes** — `onclick` → `abandonTo('hub')` |
| `pauseOverlay` | 328 | Pause overlay (`hidden`) | **yes** — `classList.toggle('hidden')` |
| `pauseHint` | 331 | `<h2 id="pauseHint">Paused — 空格 / 点击继续</h2>` | **yes** — `textContent` (key label re-rendered) |
| `volRange` | 332 | Volume range input | **yes** — `value` |
| `chkShake` | 334 | Checkbox 屏幕震动 | **yes** — `checked` |
| `chkFps` | 335 | Checkbox 显示 FPS | **yes** — `checked` (toggles `#fpsTxt`) |
| `btnResume` | 339 | Button 继续游戏 | **yes** — `onclick` |
| `btnRestart2` | 340 | Button 重新开始 (pause) | **yes** — `onclick` → `abandonTo('restart')` |
| `btnHome3` | 341 | Button 返回主页 (pause) | **yes** — `onclick` → `abandonTo('home')` |
| `boostOverlay` | 347 | Wave-upgrade (3-choose-1) overlay (`hidden`) | **yes** — `classList.remove/add('hidden')` |
| `boostTitle` | 349 | Boost panel title | **yes** — `innerHTML` replaced (`<i class="fas fa-bolt">` + text) |
| `boostSub` | 350 | Boost panel subtitle (static) | no |
| `boostOpts` | 351 | Boost card container | **yes** — `innerHTML=''` then `appendChild` of `.boostCard` |
| `endOverlay` | 356 | Results overlay (`hidden`) | **yes** — `classList.remove('hidden')` |
| `endTitle` | 358 | Result headline (你被丧尸掩埋了…) | **yes** — `textContent` |
| `endSub` | 360 | Result subtitle line | **yes** — `textContent` |
| `endStats` | 361 | Result stat grid | **yes** — `innerHTML` replaced |
| `btnRestart` | 363 | Button 再来一局 | **yes** — `onclick` |
| `btnHub2` | 364 | Button 战前准备 (results) | **yes** — `onclick` → `goHub()` |
| `btnHome2` | 365 | Button 返回主页 (results) | **yes** — `onclick` → `goIndex()` |

### 4.2 ids JS looks up that are NOT in static markup

**None.** All 48 literal `getElementById` ids exist. (`#cv`, `#feed`, `#flash`, `#vignette`,
`#streak`, `#banner` etc. are looked up by literal id **on every frame** in some paths — the element
must exist or the frame throws.) Note that this page has **no null guards** on most of these lookups
(e.g. lines 2478–2496), so a missing id `TypeError`s the render loop.

### 4.3 ids created dynamically by JS

**None.** `openBoost()` (line 1239) creates `<div class="boostCard">` elements with **no id**, only
an `onclick`, and appends them to **`#boostOpts`**:

```html
<div class="boostCard"><b><i class="fas <b.fa>"></i>名称</b><span>描述</span></div>
```

> **B9 追加（本节快照早于 B9，行号已漂移，以源码为准）**
> * 新增静态 id **`#cmdInfo`**（`#p2` 内「指挥点」读数行，图标 `fa-coins`）——JS 写 `textContent`
>   （余额；整备窗口内追加「｜ 招募价 N」）。该处有 null 守卫，缺元素不会抛错。
> * 新增测试钩子：`rotateBuild` / `buildDeg` / `circleOBB` / `squadAnchor` / `buildRot`(可写) /
>   `cmdPoints`(可写)。`SQUAD.cap` **已移除**（编制无上限，改为 `SQUAD.startCount = 2`）。
> * `.recruitNote` 不再是招募面板的常规分支（没有"满编"态），类名保留在 CSS 里备用。
> * `#buildInfo` 文案新增「朝向 N°」段；`#help` 新增 `V 旋转工事朝向`（图标 `fa-arrows-rotate`）。

### 4.4 CSS classes referenced by JS

| class | source | notes |
|---|---|---|
| `hidden` | overlays + `#fpsTxt` | `.hidden{display:none!important}`; `#fpsTxt.hidden{display:none}` |
| `low` | line 2480 | `#hpbar.classList.toggle('low', hp<30%)` → `.hpbar.low` |
| `sel` | `syncDiff()` 1954–1956 | 3 difficulty buttons |
| `boostCard` | `openBoost()` 1240 (`d.className='boostCard'`) | injected into `#boostOpts`; CSS `.boostCard{pointer-events:auto;width:184px;…}` — **three cards side by side**, click target |
| `accent` | `showEnd()` 2072–2073 | `<div class="accent">` in `#endStats` |
| `hico`, `hl` | `updateHelpKeys()` 757 | injected into `#help` |

`#endStats` fragment (2071–2077):
```html
<div class="accent">撑过波数<b>N</b></div>
<div class="accent">得分<b>N</b></div>
<div>击杀丧尸<b>N</b></div>
<div>用时<b>m:ss</b></div>
<div>命中率<b>N%</b></div>
<div>误伤队友<b>N</b></div>
```
`#feed` fragment (2512): `<div style="opacity:…;color:#rrggbb;">text</div>` (same as breach).

Note: street CSS also defines `#p1.panelhide,#p2.panelhide{opacity:.08}` but **no street JS ever adds
`panelhide`** — dead CSS carried over from breach. You may keep or drop it.

### 4.5 Cosmetic / timing coupling

1. **`#cv` must be full-viewport at the origin.** `resize()` sets
   `cv.width = window.innerWidth; cv.height = window.innerHeight`; `mousemove` stores raw
   `e.clientX/e.clientY` and the camera math (`screenToWorld`, `zoomAt`) treats them as
   canvas-space. Keep `#cv{position:absolute;inset:0;width:100%;height:100%}` and `cursor:crosshair`.
   `resize()` calls `fitCam()` **only when `!started`** — a resize during play must not change layout
   size in a way that breaks the camera.
2. **z-order:** `#vignette` 3, `#flash` 4, `#hud` 5, `.overlay` 10 — same contract as breach.
3. **`#hud` children are absolutely positioned**; `#fpsTxt` is `left:14px; top:2px` **above `#p1`**
   (p1 starts at `top:14px`) — keep them from overlapping or `#fpsTxt` will be hidden behind `#p1`.
4. **`#fpsTxt` toggles the `hidden` class every frame** (`classList.toggle('hidden', !showFps)`), and
   `#fpsTxt.hidden{display:none}` exists in addition to the global `.hidden`. Both must exist.
5. **`#pauseHint` is rewritten** with the current pause key label → keep it an element that can hold
   plain text.
6. **`#boostOverlay` blocks pause** (`togglePause()` returns early when `boostOpen`), and
   `openBoost()` is triggered on every 3rd cleared wave. `.boostCard` must be clickable
   (`pointer-events:auto`) and lay out 3-up inside `.card{max-width:780px}` (inline style in markup).
7. **`#help` fully re-rendered** from JS at boot → markup children are disposable.
8. `#endStats`, `#feed`, `#boostOpts`, `#boostTitle` innerHTML are rewritten.
9. **`#startOverlay` has no `hidden`**; `#pauseOverlay`, `#boostOverlay`, `#endOverlay` start `hidden`.
10. `#p1`/`#p2` are not measured — free to restyle.

### 4.6 Navigation & resource links

| kind | value |
|---|---|
| `<link rel="stylesheet">` | `../fontawesome-free-7.3.1-web/css/all.min.css` (line 7) |
| `<link rel="icon">` | `../photo.ico` (line 8) |
| `<script src>` | none |
| JS navigation | `goHub(){ location.href='hub.html' }`; `goIndex(){ location.href='../index.html' }`; `abandonTo('restart'\|'hub'\|'home')` runs a `confirm()` and may `saveStreetResult()` first |
| `<a href>` in markup | none |

### 4.7 Canvas & overlays

* **Canvas `#cv`** — fullscreen (`#cv{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:crosshair}`).
  No minimap canvas on this page.
* **Overlays (`.overlay > .card`)**, siblings of `#hud`:
  1. `#startOverlay` (visible at load) — h1/h2, one `p.b` + 5 `.brief` paragraphs, `#loadoutInfo`,
     `.diffRow` with 3 difficulty buttons, 开始坚守 / 战前准备.
  2. `#pauseOverlay` (`hidden`) — `#pauseHint`, volume row, two checkboxes, `.setHint` note,
     继续游戏 / 重新开始 / 返回主页.
  3. `#boostOverlay` (`hidden`) — `#boostTitle`, `#boostSub`, `#boostOpts` (3 `.boostCard`s);
     card has an inline `border-image` style referencing `--yellow`/`--border`.
  4. `#endOverlay` (`hidden`) — `#endTitle`, `h2`, `#endSub`, `#endStats`,
     再来一局 / 战前准备 / 返回主页.
* **HUD panes:** `#fpsTxt`, `#p1`, `#p2`, `#help`, plus `#feed`/`#streak`/`#banner`.

### 4.8 Icon inventory (markup, 19)

```
fa-arrow-right-from-bracket, fa-arrow-trend-up, fa-bolt, fa-bomb, fa-box-open, fa-equals, fa-gun,
fa-heart-pulse, fa-house, fa-layer-group, fa-minus, fa-pause, fa-person-walking, fa-play, fa-plus,
fa-rotate-left, fa-rotate-right, fa-screwdriver-wrench, fa-skull
```

Additional icons injected by JS (`BOOST_POOL` `b.fa`, via `openBoost()` + `#boostTitle`):
`fa-crosshairs, fa-fire, fa-forward, fa-person-running, fa-bolt`.

---

## 5. Cross-page summary tables

### 5.1 Element counts

| page | static `id`s (occurrences / unique) | ids JS literally looks up | missing from markup | ids created by JS | duplicate ids |
|---|---|---|---|---|---|
| `index.html` | **29 / 29** | 19 literal + 2 dynamic patterns | **0** | 0 | none |
| `game/hub.html` | **51 / 51** | 42 literal + 3 dynamic patterns | **0** | 18 `upBtn_<id>` | none |
| `game/breach.html` | **85 / 83** | 78 literal | **0** | 0 | `endStars` ×2, `endSub` ×2 |
| `game/street.html` | **53 / 53** | 48 literal | **0** | 0 | none |
| **total** | **218 / 216** | 187 literal | **0** | 18 | 2 |

### 5.2 ids looked up by JS but absent from static markup

**NONE on any page.** Every literal `getElementById('…')` resolves, and every dynamic pattern
(`'slotBtn'+n`, `'mapTab'+X`, `WEAPON_BTN_ID[id]`, `'upBtn_'+id`, `set(id,…)`) resolves either to a
static id or to an element created by JS in the same run.

Two near-misses worth knowing:

| page | item | status |
|---|---|---|
| `breach.html` | `<style>` comment (line 187) promises an `#fpsTxt` FPS element “which JS ignores when absent” | **element does not exist and no JS looks it up** — FPS is canvas-drawn. Stale comment only. |
| `hub.html` | `.mono` class used in JS-generated `#weaponInfo` HTML | **class is not defined in the `<style>` block** — latent styling gap (currently falls back to inherited font). |

### 5.3 Top 10 riskiest markup couplings for a CSS/markup rewrite

1. **`#p1` / `#p2` rect measurement + `PANEL_FALLBACK` (breach, lines 4797–4848).** `#p1` must stay
   top-left (`left:14;top:14`) and `#p2` **top-right** (`right:14;top:14`); their computed size drives
   the auto-fade (`.panelhide`). Rects are measured **once** and cached — a resize or a late CSS
   transition leaves stale rects. Fallback constants `p1{w:258,h:200}`, `p2{w:206}` are used in
   headless tests, so drastic size changes silently change `panelhide` behaviour in tests.
2. **`#cv` full-viewport at (0,0), sized by JS to `window.innerWidth/Height` (both game pages).**
   Client coordinates are used directly as canvas coordinates; any margin/border/offset or CSS-only
   size on `#cv` breaks aiming, panning and world↔screen conversion.
3. **`className` wholesale replacement on `#slotBtn1..3`, `#mapTab*`, `#shareHint` (index) and
   `#achFilter` (hub).** JS assigns `el.className = 'base' + …`; any extra class you add in markup
   for styling is destroyed at boot. Conversely the **base class names** (`slot`, `mtab`, `hintline`,
   `achFilterRow`) must remain defined in CSS or those elements lose all styling.
4. **`querySelectorAll` attribute contracts:** `button[data-slot]` in `#slotBtns`,
   `button[data-f]` in `#achFilter`, `button[data-k]` in `#keyGrid`. Losing the attributes (or
   changing the element from `<button>`) breaks every click handler; the JS also sets `.onclick`
   **imperatively**, so re-rendering the markup later is not enough.
5. **`hidden` class semantics + `display:none!important`.** Overlay visibility is toggled entirely in
   JS via `classList.toggle('hidden')`. Start overlays must **not** carry `hidden` in markup; the
   `#tutPanel` (breach) and `#fpsTxt` (street) must start with `class="hidden"`.
6. **`#hud{pointer-events:none}` and per-child re-enable.** If the rewrite forgets
   `pointer-events:auto` on `#toolbar`, `.diffBtn`, `#keyGrid`, `.kbtn`, `.bigbtn`, `.boostCard`,
   **every in-game button silently becomes unclickable** (this is the single most common failure
   mode for a HUD restyle).
7. **z-index stack (both game pages): `#vignette` 3 < `#flash` 4 < `#hud` 5 < `.overlay` 10.**
   `#cv` must sit below all. If `.overlay` drops to `auto`, the pause menu may end up under the HUD
   or under the flash overlay; if `#hud` drops below 4, the screen-flash will blank the HUD.
8. **Width/opacity-driven HUD bars with a value cache.** `#hpbar`, `#ammoBar`, `#reloadProg`,
   `#tutBarFill` (and `#hpbar.low`) are set via `style.width`/`style.opacity` through `styleSet()`
   which **skips writes when the string is unchanged**. They must be elements whose width is a
   percentage of a fixed-width track, and must not rely on `transform` (only `width` is written).
   `#streak` / `#banner` are `style.opacity` driven only.
9. **`innerHTML`-replaced containers whose inner structure is contractual:**
   `#help` (breach/street — icons `fa-person-walking`, `fa-bomb`, `fa-radio` + `.hl`/`.hico`/`.cmd`),
   `#keyGrid` (`.keyCell > span + button.kbtn[data-k]`), `#endStats` (`.accent`/`.good` `div > b`),
   `#feed` (`#feed div` pill styles + inline colour/opacity), `#weaponInfo` (`.mono` spans),
   `#upgradeList` (`.upRow > .upIcon + .upInfo(.nm,.ds) + .pips(.off) + .upBtn(.maxed)`),
   `#achList` (`.achRow > .ac + .ai(.an,.ad) [+ .aSt]`), `#dailyList` (`.dlRow[.none] > .dlD + b + .dlT`),
   `#slotBtns` / `#achFilter` button grids. Restyling must target these generated classes.
10. **`tests/offline_test.js` + `tests/meta_test.js` raw-file audits.** The rewrite must keep: exactly
    one local FontAwesome `<link>`, one local `.ico` link, **zero `url(` / `@import` / `font-face` /
    `http(s)://` / protocol-relative `//x`**, no `<script src>`, no `<img src>`, no emoji characters,
    literal `<meta charset="UTF-8">`, a **bare `<script>` tag** (tests extract JS with
    `/<script>([\s\S]*?)<\/script>/`), and the literal strings `蓝方5人`/`蓝方6人` in breach.html.
    Also keep the duplicate-id situation in breach deliberate (§3.2) or fix it in a JS-compatible way.
