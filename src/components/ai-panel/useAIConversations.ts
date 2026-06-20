import { useCallback, useEffect, useState } from 'react';
import { safeJsonArray } from '@/lib/utils';

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  degraded?: boolean;
  error?: string;
}

export interface AIConversation {
  id: string;
  title: string;
  workspaceId: string;
  messages: AIChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'ai-conversations';

function loadConversations(): AIConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return safeJsonArray<AIConversation>(raw, []);
  } catch {
    return [];
  }
}

function saveConversations(conversations: AIConversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    // 忽略写入错误（如配额超限）
  }
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 对话管理 hook：localStorage 持久化，按工作区过滤 */
export function useAIConversations(workspaceId: string | null) {
  const [allConversations, setAllConversations] = useState<AIConversation[]>(() => loadConversations());
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // 持久化
  useEffect(() => {
    saveConversations(allConversations);
  }, [allConversations]);

  // 当前工作区的对话
  const conversations = workspaceId
    ? allConversations.filter((c) => c.workspaceId === workspaceId)
    : [];

  // 切换工作区时，自动选中该工作区的第一条对话（或清空）
  useEffect(() => {
    if (!workspaceId) {
      setCurrentConversationId(null);
      return;
    }
    const wsConvs = allConversations.filter((c) => c.workspaceId === workspaceId);
    if (wsConvs.length === 0) {
      setCurrentConversationId(null);
      return;
    }
    // 若当前选中的对话不属于此工作区，则切换到最新的对话
    const currentBelongs = wsConvs.some((c) => c.id === currentConversationId);
    if (!currentBelongs) {
      setCurrentConversationId(wsConvs[wsConvs.length - 1].id);
    }
  }, [workspaceId, allConversations, currentConversationId]);

  const currentConversation =
    allConversations.find((c) => c.id === currentConversationId) || null;

  const createConversation = useCallback((): string | null => {
    if (!workspaceId) return null;
    const now = Date.now();
    const conv: AIConversation = {
      id: genId(),
      title: '新对话',
      workspaceId,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    setAllConversations((prev) => [...prev, conv]);
    setCurrentConversationId(conv.id);
    return conv.id;
  }, [workspaceId]);

  const deleteConversation = useCallback((id: string) => {
    setAllConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      return filtered;
    });
    setCurrentConversationId((curr) => {
      if (curr !== id) return curr;
      return null;
    });
  }, []);

  const switchConversation = useCallback((id: string) => {
    setCurrentConversationId(id);
  }, []);

  const addMessage = useCallback((conversationId: string, message: Omit<AIChatMessage, 'id' | 'createdAt'>): string => {
    const msgId = genId();
    const now = Date.now();
    const newMessage: AIChatMessage = { ...message, id: msgId, createdAt: now };
    setAllConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        const messages = [...c.messages, newMessage];
        // 第一条用户消息自动用前 20 字作为标题
        let title = c.title;
        if (c.title === '新对话' && message.role === 'user') {
          title = message.content.slice(0, 20) || '新对话';
        }
        return { ...c, messages, title, updatedAt: now };
      }),
    );
    return msgId;
  }, []);

  const updateMessage = useCallback((conversationId: string, messageId: string, patch: Partial<AIChatMessage>) => {
    setAllConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const removeLastMessage = useCallback((conversationId: string) => {
    setAllConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        return { ...c, messages: c.messages.slice(0, -1), updatedAt: Date.now() };
      }),
    );
  }, []);

  return {
    conversations,
    currentConversation,
    currentConversationId,
    createConversation,
    deleteConversation,
    switchConversation,
    addMessage,
    updateMessage,
    removeLastMessage,
    setCurrentConversationId,
  };
}
