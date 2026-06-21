# GSAP 动画引擎可行性评估

> 评估日期：2026 年 1 月  
> 评估范围：Storyloom 项目（React 19 + Tauri 2.0 + WebView2）  
> 评估结论：**强烈推荐引入 GSAP，与 Framer Motion 共存**

---

## 1. GSAP 能力矩阵

| 功能 | 当前实现 | GSAP 方案 | 提升幅度 | 优先级 |
|------|--------|----------|---------|--------|
| **Timeline（时间线编排）** | Framer Motion 无原生时间线，需手动链式调用 | `gsap.timeline()` 精确控制每一帧，支持标签、重叠、跳转 | ⭐⭐⭐⭐⭐ 质变 | **P0** |
| **ScrollTrigger（滚动触发）** | Framer Motion `useScroll` 功能有限 | `ScrollTrigger` 插件支持 pin、scrub、snap、水平滚动 | ⭐⭐⭐⭐⭐ 质变 | **P0** |
| **MorphSVG（SVG 变形）** | 无实现方案 | `MorphSVG` 插件一键实现 SVG 路径平滑变形 | ⭐⭐⭐⭐⭐ 质变 | **P1** |
| **DrawSVG（SVG 描边动画）** | CSS `stroke-dasharray` 手动计算 | `DrawSVG` 插件自动处理，支持百分比控制 | ⭐⭐⭐⭐ 显著提升 | **P1** |
| **SplitText（文字逐字动画）** | 无实现方案 | `SplitText` 插件拆分为 chars/words/lines，支持响应式重排 | ⭐⭐⭐⭐ 显著提升 | **P1** |
| **Physics2D / 3D** | 无实现方案 | `Physics2DPlugin` 实现重力、速度、角度物理模拟 | ⭐⭐⭐⭐ 显著提升 | **P2** |
| **PixiJS 驱动** | PixiJS 自带 `pixi-actions` 但功能有限 | `PixiPlugin` 原生驱动，支持颜色矩阵、模糊滤镜、定向旋转 | ⭐⭐⭐⭐ 显著提升 | **P2** |
| **常规 UI 过渡** | Framer Motion `AnimatePresence` 非常成熟 | `useGSAP` + `gsap.to` 可实现，但代码量更大 | ⭐⭐ 略降 | 保留 FM |

---

## 2. 与 Framer Motion 对比

### 2.1 核心差异

| 维度 | Framer Motion | GSAP |
|------|--------------|------|
| **API 风格** | 声明式（JSX props） | 命令式（方法链） |
| **框架绑定** | React 专用（Motion  rebranding 后扩展中） | 完全框架无关 |
| **时间线控制** | 有限，需手动编排 | `gsap.timeline()` 行业标杆 |
| **Scroll 动画** | `useScroll` + `useTransform` 基础 | `ScrollTrigger` 专业级 |
| **SVG 动画** | 仅支持 transform/opacity | MorphSVG、DrawSVG 原生支持 |
| **包体积 (gzip)** | ~32–85 KB | ~23 KB（核心），插件按需加载 |
| **Tree Shaking** | 有限 | 完全支持 |
| **手势支持** | 内置 drag/tap/hover | 需 Draggable 插件 |
| **学习曲线** | 低（React 开发者友好） | 中等（时间线概念需学习） |

### 2.2 场景推荐矩阵

