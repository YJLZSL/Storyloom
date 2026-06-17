// Electron 环境下使用 localhost:3001，Web 环境下使用相对路径（由 Vite proxy 或 Fastify static 处理）
const isElectron = typeof window !== 'undefined' && (window as unknown as { electronAPI?: unknown }).electronAPI;
const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE
  || (isElectron ? 'http://localhost:3001' : '');

export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (response.status === 204) {
    return undefined as T;
  }

  const result = await response.json().catch(() => ({}));

  if (!result.success) {
    throw new APIError(
      result.error?.code || 'UNKNOWN_ERROR',
      result.error?.message || '请求失败',
      response.status
    );
  }

  return result.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
