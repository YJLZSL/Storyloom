# Storyloom · 织叙 v1.0.0 开发状态交接文档

> 生成时间：2026-06-22 00:36:34
> 生成人：Orchestrator AI（当前会话）
> 目的：为接手AI提供完整上下文，指导后续开发和修复

---

## 一、用户原始需求（请严格遵循）

用户明确要求：

1. **彻底解决签名密钥问题** — 保留好密钥，不要让签名流程成为瓶颈
2. **修复版本号显示** — 截图显示 v1.5.0，需要确保 v1.0.0 正确显示
3. **修复品牌名** — 截图显示"絮织"，需要全部改为"织叙"
4. **修复应用图标** — 左上角显示默认图标，需要正确显示新设计的图标
5. **修复"Failed to fetch"** — 创建工作区时后端通信失败，应用完全无法使用
6. **修复白屏问题** — 应用启动后内容区域空白
7. **用 Canva 插件设计图标** — 提升前端视觉表现
8. **更新 GitHub 仓库描述** — 仍显示旧名称
9. **清理遗留代码** — 大量 v1.5.0 遗留文档和引用
10. **先整理需求 → 开发构建 → 更新文档 → 排查遗留 → 测试无误再发布**
11. **不要再出现低级问题**

---

## 二、截图问题分析（已确认）

### 截图1：主界面
- **左下角显示 `v1.5.0`** — 版本号错误
- **左上角显示 `Storyloom · 絮织`** — 品牌名错误
- **图标为默认方块** — 未使用新图标
- 左侧面板有织线图案（v1.5.0 旧设计）

### 截图2：创建工作区失败
- **错误：`创建失败: Failed to fetch`**
- 用户在名称和描述字段输入了"1"
- 选择模板后点击创建，弹出错误提示

### 截图3：设置 → 更新
- **明确显示 `当前版本 v1.5.0`**
- 自动检查更新开关已开启

### 截图4：应用白屏
- **整个窗口完全空白**（纯白）
- 标题栏显示 `Storyloom`（正确）
- 说明前端渲染或 sidecar 启动有严重问题

### 关键推断
用户安装的是 **v1.5.0 旧版本**，不是 v1.0.0。原因：
- 版本号显示 v1.5.0（代码中已改为 1.0.0）
- 品牌名显示"絮织"（代码中已改为"织叙"）

但用户说 v1.0.0 也"完全无法使用"，所以需要同时：
1. 确保 v1.0.0 构建产物正确（版本号、品牌名）
2. 修复导致"Failed to fetch"和白屏的功能性 bug

---

## 三、代码状态（已排查）

### 版本号配置（已正确）
| 文件 | 版本号 | 状态 |
|------|--------|------|
| `package.json` | `1.0.0` | ✅ |
| `src-tauri/Cargo.toml` | `1.0.0` | ✅ |
| `src-tauri/tauri.conf.json` | `1.0.0` | ✅ |

### 品牌名配置（已正确）
| 文件 | 品牌名 | 状态 |
|------|--------|------|
| `package.json` description | `Storyloom · 织叙` | ✅ |
| `src-tauri/Cargo.toml` description | `Storyloom · 织叙` | ✅ |
| `src-tauri/tauri.conf.json` 窗口标题 | `Storyloom · 织叙` | ✅ |

### 前端版本号读取（已正确）
- `src/components/settings/UpdateTab.tsx` 第16行：`const APP_VERSION = (packageJson as { version?: string }).version ?? 'unknown';`
- `src/components/layout/EmptyShell.tsx` 第15行：同上
- `src/components/settings/SettingsTabs.tsx` 第27行：同上

### 仍含"絮织"引用的文件（需要修复）
- `public/favicon.svg` 第2行：`<title>Storyloom · 絮织</title>`
- `public/icon-monochrome.svg` 第2行：`<title>Storyloom · 絮织 (monochrome)</title>`
- 大量 `docs/` 和 `docs/_archive/` 文档（非代码问题，但需更新）

### 仍含 v1.5.0 引用的文件（需要清理）
- `CHANGELOG.md` 多处
- `docs/agents.md` 第5行
- `docs/AI集成指南.md` 第765行
- `docs/README.md` 多处
- `docs/更新日志-v1.5.0.md`（整份文档）
- `docs/_archive/` 下大量文档
- `shared/types.ts` 第694行注释：`// 资料库（笔记本）类型 (v1.5)`
- `src/services/api-hooks.ts` 第273行注释：`// 资料库（笔记本）API Hooks (v1.5)`
- `src/services/api-hooks.ts` 第434行注释：`// 视觉小说（剧本编辑器）API Hooks (v1.2)`
- `updater-diagnosis.md` 整份文档（旧版本诊断，已过时）

---