| 场景 | Framer Motion | GSAP | 推荐 |
|------|--------------|------|------|
| 页面过渡（路由切换） | ✅ `AnimatePresence` 原生支持 | ⚠️ 需手动控制 | **FM** |
| 组件挂载/卸载动画 | ✅ 声明式 exit/enter | ⚠️ 需手动 revert | **FM** |
| 悬停/点击微交互 | ✅ `whileHover` / `whileTap` | ⚠️ 需事件绑定 | **FM** |
| 拖拽交互 | ✅ 内置 `drag` 约束 | ⚠️ 需 Draggable 插件 | **FM** |
| 共享元素过渡 | ✅ `layoutId` 自动处理 | ❌ 无直接支持 | **FM** |
| 复杂序列动画（多步骤编排） | ❌ 无原生时间线 | ✅ `gsap.timeline()` | **GSAP** |
| 滚动驱动动画 | ⚠️ 基础支持 | ✅ `ScrollTrigger` 专业级 | **GSAP** |
| SVG 路径变形 | ❌ 不支持 | ✅ `MorphSVG` | **GSAP** |
| SVG 线条绘制 | ⚠️ 手动 CSS | ✅ `DrawSVG` | **GSAP** |
| 文字逐字/词/行动画 | ❌ 不支持 | ✅ `SplitText` | **GSAP** |
| 物理模拟（重力/碰撞） | ❌ 不支持 | ✅ `Physics2DPlugin` | **GSAP** |
| PixiJS 对象动画 | ❌ 不支持 | ✅ `PixiPlugin` | **GSAP** |
| 精确缓动控制 | ⚠️ 预设有限 | ✅ `CustomEase` | **GSAP** |

### 2.3 迁移成本评估

| 项目 | 评估 |
|------|------|
| **现有 FM 代码迁移** | **无需迁移**。Framer Motion 在 UI 过渡场景仍有优势，建议保留 |
| **新增 GSAP 代码** | 低。通过 `useGSAP` hook 可在 React 组件中直接编写 |
| **团队学习成本** | 中等。Timeline 和 ScrollTrigger 概念需 1–2 天熟悉 |
| **构建配置** | 无。`npm install` 即可，无需 webpack/vite 特殊配置 |
| **运行时冲突** | 无。两者操作不同层级（FM 操作 React 层，GSAP 操作 DOM 层） |

---

## 3. 动画层架构设计

### 3.1 动画层在组件树中的位置

```
┌─────────────────────────────────────────────────────────────┐
│                     App (Business Logic)                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Animation Layer (React Context)          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │ GSAP Engine │  │ FM Engine   │  │ Config JSON │  │   │
│  │  │ (complex)   │  │ (UI micro)  │  │ (data驱动)   │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Presentation Layer (Components)          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │ SVG Scene   │  │ Page Layout │  │  PixiJS     │  │   │
│  │  │ (Loom)      │  │ (Scroll)    │  │  Canvas     │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**设计原则：**
- **动画层独立存在**：不侵入业务逻辑，通过 React Context 提供全局动画能力
- **双引擎并存**：GSAP 负责复杂序列/SVG/滚动，Framer Motion 负责 UI 过渡/手势
- **向下注入**：动画层向下提供 `useAnimation` hook，组件按需调用

### 3.2 动画配置系统（JSON 驱动）

```typescript
// types/animation-config.ts
interface AnimationConfig {
  id: string;
  type: 'gsap' | 'framer-motion';
  trigger: 'mount' | 'scroll' | 'hover' | 'click' | 'state-change';
  target: string; // CSS selector or ref key
  timeline?: {
    label?: string;
    position?: number | string;
    overlap?: number;
  };
  tweens: Array<{
    type: 'to' | 'from' | 'fromTo' | 'set';
    vars: Record<string, any>;
    duration?: number;
    delay?: number;
    ease?: string;
    position?: number | string;
  }>;
  plugins?: string[]; // 'ScrollTrigger', 'MorphSVG', 'DrawSVG', etc.
  scrollTrigger?: {
    trigger?: string;
    start?: string;
    end?: string;
    scrub?: boolean | number;
    pin?: boolean;
    markers?: boolean;
  };
}

// 示例：织机 SVG 描边动画配置
const loomRevealConfig: AnimationConfig = {
  id: 'loom-draw-reveal',
  type: 'gsap',
  trigger: 'scroll',
  target: '.loom-svg path',
  plugins: ['DrawSVG', 'ScrollTrigger'],
  tweens: [
    {
      type: 'fromTo',
      vars: { drawSVG: '0%' },
      varsTo: { drawSVG: '100%', stroke: '#c49a6c', strokeWidth: 2 },
      duration: 2.5,
      ease: 'power2.inOut',
    },
  ],
  scrollTrigger: {
    trigger: '.loom-section',
    start: 'top 80%',
    end: 'top 20%',
    scrub: 1,
  },
};
```

### 3.3 动画引擎执行器

```typescript
// core/animation-engine.ts
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVG } from 'gsap/DrawSVG';
import { MorphSVG } from 'gsap/MorphSVG';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, DrawSVG, MorphSVG, SplitText);

