import type { AIChatRequest } from '../../shared/types.js';

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const isElectron = typeof window !== 'undefined' && (window as unknown as { electronAPI?: unknown }).electronAPI;
const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE
  || (isElectron ? 'http://localhost:3001' : '');

export interface StreamAIChatOptions {
  messages: AIChatMessage[];
  signal?: AbortSignal;
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
  onDegraded?: (error: string) => void;
}

/** 调用后端代理 `/api/ai/chat?stream=true`，读取 SSE 流 */
export function streamAIChat(options: StreamAIChatOptions): AbortController {
  const { messages, signal, onChunk, onDone, onError, onDegraded } = options;
  const abortController = new AbortController();

  // 联动外部 signal
  if (signal) {
    if (signal.aborted) abortController.abort();
    else signal.addEventListener('abort', () => abortController.abort(), { once: true });
  }

  const requestBody: AIChatRequest = {
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
  };

  fetch(`${API_BASE}/api/ai/chat?stream=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: abortController.signal,
  }).then(async (response) => {
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { error?: { message?: string }; message?: string };
      throw new Error(data.error?.message || data.message || `AI 请求失败 (${response.status})`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('无法读取响应流');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') {
          onDone();
          return;
        }
        try {
          const data = JSON.parse(dataStr) as {
            content?: string;
            degraded?: boolean;
            error?: string;
          };
          if (data.degraded) {
            onDegraded?.(data.error || '未知错误');
            continue;
          }
          if (data.error) {
            onError(new Error(data.error));
            return;
          }
          if (data.content) onChunk(data.content);
        } catch {
          // 忽略解析错误
        }
      }
    }
    onDone();
  }).catch((err) => {
    if (err.name !== 'AbortError') {
      onError(err);
    }
  });

  return abortController;
}