## 四、关键 Bug：Failed to fetch（最高优先级）

### 问题描述
创建工作区时，前端调用 `fetch('/api/workspaces')` 失败，提示 "Failed to fetch"。

### 可能原因分析

**原因1：Sidecar 未正确启动**
- `src-tauri/src/lib.rs` 中的 `start_sidecar()` 负责启动后端 sidecar
- sidecar 启动后需要监听 stdout 中的 `{"type":"ready","port":3001}`
- 如果 sidecar 启动失败或端口未就绪，前端无法获取 API 基础路径

**原因2：前端 API 路径错误**
- `src/stores/useWorkspaceStore.ts` 第53行：`const res = await fetch('/api/workspaces');`
- 这个路径是相对路径，如果前端不是通过 dev server 运行，可能无法正确解析
- 需要检查 `API_BASE` 是否正确设置

**原因3：API 基础路径获取失败**
- `src/App.tsx` 第32行：`getServerPort()` 获取 sidecar 端口
- `src/services/api.ts` 使用 `getServerPort()` 动态构建 API URL
- 如果 `getServerPort()` 返回失败或超时，API 调用会失败

**原因4：CSP 安全策略阻止**
- `tauri.conf.json` 第26行：
  ```json
  "csp": "default-src 'self'; connect-src 'self' http://localhost:* http://127.0.0.1:*; img-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'"
  ```
- 如果 sidecar 使用非 localhost 地址，会被 CSP 阻止

**原因5：Sidecar 可执行文件缺失**
- `tauri.conf.json` 第78-80行：
  ```json
  "externalBin": ["sidecars/storyloom-sidecar"]
  ```
- 需要确认 `src-tauri/sidecars/storyloom-sidecar.exe` 是否存在
- 如果构建过程中 sidecar 未正确编译，会导致运行时缺失

### 需要检查的关键代码

1. `src-tauri/src/lib.rs` — sidecar 启动逻辑
2. `src/App.tsx` — 获取 sidecar 端口和初始化流程
3. `src/services/api.ts` — API 基础路径配置
4. `src/stores/useWorkspaceStore.ts` — 创建工作区逻辑
5. `src/lib/tauri-api.ts` — Tauri API 封装（`getServerPort`, `isTauri` 等）

---

## 五、关键 Bug：白屏（最高优先级）

### 问题描述
应用启动后整个窗口空白，没有任何内容。

### 可能原因分析

**原因1：前端构建失败**
- `npm run build` 是否成功？
- `dist/` 目录是否包含正确的构建产物？
- 检查 `dist/index.html` 是否存在

**原因2：Tauri 配置错误**
- `tauri.conf.json` 第7行：`"frontendDist": "../dist"` — 是否正确指向构建产物？
- 生产模式下是否使用了 `devUrl`？（已启用 `custom-protocol` 修复）

**原因3：前端 JavaScript 错误**
- 检查是否有未捕获的异常导致 React 崩溃
- 检查 `API_BASE` 初始化失败是否导致整个应用无法渲染

**原因4：Sidecar 启动阻塞**
- 如果 `start_sidecar()` 阻塞或死锁，可能导致整个应用无法启动

---

## 六、签名密钥问题（高优先级）

### 当前状态
- 已有多个密钥文件：`v2.key`, `v3.key`, `v5.key` 及对应的 `.pub` 文件
- `v3.key` 格式异常（74字节，标准 minisign 密钥应为 104+ 字节）
- `v5.key` 和 `v2.key` 是 `rsign encrypted secret key` 格式（348字节）
- `cargo tauri signer sign` 在 Git Bash 中无限超时（120s+）

### 已知问题
- Git Bash (mintty) 与 Rust `std::io` 的交互可能导致死锁
- 使用 `winpty`、`cmd`、`/dev/null` 重定向、环境变量方式均会超时

### 建议解决方案
1. 使用 Python + PyNaCl 实现 minisign 签名（PyNaCl 已安装）
2. 或直接使用 PowerShell 运行签名命令（非 Git Bash）
3. 确认哪个密钥是有效的，删除无效密钥，避免混淆

### 当前 tauri.conf.json 中的 pubkey
```json
"pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXkNClJXUjZ3a1lvd29aMlVnZkRKalNSNkkxdFFMMVQ4S1dacWFvSWhTYzQxSmJlS0JHSitXb1pNbzA4DQo="
```

---

## 七、GitHub 仓库状态

### 仓库信息
- Owner: `YJLZSL`
- Repo: `Storyloom`
- URL: `https://github.com/YJLZSL/Storyloom`

### 需要更新的地方
- 仓库 About 描述（仍显示旧名称）
- 可能还有其他设置未更新