export class AnimationEngine {
  private timelines: Map<string, gsap.core.Timeline> = new Map();

  execute(config: AnimationConfig, scope?: HTMLElement): gsap.core.Timeline {
    const tl = gsap.timeline({
      scrollTrigger: config.scrollTrigger ? {
        ...config.scrollTrigger,
        trigger: scope?.querySelector(config.scrollTrigger.trigger!) || config.scrollTrigger.trigger,
      } : undefined,
    });

    config.tweens.forEach((tween, index) => {
      const target = scope?.querySelector(tween.target || config.target) || config.target;
      const position = tween.position ?? (index === 0 ? 0 : '+=0');

      switch (tween.type) {
        case 'to':
          tl.to(target, { ...tween.vars, duration: tween.duration, ease: tween.ease }, position);
          break;
        case 'from':
          tl.from(target, { ...tween.vars, duration: tween.duration, ease: tween.ease }, position);
          break;
        case 'fromTo':
          tl.fromTo(target, tween.vars, { ...tween.varsTo, duration: tween.duration, ease: tween.ease }, position);
          break;
      }
    });

    this.timelines.set(config.id, tl);
    return tl;
  }

  kill(id: string) {
    const tl = this.timelines.get(id);
    if (tl) {
      tl.kill();
      this.timelines.delete(id);
    }
  }

  killAll() {
    this.timelines.forEach(tl => tl.kill());
    this.timelines.clear();
  }
}
```

### 3.4 与业务逻辑的解耦

```typescript
// hooks/use-animation.ts
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { AnimationEngine } from '@/core/animation-engine';
import type { AnimationConfig } from '@/types/animation-config';

const engine = new AnimationEngine();

export function useAnimation(config: AnimationConfig, deps: any[] = []) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (containerRef.current) {
      engine.execute(config, containerRef.current);
    }
  }, { scope: containerRef, dependencies: deps, revertOnUpdate: true });

  return { containerRef };
}

// 使用方式：组件零动画逻辑
function LoomSection() {
  const { containerRef } = useAnimation(loomRevealConfig);

  return (
    <section ref={containerRef} className="loom-section">
      <svg className="loom-svg">{/* ... */}</svg>
    </section>
  );
}
```

---

## 4. 具体应用场景

### 4.1 织机 SVG 动画增强（MorphSVG + DrawSVG）

**场景**：Storyloom 核心视觉元素——织机 SVG 需要增强动画效果：线条绘制、部件变形、光泽流动。

```tsx
// components/loom-svg-animation.tsx
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { DrawSVG } from 'gsap/DrawSVG';
import { MorphSVG } from 'gsap/MorphSVG';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(DrawSVG, MorphSVG, ScrollTrigger);

