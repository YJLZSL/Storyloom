# 当前动画渲染架构调研报告

> 调研范围：`D:/AIKFCC/Storyloom` 前端项目
> 调研日期：2025-01-21
> 重点：只扫描分析，不修改代码

---

## 1. 动画库使用矩阵

| 文件 | 动画类型 | 库/方式 | 复杂度 |
|------|---------|---------|--------|
| `src/components/layout/AppShell.tsx` | 页面切换动画、移动端抽屉滑入/遮罩淡入 | Framer Motion (`AnimatePresence`, `motion.div`) | 高 |
| `src/components/settings/SettingsTabs.tsx` | Tab 内容切换淡入淡出 | Framer Motion (`AnimatePresence`, `motion.div`) | 中 |
| `src/components/timeline/TimelineEventCard.tsx` | 卡片入场弹簧动画、悬停缩放、快速操作按钮交错入场 | Framer Motion (`motion.div`, `whileHover`, `transition spring`) | 高 |
| `src/components/zen-mode/ZenMode.tsx` | 全屏淡入、工具栏滑入滑出、底部统计淡入 | Framer Motion (`AnimatePresence`, `motion.div`) | 高 |
| `src/components/workspace/WorkspaceCard.tsx` | 卡片悬停上浮 (`whileHover`) | Framer Motion (`motion.div`) | 低 |
| `src/components/workspace/WorkspaceSelector.tsx` | 页面头部/列表交错入场、骨架屏淡入 | Framer Motion (`variants`, `staggerChildren`) | 中 |
| `src/components/workspace/ImportDialog.tsx` | 成功状态旋转+缩放组合动画 | Framer Motion (`motion.div`, `animate` 数组) | 中 |
| `src/components/workspace/ExportDialog.tsx` | 成功状态旋转+缩放组合动画 | Framer Motion (`motion.div`, `animate` 数组) | 中 |
| `src/components/relationship-graph/RelationshipGraph.tsx` | 力导向图渲染、zoom、drag、hover 放大 | D3 (`forceSimulation`, `zoom`, `drag`, `transition`) | 高 |
| `src/components/foreshadowing/ForeshadowingGraph.tsx` | 力导向图渲染、zoom、drag、节点高亮 | D3 (`forceSimulation`, `zoom`, `drag`) | 高 |
| `src/components/foreshadowing/ForeshadowingBoard.tsx` | 卡片拖拽状态管理（HTML5 DnD 无动画库） | 原生 HTML5 Drag API | 中 |
| `src/components/timeline/TimelineCanvas.tsx` | 滚动动画、网格背景 | 原生 `requestAnimationFrame` + CSS `scroll-behavior: smooth` | 中 |
| `src/components/_shared/ParticleCanvas.tsx` | 全屏主题粒子背景系统 | Canvas 2D (`requestAnimationFrame`) | 高 |
| `src/index.css` | 全局主题背景纹理、微交互动画、编排系统 | 纯 CSS (`@keyframes`, `transition`, `animation`) | 极高 |

**依赖确认**（`package.json`）：
- `framer-motion`: `^11.18.2`
- `d3`: `^7.9.0`
- `@types/d3`: `^7.4.3`
- **无** `tailwindcss-animate`、`gsap`、`animejs`、`@react-spring`、`lottie-react` 等库

---

## 2. Framer Motion 使用模式分析

### 2.1 页面切换动画（View Transition）
**文件**: `AppShell.tsx`

```tsx
const viewVariants = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
};

<AnimatePresence mode="wait">
  <motion.div key={viewMode} variants={viewVariants} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
    {renderView()}
  </motion.div>
</AnimatePresence>
```

- 使用 `mode="wait"` 确保旧视图完全退出后新视图进入
- 统一的 `ease: [0.16, 1, 0.3, 1]`（ease-out-expo）贯穿整个项目
- 7 种视图模式共享同一组动画变体

### 2.2 组件进入/退出动画
**文件**: `SettingsTabs.tsx`, `ZenMode.tsx`

- `SettingsTabs.tsx`: Tab 内容水平滑动切换 (`x: 8 → 0 → -8`)
- `ZenMode.tsx`: 全屏遮罩淡入淡出 (`opacity: 0 → 1`)，工具栏垂直滑入 (`y: -20 → 0`)
- 均使用 `AnimatePresence` 处理退出动画

### 2.3 交互动画（hover, click）
**文件**: `TimelineEventCard.tsx`, `WorkspaceCard.tsx`

