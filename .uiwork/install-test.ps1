# install.bat 场景测试(用 CLI 参数驱动, 断言只认 ASCII 标记行 CF:…)
# 用法: powershell -NoProfile -ExecutionPolicy Bypass -File .uiwork/install-test.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$batSrc = Join-Path $root '.uiwork\pkg\install.bat'
$work = Join-Path $env:TEMP ('cf-it-' + (Get-Random))
$pkg = Join-Path $work '交火_v3.3'
$dst = Join-Path $work 'GameDir'
$ASCII = [System.Text.Encoding]::ASCII
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

New-Item -ItemType Directory -Force -Path (Join-Path $pkg 'game') | Out-Null
Set-Content -Path (Join-Path $pkg 'index.html') -Value '<html><body>fake</body></html>' -Encoding UTF8
Set-Content -Path (Join-Path $pkg 'game\breach.html') -Value '<span class="tb-k">REV. 版次</span><span class="tb-v">v3.1</span>' -Encoding UTF8
[System.IO.File]::WriteAllText((Join-Path $pkg 'VERSION.txt'), "v3.3`r`n", [System.Text.Encoding]::ASCII)
Set-Content -Path (Join-Path $pkg 'photo.ico') -Value 'icon' -Encoding ASCII
Copy-Item $batSrc (Join-Path $pkg 'install.bat')

function RunIn([string]$dir, [string[]]$cliArgs) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'cmd.exe'
  $argline = '/c ""' + (Join-Path $dir 'install.bat') + '"'
  foreach ($a in $cliArgs) { $argline += ' ' + $a }
  $argline += '"'
  $psi.Arguments = $argline
  $psi.RedirectStandardInput = $true; $psi.RedirectStandardOutput = $true; $psi.UseShellExecute = $false
  $p = [System.Diagnostics.Process]::Start($psi)
  $ms = New-Object System.IO.MemoryStream
  $p.StandardInput.Close()          # 全部走参数, 不需要交互输入
  $buf = New-Object byte[] 8192
  while (($n = $p.StandardOutput.BaseStream.Read($buf, 0, $buf.Length)) -gt 0) { $ms.Write($buf, 0, $n) }
  $p.WaitForExit(120000) | Out-Null
  $text = $ASCII.GetString($ms.ToArray())
  $marks = @{}
  foreach ($m in [regex]::Matches($text, 'CF:([A-Za-z]+)=([^\r\n]*)')) {
    if (-not $marks.ContainsKey($m.Groups[1].Value)) { $marks[$m.Groups[1].Value] = $m.Groups[2].Value.Trim() }
  }
  return @{ code = $p.ExitCode; marks = $marks; text = $text }
}
function Run([string[]]$cliArgs) { RunIn $pkg $cliArgs }
function RunEnv([string]$dir) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "cmd.exe"
  $psi.Arguments = '/c ""' + (Join-Path $pkg 'install.bat') + '""'
  $psi.RedirectStandardInput = $true; $psi.RedirectStandardOutput = $true; $psi.UseShellExecute = $false
  $psi.EnvironmentVariables['CF_DIR'] = $dir
  $p = [System.Diagnostics.Process]::Start($psi)
  $ms = New-Object System.IO.MemoryStream
  $p.StandardInput.Close()
  $buf = New-Object byte[] 8192
  while (($n = $p.StandardOutput.BaseStream.Read($buf, 0, $buf.Length)) -gt 0) { $ms.Write($buf, 0, $n) }
  $p.WaitForExit(120000) | Out-Null
  $text = $ASCII.GetString($ms.ToArray())
  $marks = @{}
  foreach ($m in [regex]::Matches($text, 'CF:([A-Za-z]+)=([^\r\n]*)')) { if (-not $marks.ContainsKey($m.Groups[1].Value)) { $marks[$m.Groups[1].Value] = $m.Groups[2].Value.Trim() } }
  return @{ code = $p.ExitCode; marks = $marks; text = $text }
}

$fail = 0
function Check($cond, $msg) { if ($cond) { Write-Host ("  ok: " + $msg) } else { Write-Host ("  FAIL: " + $msg); $script:fail++ } }
function Section($t) { Write-Host ("`n=== " + $t + " ===") }

Write-Host ("管理员: " + $admin + "  工作目录: " + $work)

