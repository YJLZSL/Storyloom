# 品牌决策

> 最后更新：v3.0.0
> 范围：v2.0 品牌焕新决策记录，v3.0 起仍沿用 Storyloom · 絮织 品牌

## 候选名分析

| 候选名 | 含义 / 来源 | 一句话定位 | 优势 | 劣势 |
|---|---|---|---|---|
| **Storyloom**（推荐 · 已选定） | Story（故事） + Loom（织布机） | 用一根时间线，把故事织成宇宙 | 意象具体可视化（线 + 织）、易记、英文双音节、SEO 友好 | 与个别欧美工具同名前缀有少量重叠 |
| InkLume | Ink（墨） + Lume（光） | 在墨色长卷里点亮每一处叙事光斑 | 文艺感强，契合 luosheng 琥珀棕 + 水墨美术 | 偏抽象，不直接传达"时间轴/创作工具" |
| Chronoweave | Chrono（时间） + Weave（编织） | 把时间编织成故事 | 直白点出"时间 + 编织" | 较长（10 字符），词组感强，没有 Storyloom 简洁 |

## 最终决策

- **正式英文名**：`Storyloom`
- **正式中文副名**：`絮织`（已在仓库 README/index.html 使用，沿用以保持连续性）
- **完整品牌写法**：`Storyloom · 絮织`
- **代号**：`storyloom`（小写，用于 package name / 仓库 / npm scope）
- **历史代号保留**：`AI Timeline Creator`（仅出现在历史 spec、CHANGELOG 历史条目、README "前身" 一行注释）

## 一句话定位（双语）

- 中文：**Storyloom · 絮织 — 用一根时间线，把故事织成宇宙。**
- English: **Storyloom — Weave timelines into living stories.**

## 现状对照（2026-06-19 实勘）

| 位置 | 现状 | 是否还需改 |
|---|---|---|
| `package.json#name` | `storyloom` | ✅ 已是新名 |
| `package.json#build.productName` | `Storyloom` | ✅ |
| `package.json#build.appId` | `com.ai.timeline-creator` | ⚠️ 仍是旧 ID（保留以维持 electron-updater 链路，v2.0 一并迁移到 `com.storyloom.app`） |
| `package.json#build.publish.repo` | `AI-Timeline-Creator` | ⚠️ 与 GitHub 仓库同名，迁移涉及 release 链路，本轮保留并在 release notes 中说明 |
| `index.html#title` | `Storyloom · 絮织` | ✅ |
| `README.md` 首屏 | `Storyloom · 絮织` | ✅ |
| `version` | `1.1.0` | 🔁 本轮升至 `2.0.0` |
| favicon / app icon | `public/icon.ico`、`public/icon.png`（旧）| 🔁 重新设计 Storyloom 主题图标 |
| GitHub 仓库 URL | `YJLZSL/AI-Timeline-Creator` | ⚠️ 暂不改名（已部署链路依赖），改 description / topics 即可 |

## 视觉基调

- 主色：luosheng 琥珀棕 `#A47148`（沿用 v1.4 已经成熟的主题色板）
- 辅色：宣纸米 `#F5EFE2` / 墨 `#2B2A28`
- 图标符号建议：**经线（垂直时间线刻度）+ 纬线（书写笔触）+ 起承转合四个节点**，整体向"织机梭子"的轮廓收束，呼应 Loom。

## 引用

本决策被以下 spec / 任务引用：
- `.trae/specs/rebrand-finalize-handoff-v2_0/spec.md`
- `.trae/specs/rebrand-finalize-handoff-v2_0/tasks.md` (Task 1 / 7 / 8)

## 待办

- **位图图标重生成**：`public/icon.ico` 与 `public/icon.png` 仍为旧版 AI Timeline Creator 资源，本轮 Task 7 仅交付了矢量主图标 `public/favicon.svg`（彩色，琥珀棕 + 宣纸米）与 `public/icon-monochrome.svg`（透明背景 + 墨色，用于浅底文档/徽章）。位图重生成需要 Sharp 等二进制工具链（参见 `scripts/generate-icon.py`），留作 v2.0 维护轮的后续任务；在此之前，旧 `icon.ico` / `icon.png` 作为 Electron 安装包与 Apple touch icon 的回退资源继续使用，不影响新品牌主标识展示（浏览器 / GitHub README / 应用窗口标题已优先指向 SVG）。
- **跟进任务建议**：新增 spec 子任务"用 `scripts/generate-icon.py` 基于 `favicon.svg` 渲染 256/128/64/48/32/16 多尺寸 ICO + 1024 PNG"，并在 Electron `build.icon` 配置中校验。