export function LoomSVGAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      // 1. DrawSVG：线条绘制效果（经线依次出现）
      gsap.fromTo('.warp-thread',
        { drawSVG: '0%' },
        {
          drawSVG: '100%',
          duration: 1.5,
          stagger: 0.05,
          ease: 'power2.inOut',
          scrollTrigger: {
            trigger: '.loom-svg',
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // 2. MorphSVG：梭子变形为光束
      gsap.to('.shuttle', {
        morphSVG: '.shuttle-morphed',
        duration: 2,
        ease: 'elastic.out(1, 0.3)',
        scrollTrigger: {
          trigger: '.loom-svg',
          start: 'top 50%',
          toggleActions: 'play pause resume reverse',
        },
      );

      // 3. 组合时间线：整体织机动画序列
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '.loom-svg',
          start: 'top 60%',
          end: 'bottom 40%',
          scrub: 1,
        },
      });

      tl.from('.loom-frame', { opacity: 0, y: 30, duration: 1 })
        .from('.beam', { scaleX: 0, transformOrigin: 'left center', duration: 0.8 }, '-=0.5')
        .from('.threads', { opacity: 0, scale: 0.9, duration: 1 }, '-=0.3');

    }, containerRef);

    return () => ctx.revert();
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="loom-container">
      <svg className="loom-svg" viewBox="0 0 800 600">
        {/* 经线 - 将被 DrawSVG 动画化 */}
        <path className="warp-thread" d="M100,100 L100,500" stroke="#c49a6c" fill="none" />
        <path className="warp-thread" d="M120,100 L120,500" stroke="#c49a6c" fill="none" />
        {/* ... 更多经线 */}

        {/* 梭子 - 将被 MorphSVG 变形 */}
        <path className="shuttle" d="M350,280 L450,280 L430,320 L370,320 Z" fill="#8b6914" />
        <path className="shuttle-morphed" d="M350,280 C450,280 450,320 350,320 C250,320 250,280 350,280" fill="#ffd700" opacity="0" />

        {/* 框架 */}
        <rect className="loom-frame" x="50" y="80" width="700" height="440" stroke="#5c4033" fill="none" strokeWidth="4" />
      </svg>
    </div>
  );
}
```

### 4.2 页面切换序列（Timeline）

**场景**：Storyloom 叙事场景切换需要精确的时序控制——背景淡出、文字显现、角色入场的精确编排。

```tsx
// components/scene-transition.tsx
import { useRef, useCallback } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface SceneTransitionProps {
  sceneId: string;
  onComplete?: () => void;
}

export function SceneTransition({ sceneId, onComplete }: SceneTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      // 创建主时间线，paused 由外部控制
      tlRef.current = gsap.timeline({
        paused: true,
        onComplete: () => onComplete?.(),
      });

      tlRef.current
        // 0s: 旧场景淡出
        .to('.old-scene', { opacity: 0, duration: 0.8, ease: 'power2.in' })
        // 0.3s: 幕布拉下（与旧场景淡出重叠）
        .to('.curtain', { y: 0, duration: 0.6, ease: 'power3.out' }, 0.3)
        // 0.8s: 切换背景
        .set('.scene-bg', { backgroundImage: `url(/scenes/${sceneId}.jpg)` }, 0.8)
        // 1.0s: 幕布拉起
        .to('.curtain', { y: '-100%', duration: 0.8, ease: 'power3.in' }, 1.0)
        // 1.2s: 新场景淡入
        .from('.new-scene', { opacity: 0, duration: 1, ease: 'power2.out' }, 1.2)
        // 1.5s: 标题文字逐字显现（配合 SplitText）
        .from('.scene-title .char', {
          opacity: 0,
          y: 20,
          stagger: 0.03,
          duration: 0.6,
          ease: 'back.out(1.7)',
        }, 1.5)
        // 2.0s: 角色从下方滑入
        .from('.character', { y: 100, opacity: 0, duration: 0.8, ease: 'power2.out' }, 2.0);
    }, containerRef);

    return () => ctx.revert();
  }, { scope: containerRef });

  // 外部触发播放
  const play = useCallback(() => {
    tlRef.current?.play(0);
  }, []);

  return (
    <div ref={containerRef} className="scene-container">
      <div className="scene-bg" />
      <div className="old-scene" />
      <div className="new-scene" />
      <div className="curtain" />
      <h1 className="scene-title">{/* SplitText 将在这里拆分 */}</h1>
      <div className="character" />
    </div>
  );
}
```

### 4.3 时间轴滚动效果（ScrollTrigger）

**场景**：Storyloom 叙事时间轴页面——用户滚动时，时间轴节点依次激活、内容卡片从两侧滑入、进度线自动绘制。

```tsx
// components/timeline-scroll.tsx
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVG } from 'gsap/DrawSVG';

gsap.registerPlugin(ScrollTrigger, DrawSVG);