### 已创建的 Release
- v1.0.0 Release 已创建
- 已上传 `Storyloom_1.0.0_x64-setup.exe` 和 `latest.json`
- 但版本号可能不正确（用户安装后显示 1.5.0）

---

## 八、图标状态

### 已设计的图标文件
- `src-tauri/icons/` 目录下有 23 个平台尺寸 PNG
- `icon.ico`（Windows 图标）
- `icon.icns`（macOS 图标）
- `icon.png`（通用图标）
- `StoreLogo.png`（Windows Store）
- `Square*Logo.png` 系列（Windows 各种尺寸）

### 问题
- 截图显示左上角仍是默认方块图标
- 说明 `icon.ico` 未正确嵌入到 Windows 二进制资源中
- 或 Tauri 构建时未正确引用图标

### 需要检查
- `tauri.conf.json` 中的 `icon` 数组配置
- `icons/icon.ico` 文件是否正确生成
- Windows 资源编译是否正确包含图标

---

## 九、技术栈（供参考）

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 19.2.7 |
| 构建工具 | Vite | 6.0.0 |
| 样式 | Tailwind CSS | 4.3.1 |
| UI 组件 | TDesign React | 1.17.1 |
| 桌面框架 | Tauri | 2.11.3 |
| 后端框架 | Fastify | 5.0.0 |
| ORM | Drizzle ORM | 0.44.0 |
| 数据库 | SQLite | (better-sqlite3) |
| 加密 | PyNaCl | (Python runtime) |
| 包管理器 | npm | (Node.js v24.15.1) |
| 编译器 | Rust | 1.96.0 |

---

## 十、构建命令（需要 MSVC 环境）

```bash
# 设置 MSVC 环境变量
export PATH="/c/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/VC/Tools/MSVC/14.37.32822/bin/Hostx64/x64:$PATH"
export PATH="/c/Users/23501/.cargo/bin:$PATH"
export LIB="C:/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/VC/Tools/MSVC/14.37.32822/lib/x64;C:/Program Files (x86)/Windows Kits/10/Lib/10.0.22621.0/um/x64;C:/Program Files (x86)/Windows Kits/10/Lib/10.0.22621.0/ucrt/x64"
export INCLUDE="C:/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/VC/Tools/MSVC/14.37.32822/include;C:/Program Files (x86)/Windows Kits/10/Include/10.0.22621.0/ucrt;C:/Program Files (x86)/Windows Kits/10/Include/10.0.22621.0/um;C:/Program Files (x86)/Windows Kits/10/Include/10.0.22621.0/shared"

# 构建前端 + Tauri 安装包
cd D:/AIKFCC/Storyloom/src-tauri && cargo tauri bundle
```

---

## 十一、下一步行动计划（请按此执行）

### 阶段1：全面排查（优先级 P0）
1. ✅ 检查 `tauri.conf.json` 版本号（已确认正确）
2. ✅ 检查 `package.json` 版本号（已确认正确）
3. ✅ 检查 `Cargo.toml` 版本号（已确认正确）
4. ✅ 检查前端硬编码版本号（已确认正确）
5. ⏳ 检查 `public/favicon.svg` 和 `icon-monochrome.svg` 中的品牌名
6. ⏳ 检查 `src/stores/useWorkspaceStore.ts` 的 API 路径
7. ⏳ 检查 `src/lib/tauri-api.ts` 的 `getServerPort` 实现
8. ⏳ 检查 `src/App.tsx` 的启动流程
9. ⏳ 检查 sidecar 可执行文件是否存在
10. ⏳ 检查 `dist/` 构建产物是否完整

### 阶段2：修复核心 Bug（优先级 P0）
1. 修复 `Failed to fetch` — 可能是 sidecar 未启动或 API 路径错误
2. 修复白屏 — 可能是前端构建错误或 sidecar 启动失败
3. 验证图标是否正确嵌入

### 阶段3：清理遗留（优先级 P1）
1. 更新 `public/favicon.svg` 和 `icon-monochrome.svg` 中的品牌名
2. 清理 `docs/` 目录中的 v1.5.0 引用（或归档到 `_archive/`）
3. 更新 `CHANGELOG.md` 中的版本号
4. 删除或更新 `updater-diagnosis.md`
5. 更新代码注释中的版本号（`shared/types.ts`, `src/services/api-hooks.ts`）

### 阶段4：图标重设计（优先级 P1）
1. 使用 Canva 插件重新设计应用图标
2. 生成所有平台尺寸的图标文件
3. 替换 `src-tauri/icons/` 下的所有图标
4. 验证 Windows 任务栏和窗口图标是否正确显示

### 阶段5：签名修复（优先级 P1）
1. 确认有效密钥（测试签名和验证）
2. 删除无效/冗余密钥文件
3. 在文档中记录签名流程
4. 使用 Python/PyNaCl 或 PowerShell 替代 Git Bash 进行签名

