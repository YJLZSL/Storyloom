# AI 深度集成实施指南 — 面向下一个 AI Agent

> 版本：v1.4.0 基线
> 最后更新：2026-06-21
> 状态：部分已实施（AI 对话历史持久化、AI 工作区上下文注入、AI 辅助创作增强已在 v1.3.0 完成；美术丰富指南已在 v1.4.0 完成）

**本文档是 v1.3.0 的唯一实施参考。** 请通读全文后再动手。

---

## 目录

- [一、核心省钱策略：DeepSeek V4 KV 缓存](#一核心省钱策略deepseek-v4-kv-缓存)
- [二、后端实施：对话持久化 + KV 缓存架构](#二后端实施对话持久化--kv-缓存架构)
- [三、前端实施：AI 面板改造](#三前端实施ai-面板改造)
- [四、美术丰富指南](#四美术丰富指南)
- [五、文件变更清单](#五文件变更清单)

---

## 一、核心省钱策略：DeepSeek V4 KV 缓存

### 1.1 原理

DeepSeek V4 内置**自动前缀缓存**（Context Caching），无需额外 API 参数：
- 每次请求时，系统自动检查新 prompt 与历史请求的**前缀重叠**部分
- 重叠部分从磁盘缓存读取 KV，不重新计算
- **缓存命中** vs **缓存未命中**的价格差距巨大

### 1.2 价格对比（2026-06 官方数据）

| 模型 | 缓存未命中 (输入) | 缓存命中 (输入) | 输出 | **命中折扣** |
|------|:---:|:---:|:---:|:---:|
| DeepSeek V4 Flash | ¥1.00/M tokens | ¥0.02/M tokens | ¥2.00/M tokens | **约 2%** |
| DeepSeek V4 Pro | ¥3.15/M tokens | ¥0.026/M tokens | ¥6.30/M tokens | **约 0.8%** |

> 来源：[DeepSeek Context Caching 文档](https://api-docs.deepseek.com/guides/kv_cache) · [DeepSeek 定价页](https://api-docs.deepseek.com/quick_start/pricing)

**结论：缓存命中时，输入成本几乎为零。** 这就是省钱的核心杠杆。

### 1.3 缓存命中的铁律

**前缀必须逐字节完全一致。** 一个字符不同，整段缓存就失效。

```
请求 A：[系统提示词(2000 tokens)][工作区上下文(3000 tokens)][用户消息1][AI回复1][用户消息2]
请求 B：[系统提示词(2000 tokens)][工作区上下文(3000 tokens)][用户消息1][AI回复1][用户消息3]
                    ↑ 这 5000 tokens 完全一致 → 命中缓存 ↑
```

### 1.4 在 Storyloom 中的具体应用

**核心架构决策：三段式消息结构（必须严格遵守）**

```
messages = [
  // ─── 第 1 段：固定系统提示词（永远不变）───
  {
    role: 'system',
    content: STORYLOOM_SYSTEM_PROMPT  // 固定不变的角色定义 + 能力说明
  },

  // ─── 第 2 段：工作区上下文（同一工作区内不变）───
  {
    role: 'system',
    content: workspaceContext  // 从 /api/ai/workspace-context 生成
  },

  // ─── 第 3 段：对话历史 + 当前消息（每次变化）───
  ...conversationHistory,
  { role: 'user', content: currentMessage }
]
```

**为什么这样设计：**
- 第 1 段在所有请求、所有工作区中完全一致 → 全局缓存命中
- 第 2 段在同一工作区的所有请求中完全一致 → 工作区级缓存命中
- 第 3 段每次不同，但不影响前缀缓存

**禁止做的事（会导致缓存失效）：**

```
❌ 把系统提示词和工作区上下文合并为一个 system message（更新上下文时会改变前缀位置）
❌ 在系统提示词中插入时间戳、随机数、会话 ID
❌ 每次请求时重新生成工作区上下文（即使内容相同，生成顺序或格式微差也会破坏缓存）
❌ 在 system message 之间插入 user/assistant message
```

### 1.5 缓存命中率优化清单

| 做法 | 效果 | 实现方式 |
|------|------|----------|
| 系统提示词固定不变 | 全局缓存命中 | 硬编码常量，不拼接任何动态内容 |
| 工作区上下文缓存到后端内存 | 同一工作区缓存命中 | `Map<workspaceId, { context: string, updatedAt: number }>` |
| 工作区数据变化时才重新生成上下文 | 避免无意义重新生成 | 监听事件/角色/伏笔的 CRUD，设 `dirty` 标记 |
| 对话历史追加而非替换 | 保持前缀一致 | 只 append 新消息，不修改已有消息 |
| 上下文超长时压缩旧对话为摘要 | 保持前缀一致 + 控制 token 数 | 在摘要中固定格式，不引入随机内容 |

### 1.6 缓存命中率监控

DeepSeek API 响应中包含缓存统计字段：

```json
{
  "usage": {
    "prompt_tokens": 5000,
    "prompt_cache_hit_tokens": 4800,    // ← 缓存命中 tokens
    "prompt_cache_miss_tokens": 200,    // ← 缓存未命中 tokens
    "completion_tokens": 500
  }
}
```

**实施要求：** 后端必须记录并返回这两个字段，前端在 AI 面板底部显示缓存命中率（如「缓存命中 96%」），帮助开发者验证缓存策略是否生效。

---

## 二、后端实施：对话持久化 + KV 缓存架构

### 2.1 当前架构概览

```
前端 AIPanel.tsx
  ↓ POST /api/ai/chat { messages, stream: true }
后端 server/routes/ai.ts
  ↓ 转发
server/services/ai-proxy.ts → DeepSeek / SiliconFlow / OpenAI ...
```

**当前问题：**
1. 对话历史存在前端 `localStorage`，重装或换设备就丢失
2. `ai_conversations` / `ai_cache` 数据库表已创建但没有 CRUD 路由
3. `/api/ai/workspace-context` 已实现但前端未调用
4. 没有 KV 缓存优化（每次请求都重新生成完整 messages 数组）

### 2.2 目标架构

```
前端 AIPanel.tsx
  ├─ GET  /api/workspaces/:wsId/ai-conversations → 对话列表
  ├─ POST /api/workspaces/:wsId/ai-conversations → 新建对话
  ├─ POST /api/workspaces/:wsId/ai-conversations/:id/messages → 追加消息
  ├─ DELETE /api/workspaces/:wsId/ai-conversations/:id → 删除对话
  ├─ POST /api/ai/chat { messages, stream: true } → 对话（带 KV 缓存）
  └─ POST /api/ai/workspace-context { workspaceId } → 获取工作区上下文

后端 server/routes/ai.ts
  ├─ 工作区上下文缓存层（内存 Map + TTL）
  ├─ 消息组装器（三段式结构）
  └─ ai-proxy.ts → DeepSeek / ... （记录 cache_hit_tokens）

数据库
  ├─ ai_conversations 表 → 对话元数据 + 消息 JSON
  └─ ai_cache 表 → 常用查询缓存（可选，v2 再做）
```

### 2.3 步骤一：后端 CRUD 路由

在 `server/routes/ai.ts` 中新增以下路由：

```
GET  /api/workspaces/:workspaceId/ai-conversations
  → 返回该工作区所有对话列表（按 updatedAt DESC）
  → 响应：{ success: true, data: AIConversation[] }

POST /api/workspaces/:workspaceId/ai-conversations
  → 新建对话，body: { title?: string }
  → 默认 title: "新对话"
  → 响应：{ success: true, data: AIConversation }

GET  /api/workspaces/:workspaceId/ai-conversations/:conversationId
  → 获取单个对话详情（含所有消息）
  → 响应：{ success: true, data: AIConversation }

POST /api/workspaces/:workspaceId/ai-conversations/:conversationId/messages
  → 追加消息到对话，body: { role, content }
  → 同时更新对话的 updatedAt
  → 响应：{ success: true, data: AIChatMessage }

PATCH /api/workspaces/:workspaceId/ai-conversations/:conversationId
  → 更新对话元数据，body: { title?, summary? }
  → 响应：{ success: true, data: AIConversation }

DELETE /api/workspaces/:workspaceId/ai-conversations/:conversationId
  → 删除对话（级联删除消息）
  → 响应：{ success: true, data: { id } }
```

**数据库操作参考（schema 已存在）：**

```typescript
// server/db/schema.ts 中已有的表定义：
aiConversations = sqliteTable('ai_conversations', {
  id: text('id').primaryKey(),        // UUID
  workspaceId: text('workspace_id'),  // 关联工作区
  title: text('title'),               // 对话标题
  messagesJson: text('messages_json'),// JSON 数组存储所有消息
  summary: text('summary'),           // 对话摘要（可选）
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});
```

**注意：`messagesJson` 是一个 JSON 字符串，存储完整消息数组。** 每次追加消息时：
1. 读取现有 `messagesJson`
2. JSON.parse 后 append 新消息
3. JSON.stringify 后写回

这是因为 SQLite 不支持原生 JSON 数组操作，但对话消息通常不超过几千条，性能可以接受。

### 2.4 步骤二：工作区上下文缓存层

在 `server/services/` 下新建 `workspace-context-cache.ts`：

```typescript
// 核心数据结构
interface CachedContext {
  context: string;      // 格式化后的上下文文本
  hash: string;         // 内容 SHA-256 哈希（用于变更检测）
  generatedAt: number;  // 生成时间戳
}

const cache = new Map<string, CachedContext>();
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟 TTL

export function getOrGenerateContext(workspaceId: string): string {
  const cached = cache.get(workspaceId);
  if (cached && Date.now() - cached.generatedAt < CACHE_TTL) {
    return cached.context;  // ← 缓存命中，返回完全相同的字符串
  }
  // 缓存未命中或过期，重新生成
  const context = generateWorkspaceContext(workspaceId);
  cache.set(workspaceId, {
    context,
    hash: sha256(context),
    generatedAt: Date.now(),
  });
  return context;
}

// 当工作区数据变化时，使缓存失效
export function invalidateContext(workspaceId: string): void {
  cache.delete(workspaceId);
}
```

**调用 `invalidateContext` 的时机：**
- 事件 CRUD（`server/routes/events.ts`）
- 角色 CRUD（`server/routes/characters.ts`）
- 伏笔 CRUD（`server/routes/foreshadowings.ts`）
- 世界观设定 CRUD（`server/routes/world-settings.ts`）
- 轨道 CRUD（`server/routes/tracks.ts`）

**在每个 CRUD 路由的成功回调中添加一行：**
```typescript
invalidateContext(workspaceId);
```

### 2.5 步骤三：工作区上下文格式化（关键！）

上下文文本的格式必须**稳定、确定、无随机性**。以下是推荐模板：

```typescript
function generateWorkspaceContext(workspaceId: string): string {
  const db = getDb();
  // ... 查询所有数据（复用已有的 /workspace-context 逻辑）

  return [
    `# 故事工作区：${workspace.name}`,
    workspace.description ? `简介：${workspace.description}` : '',
    '',
    `## 时间线（${events.length} 个事件）`,
    ...tracks.map(track => {
      const trackEvents = events.filter(e => e.trackId === track.id);
      return [
        `### 轨道：${track.name}`,
        ...trackEvents.map(e =>
          `- [${e.startTime || '?'}→${e.endTime || '?'}] ${e.title}${e.summary ? '：' + e.summary : ''}`
        ),
      ].join('\n');
    }),
    '',
    `## 角色（${characters.length} 个）`,
    ...characters.map(c =>
      `- ${c.name}（${c.role || '未设定角色'}）${c.description ? '：' + c.description.slice(0, 100) : ''}`
    ),
    '',
    `## 伏笔（${foreshadowings.length} 个）`,
    ...foreshadowings.map(f =>
      `- [${f.status}] ${f.title}${f.description ? '：' + f.description.slice(0, 100) : ''}`
    ),
    '',
    `## 世界观设定（${worldSettings.length} 条）`,
    ...worldSettings.map(w =>
      `- [${w.category}] ${w.key}：${(w.value || '').slice(0, 100)}`
    ),
  ].filter(Boolean).join('\n');
}
```

**关键约束：**
- 事件按 `orderIndex` 排序（不按 UUID，UUID 在不同设备间不同）
- 角色按 `name` 排序
- 伏笔按 `title` 排序
- 不使用 `new Date().toISOString()`（时间戳每次都不同，会破坏缓存）
- 不使用 `Math.random()` 或任何随机元素
- 截断长度固定（如 `.slice(0, 100)`，不要用 `.slice(0, Math.min(...))` 这种动态长度）

### 2.6 步骤四：三段式消息组装器

在 `server/services/ai-proxy.ts` 中修改 `chatCompletion` 和 `chatCompletionStream`：

```typescript
// 固定的系统提示词（硬编码，永远不变）
const STORYLOOM_SYSTEM_PROMPT = `你是 Storyloom（絮织）的 AI 创作助手。
你擅长：故事续写、角色对话生成、伏笔设计、世界观构建、情节分析。
你的用户正在使用 Storyloom 桌面工作台创作故事。
请用中文回复，语气温暖专业，像一个资深编剧搭子。
回复使用 Markdown 格式。`;

// 消息组装函数
export function assembleMessages(
  workspaceContext: string,
  conversationMessages: AIChatMessage[],
  currentUserMessage: string,
): Array<{ role: string; content: string }> {
  return [
    // 第 1 段：固定系统提示词
    { role: 'system', content: STORYLOOM_SYSTEM_PROMPT },

    // 第 2 段：工作区上下文（同一工作区内不变）
    { role: 'system', content: workspaceContext },

    // 第 3 段：对话历史 + 当前消息
    ...conversationMessages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: currentUserMessage },
  ];
}
```

### 2.7 步骤五：缓存命中率记录

修改 `ai-proxy.ts` 的响应处理，提取并记录缓存统计：

```typescript
// 在 chatCompletion 和 chatCompletionStream 中
const data = await response.json();
const usage = data.usage;

if (usage) {
  aiLog.info({
    cacheHitTokens: usage.prompt_cache_hit_tokens || 0,
    cacheMissTokens: usage.prompt_cache_miss_tokens || 0,
    totalPromptTokens: usage.prompt_tokens,
    hitRate: usage.prompt_tokens > 0
      ? ((usage.prompt_cache_hit_tokens || 0) / usage.prompt_tokens * 100).toFixed(1) + '%'
      : 'N/A',
  }, 'KV cache statistics');
}
```

**将缓存统计返回给前端：** 在 SSE 流的 `[DONE]` 之前发送：

```typescript
reply.raw.write(`data: ${JSON.stringify({
  usage: {
    promptCacheHitTokens: usage.prompt_cache_hit_tokens || 0,
    promptCacheMissTokens: usage.prompt_cache_miss_tokens || 0,
    totalPromptTokens: usage.prompt_tokens,
  }
})}\n\n`);
```

---

## 三、前端实施：AI 面板改造

### 3.1 当前前端架构（你需要修改的文件）

| 文件 | 当前状态 | 改造方向 |
|------|----------|----------|
| `src/components/ai-panel/AIPanel.tsx` | 主协调器，消息状态在内存中 | 改为调用后端 CRUD API |
| `src/components/ai-panel/useAIConversations.ts` | 自定义 hook，localStorage 持久化 | 改为 React Query hooks，调后端 API |
| `src/services/ai-stream.ts` | SSE 流式请求 | 保持不变，增加 usage 统计解析 |
| `src/components/ai-panel/AIConversationList.tsx` | 展示型组件 | 保持不变 |
| `src/components/ai-panel/AIInput.tsx` | 展示型组件 | 保持不变 |
| `src/components/ai-panel/AIMessage.tsx` | Markdown 渲染 | 保持不变 |
| `src/components/ai-panel/AIConfigPanel.tsx` | 配置对话框 | 保持不变 |
| `src/lib/ai-config.ts` | localStorage 配置 | 保持不变 |

### 3.2 改造步骤

#### 3.2.1 新建 API hooks（替换 useAIConversations.ts）

```typescript
// src/services/ai-conversation-hooks.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';

interface AIConversation {
  id: string;
  workspaceId: string;
  title: string;
  messagesJson: string;  // JSON 数组
  summary: string;
  createdAt: number;
  updatedAt: number;
}

interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  degraded?: boolean;
  error?: string;
}

// 对话列表
export function useAIConversations(workspaceId: string | null) {
  return useQuery({
    queryKey: ['ai-conversations', workspaceId],
    queryFn: () => api.get<AIConversation[]>(
      `/api/workspaces/${workspaceId}/ai-conversations`
    ),
    enabled: !!workspaceId,
  });
}

// 单个对话详情
export function useAIConversation(workspaceId: string | null, conversationId: string | null) {
  return useQuery({
    queryKey: ['ai-conversations', workspaceId, conversationId],
    queryFn: () => api.get<AIConversation>(
      `/api/workspaces/${workspaceId}/ai-conversations/${conversationId}`
    ),
    enabled: !!workspaceId && !!conversationId,
  });
}

// 新建对话
export function useCreateAIConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, title }: { workspaceId: string; title?: string }) =>
      api.post<AIConversation>(
        `/api/workspaces/${workspaceId}/ai-conversations`,
        { title }
      ),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['ai-conversations', vars.workspaceId] }),
  });
}

