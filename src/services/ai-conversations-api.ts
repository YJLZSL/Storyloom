import type { AIConversation, AIChatMessage } from '../components/ai-panel/useAIConversations.js';
import { isTauri } from '@/lib/tauri-api';

const envApiBase = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE;
const API_BASE = envApiBase || (isTauri() ? 'http://localhost:3001' : '');

/** 获取工作区的所有 AI 对话 */
export async function fetchAIConversations(workspaceId: string): Promise<AIConversation[]> {
  const res = await fetch(`${API_BASE}/api/ai/conversations?workspaceId=${encodeURIComponent(workspaceId)}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || '获取对话失败');
  }
  return data.data.map(dbToFrontend);
}

/** 获取单条对话 */
export async function fetchAIConversation(id: string): Promise<AIConversation> {
  const res = await fetch(`${API_BASE}/api/ai/conversations/${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || '获取对话失败');
  }
  return dbToFrontend(data.data);
}

/** 创建新对话 */
export async function createAIConversation(
  workspaceId: string,
  title?: string,
): Promise<AIConversation> {
  const res = await fetch(`${API_BASE}/api/ai/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId, title: title?.trim() || '新对话' }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || '创建对话失败');
  }
  return dbToFrontend(data.data);
}

/** 更新对话 */
export async function updateAIConversation(
  id: string,
  updates: { title?: string; messagesJson?: string; summary?: string },
): Promise<AIConversation> {
  const res = await fetch(`${API_BASE}/api/ai/conversations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || '更新对话失败');
  }
  return dbToFrontend(data.data);
}

/** 删除对话 */
export async function deleteAIConversation(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/ai/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || '删除对话失败');
  }
}

// ─── 数据库 ↔ 前端类型转换 ───

interface DbAIConversation {
  id: string;
  workspaceId: string;
  title: string;
  messagesJson: string;
  summary: string | null;
  createdAt: string | Date | number;
  updatedAt: string | Date | number;
}

interface DbMessage {
  id?: string;
  role?: string;
  content?: string;
  createdAt?: number;
  timestamp?: number;
  degraded?: boolean;
  error?: string;
}

function dbToFrontend(db: DbAIConversation): AIConversation {
  const messages: AIChatMessage[] = (() => {
    try {
      const parsed = JSON.parse(db.messagesJson || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.map((m: DbMessage) => ({
        id: m.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        role: m.role || 'user',
        content: m.content || '',
        createdAt: m.createdAt || m.timestamp || Date.now(),
        degraded: m.degraded || false,
        error: m.error || undefined,
      })) as AIChatMessage[];
    } catch {
      return [];
    }
  })();

  const parseDate = (v: string | Date | number): number => {
    if (typeof v === 'number') return v;
    if (v instanceof Date) return v.getTime();
    return new Date(v).getTime();
  };

  return {
    id: db.id,
    title: db.title || '新对话',
    workspaceId: db.workspaceId,
    messages,
    createdAt: parseDate(db.createdAt),
    updatedAt: parseDate(db.updatedAt),
  };
}

function messagesToJson(messages: AIChatMessage[]): string {
  return JSON.stringify(
    messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
      degraded: m.degraded,
      error: m.error,
    })),
  );
}

export { messagesToJson };
