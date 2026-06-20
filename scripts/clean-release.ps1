# scripts/clean-release.ps1
# 清理本仓库与外部 dist 目录中的旧产物，避免 EBUSY app.asar
$ErrorActionPreference = 'SilentlyContinue'
$projectRoot = (Resolve-Path "$PSScriptRoot/..").Path
$externalDist = $env:ATC_DIST_DIR
if (-not $externalDist) { $externalDist = "D:\AIKFCC\AI-Timeline-Creator-dist\$(node -p "require('$projectRoot/package.json').version")" }

function Stop-RelatedNode {
  Write-Host "[clean] 终止本项目残留 node/electron 进程..."
  Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='electron.exe'" | Where-Object {
    $_.CommandLine -like "*AI-Timeline-Creator*" -or $_.ExecutablePath -like "*AI-Timeline-Creator*"
  } | ForEach-Object {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
  }
}

function Remove-DirSafely($path) {
  if (-not (Test-Path $path)) { return }
  Write-Host "[clean] 处理 $path"
  $renamed = "$path`_purge_$(Get-Date -Format 'yyyyMMddHHmmss')"
  try { Rename-Item -Path $path -NewName (Split-Path $renamed -Leaf) -Force } catch {}
  $target = if (Test-Path $renamed) { $renamed } else { $path }
  for ($i = 0; $i -lt 5; $i++) {
    try { [System.IO.Directory]::Delete($target, $true); break } catch { Start-Sleep -Seconds 2 }
  }
  if (Test-Path $target) {
    Write-Host "[clean] 直接删除失败，尝试 asar 解压绕过..."
    $asar = Join-Path $target 'dist\win-unpacked\resources\app.asar'
    if (Test-Path $asar) {
      try {
        npx --yes @electron/asar extract $asar (Join-Path $env:TEMP "asar_$(Get-Random)") | Out-Null
        Remove-Item -Path $asar -Force -ErrorAction SilentlyContinue
      } catch {}
    }
    try { [System.IO.Directory]::Delete($target, $true) } catch {
      Write-Warning "[clean] 仍未能删除 $target，请手动检查 OneDrive / Indexer / 防病毒 是否锁定。"
    }
  }
}

Stop-RelatedNode
Remove-DirSafely (Join-Path $projectRoot 'release')
if ($externalDist) { Remove-DirSafely $externalDist }
Write-Host "[clean] 完成"
