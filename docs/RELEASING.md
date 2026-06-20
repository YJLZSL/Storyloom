# Storyloom 发版指南

> 最后更新：v3.0.0

## 1. 版本号策略

- **v3.0 起单线 SemVer 递进**：`major.minor.patch`，每次只在一条主线上前进。
- 不再出现 v1.x / v2.x / v4.x 同时迭代的局面；早期版本号被归档为历史实验，发布说明已加 `[ARCHIVED]` 前缀。
- **`appId` 不可变更**：始终保持 `com.ai.timeline-creator`（见 `package.json#build.appId`）。该字段是 Windows NSIS 升级链路的全局键，已部署用户的覆盖安装、注册表项、用户数据目录均与之绑定，迁移成本远超收益。
- 资产命名采用连字符版（`Storyloom-Setup-X.Y.Z.exe`），与 `latest.yml` 中 `url` 字段保持完全一致；不要依赖 GitHub 301 重定向（v2.0.2 修复点）。

## 2. 标准发版流程（10 步）

> 假设目标版本号 `X.Y.Z`，以下命令按顺序执行；任意一步失败必须先修复再继续。

### Step 1 — Bump version

改 `package.json#version`，并同步 lockfile：

```bash
npm install --package-lock-only
```

### Step 2 — 质量门三连

```bash
npm run typecheck
npm run test
npm run build
```

三条必须 exit 0。任何 TS 错、单测失败、构建失败一律就地修。

### Step 3 — Commit

```bash
git add -A
git commit -m "chore(vX.Y.Z): <一句话总结本版主要改动>"
```

### Step 4 — Tag

```bash
git tag -a vX.Y.Z -m "Storyloom vX.Y.Z — <亮点>"
```

### Step 5 — Push

```bash
git push origin master
git push origin vX.Y.Z
```

### Step 6 — 构建分发包

```powershell
$env:ATC_DIST_DIR = "release-vX.Y.Z"
npm run dist
```

`predist` 会自动跑 `clean:release` 清场；`dist` 串：`build` → `build:server` → `build:electron` → `electron:rebuild` → `electron-builder --win --publish never`。

产物：`release-vX.Y.Z\Storyloom Setup X.Y.Z.exe`、同名 `.blockmap`、`latest.yml`。

### Step 7 — 重命名 artifacts

把空格版改成连字符版（必须与 `latest.yml#url` 一致）：

```powershell
Rename-Item "release-vX.Y.Z\Storyloom Setup X.Y.Z.exe" "Storyloom-Setup-X.Y.Z.exe"
Rename-Item "release-vX.Y.Z\Storyloom Setup X.Y.Z.exe.blockmap" "Storyloom-Setup-X.Y.Z.exe.blockmap"
```

打开 `latest.yml` 确认 `url:` 字段已是 `Storyloom-Setup-X.Y.Z.exe`；如未对齐，手动改并保存（electron-builder 在某些版本会写出空格版）。

### Step 8 — 上传 GitHub Release

```bash
gh release create vX.Y.Z `
  "release-vX.Y.Z\Storyloom-Setup-X.Y.Z.exe" `
  "release-vX.Y.Z\Storyloom-Setup-X.Y.Z.exe.blockmap" `
  "release-vX.Y.Z\latest.yml" `
  --title "Storyloom vX.Y.Z — <主题>" `
  --notes-file docs/release-notes-vX_Y_Z.md
```

三件套缺一不可：`.exe` / `.blockmap` / `latest.yml`。

### Step 9 — 验证 latest 稳定 URL

```powershell
Invoke-WebRequest https://github.com/YJLZSL/Storyloom/releases/latest/download/latest.yml
```

期望：HTTP 200，响应内容包含 `version: X.Y.Z` 与正确的 `url` / `sha512` 字段。该 URL 是 electron-updater 的入口，必须可访问。

### Step 10 — 更新 CHANGELOG

把本版条目加到 `CHANGELOG.md` 顶部（≤ 5 行 + 链接到 GitHub release 页），提交：

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): add vX.Y.Z entry"
git push origin master
```

## 3. 自动更新调试

### 客户端日志

`electron-updater` 默认走 `console.log` / `console.error`，主进程已通过 `setupLogging()` 把 stdout/stderr 同步写入 `%APPDATA%\storyloom\app.log`。要查看：

```powershell
Get-Content "$env:APPDATA\storyloom\app.log" -Tail 200 -Wait
```

关键日志前缀：`[updater] checking-for-update` / `[updater] update-available v...` / `[updater] error`。

### 手动复现升级

1. 把本地 `package.json#version` 临时改成上一版（例：发布 `3.0.0` 后想测，就改成 `2.9.9`）。
2. `npm run dist`，安装产出的安装包。
3. 启动应用；5 秒后主进程自动 `autoUpdater.checkForUpdates()`，渲染层 `UpdateNotifier` 收到 `update:event`。
4. 抓包：用 Fiddler / Charles / Wireshark 看是否真的请求了 `https://github.com/YJLZSL/Storyloom/releases/latest/download/latest.yml`。

### 常见坑

- `package.json#build.publish.repo` 必须与实际仓库名一致（当前 `YJLZSL/Storyloom`）。
- 不要依赖 GitHub 301 重定向（旧版偶发把 `Storyloom Setup` 空格版写进 `latest.yml`，导致 client 请求 404 → 静默失败）—— 永远手动核对 Step 7。
- `sha512` 必须与 asset 实际哈希一致；electron-builder 在打包阶段已校对，但若手动替换过 exe 务必重新算。
- 生产模式下 `autoDownload = false`，下载需要渲染层显式 `update:download`；这是 UI 设计决策，不要随手改。

## 4. 附录：v2.0.2 → v3.0.0 已验证升级流程

本轮 `cleanup-and-firstrun-fix-v3_0_0` 完整走过上述 10 步：

1. 改 `package.json` 2.0.2 → 3.0.0，`npm install --package-lock-only` 同步 lockfile。
2. 三连质量门通过；`vitest` 12 用例全绿。
3. 综合 commit `chore(v3.0.0): cleanup repo + rewrite docs + fix first-run UX + fix create-workspace dialog`，打 tag `v3.0.0` 推送。
4. `$env:ATC_DIST_DIR = "release-v3.0.0"; npm run dist` 产出 `Storyloom-Setup-3.0.0.exe`（约 126 MB）+ `.blockmap` + `latest.yml`。
5. `gh release create v3.0.0` 一次上传三件套，`docs/release-notes-v3_0.md` 作为 notes。
6. `Invoke-WebRequest https://github.com/YJLZSL/Storyloom/releases/latest/download/latest.yml` 返回 HTTP 200，`version: 3.0.0`，URL/SHA 自洽。
7. 已部署的 v2.0.2 客户端在启动 5 秒内即收到 `update-available` 事件，整链路打通。

将本附录作为下一次发版的"复跑模板"：替换其中所有 `3.0.0` 为目标版本号，按 Step 1–10 顺序执行即可。