```tsx
// TimelineEventCard.tsx
<motion.div
  whileHover={!isDragging && !isSelected ? { scale: 1.005, y: -1, transition: { duration: 0.15 } } : undefined}
  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
/>

// WorkspaceCard.tsx
<motion.div
  whileHover={{ y: -6 }}
  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
/>
```

- 大量使用 `spring` 物理动画（`stiffness: 400, damping: 25`）
- 条件化 `whileHover` 避免拖拽/选中状态下的冲突
- `TimelineEventCard` 同时存在 CSS `transition` 和 Framer Motion，存在动画冲突隐患

### 2.4 布局动画与列表编排
**文件**: `WorkspaceSelector.tsx`, `ImportDialog.tsx`

```tsx
// WorkspaceSelector.tsx - 列表交错入场
const containerVariant = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};
const itemVariant = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

// ImportDialog.tsx - 成功状态组合动画
animate={{ scale: [0, 1.2, 1], rotate: [-180, 0] }}
```

- `staggerChildren` 用于工作区卡片列表的逐项入场
- `animate` 数组用于关键状态（成功/失败）的组合动画
- 但缺少统一的动画编排配置中心

---

## 3. D3 渲染层分析

### 3.1 关系图实现方式

**文件**: `RelationshipGraph.tsx`（224 行）

| 特性 | 实现方式 |
|------|---------|
| 力导向引擎 | `d3.forceSimulation` + `forceLink` + `forceManyBody` + `forceCenter` + `forceCollide` |
| 缩放 | `d3.zoom<SVGSVGElement, unknown>()`，`scaleExtent: [0.1, 4]` |
| 拖拽 | `d3.drag<SVGGElement, GraphNode>()`，固定节点位置 (`fx/fy`) |
| 更新 | 每次 `nodes`/`links` 变化时 `svg.selectAll('*').remove()` 全量重绘 |
| 高亮 | 独立的 `useEffect` 根据 `highlightedNodeIds` 更新 `opacity` 和 `stroke` |
| 节点大小 | 按 `degree` 线性映射到半径 `20-40px` |
| 颜色 | 硬编码在 `src/lib/colors.ts`：`character=#3B5BDB`, `event=#16A34A`, `world-setting=#EA580C` |

**文件**: `ForeshadowingGraph.tsx`（294 行）

| 特性 | 实现方式 |
|------|---------|
| 力导向引擎 | 与 RelationshipGraph 几乎相同的配置，参数微调（`distance: 80`, `strength: 0.2`） |
| 缩放 | 相同实现 |
| 拖拽 | 相同实现 |
| 更新 | 相同的全量重绘策略 |
| 高亮 | 内置的 `highlightedId` 状态管理，点击切换高亮 |
| 连线 | 带箭头标记 (`marker-end: 'url(#fs-arrow')`) |
| 颜色 | 运行时读取 CSS 变量 (`getComputedStyle`) → `statusColors` 映射 |

### 3.2 性能瓶颈

1. **全量重绘**: 两个 D3 组件在数据变化时均执行 `svg.selectAll('*').remove()`，重新创建所有 DOM 节点，无数据绑定复用（`join` 模式虽好但 preceded by `remove()`）。
2. **无防抖**: `highlightedNodeIds` 或 `highlightedId` 更新触发 `useEffect` 遍历所有节点，但 D3 选择器操作是同步的，频繁高亮切换可能卡顿。
3. **力模拟重启**: 每次数据更新重新初始化 `forceSimulation`，节点位置随机重置，无位置记忆机制。
4. **双图重复**: 两个力导向图组件代码重复度约 70%，各自维护一套 D3 生命周期逻辑。

### 3.3 可扩展性

- **无共享 D3 Hook**: 力导向图、zoom、drag 逻辑均未抽离为可复用 Hook。
- **SVG 限制**: 当前使用 SVG 渲染，节点数 > 200 时可能出现性能瓶颈，无 Canvas/WebGL 降级方案。
- **高亮逻辑耦合**: 高亮状态与渲染逻辑紧耦合，难以扩展为多节点高亮或区域高亮。

---

## 4. 主题系统动画配置

### 4.1 8 套主题的动画参数差异

项目当前有 **8 套主题 + 1 系统跟随**（`luosheng`, `midnight`, `forest`, `ink-wash`, `contrast`, `sakura`, `ocean`, `aurora`, `system`）。

每套主题在 `src/index.css` 中定义了以下动画相关配置：