export function TimelineScroll() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      // 1. 时间轴线绘制
      gsap.fromTo('.timeline-line',
        { drawSVG: '0%' },
        {
          drawSVG: '100%',
          ease: 'none',
          scrollTrigger: {
            trigger: '.timeline-section',
            start: 'top 80%',
            end: 'bottom 20%',
            scrub: 1,
          },
        }
      );

      // 2. 节点激活（从左侧滑入）
      gsap.utils.toArray<HTMLElement>('.timeline-node').forEach((node, i) => {
        gsap.from(node, {
          x: i % 2 === 0 ? -80 : 80, // 奇偶交替方向
          opacity: 0,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: node,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        });
      });

      // 3. 年份数字放大脉冲
      gsap.from('.timeline-year', {
        scale: 0.5,
        opacity: 0,
        duration: 0.8,
        ease: 'back.out(2)',
        stagger: 0.2,
        scrollTrigger: {
          trigger: '.timeline-section',
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      });

      // 4. 固定侧边栏（Pin）
      ScrollTrigger.create({
        trigger: '.timeline-section',
        start: 'top top',
        end: 'bottom bottom',
        pin: '.timeline-sidebar',
        pinSpacing: false,
      });

    }, containerRef);

    return () => ctx.revert();
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="timeline-wrapper">
      <aside className="timeline-sidebar">时间轴导航</aside>
      <section className="timeline-section">
        <svg className="timeline-svg">
          <line className="timeline-line" x1="50" y1="0" x2="50" y2="1000" stroke="#c49a6c" strokeWidth="2" />
        </svg>
        {timelineData.map((item, i) => (
          <div key={i} className="timeline-node" data-index={i}>
            <span className="timeline-year">{item.year}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
```

### 4.4 文字打字机效果（SplitText）

**场景**：Storyloom 叙事文本——对话逐字显现、标题逐行揭示、诗句逐词浮现。

```tsx
// components/typewriter-text.tsx
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

interface TypewriterTextProps {
  text: string;
  type?: 'chars' | 'words' | 'lines';
  speed?: number; // 每个单位动画时间（秒）
  delay?: number;
  onComplete?: () => void;
}

export function TypewriterText({
  text,
  type = 'chars',
  speed = 0.05,
  delay = 0,
  onComplete,
}: TypewriterTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<SplitText | null>(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      const target = containerRef.current?.querySelector('.type-target');
      if (!target) return;

      // SplitText 拆分文本
      splitRef.current = new SplitText(target, {
        type: type === 'chars' ? 'chars' : type === 'words' ? 'words' : 'lines',
        charsClass: 'char',
        wordsClass: 'word',
        linesClass: 'line',
        aria: true, // 自动添加无障碍标签
      });

      const elements = type === 'chars'
        ? splitRef.current.chars
        : type === 'words'
          ? splitRef.current.words
          : splitRef.current.lines;

      // 打字机动画：从透明度 0 显现
      gsap.from(elements, {
        opacity: 0,
        duration: speed,
        stagger: speed,
        delay,
        ease: 'none',
        onComplete,
      });
    }, containerRef);

    return () => {
      splitRef.current?.revert(); // 清理 SplitText，恢复原始 DOM
      ctx.revert();
    };
  }, { scope: containerRef, dependencies: [text, type, speed, delay] });

  return (
    <div ref={containerRef} className="typewriter-container">
      <p className="type-target">{text}</p>
    </div>
  );
}

// 使用示例
function DialogueScene() {
  return (
    <div className="dialogue-scene">
      <TypewriterText
        text="很久很久以前，在时间的织机上，每一根丝线都承载着一个故事..."
        type="chars"
        speed={0.06}
        onComplete={() => console.log('第一句话完毕')}
      />
      <TypewriterText
        text="现在，轮到你来编织属于自己的篇章了。"
        type="words"
        speed={0.3}
        delay={2} // 等待第一句完成后
      />
    </div>
  );
}
```

---

## 5. 集成方案

### 5.1 安装步骤

```bash
# 1. 安装 GSAP 核心（2025 年 5 月起所有插件完全免费）
npm install gsap

# 2. 安装 React 官方集成包
npm install @gsap/react

