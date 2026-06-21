# Storyloom 前端视觉架构扩展方案

> 版本：v1.3.0+
> 日期：2026-06-21
> 目标：在架构初期预留动画层和渲染层，为未来的美术风格扩展奠定基础

---

## 执行摘要

**React + Framer Motion + GSAP + PixiJS + Tailwind 组合完全可行**，且已在多个生产项目中验证。推荐采用**双引擎动画 + 分层渲染**的架构：

| 层级 | 技术 | 职责 |
|------|------|------|
| **DOM 动画层** | Framer Motion + GSAP | UI 过渡、微交互、复杂序列 |
| **GPU 渲染层** | PixiJS v8 (@pixi/react) | 粒子背景、动态纹理、Shader 特效 |
| **样式系统** | Tailwind CSS v4 | 布局、颜色、排版、基础过渡 |
| **主题引擎** | CSS 变量 + JS 配置 | 主题切换、动画参数配置 |

**后端完全兼容**：当前 Fastify + SQLite 后端无需大改，仅需新增 2-3 个轻量表存储动画配置和纹理资产。

---

## 1. 现状诊断

### 1.1 当前动画栈

| 技术 | 使用场景 | 数量 | 问题 |
|------|---------|------|------|
| Framer Motion | 页面切换、Tab 切换、卡片交互 | 49 处 | 功能局限于 UI 过渡 |
| D3 | 关系图、伏笔图 | 2 处 | 代码重复 70%，无共享 Hook |
| Canvas 2D | 粒子背景（ParticleCanvas） | 1 处 | 与 CSS 伪元素粒子重复运行 |
| CSS 动画 | 全局纹理、微交互 | 142 处 | `index.css` 近 3000 行，臃肿耦合 |

### 1.2 核心痛点

1. **CSS 动画臃肿**：`index.css` 2921 行，主题、纹理、动画 keyframes 全部挤在一起
2. **D3 双图重复**：两个力导向图各自独立实现 zoom/drag/forceSimulation
3. **两套粒子系统**：Canvas 2D 粒子和 CSS 伪元素粒子同时运行，性能冗余
4. **动画不可配置**：所有动画参数硬编码在组件中，无法 JSON 驱动

---

## 2. 目标架构：三层渲染模型

```
┌─────────────────────────────────────────────────────────────┐
│  z-index: 30  │  Overlay 层 — 对话框、Toast、悬浮面板          │
│               │  Framer Motion (AnimatePresence)              │
├─────────────────────────────────────────────────────────────┤
│  z-index: 20  │  DOM 内容层 — 页面、组件、文本               │
│               │  React + Tailwind + Framer Motion + GSAP     │
├─────────────────────────────────────────────────────────────┤
│  z-index: 10  │  GPU 渲染层 — 粒子背景、动态纹理、Shader     │
│               │  PixiJS v8 (@pixi/react)                     │
│               │  pointer-events: none                         │
├─────────────────────────────────────────────────────────────┤
│  z-index: 0   │  基底 — 纯色背景 / CSS 纹理                   │
│               │  Tailwind CSS 变量                            │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 分层职责

| 层 | 渲染方式 | 动画引擎 | 典型内容 |
|---|---------|---------|---------|
| **Overlay** | DOM | Framer Motion | 对话框、命令面板、Toast、Tooltip |
| **DOM Content** | DOM | Framer Motion + GSAP | 页面布局、卡片、时间轴、SVG 图形 |
| **GPU Render** | WebGL/Canvas | PixiJS Ticker + GSAP PixiPlugin | 星空粒子、动态纹理、Shader 特效 |
| **Base** | CSS | CSS 变量 | 背景色、渐变、静态纹理 |

---

## 3. 动画层架构（Animation Layer）

### 3.1 双引擎策略

**保留 Framer Motion** 用于：
- 页面路由过渡（`AnimatePresence`）
- 组件挂载/卸载动画
- 悬停/点击微交互（`whileHover` / `whileTap`）
- 拖拽手势（`drag` 约束）
- 共享元素过渡（`layoutId`）

**引入 GSAP** 用于：
- 复杂时间线序列（`gsap.timeline()`）
- 滚动驱动动画（`ScrollTrigger`）
- SVG 描边/变形（`DrawSVG` + `MorphSVG`）
- 文字逐字动画（`SplitText`）
- 物理模拟（`Physics2DPlugin`）
- PixiJS 对象动画（`PixiPlugin`）

### 3.2 动画配置系统（JSON 驱动）

```typescript
// src/animation/types.ts
interface AnimationPreset {
  id: string;
  name: string;
  category: 'page-transition' | 'scroll' | 'hover' | 'entrance' | 'special';
  engine: 'framer-motion' | 'gsap';
  config: Record<string, unknown>;
  duration: number;
  easing: string;
}

