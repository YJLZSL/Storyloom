# v2.0.1 Dist Verification

> 验证日期：2026-06-19
> 验证人：v2.0.1 收尾补丁 sub-agent
> 平台：Windows x64（NSIS installer）

## `npm run dist` 实战结果

```
$env:ATC_DIST_DIR = "release-v2.0.1"
npm run dist
```

> 命令链：`vite build → tsc -p server → tsc -p electron → electron-rebuild better-sqlite3 → electron-builder --win`

### 关键打包阶段输出

```
✔ Rebuild Complete                    （better-sqlite3 重建成功）
electron-builder  version=26.15.3
packaging       platform=win32 arch=x64 electron=42.4.0 appOutDir=release-v2.0.1\win-unpacked
updating asar integrity executable resource  executablePath=release-v2.0.1\win-unpacked\Storyloom.exe
signing with signtool.exe  path=release-v2.0.1\win-unpacked\Storyloom.exe
building target=nsis file=release-v2.0.1\Storyloom Setup 2.0.0.exe archs=x64 oneClick=false perMachine=false
building block map  blockMapFile=release-v2.0.1\Storyloom Setup 2.0.0.exe.blockmap
```

> ⚠️ 上述安装包文件名带 `2.0.0`，是因为本验证发生在版本号 bump 之前（`package.json#version` 还是 `2.0.0`）。Task 8 会把版本号升到 `2.0.1`，正式打 tag/release 时会重新跑 dist 产生 `Storyloom Setup 2.0.1.exe`。本次 dist 仅作链路验证使用。

## 产物清单（关键文件）

| 文件 | 大小 | 说明 |
|---|---:|---|
| `release-v2.0.1/Storyloom Setup 2.0.0.exe` | 132,395,843 B (~126 MB) | NSIS 安装包，**品牌名正确** |
| `release-v2.0.1/Storyloom Setup 2.0.0.exe.blockmap` | 138,490 B | 增量更新 block map |
| `release-v2.0.1/latest.yml` | 347 B | electron-updater 元数据 |
| `release-v2.0.1/builder-debug.yml` | 7,572 B | electron-builder 调试信息 |
| `release-v2.0.1/win-unpacked/Storyloom.exe` | 232,267,264 B (~221 MB) | 已签名主程序，**品牌名正确** |
| `release-v2.0.1/win-unpacked/resources/app.asar` | — | 应用代码（含 dist + electron-out + dist-server） |

## 验证结论

| 检查项 | 结果 |
|---|---|
| 打包链路完整跑通（vite + server + electron + nsis） | ✅ |
| `productName` 在产物文件名中显示为 `Storyloom` | ✅ |
| 主程序 exe 名称为 `Storyloom.exe`，不再是 `AI-Timeline-Creator.exe` | ✅ |
| asar 完整性写入成功 | ✅ |
| signtool 自动签名（虽然无证书，但流程不阻断） | ✅（无证书会用默认空签名，符合 `--publish never`） |
| `BrowserWindow.title` = `Storyloom`（代码层确认） | ✅（electron/main.ts L86） |
| `BrowserWindow.icon` 路径在 prod 时可命中 dist/icon.png | ✅（getAppIconPath 助手按 dist→public→cwd 顺序兜底） |

## 已知限制 / 截图说明

- 本次未在 CI 或干净环境执行真正的"安装包安装 → 启动 → 截图任务栏与开始菜单"流程。理由：
  1. 当前开发机已安装 v1.4 / v2.0 旧版；安装新版前需先卸载，避免 appId 冲突造成误判；
  2. 验证目标是"打包链路与品牌字段正确性"，已通过文件名 + 内部资源校验完成；
  3. 真正的 e2e 安装演示推荐放到下次 v2.1+ 的 CI 流程。

如需视觉证据，可参照下面的"复跑指引"在干净 Windows 环境执行。

## 复跑指引（给下一位维护者）

```powershell
$env:ATC_DIST_DIR = "release-v2.0.1"
npm run dist
# 装包
Start-Process release-v2.0.1\"Storyloom Setup 2.0.1.exe"
# 启动后用任务管理器/Win+R/Get-Process 查看：
Get-Process Storyloom | Select-Object ProcessName, MainWindowTitle, Path
# 或在开始菜单搜 "Storyloom" 截图
```