# 3. 如需 PixiJS 集成（可选）
npm install pixi.js
# PixiPlugin 已包含在 gsap 包中，无需额外安装
```

### 5.2 全局注册（推荐在入口文件）

```typescript
// src/main.tsx or src/App.tsx
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVG } from 'gsap/DrawSVG';
import { MorphSVG } from 'gsap/MorphSVG';
import { PixiPlugin } from 'gsap/PixiPlugin';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';

// 一次性注册所有插件（避免组件内重复注册导致 StrictMode 问题）
gsap.registerPlugin(
  useGSAP,
  ScrollTrigger,
  SplitText,
  DrawSVG,
  MorphSVG,
  PixiPlugin,
  Physics2DPlugin
);

// PixiJS 集成时注册 PIXI 对象
import * as PIXI from 'pixi.js';
PixiPlugin.registerPIXI(PIXI);
```

### 5.3 与现有 Framer Motion 代码的兼容性

```tsx
// 完全兼容：同一组件中可混用
import { motion, AnimatePresence } from 'framer-motion';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

function MixedAnimationComponent() {
  const containerRef = useRef<HTMLDivElement>(null);

  // GSAP 负责复杂序列
  useGSAP(() => {
    gsap.from('.gsap-target', { x: 100, duration: 1 });
  }, { scope: containerRef });

  return (
    <div ref={containerRef}>
      {/* Framer Motion 负责 UI 过渡 */}
      <AnimatePresence>
        <motion.div
          className="fm-target"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      </AnimatePresence>

      {/* GSAP 负责复杂动画 */}
      <div className="gsap-target" />
    </div>
  );
}
```

### 5.4 React 19 / Tauri WebView2 注意事项

```tsx
// 1. React 19 中 useGSAP 安全使用
// useGSAP 内部实现了 useIsomorphicLayoutEffect，SSR 安全

// 2. Tauri 中确保在客户端组件中使用
'use client'; // 如果是 Next.js 风格