interface ThemeAnimationConfig {
  themeId: string;
  backgroundEffect: 'none' | 'particles' | 'shader' | 'texture';
  particlePreset?: string;      // 关联 effect_presets 表
  shaderPreset?: string;
  transitionPreset: string;     // 页面切换动画
  hoverPreset: string;          // 悬停动画
}
```

### 3.3 动画引擎封装

```typescript
// src/animation/AnimationEngine.ts
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { PixiPlugin } from 'gsap/PixiPlugin';

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, PixiPlugin);

export class AnimationEngine {
  private timeline: gsap.core.Timeline | null = null;

  playSequence(presetId: string, target: HTMLElement | string) {
    const preset = getPreset(presetId);
    this.timeline = gsap.timeline();
    // 根据 preset 配置构建时间线
    return this.timeline;
  }

  scrollTrigger(target: string, config: ScrollTrigger.Vars) {
    return ScrollTrigger.create({ trigger: target, ...config });
  }

  destroy() {
    this.timeline?.kill();
    ScrollTrigger.getAll().forEach(t => t.kill());
  }
}
```

---

## 4. 渲染层架构（Render Layer）

### 4.1 PixiJS v8 集成方案

```bash
npm install pixi.js@^8.0.0 @pixi/react@^8.0.0
```

**核心组件**（`src/components/render-layer/PixiBackground.tsx`）：

```tsx
import { Application, extend } from '@pixi/react';
import { Container, Sprite, Graphics, ParticleContainer } from 'pixi.js';
import { useThemeStore } from '@/stores/useThemeStore';

extend({ Container, Sprite, Graphics, ParticleContainer });

export function PixiBackground() {
  const { currentTheme } = useThemeStore();
  const effect = currentTheme.backgroundEffect;

  return (
    <Application
      width={window.innerWidth}
      height={window.innerHeight}
      backgroundAlpha={0}
      antialias={true}
      autoDensity={true}
      resolution={Math.min(window.devicePixelRatio || 1, 2)}
      eventMode="none"
      style={{ position: 'fixed', top: 0, left: 0, zIndex: 10, pointerEvents: 'none' }}
    >
      {effect === 'particles' && <ParticleSystem preset={currentTheme.particlePreset} />}
      {effect === 'shader' && <ShaderEffect preset={currentTheme.shaderPreset} />}
      {effect === 'texture' && <AnimatedTexture preset={currentTheme.texturePreset} />}
    </Application>
  );
}
```

### 4.2 渲染层与 DOM 的交互

```tsx
// src/components/render-layer/RenderLayerBridge.tsx
import { useEffect } from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { usePixiApp } from '@pixi/react';

/**
 * Zustand → PixiJS 状态桥接
 * 将 DOM 层的状态变化同步到 GPU 渲染层
 */
