# 发布到 GitHub：照做就行

这份文档把"从本地目录变成 GitHub 上一个能在线试玩的仓库 + 一个带安装包的 Release"拆成六步。
命令按 Windows PowerShell 写，其它平台把路径换掉即可。

> 本机原始素材里的 `MicrosoftEdgeWebView2RuntimeInstallerX86.exe`（187 MB）和 `交火_v3.3.zip`（188 MB）**已经在 `.gitignore` 里排除**——GitHub 单文件硬上限 100 MB，推不上去也不该进版本库。它们只应该在 Release 里作为附件出现。

---

## 0. 推送前先自检（1 分钟）

```powershell
cd "C:\path\to\repo"     # 就是 index.html 所在的那一层

node --version                  # 需要 >= 18
npm test                        # 25 个断言测试，约 70s，必须全绿
node tools/check-site.js        # 页面引用的本地资源是否齐全、大小写是否一致
npm start                       # 打开 http://127.0.0.1:5173/ 手玩一遍（Ctrl+C 退出）
```

`npm start` 打开的形态就是 GitHub Pages 的形态（纯静态 + 相对路径），这一步过了，Pages 基本不会有意外。

## 1. 装 Git（本机还没有）

```powershell
winget install --id Git.Git -e --source winget
```

装完**新开一个终端**（PATH 才会刷新），确认 `git --version` 有输出。
如果这台机器上不了外网，就在有网的机器上执行第 2～6 步，把整个目录拷过去即可——仓库内容与平台无关。

## 2. 初始化本地仓库

```powershell
cd "C:\path\to\repo"
git init -b main
git add .
git status                      # 提交前扫一眼：不该出现 *.exe / *.zip / fontawesome 的 js、svgs、scss…
git commit -m "chore: 首发 v0.1.0（交火 · 户型图红蓝对抗）"
```

**提交前必须确认这几样没被 `git add` 进去**（`.gitignore` 已经挡了，但第一次提交值得亲眼看一眼）：

| 不该提交 | 原因 |
|---|---|
| `MicrosoftEdgeWebView2RuntimeInstallerX86.exe` | 187 MB，超过 GitHub 100 MB 单文件上限 |
| `交火_v*.zip` | 发布包属于 Release 附件，不属于版本库 |
| `fontawesome-free-7.3.1-web/{js,scss,svgs,sprites,metadata}/` | 约 28.8 MB，运行时用不到，只保留 5 个必需文件 |
| `tests/_map_*.png` | 探针生成物，随时可重跑 |

## 3. 在 GitHub 上建空仓库

网页操作：<https://github.com/new>

- **Repository name**：建议 `breach-door-cqb`（与 `package.json` 的 `name` 一致），也可以用别的名字，下文按这个名字写；
- **Public**（公开仓库才能免费用 Pages，别人也才能在线试玩）；
- **不要**勾选 `Add a README file` / `Add .gitignore` / `Choose a license` —— 本地已经有这些文件，勾了反而要解冲突。

建完把仓库地址接上并推送：

```powershell
git remote add origin https://github.com/<你的用户名>/breach-door-cqb.git
git push -u origin main
```

**认证方式**（GitHub 早就不接受账号密码推送）：

- **HTTPS + PAT（最省事）**：GitHub → Settings → Developer settings → Personal access tokens →
  Fine-grained tokens → 生成一个只对这一个仓库有 `Contents: Read and write` 权限的 token，推送时
  用户名填 GitHub 用户名、密码粘 token。想避免反复输入：`git config --global credential.helper manager`。
- **SSH**：`ssh-keygen -t ed25519 -C "<你的邮箱>"`，把 `~/.ssh/id_ed25519.pub` 贴到 GitHub → Settings → SSH keys，
  然后把 remote 换成 `git@github.com:<用户名>/breach-door-cqb.git`。
- **完全不想装 Git**：网页版 `Add file → Upload files`，把 `index.html`、`photo.ico`、`game/`、
  `fontawesome-free-7.3.1-web/`（只要 `css/all.min.css` + 4 个 `.woff2` + `LICENSE.txt`）、`tests/`、
  `.uiwork/`、`tools/`、`docs/` 拖进去，再把根目录的文本文件逐个 `Add file → Create new file` 贴进去。
  `.github/workflows/` 里的两个 yml 也必须这样建出来（网页端支持建目录）。这条路能通，但很啰嗦，
  只建议在没法装 Git 的机器上用。