| 主题 | 背景纹理 | body::before 粒子效果 | 卡片 Hover 特效 | 时间轴侧边条 | 按钮发光 |
|------|---------|----------------------|---------------|------------|---------|
| **luosheng** (暖米色) | 纸张横线 + 径向渐变 | 金色光点漂浮（`luosheng-particle-float`） | 金色 shimmer 扫过 | 暗金色渐变 | 温暖光晕 |
| **midnight** (深蓝) | 星空径向渐变 | 星星闪烁（`midnight-star-twinkle`） | 蓝色星辉 radial | 天蓝色渐变 + 发光 | 天蓝发光 |
| **forest** (淡绿) | 绿色网格 + 径向渐变 | 树叶飘落（`forest-leaf-fall`） | 植物纹理 | 绿色渐变 + 藤蔓圆点 | 有机阴影 |
| **ink-wash** (灰白) | 水墨晕染 + 横线 | 墨滴呼吸（`ink-wash-breathe`）+ 漂移 | 墨点扩散 radial | 极简黑色线条 | 无 |
| **contrast** (纯黑) | 无 | 无 | 无 | 纯黄线条 | 无 |
| **sakura** (粉白) | 径向渐变 | 樱花光点（`sakura-petal-glow`） | 粉色星辉 | 樱花粉渐变 | 粉色光晕 |
| **ocean** (深海) | 径向渐变 | 气泡漂浮（`ocean-bubble-float`） | 青色星辉 | 海蓝渐变 + 发光 | 青色光晕 |
| **aurora** (紫绿) | 径向渐变 | 极光光带漂移（`aurora-glow-shift`） | 紫色星辉 | 极光紫渐变 + 发光 | 紫色光晕 |

### 4.2 CSS 变量驱动的动画

**核心动画令牌**（`src/index.css` `@theme` 区块）：

```css
--animation-enter: 150ms cubic-bezier(0.16, 1, 0.3, 1);
--animation-exit: 100ms ease-in;
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 400ms;
```

**主题纹理变量**:
```css
--theme-texture: /* 各主题独特的多层 radial-gradient */
--theme-texture-size: /* 背景尺寸 */
--theme-shadow-intensity: 0.1 ~ 0.25 /* 阴影强度差异 */
--theme-font-weight: 400 | 500 /* 字体粗细差异 */
```

**View Transitions API 主题切换**:
```css
::view-transition-new(root) {
  animation: theme-circle-reveal 0.5s var(--ease-out);
}
@keyframes theme-circle-reveal {
  from { clip-path: circle(0 at var(--theme-transition-x) var(--theme-transition-y)); }
  to   { clip-path: circle(var(--theme-transition-radius) at var(--theme-transition-x) var(--theme-transition-y)); }
}
```

- 点击位置作为圆心，使用 `clip-path` 实现圆形扩散主题切换
- 由 `useThemeStore.ts` 中的 `startViewTransition` 触发

### 4.3 减少动画偏好（Accessibility）

项目在全站多处实现了 `prefers-reduced-motion` 降级：

```css
@media (prefers-reduced-motion: reduce) {
  .loom-warp, .pulse-dot::after, .panel-enter, .tab-content-enter,
  .dialog-enter, .zen-mode-toolbar, .timeline-glow.selected,
  .card-hover-shadow, .empty-state-refined .empty-icon, .zoom-smooth {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}
```

- 同时禁用了所有主题 `body::before` 的粒子动画
- `contrast` 主题本身也强制禁用装饰性动画

---

## 5. Canvas/WebGL 使用

### 5.1 Canvas 2D 使用

**文件**: `src/components/_shared/ParticleCanvas.tsx`（595 行）

这是项目中**唯一的 Canvas 使用**，是一个全屏粒子背景系统：

| 特性 | 说明 |
|------|------|
| 渲染目标 | 全屏固定定位 `<canvas>`，`z-index: 0`，`pointer-events: none` |
| 渲染循环 | `requestAnimationFrame` 主循环，每帧 `clearRect` + 重绘所有粒子 |
| DPR 处理 | 正确缩放 `canvas.width = window.innerWidth * dpr`，`ctx.scale(dpr, dpr)` |
| 主题监听 | `MutationObserver` 监听 `document.documentElement.dataset.theme` 变化，切换时重置粒子 |
| 鼠标交互 | 7 个主题中有 6 个支持鼠标排斥/涡流/波纹效果 |

**7 套主题粒子配置**:

| 主题 | 粒子数 | 粒子类型 | 特色效果 |
|------|--------|---------|---------|
| luosheng | 80 | 金色光点 | 光晕 + 鼠标排斥 |
| midnight | 100 | 星星 + 流星(5%) | 星座连线 + 闪烁 + 鼠标排斥 |
| forest | 60 | 萤火虫 + 树叶 | 树叶飘落 + 萤火虫闪烁 |
| ink-wash | 40 | 墨滴 | 墨滴扩散 + 鼠标波纹 |
| sakura | 70 | 樱花花瓣 | 花瓣旋转飘落 |
| ocean | 90 | 气泡 + 光线 | 上升气泡 + 鼠标涡流 |
| aurora | 50 | 光带 | 大颗粒光带缓慢流动 |

### 5.2 WebGL 使用

**无 WebGL 使用**。项目中未使用 Three.js、Babylon.js、原生 WebGL 或任何 WebGL 封装库。

### 5.3 注意：伪 Canvas 组件

`src/components/timeline/TimelineCanvas.tsx` **不是真正的 Canvas**，而是一个基于 `div` + CSS 的虚拟时间轴画布，使用 `overflow: auto` 实现滚动，使用 `requestAnimationFrame` 节流滚动事件。

---

## 6. 架构痛点

### 6.1 动画代码极度分散

- **CSS 动画集中但臃肿**: `src/index.css` 长达 **2921 行**，其中约 **60%**（~1700 行）与动画、过渡、主题特效直接相关。
- **主题与动画紧耦合**: 8 套主题的颜色变量、纹理、动画 keyframes 全部写在同一文件中，任何主题修改都需编辑巨型 CSS 文件。
- **组件级动画碎片化**: Framer Motion 的 `variants` 和 `transition` 配置分散在 8 个 TSX 文件中，无统一配置源。

### 6.2 缺乏统一的动画层

- **无动画设计系统**: 没有 `@/animation` 或 `@/motion` 目录，所有动画逻辑散落在组件和 CSS 中。
- **重复定义 easing**: `[0.16, 1, 0.3, 1]` 这个 ease-out-expo 曲线在至少 6 个文件中硬编码重复。
- **spring 参数不一致**: `TimelineEventCard` 用 `stiffness: 400, damping: 25`，`ImportDialog` 用 `stiffness: 200, damping: 20`，无统一物理参数规范。

### 6.3 复杂动画难以复用

- **D3 双图重复**: `RelationshipGraph` 和 `ForeshadowingGraph` 约 70% 代码重复（力模拟、zoom、drag、tick 更新），无共享抽象。
- **粒子系统与 CSS 粒子重复**: `ParticleCanvas`（Canvas 2D）和 `index.css` 中各主题的 `body::before` 粒子效果是两套独立系统，主题切换时同时运行，存在性能冗余。
- **成功/失败动画**: `ImportDialog` 和 `ExportDialog` 的成功动画几乎相同，但各自独立实现。

### 6.4 动画性能隐患

- **D3 全量重绘**: 每次数据更新销毁并重建所有 SVG 元素，无 `enter/update/exit` 数据绑定模式。
- **Canvas 粒子无对象池**: 每帧创建/销毁粒子对象，虽然数量不多（40-100），但 GC 压力存在。
- **CSS 动画层级混乱**: 大量 `position: fixed` + `z-index: -1` 的伪元素动画，与 React 组件层级管理冲突。
- **主题纹理重渲染**: 切换主题时，`body` 的 `background-image` 突变可能导致全屏重绘。

### 6.5 无动画编排/序列化能力

- 当前动画是**声明式**的（CSS/Framer Motion variants），但缺少**命令式编排**能力。
- 无法轻松实现："先高亮 A 节点，2 秒后平移到 B 节点，同时打开 C 面板" 这样的复杂动画序列。
- 无动画状态机或时间线控制。

---

## 7. 扩展建议

### 7.1 为动画层预留架构空间

建议建立以下目录结构：

```
src/
  animation/
    ├── tokens.ts              # 统一动画令牌（duration, easing, spring）
    ├── variants.ts            # Framer Motion 共享 variants（fade, slide, scale, stagger）
    ├── choreography.ts        # 动画编排器（序列、并行、延迟）
    ├── hooks/
    │   ├── useForceGraph.ts   # 共享 D3 力导向图 Hook
    │   ├── useZoomPan.ts      # 共享 D3 zoom/pan Hook
    │   ├── useCanvasLoop.ts   # 共享 Canvas RAF 循环 Hook
    │   └── useThemeTexture.ts # 主题纹理/粒子管理 Hook
    ├── systems/
    │   ├── particle-system.ts # 统一粒子系统（Canvas 2D，可配置主题）
    │   └── ripple-system.ts   # 按钮涟漪效果系统
    └── index.ts
```

