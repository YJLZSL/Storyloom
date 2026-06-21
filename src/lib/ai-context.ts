// ============================================
// AI 上下文构建工具 — 三段式消息结构（参考 AI集成指南.md）
// ============================================

import type { AIChatMessage } from '../components/ai-panel/useAIConversations';

const STORYLOOM_SYSTEM_PROMPT = `你是 Storyloom · 织叙的 AI 创作助手，一位经验丰富的小说编辑和故事顾问。

你的能力：
1. 分析故事结构、角色关系和情节逻辑
2. 提供灵感启发、修改建议和续写支持
3. 检测伏笔回收情况和故事一致性
4. 帮助用户扩展和完善故事内容

约束：
- 回答使用与用户相同的语言
- 回答简洁，优先给出可执行的建议
- 引用用户提供的角色名和事件名时使用原文
- 不生成不适当的或违反用户设定世界观的内容`;

interface ContextConfig {
  includeCharacters: boolean;
  includeEvents: boolean;
  includeForeshadowings: boolean;
  includeWorldSettings: boolean;
  maxTokens: number; // 上下文总 token 预算
}

const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  includeCharacters: true,
  includeEvents: true,
  includeForeshadowings: true,
  includeWorldSettings: true,
  maxTokens: 4000,
};

/** 从 localStorage 读取上下文配置 */
export function loadContextConfig(): ContextConfig {
  try {
    const raw = localStorage.getItem('ai-context-config');
    if (!raw) return DEFAULT_CONTEXT_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONTEXT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONTEXT_CONFIG;
  }
}

/** 保存上下文配置到 localStorage */
export function saveContextConfig(config: ContextConfig): void {
  localStorage.setItem('ai-context-config', JSON.stringify(config));
}

/** 构建三段式消息结构 */
export function buildAIContextMessages(
  userMessage: string,
  conversationHistory: AIChatMessage[],
  workspaceContext: string | null,
  selectedEventContext: string | null,
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

  // 第 1 段：固定系统提示词（永远不变）→ 全局缓存命中
  messages.push({ role: 'system', content: STORYLOOM_SYSTEM_PROMPT });

  // 第 2 段：工作区上下文（同一工作区内不变）→ 工作区级缓存命中
  if (workspaceContext) {
    messages.push({ role: 'system', content: workspaceContext });
  }

  // 第 3 段：选中事件上下文（动态变化）
  if (selectedEventContext) {
    messages.push({ role: 'system', content: selectedEventContext });
  }

  // 第 4 段：对话历史（只保留最近 N 条，控制总长度）
  const history = conversationHistory
    .filter((m) => m.role !== 'system')
    .slice(-10) // 最多保留最近 10 条
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  messages.push(...history);

  // 第 5 段：当前用户消息
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

/** 从 workspace-context API 响应构建上下文文本 */
export function buildWorkspaceContextText(data: {
  workspace: { name: string; description: string | null; eventCount: number; characterCount: number };
  tracks: Array<{ name: string }>;
  events: Array<{ title: string; summary: string | null; description: string | null }>;
  characters: Array<{ name: string; role: string | null; description: string | null }>;
  foreshadowings: Array<{ title: string; status: string }>;
  worldSettings: Array<{ category: string; key: string; value: string | null }>;
}): string {
  const parts: string[] = [];
  parts.push(`当前工作区：${data.workspace.name}`);
  if (data.workspace.description) {
    parts.push(`工作区描述：${data.workspace.description}`);
  }

  if (data.characters.length > 0) {
    parts.push('\n角色列表：');
    data.characters.forEach((c) => {
      parts.push(`- ${c.name}${c.role ? `（${c.role}）` : ''}`);
    });
  }

  if (data.events.length > 0) {
    parts.push('\n关键事件：');
    data.events.slice(0, 20).forEach((e) => {
      parts.push(`- ${e.title}${e.summary ? `：${e.summary.slice(0, 100)}` : ''}`);
    });
  }

  if (data.foreshadowings.length > 0) {
    const unresolved = data.foreshadowings.filter((f) => f.status !== 'resolved');
    if (unresolved.length > 0) {
      parts.push('\n未回收伏笔：');
      unresolved.slice(0, 10).forEach((f) => {
        parts.push(`- ${f.title}`);
      });
    }
  }

  if (data.worldSettings.length > 0) {
    parts.push('\n世界观设定：');
    data.worldSettings.slice(0, 10).forEach((w) => {
      parts.push(`- [${w.category}] ${w.key}：${w.value?.slice(0, 100) || ''}`);
    });
  }

  return parts.join('\n');
}

/** AI 辅助功能 Prompt 模板 */
export const AI_ASSIST_TEMPLATES = {
  continue: (eventTitle: string, eventDesc: string) =>
    `请根据以下事件背景续写或扩展描述：\n\n事件：${eventTitle}\n描述：${eventDesc}\n\n请续写 200-500 字，保持故事风格和逻辑一致性。`,

  dialogue: (char1: string, char2: string, scene: string) =>
    `请生成以下两个角色之间的对话：\n\n场景：${scene}\n角色 A：${char1}\n角色 B：${char2}\n\n要求：\n- 对话自然流畅，符合角色性格\n- 控制在 300-800 字\n- 适当加入动作和神态描写`,

  foreshadow: (foreshadowings: string[]) =>
    `以下是我故事中已埋下但尚未回收的伏笔，请帮我建议回收方式：\n\n${foreshadowings.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\n请为每个伏笔提供 1-2 种回收建议，并说明可以关联到哪些已有事件或角色。`,

  consistency: (events: string[]) =>
    `请帮我检查以下故事内容中的逻辑矛盾或不一致之处：\n\n${events.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n\n请检查：\n- 时间线矛盾（时间先后顺序）\n- 角色行为与其性格/设定不一致\n- 伏笔回收与铺设不一致\n- 其他逻辑漏洞`,
} as const;

export type AIAssistType = keyof typeof AI_ASSIST_TEMPLATES;

export { DEFAULT_CONTEXT_CONFIG };
export type { ContextConfig };
