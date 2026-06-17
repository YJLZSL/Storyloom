# 全面测试、构建与安装计划

## 摘要
对 AI-Timeline-Creator V4.0 进行前端界面和后端功能的全面测试，修复发现的问题，然后构建并打包安装程序。

## 当前状态分析

### 项目架构
- **前端**: React 19 + TypeScript + Vite 6 + Tailwind CSS 4 + Zustand 5 + React Query 5
- **后端**: Fastify 5 + better-sqlite3 + Drizzle ORM
- **桌面端**: Electron 42 + electron-builder (NSIS 安装程序)
- **构建**: `npm run build` = `tsc -b && vite build`，Electron 构建 = `npm run electron:build`

### 已知问题
1. **缺少应用图标**: `public/icon.png` 不存在（仅有 `.gitkeep`），Electron 构建需要图标
2. **Electron 生产模式未验证**: `electron/main.ts` 在生产模式下动态 import `server/index.js`，但 server 代码需要先编译为 JS
3. **electron-builder 配置**: `package.json` 中的 `build.files` 包含 `server/**/*` 和 `shared/**/*`，但这些是 `.ts` 文件，生产环境需要编译后的 `.js` 文件
4. **前端构建有 chunk 大小警告**: `index-*.js` 约 584KB（超过 500KB 限制）
5. **后端 TypeScript 编译**: `tsconfig.server.json` 配置了 server 端编译，但 `npm run build` 只编译前端

### 测试范围

#### 后端 API 测试（通过 HTTP 请求）
- 健康检查 `GET /api/health`
- 工作区 CRUD
- 事件 CRUD + 角色关联
- 轨道 CRUD
- 角色 CRUD
- 世界观 CRUD
- 伏笔 CRUD
- 关联 CRUD
- AI 端点

#### 前端功能测试（通过浏览器）
- 工作区创建/切换/删除
- 时间轴画布渲染、缩放、拖拽
- 事件创建/编辑/删除
- 面板切换（AI/角色/世界观/伏笔/关联/结构/番茄钟/快捷键）
- 主题切换 + 视觉模式
- 搜索对话框
- 右键上下文菜单
- AI 配置面板（国产提供商）
- 取名生成器
- 专注模式
- 字数统计/日更目标
- 撤销/重做
- 自动保存

## 实施计划

### Step 1: 启动开发服务器并测试后端 API
- 启动 `npm run dev`（前端 5173 + 后端 3001）
- 通过 HTTP 请求测试所有后端 API 端点
- 记录任何 API 错误或异常

### Step 2: 浏览器前端功能测试
- 使用 Playwright 或浏览器自动化工具测试前端界面
- 逐项验证核心功能
- 记录 UI/UX 问题

### Step 3: 修复发现的问题
- 修复后端 API 问题
- 修复前端界面问题
- 修复 TypeScript 类型错误

### Step 4: 准备 Electron 构建环境
- 创建应用图标 `public/icon.png`（至少 256x256 PNG）
- 确保 `tsconfig.server.json` 编译配置正确
- 验证 `electron/main.ts` 生产模式启动流程
- 检查 electron-builder 配置

### Step 5: 构建并打包
- 运行 `npm run build` 构建前端
- 编译后端 TypeScript
- 编译 Electron TypeScript
- 运行 `electron-builder --win` 打包 Windows 安装程序
- 验证安装程序可正常运行

### Step 6: 安装验证
- 运行生成的安装程序
- 验证应用启动
- 验证基本功能可用

## 关键文件

| 文件 | 用途 |
|------|------|
| `package.json` | 构建脚本和 electron-builder 配置 |
| `vite.config.ts` | 前端构建配置 |
| `electron/main.ts` | Electron 主进程 |
| `electron/preload.ts` | Electron 预加载脚本 |
| `tsconfig.electron.json` | Electron TypeScript 配置 |
| `tsconfig.server.json` | 后端 TypeScript 配置 |
| `server/index.ts` | 后端入口（导出 createApp 和 startServer） |
| `server/db/schema.ts` | 数据库 Schema |
| `src/App.tsx` | 前端入口组件 |

## 假设与决策

1. **图标**: 需要创建一个简单的应用图标（PNG 256x256+），Electron 构建必需
2. **后端编译**: Electron 生产模式需要编译后的 server 代码，当前 `build.files` 引用的是 `.ts` 源文件，需要调整为引用编译输出
3. **测试方式**: 使用 Playwright 进行浏览器自动化测试，使用 HTTP 请求测试后端 API
4. **目标平台**: Windows (NSIS 安装程序)，根据 `package.json` 的 `build.win` 配置

## 验证步骤

1. 后端 API 全部返回正确响应
2. 前端所有面板可正常切换和操作
3. TypeScript 编译无错误
4. Vite 构建成功
5. Electron 应用可启动
6. 安装程序可正常安装和运行