// 3. WebView2 中 GSAP 性能最佳实践
// - 优先使用 transform 和 opacity（GPU 加速）
// - 避免动画化 layout 属性（width/height/top/left）
// - 使用 will-change: transform 提示浏览器优化
```

---

## 6. 性能评估

### 6.1 包体积增加

| 模块 | 大小（gzip） | 说明 |
|------|------------|------|
| `gsap` 核心 | ~23 KB | 必须 |
| `@gsap/react` | ~3 KB | 必须 |
| `ScrollTrigger` | ~10 KB | 按需加载 |
| `SplitText` | ~8 KB | 按需加载 |
| `DrawSVG` | ~5 KB | 按需加载 |
| `MorphSVG` | ~12 KB | 按需加载 |
| `PixiPlugin` | ~6 KB | 按需加载 |
| `Physics2DPlugin` | ~7 KB | 按需加载 |
| **典型场景总计** | **~35–50 KB** | 核心 + 3-4 个常用插件 |
| **全插件加载** | ~80 KB | 不推荐 |

**结论**：GSAP 采用按需导入策略，实际增量可控。即使加载全部常用插件，也仅与 Framer Motion 单包体积相当。

### 6.2 运行时性能

| 指标 | 评估 |
|------|------|
| **动画帧率** | GSAP 使用 `requestAnimationFrame` 优化，可同时驱动数千个 tween 不掉帧 |
| **React 重渲染** | GSAP 直接操作 DOM，绕过 React 虚拟 DOM diff，动画不触发重渲染 |
| **内存占用** | `useGSAP` 自动清理（revert），组件卸载时释放所有动画实例 |
| **ScrollTrigger** | 滚动事件使用被动监听器，内部节流优化，不影响滚动性能 |
| **WebView2 兼容性** | 完全兼容。Tauri 生产项目（如 YeeMusic、ETBSaveManager）已验证 |

### 6.3 与 Framer Motion 性能对比

| 场景 | Framer Motion | GSAP | 胜出 |
|------|--------------|------|------|
| 100+ 元素同时动画 | 可能掉帧 | 稳定 60fps | GSAP |
| 高频状态同步动画 | 绑定 React 渲染周期 | 直接操作 DOM | GSAP |
| 简单 UI 过渡 | 优化良好 | 同样良好 | 持平 |
| 复杂时间线序列 | 性能开销随复杂度上升 | 恒定低开销 | GSAP |

---

## 7. 推荐方案

### 7.1 总体策略：**双引擎共存，各司其职**

```
┌──────────────────────────────────────────────────────────┐
│  Framer Motion（保留）                                    │
│  ├── 页面路由过渡（AnimatePresence）                      │
│  ├── 组件挂载/卸载动画                                   │
│  ├── 悬停/点击微交互（whileHover / whileTap）            │
│  ├── 拖拽手势（drag）                                     │
│  ├── 共享元素过渡（layoutId）                             │
│  └── 布局动画（layout prop）                             │
├──────────────────────────────────────────────────────────┤
│  GSAP（新增）                                             │
│  ├── 复杂时间线序列（Timeline）                            │
│  ├── 滚动驱动动画（ScrollTrigger）                        │
│  ├── 织机 SVG 动画（MorphSVG + DrawSVG）                  │
│  ├── 文字特效（SplitText）                               │
│  ├── 物理模拟（Physics2D）                               │
│  └── PixiJS 集成动画（PixiPlugin）                       │
└──────────────────────────────────────────────────────────┘
```

### 7.2 实施路线图

| 阶段 | 时间 | 任务 | 优先级 |
|------|------|------|--------|
| **Phase 1** | 1 周 | 安装 `gsap` + `@gsap/react`，全局注册插件，完成集成测试 | P0 |
| **Phase 2** | 2 周 | 织机 SVG 动画增强：DrawSVG 描边 + MorphSVG 变形 | P0 |
| **Phase 3** | 2 周 | 叙事时间轴 ScrollTrigger 滚动效果 | P1 |
| **Phase 4** | 1 周 | 对话打字机效果（SplitText） | P1 |
| **Phase 5** | 2 周 | 场景切换 Timeline 编排系统 | P1 |
| **Phase 6** | 2 周 | 动画配置 JSON 数据化 + 动画引擎抽象层 | P2 |
| **Phase 7** | 待定 | PixiJS + GSAP 集成（如引入 Canvas 渲染） | P2 |

### 7.3 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 团队学习曲线 | 中 | 低 | 提供 `useGSAP` 模板代码，Timeline 概念 1 天可掌握 |
| 与 React 声明式冲突 | 低 | 中 | 使用 `useGSAP` scope 隔离，动画逻辑封装在自定义 hook 中 |
| 插件 Tree Shaking 失败 | 低 | 中 | 始终在入口文件 `registerPlugin`，使用命名导入 |
| Tauri WebView2 兼容问题 | 极低 | 高 | 已在多个 Tauri 生产项目验证，无已知问题 |
| 包体积超预期 | 低 | 低 | 按需导入，未使用插件不会被打包 |

### 7.4 最终结论

> **强烈建议引入 GSAP，与 Framer Motion 形成互补。**
>
> GSAP 在 Timeline、ScrollTrigger、SVG 动画、文字特效等场景的能力是 Framer Motion 无法替代的。Framer Motion 在 React UI 过渡和手势交互方面仍有优势，两者共存是最优架构选择。
>
> 2025 年 5 月 GSAP 全面免费后，所有高级插件（SplitText、MorphSVG、DrawSVG、Physics2D）均可零成本使用，此时引入的性价比达到最高。

---

## 附录：参考资源

- [GSAP React 官方文档](https://gsap.com/resources/React/)
- [@gsap/react npm](https://www.npmjs.com/package/@gsap/react)
- [GSAP ScrollTrigger 文档](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
- [GSAP PixiPlugin 文档](https://gsap.com/docs/v3/Plugins/PixiPlugin/)
- [GSAP 全面免费公告](https://tympanus.net/codrops/2025/05/14/from-splittext-to-morphsvg-5-creative-demos-using-free-gsap-plugins/)
- [Framer Motion vs GSAP 对比](https://www.pacgie.com/npm-trends/framer-motion-vs-gsap)
