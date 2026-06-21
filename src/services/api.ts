import { isTauri, getServerPort } from '@/lib/tauri-api';

const envApiBase = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE;
let API_BASE = envApiBase || '';

// Tauri 环境下动态获取服务器端口
if (isTauri() && !API_BASE) {
  getServerPort()
    .then((port) => {
      API_BASE = `http://localhost:${port}`;
    })
    .catch(() => {
      API_BASE = 'http://localhost:3001';
    });
}

export function setApiBase(port: number): void {
  API_BASE = `http://localhost:${port}`;
}

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
  };

  if (body !== undefined) {
    options.headers = {
      'Content-Type': 'application/json',
    };
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
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