export function RenderLayerBridge() {
  const pixiApp = usePixiApp();
  const { focusedEventId, viewMode } = useUIStore();

  useEffect(() => {
    // 当用户聚焦某个事件时，PixiJS 层高亮对应粒子
    if (focusedEventId && pixiApp) {
      pixiApp.stage.emit('event-focus', focusedEventId);
    }
  }, [focusedEventId, pixiApp]);

  useEffect(() => {
    // 视图切换时，PixiJS 层切换背景特效
    if (pixiApp) {
      pixiApp.stage.emit('view-change', viewMode);
    }
  }, [viewMode, pixiApp]);

  return null;
}
```

### 4.3 自定义 Shader 支持

```tsx
// 基于主题的动态 Shader
const fragmentShader = `
  varying vec2 vTextureCoord;
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;

  void main() {
    vec2 uv = vTextureCoord;
    float noise = sin(uv.x * 10.0 + uTime) * cos(uv.y * 10.0 + uTime * 0.5);
    vec3 color = mix(uColor1, uColor2, noise * 0.5 + 0.5);
    gl_FragColor = vec4(color, 0.3); // 30% 透明度叠加
  }
`;
```

---

## 5. 主题系统重构

### 5.1 当前问题

当前 8 套主题的配置分散在：
- `index.css`（颜色、纹理、keyframes）
- `ParticleCanvas.tsx`（每套主题独立的粒子逻辑）
- 各组件中的硬编码颜色

### 5.2 目标架构：JSON 驱动主题

```typescript
// src/themes/ThemeEngine.ts
interface ThemeDefinition {
  id: string;
  name: string;
  nameEn: string;
  // 颜色系统
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    accent: string;
  };
  // 动画配置
  animation: {
    pageTransition: string;      // AnimationPreset ID
    hoverEffect: string;
    entranceEffect: string;
    backgroundEffect: 'none' | 'particles' | 'shader' | 'texture';
  };
  // 渲染层配置
  renderLayer: {
    particlePreset?: string;
    shaderPreset?: string;
    texturePreset?: string;
  };
  // 字体配置
  typography: {
    fontFamily: string;
    fontSizeScale: number;
  };
}
```

### 5.3 主题切换流程

```
用户切换主题
  → ThemeEngine 加载 ThemeDefinition JSON
  → CSS 变量更新（Tailwind CSS 变量插件）
  → AnimationEngine 加载对应动画预设
  → PixiBackground 切换渲染层特效
  → 所有组件自动响应（React 状态 + CSS 变量）