### 阶段6：GitHub 更新（优先级 P1）
1. 更新仓库 About 描述
2. 更新 README 文档
3. 确认 Release 中的版本号正确

### 阶段7：构建和测试（优先级 P0）
1. 完整清理构建：`npm run build` + `cargo tauri bundle`
2. 验证构建产物中的版本号（使用 `grep` 检查二进制文件）
3. 本地安装测试
4. 验证所有功能正常
5. 验证自动更新功能正常

### 阶段8：发布（优先级 P0）
1. 上传正确的构建产物到 GitHub Release
2. 更新 `latest.json` 签名
3. 验证用户可正常更新

---

## 十二、关键文件清单（供快速定位）

### 配置类
- `D:/AIKFCC/Storyloom/package.json` — 前端版本号、依赖
- `D:/AIKFCC/Storyloom/src-tauri/Cargo.toml` — Rust 版本号、依赖
- `D:/AIKFCC/Storyloom/src-tauri/tauri.conf.json` — Tauri 主配置、窗口、图标、更新器
- `D:/AIKFCC/Storyloom/latest.json` — 自动更新配置文件

### 启动流程类
- `D:/AIKFCC/Storyloom/src-tauri/src/lib.rs` — Tauri 主入口、sidecar 启动
- `D:/AIKFCC/Storyloom/src/App.tsx` — 前端主入口、获取 sidecar 端口
- `D:/AIKFCC/Storyloom/src/lib/tauri-api.ts` — Tauri API 封装

### API 通信类
- `D:/AIKFCC/Storyloom/src/services/api.ts` — API 基础路径配置
- `D:/AIKFCC/Storyloom/src/stores/useWorkspaceStore.ts` — 工作区状态管理（创建失败处）
- `D:/AIKFCC/Storyloom/src/services/api-hooks.ts` — API Hooks

### UI 组件类
- `D:/AIKFCC/Storyloom/src/components/settings/UpdateTab.tsx` — 更新页面（显示版本号处）
- `D:/AIKFCC/Storyloom/src/components/layout/EmptyShell.tsx` — 空状态页面（显示版本号处）
- `D:/AIKFCC/Storyloom/src/components/settings/SettingsTabs.tsx` — 设置标签页

### 图标类
- `D:/AIKFCC/Storyloom/src-tauri/icons/` — 所有平台图标
- `D:/AIKFCC/Storyloom/public/favicon.svg` — 浏览器图标（含品牌名）
- `D:/AIKFCC/Storyloom/public/icon-monochrome.svg` — 单色图标（含品牌名）

### 文档类
- `D:/AIKFCC/Storyloom/docs/README.md` — 主文档（含 v1.5.0 引用）
- `D:/AIKFCC/Storyloom/CHANGELOG.md` — 更新日志（含 v1.5.0）
- `D:/AIKFCC/Storyloom/updater-diagnosis.md` — 旧诊断文档
- `D:/AIKFCC/Storyloom/docs/_archive/` — 归档文档（大量旧版本引用）

---

## 十三、已知陷阱和注意事项

1. **Git Bash 签名死锁** — 不要使用 Git Bash 运行 `cargo tauri signer sign`，使用 PowerShell 或 Python
2. **MSVC 环境变量** — 构建前必须正确设置 PATH、LIB、INCLUDE 环境变量
3. **custom-protocol** — 生产构建必须启用 `custom-protocol`，否则 `devUrl` 会嵌入到二进制中
4. **sidecar 路径** — `sidecars/storyloom-sidecar` 是相对路径，构建时需要确保可执行文件存在
5. **Canva 插件** — 使用时注意配额限制，如果返回 `Not eligible for design composition` 说明 AI 生成配额不足
6. **GitHub Token** — 已移除，请通过环境变量 `GH_TOKEN` 或 GitHub CLI 配置

---

## 十四、用户截图文件路径（供参考）

- 截图1（主界面）：`C:\Users\23501\AppData\Local\Temp\kimi-desktop-attachments\1782059009334-13-image.png`
- 截图2（创建失败）：`C:\Users\23501\AppData\Local\Temp\kimi-desktop-attachments\1782059033072-14-image.png`
- 截图3（版本号）：`C:\Users\23501\AppData\Local\Temp\kimi-desktop-attachments\1782059221516-15-image.png`
- 截图4（白屏）：`C:\Users\23501\AppData\Local\Temp\kimi-desktop-attachments\1782059315742-16-image.png`

---

> 本文档是 AI 交接的核心文件。下一个 AI 接手后，请先阅读此文档，然后按"阶段1"开始排查和修复。每完成一个阶段，请更新此文档中的进度标记。