Section '场景1 全新安装 /dir:<不存在>'
$r = Run @("/dir:$dst")
Check ($r.code -eq 0) "退出码 0 (实际 $($r.code))"
Check ($r.marks['PKG'] -eq 'OK') "包结构自检通过 (CF:PKG)"
Check ($r.marks['STATUS'] -eq 'NEW') "判定为全新安装 (CF:STATUS)"
Check ($r.marks['DIR'] -eq $dst) "目标目录正确 (CF:DIR)"
Check ($r.marks['WV'] -eq 'FOUND') "WebView2 已装并检出 (CF:WV)"
Check ($r.marks['LNK'] -eq 'OK') "桌面快捷方式创建成功 (CF:LNK)"
Check ($r.marks['COPY'] -eq 'OK') "文件写入完成 (CF:COPY)"
Check (Test-Path (Join-Path $dst 'index.html')) "游戏文件已落地"
Check (Test-Path (Join-Path $dst 'game\breach.html')) "game\ 子目录已复制"
Check ((Get-Content (Join-Path $dst 'VERSION.txt') -Raw).Trim() -eq 'v3.3') "VERSION.txt = v3.3"
Check (Test-Path (Join-Path ([Environment]::GetFolderPath('Desktop')) '交火.lnk')) "磁盘上确实有 交火.lnk"

Section '场景2 同版本重装'
$r = Run @("/dir:$dst")
Check ($r.code -eq 0) "退出码 0 (实际 $($r.code))"
Check ($r.marks['STATUS'] -eq 'UPDATE') "判定为更新 (CF:STATUS)"
Check ($r.marks['VER'] -eq 'v3.3' -or $r.marks['VER'] -eq 'INSTALLED:v3.3') "读到已装版本 v3.3 (CF:VER=$($r.marks['VER']))"
Check ($r.marks['CMP'] -eq 'EQ') "版本比对 = 相同 (CF:CMP)"

Section '场景3 降级(安装包 v3.2 / 已装 v3.3)'
[System.IO.File]::WriteAllText((Join-Path $pkg 'VERSION.txt'), "v3.2`r`n", [System.Text.Encoding]::ASCII)
$r = Run @("/dir:$dst")
Check ($r.marks['CMP'] -eq 'LT') "判定包更旧 (CF:CMP=LT)"
Check ($r.marks['DECISION'] -eq 'ABORT') "未带 /yes → 拒绝覆盖 (CF:DECISION)"
Check ($r.code -eq 1) "拒绝时退出码 1 (实际 $($r.code))"
Check ((Get-Content (Join-Path $dst 'VERSION.txt') -Raw).Trim() -eq 'v3.3') "拒绝后目标未被改动"
$r = Run @("/dir:$dst", "/yes")
Check ($r.marks['DECISION'] -eq 'FORCE') "带 /yes → 强制覆盖 (CF:DECISION)"
Check ($r.code -eq 0) "强制覆盖退出码 0"
Check ((Get-Content (Join-Path $dst 'VERSION.txt') -Raw).Trim() -eq 'v3.2') "目标确实降级成 v3.2"

Section '场景4 老安装无 VERSION.txt → 从图签栏 REV 读版本'
[System.IO.File]::WriteAllText((Join-Path $pkg 'VERSION.txt'), "v3.3`r`n", [System.Text.Encoding]::ASCII)
Remove-Item (Join-Path $dst 'VERSION.txt') -Force
Set-Content -Path (Join-Path $dst 'game\breach.html') -Value '<span class="tb-k">REV. 版次</span><span class="tb-v">v3.2</span>' -Encoding UTF8
$r = Run @("/dir:$dst")
Check ($r.marks['VER'] -eq 'v3.2' -or $r.marks['VER'] -eq 'INSTALLED:v3.2') "从 REV 版次读到 v3.2 (CF:VER=$($r.marks['VER']))"
Check ($r.marks['CMP'] -eq 'GT') "包更新 (CF:CMP=GT)"
Check ($r.code -eq 0 -and (Get-Content (Join-Path $dst 'VERSION.txt') -Raw).Trim() -eq 'v3.3') "随后正常升级到 v3.3"

Section '场景5 目录路径带空格'
$sp = Join-Path $work 'My Games'
$r = RunEnv $sp
Check ($r.marks['DIR'] -eq $sp) "带空格路径原样接受"
Check (Test-Path (Join-Path $sp 'index.html')) "带空格的目录被正确安装"

Section '场景6 包不完整(缺 index.html)'
$bad = Join-Path $work 'BrokenPkg'
New-Item -ItemType Directory -Force -Path $bad | Out-Null
Copy-Item $batSrc (Join-Path $bad 'install.bat')
$r6 = RunIn $bad @("/dir:$work\Never")
Check ($r6.code -eq 1) "退出码 1 (实际 $($r6.code))"
Check ($r6.text -match 'index\.html') "错误里点名 index.html"
Check (-not $r6.marks.ContainsKey('PKG')) "缺包时不会打出 CF:PKG=OK"

Write-Host ("`n结果: " + $(if ($fail -eq 0) { '全部通过' } else { "$fail 项失败" }) + "  工作目录: $work")
exit $fail