### 7.2 统一 Framer Motion 配置

提取所有共享 `variants` 和 `transition` 到 `animation/variants.ts`：

```ts
export const transitions = {
  easeOutExpo: [0.16, 1, 0.3, 1] as const,
  springSnappy: { type: 'spring' as const, stiffness: 400, damping: 25 },
  springGentle: { type: 'spring' as const, stiffness: 200, damping: 20 },
  fadeFast: { duration: 0.15, ease: [0.16, 1, 0.3, 1] as const },
};

export const viewVariants = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};
```

### 7.3 提取 D3 力导向图为可复用 Hook

将 `RelationshipGraph` 和 `ForeshadowingGraph` 的共同逻辑提取为 `useForceGraph`：

```ts
function useForceGraph<T extends d3.SimulationNodeDatum>(
  nodes: T[],
  links: d3.SimulationLinkDatum<T>[],
  options: ForceGraphOptions
): ForceGraphAPI;
```

支持配置：节点半径映射、力参数、zoom 范围、碰撞检测、高亮策略等。

### 7.4 统一粒子系统

**建议**: 将 `ParticleCanvas` 作为唯一的粒子渲染层，移除 CSS `body::before` 的粒子效果。

理由：
- Canvas 粒子性能更好、可控性更强
- 避免两套系统同时运行造成的资源浪费
- 可通过统一配置文件驱动不同主题的粒子行为

配置示例：
```ts
export const PARTICLE_PRESETS: Record<ThemeId, ParticlePreset> = {
  luosheng: { type: 'glow-dot', count: 80, color: '#B8860B', mouseRepel: true },
  midnight: { type: 'star-field', count: 100, color: '#38BDF8', connectDistance: 100 },
  // ...
};
```

### 7.5 主题动画参数配置文件

将主题相关的动画参数从 `index.css` 提取到 TypeScript 配置：

```ts
// src/themes/animation-config.ts
export interface ThemeAnimationConfig {
  texture: CSSGradient[];
  bodyParticles: boolean;
  cardHoverEffect: 'shimmer' | 'glow' | 'ripple' | 'none';
  timelineAccentColor: string;
  buttonGlow: boolean;
  shadowIntensity: number;
  // ...
}
```

CSS 只保留基础变量定义，主题特效通过 CSS 变量注入或 JS 动态计算。

### 7.6 引入动画性能监控

- 对 D3 力导向图添加 FPS 监控，节点数 > 100 时切换为 Canvas 渲染或简化力模拟
- 对 ParticleCanvas 添加 `visibilitychange` 监听，页面不可见时暂停 RAF
- 利用 Chrome DevTools 的 Animation 面板定期审查动画性能

### 7.7 考虑未来 WebGL 升级路径

如果未来节点数/粒子数大幅增加，建议预留：
- **Pixi.js** 或 **Lottie** 的接入位置（用于复杂 2D 动画）
- **Three.js** 或 **Babylon.js** 的接入位置（用于 3D 关系图可视化）
- 但当前架构下，**Canvas 2D 已足够支撑 2-3 年的功能扩展**

---

## 附录：关键文件索引

| 文件 | 行数 | 动画相关内容 |
|------|------|------------|
| `src/index.css` | 2921 | 全局主题、keyframes、transitions、glassmorphism、动画编排 |
| `src/components/_shared/ParticleCanvas.tsx` | 595 | Canvas 2D 粒子系统（7 主题） |
| `src/components/relationship-graph/RelationshipGraph.tsx` | 224 | D3 力导向关系图 |
| `src/components/foreshadowing/ForeshadowingGraph.tsx` | 294 | D3 力导向伏笔图 |
| `src/components/timeline/TimelineEventCard.tsx` | 432 | Framer Motion 卡片动画 + CSS 效果 |
| `src/components/layout/AppShell.tsx` | 410 | Framer Motion 页面切换 + 移动端抽屉 |
| `src/components/zen-mode/ZenMode.tsx` | 350 | Framer Motion 全屏模式动画 |
| `src/components/timeline/TimelineCanvas.tsx` | 475 | RAF 滚动同步 + 空状态 SVG 动画 |
| `src/stores/useThemeStore.ts` | 123 | View Transitions API 主题切换 |
| `src/lib/colors.ts` | 137 | 调色板、主题预览色、语义颜色映射 |
| `src/components/settings/ThemeSelector.tsx` | 82 | 主题选择器 UI |

---

*报告完*
