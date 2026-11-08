# 重新生成《交火》安装包 zip
#   PowerShell 7:        pwsh -File .uiwork/build-package.ps1
#   Windows PowerShell:  powershell -ExecutionPolicy Bypass -File .uiwork/build-package.ps1
#   （本机执行策略默认禁止运行脚本, 所以必须带 -ExecutionPolicy Bypass）
#   -Version 可选: 不传就读项目根目录的 VERSION.txt(版本号单一来源, 与四页图签栏 / package.json 同源,
#   tests/version_test.js 会比对打包脚本的默认值, 所以这里不要写死版本号)。
#   -OutDir 可选: 指定 zip 落点(默认项目根目录)。例如把包直接吐到 D 盘:
#     pwsh -File .uiwork/build-package.ps1 -OutDir "D:\breach-dist"
#   -NoWebView2 可选: 不并入 187MB 的 WebView2 离线安装器(包体积约 5MB, 适合挂 GitHub Release)。
#     pwsh -File .uiwork/build-package.ps1 -NoWebView2
# 注意: 本文件必须保存为「UTF-8 with BOM」, 否则 Windows PowerShell 5.1 会按 ANSI 读中文注释而解析失败。
param([string]$Version = '', [string]$OutDir = '', [switch]$NoWebView2)

$ErrorActionPreference = 'Stop'
$root  = Split-Path -Parent $PSScriptRoot          # 项目根目录

# 版本号: 未显式指定时读 VERSION.txt(形如 vX.Y.Z)。找不到就报错, 绝不静默用一个过期版本号打包装。
if (-not $Version) {
  $vf = Join-Path $root 'VERSION.txt'
  if (Test-Path $vf) { $Version = (Get-Content -LiteralPath $vf -TotalCount 1).Trim() }
}
if (-not $Version) { throw '找不到版本号: 项目根目录缺 VERSION.txt, 请显式传 -Version vX.Y.Z' }

$name  = "交火_$Version"
$stage = Join-Path $env:TEMP 'breach-pkg'
$pkg   = Join-Path $stage $name
if (-not $OutDir) { $OutDir = $root }
$zip   = Join-Path $OutDir "$name.zip"

# FontAwesome 资源目录: 随包分发时它必须与 index.html 同级。
# 两种布局都支持 —— "在项目根里"(整理后的标准布局) 与 "在项目上一级"(本机当前的历史布局)。
$faSrc = Join-Path $root 'fontawesome-free-7.3.1-web'
if (-not (Test-Path $faSrc)) {
  $alt = Join-Path (Split-Path -Parent $root) 'fontawesome-free-7.3.1-web'
  if (Test-Path $alt) { $faSrc = $alt }
}
if (-not (Test-Path $faSrc)) { throw "找不到 fontawesome-free-7.3.1-web/（既不在 $root 也不在其上一级）" }

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $pkg -Force | Out-Null
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

# 1) 游戏本体 + 文档(README / LICENSE / CHANGELOG / 第三方声明 一并发给玩家)
Copy-Item "$root\index.html", "$root\photo.ico", "$root\AI_README.md" $pkg
foreach ($doc in 'README.md', 'CHANGELOG.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md') {
  if (Test-Path (Join-Path $root $doc)) { Copy-Item (Join-Path $root $doc) $pkg }
}
if (Test-Path "$root\CHANGELOG_v3.md") { Copy-Item "$root\CHANGELOG_v3.md" $pkg }
if (Test-Path "$root\AUDIT.md")       { Copy-Item "$root\AUDIT.md" $pkg }
New-Item -ItemType Directory -Path "$pkg\game", "$pkg\tests" -Force | Out-Null
Copy-Item "$root\game\*.html" "$pkg\game"
Copy-Item "$root\tests\*"     "$pkg\tests" -Recurse

# 2) FontAwesome: 只保留被引用的 5 个文件(28.8MB -> 0.24MB) + 许可 + 裁剪说明
$fa = "$pkg\fontawesome-free-7.3.1-web"
New-Item -ItemType Directory -Path "$fa\css", "$fa\webfonts" -Force | Out-Null
Copy-Item "$faSrc\css\all.min.css"   "$fa\css"
Copy-Item "$faSrc\webfonts\*.woff2"  "$fa\webfonts"
Copy-Item "$faSrc\LICENSE.txt"       $fa
Copy-Item "$PSScriptRoot\pkg\打包说明.txt" $fa

# 3) 安装器 + 版本戳 + WebView2 离线安装器(放进包根, 与 index.html 同级)
Copy-Item "$PSScriptRoot\pkg\install.bat" $pkg
[System.IO.File]::WriteAllText((Join-Path $pkg 'VERSION.txt'), "$Version`r`n", (New-Object System.Text.ASCIIEncoding))
# WebView2 离线安装器(可选, 187MB): 先看项目根目录, 再看上一级(历史布局); 都没有就跳过 —— 游戏本身是纯网页。
$wvSrc = Join-Path $root 'MicrosoftEdgeWebView2RuntimeInstallerX86.exe'
if (-not (Test-Path $wvSrc)) {
  $wvAlt = Join-Path (Split-Path -Parent $root) 'MicrosoftEdgeWebView2RuntimeInstallerX86.exe'
  if (Test-Path $wvAlt) { $wvSrc = $wvAlt }
}
if ($NoWebView2) {
  "WebView2 离线安装器: 按 -NoWebView2 跳过(包体积约 5MB, 适合放到 GitHub Release)"
} elseif (Test-Path $wvSrc) {
  Copy-Item $wvSrc $pkg
  "WebView2 离线安装器: 已并入包内"
} else {
  "WebView2 离线安装器: 未找到($wvSrc) —— 包照常可用, 安装器会提示去官网下载"
}

# 3) 玩家说明书
Copy-Item "$PSScriptRoot\pkg\使用说明.txt" $pkg

# 4) 压包
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path $pkg -DestinationPath $zip -CompressionLevel Optimal

$f = Get-Item $zip
"生成: {0}" -f $f.FullName
"体积: {0:N2} MB   文件数: {1}" -f ($f.Length / 1MB), (Get-ChildItem $pkg -Recurse -File).Count
"提示: 本脚本刻意排除 .uiwork/ 开发工作台(审计脚本、约束报告、截图)。"