// 追加消息
export function useAddAIMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, conversationId, message }: {
      workspaceId: string;
      conversationId: string;
      message: { role: string; content: string };
    }) => api.post<AIChatMessage>(
      `/api/workspaces/${workspaceId}/ai-conversations/${conversationId}/messages`,
      message
    ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ai-conversations', vars.workspaceId] });
      qc.invalidateQueries({ queryKey: ['ai-conversations', vars.workspaceId, vars.conversationId] });
    },
  });
}

// 删除对话
export function useDeleteAIConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, conversationId }: { workspaceId: string; conversationId: string }) =>
      api.delete(`/api/workspaces/${workspaceId}/ai-conversations/${conversationId}`),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['ai-conversations', vars.workspaceId] }),
  });
}
```

#### 3.2.2 修改 AIPanel.tsx 的消息发送逻辑

**核心变化：** 发送消息时，先通过后端获取工作区上下文，再用三段式结构组装 messages。

```typescript
// 在 AIPanel.tsx 的 handleSend 中：

async function handleSend() {
  const userMessage = input.trim();
  if (!userMessage || isStreaming) return;

  // 1. 获取工作区上下文（后端有缓存，同一工作区多次调用返回完全相同的字符串）
  const contextResponse = await api.post<{ context: string }>(
    '/api/ai/workspace-context',
    { workspaceId }
  );
  const workspaceContext = contextResponse.context;

  // 2. 获取固定的系统提示词（可以从后端获取或前端硬编码）
  const systemPrompt = STORYLOOM_SYSTEM_PROMPT;

  // 3. 组装三段式消息
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: workspaceContext },
    ...conversationMessages.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  // 4. 先保存用户消息到数据库
  await addMessage({ workspaceId, conversationId, message: { role: 'user', content: userMessage } });

  // 5. 发送流式请求
  const abortController = streamAIChat(messages, {
    onChunk: (chunk) => { /* ... */ },
    onDone: async () => {
      // 6. 流完成后保存 AI 回复到数据库
      await addMessage({ workspaceId, conversationId, message: { role: 'assistant', content: fullResponse } });
    },
  });
}
```

**关键：`STORYLOOM_SYSTEM_PROMPT` 必须是前端硬编码的常量字符串。** 不要从后端动态获取，不要拼接时间戳。

```typescript
// src/lib/ai-system-prompt.ts
export const STORYLOOM_SYSTEM_PROMPT = `你是 Storyloom（絮织）的 AI 创作助手。
你擅长：故事续写、角色对话生成、伏笔设计、世界观构建、情节分析。
你的用户正在使用 Storyloom 桌面工作台创作故事。
请用中文回复，语气温暖专业，像一个资深编剧搭子。
回复使用 Markdown 格式。`;
```

#### 3.2.3 改造 compressHistory（历史压缩）

当前的 `compressHistory` 在客户端做，会破坏前缀缓存。改为：

```typescript
// 保留完整的系统提示词 + 工作区上下文（前两段永远不变）
// 只压缩第三段（对话历史）
function compressHistory(
  systemPrompt: string,
  workspaceContext: string,
  messages: AIChatMessage[],
  maxHistoryChars = 4000,
): Array<{ role: string; content: string }> {
  const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);

  if (totalChars <= maxHistoryChars) {
    // 不需要压缩，直接返回
    return [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: workspaceContext },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];
  }

  // 压缩：保留最近 3 条完整消息 + 更早消息的摘要
  const recentMessages = messages.slice(-3);
  const olderMessages = messages.slice(0, -3);

  const summary = olderMessages.map(m =>
    `[${m.role === 'user' ? '用户' : 'AI'}] ${m.content.slice(0, 80)}...`
  ).join('\n');

  return [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: workspaceContext },
    { role: 'system', content: `以下是之前的对话摘要：\n${summary}` },
    ...recentMessages.map(m => ({ role: m.role, content: m.content })),
  ];
}
```

**关键：摘要消息的格式必须固定。** 不要用 `new Date()` 或随机 ID，截断长度固定（如 80 字符），格式字符串硬编码。

#### 3.2.4 显示缓存命中率

在 AI 面板底部（StatusBar 或 AIPanel footer）添加缓存统计显示：

```tsx
// 在 AIPanel.tsx 中，stream 完成后解析 usage 数据
const [cacheStats, setCacheStats] = useState<{ hit: number; miss: number } | null>(null);