```

---

## 6. 后端支持需求

### 6.1 当前后端完全兼容

当前后端（Fastify + SQLite + Drizzle ORM）**无需修改**即可支持前端渲染层：
- 所有动画数据存储在前端（JSON 配置、本地状态）
- 后端仅需提供常规的 CRUD API

### 6.2 建议新增表（可选，Phase 2）

```typescript
// server/db/schema.ts — 新增表
export const effectPresets = sqliteTable('effect_presets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(), // 'particle', 'shader', 'texture', 'transition'
  config: text('config').notNull(),      // JSON 字符串
  thumbnail: text('thumbnail'),           // 预览图路径
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const projectRenderSettings = sqliteTable('project_render_settings', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  themeId: text('theme_id').default('luosheng'),
  backgroundEffect: text('background_effect').default('none'),
  particlePresetId: text('particle_preset_id').references(() => effectPresets.id),
  shaderPresetId: text('shader_preset_id').references(() => effectPresets.id),
  customConfig: text('custom_config'), // 用户自定义 JSON
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
```

### 6.3 新增 API（可选，Phase 2）

```typescript
// GET /api/effects/presets — 获取所有特效预设
// GET /api/effects/presets/:id — 获取单个预设配置
// GET /api/workspaces/:id/render-settings — 获取工作区渲染设置
// PATCH /api/workspaces/:id/render-settings — 更新渲染设置
```

**工作量评估**：约 **3 天**（后端 CRUD + 前端 UI）

---

## 7. 实施路线图

### Phase 0：基线测试（1 天）
- [ ] 在 Tauri 构建版中测试 PixiJS 的 WebGL 性能（dev 版 vs 构建版）
- [ ] 测试 GSAP + Framer Motion 在同一组件中的共存
- [ ] 测量包体积增量（PixiJS + GSAP）

### Phase 1：动画层（3 天）
- [ ] 安装 `gsap` + `@gsap/react`
- [ ] 创建 `src/animation/` 目录（types, AnimationEngine, presets）
- [ ] 将 `index.css` 中的动画 keyframes 提取到动画配置系统
- [ ] 用 GSAP Timeline 重构织机 SVG 动画（DrawSVG + MorphSVG）
- [ ] 用 GSAP ScrollTrigger 重构时间轴滚动效果

### Phase 2：渲染层（5 天）
- [ ] 安装 `pixi.js` + `@pixi/react`
- [ ] 创建 `PixiBackground` 组件（GPU 渲染层）
- [ ] 统一粒子系统（用 PixiJS 替代 Canvas 2D + CSS 伪元素）
- [ ] 实现 `RenderLayerBridge`（Zustand ↔ PixiJS 状态桥接）
- [ ] 为 3 套主题实现 Shader 特效（子夜、深海、极光）

### Phase 3：主题引擎重构（3 天）
- [ ] 创建 `src/themes/` 目录（ThemeEngine, definitions, registry）
- [ ] 将 8 套主题提取为 JSON 配置
- [ ] 实现 CSS 变量动态切换
- [ ] 主题动画配置化（每个主题可配置动画预设）

### Phase 4：D3 优化（2 天）
- [ ] 提取 `useForceGraph` Hook（消除双图重复）
- [ ] 用 PixiJS 渲染关系图节点（提升性能）
- [ ] 保留 D3 的 forceSimulation 逻辑，但渲染交给 PixiJS

### Phase 5：后端同步（3 天）
- [ ] 新增 `effect_presets` 和 `project_render_settings` 表
- [ ] 实现后端 CRUD API
- [ ] 前端同步保存渲染设置到数据库

**总计：约 17 天**（含测试和文档）

---

## 8. 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| PixiJS 在 Tauri WebView2 中性能不如预期 | 中 | 高 | Phase 0 基准测试；提供 CSS 降级方案 |
| GSAP 包体积增加过多 | 低 | 中 | Tree Shaking 按需加载；核心仅 ~23KB gzip |
| 主题 JSON 配置过大 | 低 | 低 | 配置分片加载；默认只加载当前主题 |
| 双引擎动画冲突 | 低 | 中 | 明确分层：FM 负责 DOM，GSAP 负责 Canvas/SVG |
| 构建产物体积增加 | 中 | 中 | PixiJS 按需加载；不用的插件不打包 |

---

## 9. 技术选型最终结论

| 问题 | 答案 |
|------|------|
| **React + FM + GSAP + PixiJS + Tailwind 是否可行？** | ✅ **完全可行**。已在多个生产项目验证 |
| **当前后端是否支持？** | ✅ **完全支持**。仅需新增 2 个轻量表（Phase 5） |
| **架构初期预留动画层是否可行？** | ✅ **可行**。Phase 1 即可建立 `src/animation/` 目录和配置系统 |
| **架构初期预留渲染层是否可行？** | ✅ **可行**。Phase 2 即可建立 `PixiBackground` 组件和分层模型 |
| **包体积增加多少？** | GSAP ~23KB + PixiJS ~100KB（tree-shaking 后），总计约 +120KB gzip |
| **开发周期？** | 约 17 天（5 个 Phase），可分阶段交付 |

---

## 10. 关键文件规划

```
src/
├── animation/                    # 新增：动画层
│   ├── types.ts                  # 动画类型定义
│   ├── AnimationEngine.ts        # GSAP 引擎封装
│   ├── presets/                  # 动画预设
│   │   ├── page-transitions.ts
│   │   ├── scroll-effects.ts
│   │   └── svg-effects.ts
│   └── hooks/
│       ├── useAnimation.ts
│       └── useScrollAnimation.ts
├── components/
│   ├── render-layer/             # 新增：渲染层
│   │   ├── PixiBackground.tsx    # GPU 渲染层根组件
│   │   ├── ParticleSystem.tsx    # 粒子系统
│   │   ├── ShaderEffect.tsx      # Shader 特效
│   │   └── RenderLayerBridge.tsx # 状态桥接
│   └── ...
├── themes/                       # 新增：主题引擎
│   ├── ThemeEngine.ts
│   ├── registry.ts
│   └── definitions/              # 8 套主题 JSON 配置
│       ├── luosheng.ts
│       ├── midnight.ts
│       └── ...
└── ...
```

---

*本方案基于 `reports/animation-architecture-current.md`、`reports/pixijs-webgl-feasibility.md`、`reports/gsap-animation-feasibility.md` 三份调研报告整合而成。*
