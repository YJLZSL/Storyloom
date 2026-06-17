export interface AIConfig {
  provider: 'siliconflow' | 'openai' | 'deepseek' | 'kimi' | 'minimax' | 'glm' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
}

const STORAGE_KEY = 'ai-config';

export function getAIConfig(): AIConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAIConfig(config: AIConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function hasAIConfig(): boolean {
  return !!getAIConfig()?.apiKey;
}