## 4. 开启在线试玩（GitHub Pages）

仓库页 → **Settings → Pages** → **Build and deployment → Source** 选 **GitHub Actions**。

之后每次 `git push` 到 `main`，`.github/workflows/pages.yml` 会自动：

1. 组装 `_site`：只放 `index.html`、`photo.ico`、`game/*.html`、裁剪过的 FontAwesome；
2. 跑 `node tools/check-site.js _site`（资源缺失或大小写不一致直接失败，不会把 404 推上线）；
3. 部署到 `https://endlessfield.github.io/breach-door-cqb/`。

> 首次发布已完成：`README.md` 里的地址已经是真实地址，换仓库/换账号时才需要改回占位地址重新提交一次。

> 也支持"传统"方式：Settings → Pages → Source 选 `Deploy from a branch` → `main` / `/ (root)`。
> 仓库根目录带 `.nojekyll`，Jekyll 不会插手，页面原样发布；缺点是会把 `tests/`、`.uiwork/` 一起公开托管（无害，只是不必要）。

## 5. 打标签 + 发 Release（带安装包）

```powershell
git tag -a v0.1.0 -m "v0.1.0 首个公开版本"
git push origin v0.1.0
```

先把 Windows 安装包打出来（版本号自动取 `VERSION.txt`）：

```powershell
powershell -ExecutionPolicy Bypass -File .uiwork\build-package.ps1                 # 产出 交火_v0.1.0.zip 到项目根目录
powershell -ExecutionPolicy Bypass -File .uiwork\build-package.ps1 -OutDir "D:\breach-dist"   # 或指定落点
```

> 装了 PowerShell 7 的话把 `powershell -ExecutionPolicy Bypass -File` 换成 `pwsh -File`。
> 本机默认执行策略禁止运行脚本，所以 `-ExecutionPolicy Bypass` 不能省。

只想挂一个轻量包（不含 187 MB 的 WebView2 离线安装器，约 5 MB）：

```powershell
powershell -ExecutionPolicy Bypass -File .uiwork\build-package.ps1 -NoWebView2
```

然后网页操作：仓库页 → **Releases → Draft a new release**

- **Choose a tag**：`v0.1.0`（选已有的 tag）
- **Release title**：`交火 v0.1.0 · 首个公开版本`
- **Describe this release**：把 [`CHANGELOG.md`](../CHANGELOG.md) 里 `## [v0.1.0]` 那一段整段粘过来
- **Attach binaries**：上传 `交火_v0.1.0.zip`

> 包里有 187 MB 的 WebView2 离线安装器时，zip 会到 188 MB。Release 附件的上限远大于这个数（2 GB），
> 但它会让下载变慢——想要轻量包就加 `-NoWebView2` 参数重新打包（约 5 MB），
> 安装器会自动跳过这一步（`install.bat` 里 WebView2 本来就是可选项）。
>
> 想同时挂一个网页版压缩包，直接把仓库的 `Code → Download ZIP` 链接写进 Release 说明即可。

## 6. 以后怎么升版本

`VERSION.txt` 是**唯一权威**。一次升版本要同步改这些地方（`npm test` 里的 `version_test.js` 会逐处比对，漏一处就红）：

| 位置 | 改什么 |
|---|---|
| `VERSION.txt` | `v0.2.0` |
| `index.html` ×4 / `game/hub.html` ×1 / `game/street.html` ×1 | 图签栏 `REV. 版次` |
| `game/breach.html` | `setTitleBlock` 里 `kind === 'rev'` 的注入值 |
| `package.json` | `version`（不带 `v`） |
| `CHANGELOG.md` | 新增 `## [v0.2.0] - YYYY-MM-DD` 段 |
| `README.md` / `AI_README.md` | 顶部"当前版本" |
| `.uiwork/build-package.ps1` | 不用改：它读 `VERSION.txt`，但**不要**把版本号写死回去 |

然后：

```powershell
npm test
git commit -am "release: v0.2.0"
git tag -a v0.2.0 -m "v0.2.0"
git push origin main --tags
```

再去 Releases 网页按第 5 步的格式发一版。