// 在 onDone 回调中：
onUsage: (usage) => {
  setCacheStats({
    hit: usage.promptCacheHitTokens,
    miss: usage.promptCacheMissTokens,
  });
}

// 在面板底部渲染：
{cacheStats && (
  <div className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
    <span>缓存命中</span>
    <span className="text-green-600 font-mono">
      {((cacheStats.hit / (cacheStats.hit + cacheStats.miss)) * 100).toFixed(0)}%
    </span>
    <span className="text-muted-foreground/30">
      ({cacheStats.hit} / {cacheStats.hit + cacheStats.miss} tokens)
    </span>
  </div>
)}
```

---

## 四、美术丰富指南

### 4.1 AI 面板视觉升级

当前 AI 面板是一个朴素的消息列表 + 输入框。需要升级为更有"创作工作台"感觉的界面。

#### 4.1.1 消息气泡增强

当前 `AIMessage.tsx` 使用简单的 div 渲染。改造方向：

```tsx
// 用户消息 — 右对齐，主题色背景
<div className="flex justify-end mb-3">
  <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5
                  bg-primary/10 text-foreground border border-primary/20">
    {content}
  </div>
</div>

// AI 消息 — 左对齐，卡片风格，带 AI 头像图标
<div className="flex gap-2 mb-3">
  <div className="shrink-0 w-7 h-7 rounded-full bg-primary/15 flex items-center
                  justify-center text-primary text-xs font-bold">
    AI
  </div>
  <div className="flex-1 max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-2.5
                  bg-card border border-border/50 shadow-sm">
    <ReactMarkdown>{content}</ReactMarkdown>
  </div>
