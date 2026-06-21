# Storyloom 本地开发指南

> 最后更新：v3.0.0

## 1. 环境要求

| 工具 | 版本 | 用途 |
|---|---|---|
| Node.js | 20.x LTS 或更高 | 运行 Vite / Fastify / Electron |
| npm | 随 Node.js 自带 | 包管理（仓库使用 `package-lock.json`） |
| Python | 3.10+ | 运行 `scripts/generate-storyloom-icons.py` |
| Pillow | 11+ | 同上，图标合成 |
| Windows 10/11 (x64) | — | 跑 `npm run dist` 出 NSIS 安装包必需 |
| Git | 任意近期版 | 源码管理 |

校验：

```bash
node -v        # v20.x
npm -v
python --version
git --version
```

## 2. 本地起步

```bash
git clone https://github.com/YJLZSL/Storyloom.git
cd Storyloom
npm install
```

> Windows 上首次 `npm install` 会编译 `better-sqlite3`，需要 Visual Studio Build Tools 或 `windows-build-tools`，10–60 秒不等。

## 3. 开发模式三选一

| 命令 | 起什么 | 用途 |
|---|---|---|
| `npm run dev` | Vite (5173) + Fastify (3001) | 浏览器调 UI，最快反馈 |
| `npm run dev:electron` | 上面两者 + Electron 主进程 | 调主进程 / IPC / preload |
| `npm run dev:server` | 仅 Fastify (`tsx watch`) | 仅调 API |

```bash
# 仅前端 + 后端：浏览器访问 http://localhost:5173
npm run dev

# 完整 Electron 开发模式
npm run dev:electron

# 仅后端
npm run dev:server
```

`npm run dev:electron` 内部用 `wait-on` 等 5173 起来后再启 Electron，免手动协调时序。

## 4. 目录约定

```
electron/                 主进程（main / preload / updater）
server/
  ├─ index.ts             Fastify 入口 + startServer()
  ├─ db/                  drizzle + better-sqlite3 + migrations 调用
  ├─ plugins/             error-handler / database / validation
  └─ routes/<resource>/   每资源一个 plugin（多文件时用目录如 workspaces/）
src/
  ├─ components/<feature>/  按功能而非按类型组织（timeline/ outline/ workspace/ ...）
  ├─ components/_shared/    跨功能复用（注：当前以 ui/ 与 ui-tdesign/ 收容）
  ├─ services/api-hooks.ts  react-query hooks 单文件入口
  ├─ services/api.ts        fetch 封装 + 动态 base
  ├─ stores/                Zustand 切片
  ├─ lib/                   纯函数工具与领域模块
  └─ App.tsx                极简：仅挂 WorkspaceInitializer + AppShell + UpdateNotifier
scripts/                  一次性脚本，文件名带描述（如 generate-storyloom-icons.py）
shared/                   前后端共享类型
drizzle/                  迁移 SQL（drizzle-kit 生成）
```

新增组件时优先放进对应 feature 目录；只有真正跨功能复用且粒度极小的（按钮、薄包装）才考虑 `ui/`。

## 5. 测试约定

- 框架：[vitest](https://vitest.dev/) + jsdom（见 `src/test/setup.ts`）。
- 文件命名：`*.test.ts(x)`，与被测源码并列（例：`WorkspaceCard.tsx` 旁边 `WorkspaceCard.test.tsx`）。
- 跑一次：

  ```bash
  npm run test
  ```

- 起 watch：

  ```bash
  npm run test:watch
  ```

- 类型检查（不出代码）：

  ```bash
  npm run typecheck
  ```

E2E / 视觉回归在 `scripts/` 下用 Python + Playwright 写，按需手动跑（如 `npm run test:e2e:chromium`）。

## 6. 提交约定

- [Conventional Commits](https://www.conventionalcommits.org/) + scope，例：

  ```
  feat(timeline): add gantt zoom slider
  fix(workspace): unblock create-workspace dialog catch handler
  chore(v3.0.0): cleanup repo + rewrite docs
  refactor(server): split workspaces routes into folder
  docs(architecture): refresh module map for v3.0
  test(workspace): add WorkspaceCard render snapshot
  ```

- 大改动写 `.trae/specs/<change-id>/` 三件套（design / requirements / tasks）。改动完成后 `.trae/specs/_archive/` 归档，避免活跃目录膨胀。
- 推送前最低门槛：

  ```bash
  npm run typecheck && npm run test
  ```

  发版前再加 `npm run build`。

## 7. 常见坑

### (1) ESM 下相对 import 必须写 `.js` 后缀

仓库 `"type": "module"`，tsc 与 Vite 都按纯 ESM 解析；哪怕源文件是 `.ts`，相对路径里也要写 `.js`：

```ts
// ✅ 正确
import { startServer } from './server/index.js';
import { workspacesRoutes } from './routes/workspaces/index.js';

// ❌ 错误：运行时 ERR_MODULE_NOT_FOUND
import { startServer } from './server/index';
```

### (2) `__dirname` 在主进程不是源码目录

编译产物在 `electron-out/electron/main.js`，`__dirname` 就是它所在目录。所有相对路径要相对编译产物来想：

```ts
// ✅ getAppIconPath() 探测多个候选路径，dev/prod 都能命中
path.join(__dirname, '..', '..', 'dist', 'icon.png')   // prod (asar)
path.join(process.cwd(), 'public', 'icon.png')         // dev
```

模式参考 [getAppIconPath()](file:///d:/AIKFCC/Storyloom/electron/main.ts#L82-L98)。

### (3) better-sqlite3 必须 electron-rebuild

升 Electron 主版本或重新 `npm install` 后跑：

```bash
npx electron-rebuild
# 或更直接
npm run electron:rebuild
```

`npm run dist` 已经把 `electron:rebuild` 串在流水线里，平时只需手动处理 dev 场景。

### (4) `data/` 路径在生产用 `app.getPath('userData')`

不要在 server 代码里硬编码 `./data/`。生产模式由主进程注入：

```ts
// electron/main.ts
process.env.DATA_DIR = path.join(app.getPath('userData'), 'data');
// server/db/index.ts 据此解析，开发模式回落到 cwd()/data
```

调试用户数据时，Windows 实际目录通常是 `%APPDATA%\storyloom\data\timeline.db`。

### (5) TDesign Dialog `onConfirm` 与 form `onSubmit` 不要重复绑同一动作

唯一入口走 `onConfirm`，form 用 `<button type="submit" hidden>` 兜底回车键，避免双触发被 `mutateAsync` inflight 静默吞掉：

```tsx
<Dialog onConfirm={handleSubmit} confirmBtn={{ disabled: !name, loading: applying }}>
  <form onSubmit={handleSubmit}>
    {/* fields */}
    <button type="submit" hidden />
  </form>
</Dialog>
```

`catch` 块里务必 `toast.error(message)` + `finally` 复位 loading 标志；否则用户感知"点了没反应"（v3.0 创建工作区 bug 真因）。