## 附：没有 git 的机器怎么发（v0.1.0 实际就是这么发的）

本项目的首次发布是在一台**没有 git、且从 GitHub 拉大文件只有 16 KB/s** 的 Windows 机器上完成的，
所以没走 `git push`，而是用 GitHub REST API 直接写仓库（不需要 git，只需要一个 `repo` + `workflow` 的 token）：

| 步骤 | 接口 |
|---|---|
| 建仓库 | `POST /user/repos` |
| 空仓库先造一个初始提交（Git Data API 在空仓库上会 409） | `PUT /repos/{o}/{r}/contents/README.md` |
| 每个文件传 blob（base64） | `POST /repos/{o}/{r}/git/blobs` |
| 一次性建整棵树 | `POST /repos/{o}/{r}/git/trees` |
| 建根提交（不带 `parents`） | `POST /repos/{o}/{r}/git/commits` |
| 覆盖 `main` | `PATCH /repos/{o}/{r}/git/refs/heads/main`（`force: true`） |
| 开 Pages | `POST /repos/{o}/{r}/pages` `{"build_type":"workflow"}` |
| 触发部署 | `POST /repos/{o}/{r}/actions/workflows/pages.yml/dispatches` |
| 建 Release / 传附件 | `POST /repos/{o}/{r}/releases`、`POST https://uploads.github.com/repos/{o}/{r}/releases/{id}/assets?name=` |

实测踩到的三个坑：

- 空仓库上 `GET /git/ref/heads/main` 返回的是 **409**（"Git Repository is empty"）而不是 404，两个都要当成"没有分支"；
- **Release 附件名里的非 ASCII 字符会被替换成 `_`**（`交火_v0.1.0.zip` 上去就变成 `_v0.1.0.zip`，改名接口也救不回来），
  附件请直接用 ASCII 名 —— 本次用的是 `CROSSFIRE_v0.1.0_windows.zip`；
- token 的 scope：写 `.github/workflows/` 必须带 **`workflow`**，建仓库/写文件要 **`repo`**，开 Pages 还需要该账号的 Pages 权限。
  token 不要贴进聊天、不要进命令行历史，用完立刻删掉本地那份。

## 常见坑（都踩过）

| 现象 | 原因 / 处理 |
|---|---|
| `git push` 报 `remote: error: File ... is 187.00 MB; this exceeds GitHub's file size limit of 100.00 MB` | 安装器被提交了。`git rm --cached MicrosoftEdgeWebView2RuntimeInstallerX86.exe`，确认 `.gitignore` 生效后 amend 提交 |
| Release 附件名变成 `_v0.1.0.zip` | GitHub 会把非 ASCII 附件名替换成下划线，改用 ASCII 名重传（或用改名接口也无效，直接重传） |
| Pages 上图标全是空白方块 | `fontawesome-free-7.3.1-web/` 没上传，或路径大小写不对。Linux 大小写敏感，`node tools/check-site.js` 能在上传前抓出来 |
| Pages 打开是 README 的渲染页 / 404 | Pages 的 Source 没选对，或还没跑完第一次部署；`index.html` 必须在仓库根目录 |
| `install.bat` 在别的机器上乱码 | 该文件是 **GBK + CRLF**，编辑时不要转成 UTF-8；`.gitattributes` 里已把它标成 `-text`（按原字节存取） |
| 测试在 CI 上红、本地绿 | 先看 `npm test` 输出里的脚本名；`preview_test.js` / `render_test.js` 对路径与浮点敏感，多半是改了地图或渲染却没同步预览数据 |
| 老玩家更新后提示"包比已装旧" | 公开发布从 `v0.1.0` 重新起算，安装器按字符串比较版本，遇到旧装的 `v3.x` 会保守报警；输入 `Y` 覆盖即可（或用 `/yes`） |

## 维护者的两条底线

1. **不要手改四个游戏页面的结构**，除非读过 [`AI_README.md`](../AI_README.md) 的「改 UI 的红线」——
   `tests/` 直接读页面源码、把 `<script>` 送进 `vm`，改错一个 id 或类名就是一片红。
2. **零联网是硬约束**。加任何 `http(s)://`、`@import`、`url(`、`fetch(`、外部字体或 emoji 依赖，
   `offline_test.js` 都会失败——这是故意的，不是测试太严。