</div>
```

#### 4.1.2 打字指示器（替代当前的 "thinking" 动画）

```tsx
// AI 正在思考的动画 — 三个脉冲点
function TypingIndicator() {
  return (
    <div className="flex gap-2 mb-3">
      <div className="shrink-0 w-7 h-7 rounded-full bg-primary/15 flex items-center
                      justify-center text-primary text-xs font-bold animate-pulse">
        AI
      </div>
      <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-tl-sm
                      bg-card border border-border/50">
        <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
              style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
              style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
              style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
```

#### 4.1.3 对话列表侧边栏视觉

当前 `AIConversationList.tsx` 是一个简单列表。改造为带搜索 + 分组的侧边栏：

```tsx
<div className="w-56 border-r border-border/50 bg-card/50 flex flex-col h-full">
  {/* 搜索框 */}
  <div className="p-2 border-b border-border/30">
    <TInput size="small" placeholder="搜索对话..." />
  </div>

  {/* 对话列表 — 使用 stagger-list 动画 */}
  <div className="flex-1 overflow-auto p-1.5 stagger-list">
    {conversations.map((conv) => (
      <button
        key={conv.id}
        className={cn(
          'w-full text-left px-3 py-2 rounded-lg text-sm transition-all mb-1',
          isActive(conv.id)
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'hover:bg-muted/50 text-foreground/80 border border-transparent'
        )}
      >
        <div className="font-medium truncate">{conv.title}</div>
        <div className="text-[10px] text-muted-foreground/50 mt-0.5">
          {formatRelativeTime(conv.updatedAt)}
        </div>
      </button>
    ))}
  </div>

  {/* 新建对话按钮 */}
  <div className="p-2 border-t border-border/30">
    <TButton variant="outline" size="small" className="w-full" onClick={onCreate}>
      <PlusIcon size={14} /> 新建对话
    </TButton>
  </div>
</div>
```

#### 4.1.4 输入区域增强

```tsx
// AIInput.tsx 改造 — 更丰富的输入区域
<div className="border-t border-border/50 p-3 bg-card/30">
  {/* 上下文提示条 */}
  {selectedEvent && (
    <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-md
                    bg-primary/5 border border-primary/10 text-[10px]">
      <EventIcon size={10} className="text-primary" />
      <span className="text-muted-foreground">当前事件：</span>
      <span className="text-foreground font-medium truncate">{selectedEvent.title}</span>
    </div>
  )}

  {/* 输入框 */}
  <div className="flex gap-2 items-end">
    <textarea
      className="flex-1 resize-none rounded-xl border border-border/60 bg-background/50
                 px-3 py-2.5 text-sm focus:border-primary/50 focus:ring-2
                 focus:ring-primary/10 transition-all min-h-[44px] max-h-[120px]"
      placeholder="描述你想创作的内容..."
      rows={1}
    />
    <button
      className="shrink-0 w-10 h-10 rounded-xl bg-primary text-primary-foreground
                 flex items-center justify-center hover:bg-primary/90
                 active:scale-95 transition-all shadow-sm"
    >
      {isStreaming ? <StopIcon size={16} /> : <SendIcon size={16} />}
    </button>
  </div>

  {/* 底部状态栏 */}
  <div className="flex justify-between items-center mt-1.5 px-1">
    <span className="text-[10px] text-muted-foreground/40">
      {modelInfo ? `${modelInfo.provider} · ${modelInfo.model}` : '未配置模型'}
    </span>
    {cacheStats && (
      <span className="text-[10px] text-green-600/70">
        缓存 {((cacheStats.hit / (cacheStats.hit + cacheStats.miss)) * 100).toFixed(0)}%
      </span>
    )}
  </div>
</div>
```

### 4.2 全局美术增强方向

以下是不涉及 AI 面板的通用美术改进，可在 v1.5.0 中实施：

#### 4.2.1 事件卡片信息密度提升

当前事件卡片只显示标题和简短摘要。增加：
- 关联角色头像缩略图（小圆圈，最多显示 3 个 + "+2"）
- 伏笔状态指示器（小色点：绿=已埋下、黄=发展中、蓝=已回收）
- 关联线数量 badge

#### 4.2.2 时间轴 ruler 精致化

- 刻度线使用渐变色（从深到浅）
- 当前时间指示器加脉冲动画
- 缩放时用 CSS transition 平滑过渡（而非跳变）

#### 4.2.3 面板切换动画编排

使用 `index.css` 中已有的 `.panel-enter` / `.panel-exit` 类，在 `ContextPanel` 切换时添加过渡：

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={activePanel}
    initial={{ opacity: 0, x: 16 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -16 }}
    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    className="h-full w-full"
  >
    {renderPanel()}
  </motion.div>
</AnimatePresence>
```

#### 4.2.4 主题切换增强

当前主题切换使用 View Transitions API（已有代码），但可以增加：
- 切换时的色彩扩散动画（从点击位置向外扩散）
- 新主题加载时的 stagger 动画（组件逐个淡入）

---

## 五、文件变更清单

### 新增文件

| 路径 | 说明 |
|------|------|
| `server/services/workspace-context-cache.ts` | 工作区上下文缓存层 |
| `server/routes/ai-conversations.ts` | AI 对话 CRUD 路由 |
| `src/services/ai-conversation-hooks.ts` | React Query hooks（替代 useAIConversations） |
| `src/lib/ai-system-prompt.ts` | 固定系统提示词常量 |

### 修改文件

| 路径 | 改动说明 |
|------|----------|
| `server/routes/ai.ts` | 导入新路由、注册 ai-conversations 子路由 |
| `server/services/ai-proxy.ts` | 添加 assembleMessages、缓存统计记录 |
| `server/routes/events.ts` | CRUD 成功后调用 `invalidateContext(workspaceId)` |
| `server/routes/characters.ts` | 同上 |
| `server/routes/foreshadowings.ts` | 同上 |
| `server/routes/world-settings.ts` | 同上 |
| `server/routes/tracks.ts` | 同上 |
| `server/index.ts` | 注册 ai-conversations 路由 |
| `src/components/ai-panel/AIPanel.tsx` | 改用后端 API、三段式消息组装、缓存统计显示 |
| `src/components/ai-panel/AIMessage.tsx` | 消息气泡视觉升级 |
| `src/components/ai-panel/AIInput.tsx` | 输入区域增强、上下文提示条 |
| `src/components/ai-panel/AIConversationList.tsx` | 侧边栏视觉升级 |
| `src/services/ai-stream.ts` | 解析 usage 统计字段 |
| `shared/types.ts` | 添加 AIConversation / AIChatMessage 类型定义 |

### 删除文件

| 路径 | 说明 |
|------|------|
| `src/components/ai-panel/useAIConversations.ts` | 被 `ai-conversation-hooks.ts` 替代 |

---

## 附：验证 KV 缓存是否生效

### 测试步骤

1. 启动开发模式：`npm run dev`
2. 打开 AI 面板，选择一个工作区
3. 发送第一条消息 → 观察后端日志中的 `cache_hit_tokens` 和 `cache_miss_tokens`
4. 发送第二条消息 → `cache_hit_tokens` 应该 > 0（系统提示词 + 工作区上下文被缓存）
5. 切换到另一个工作区 → `cache_hit_tokens` 应该为 0（新工作区的上下文不同）
6. 切回第一个工作区 → `cache_hit_tokens` 应该 > 0（第一个工作区的缓存仍在）

### 预期缓存命中率

| 场景 | 预期命中率 |
|------|:---:|
| 同一工作区连续对话 | 85-95% |
| 首次打开工作区 | 0%（冷启动） |
| 切换工作区后回来 | 70-90%（取决于 TTL） |
| 修改事件/角色后 | 0%（缓存被 invalidate，下次重建） |

---

*本文档是 v1.3.0 AI 深度集成的完整实施蓝图。严格按此实施，可确保 KV 缓存命中率最大化、对话持久化可靠、前端体验流畅。*
