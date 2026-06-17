import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { type AIConfig, getAIConfig, setAIConfig } from '@/lib/ai-config.js';

interface AIConfigPanelProps {
  open: boolean;
  onClose: () => void;
}

const PROVIDER_OPTIONS = [
  { value: 'deepseek' as const, label: 'DeepSeek', badge: '免费' },
  { value: 'kimi' as const, label: 'Kimi (Moonshot)' },
  { value: 'glm' as const, label: '智谱 GLM', badge: '免费' },
  { value: 'minimax' as const, label: 'MiniMax' },
  { value: 'siliconflow' as const, label: 'SiliconFlow' },
  { value: 'openai' as const, label: 'OpenAI' },
  { value: 'custom' as const, label: '自定义' },
];

const PROVIDER_MODELS: Record<string, string[]> = {
  deepseek: [
    'deepseek-v4-flash (免费)',
    'deepseek-v4-pro',
  ],
  kimi: [
    'kimi-k2.6',
    'moonshot-v1-128k',
    'moonshot-v1-32k',
    'moonshot-v1-8k',
  ],
  glm: [
    'glm-4-flash (免费)',
    'glm-4-plus',
    'glm-4-long',
    'glm-4-air',
  ],
  minimax: [
    'MiniMax-M3',
    'MiniMax-Text-01',
  ],
  siliconflow: [
    'deepseek-ai/DeepSeek-V3',
    'Qwen/Qwen2.5-72B-Instruct',
    'THUDM/glm-4-9b-chat',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-3.5-turbo',
  ],
  custom: [],
};

const DEFAULT_BASE_URLS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com',
  kimi: 'https://api.moonshot.cn/v1',
  glm: 'https://open.bigmodel.cn/api/paas/v4/',
  minimax: 'https://api.minimax.io/v1',
  siliconflow: 'https://api.siliconflow.cn/v1',
  openai: 'https://api.openai.com/v1',
  custom: '',
};

export function AIConfigPanel({ open, onClose }: AIConfigPanelProps) {
  const [provider, setProvider] = useState<AIConfig['provider']>('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (open) {
      const saved = getAIConfig();
      if (saved) {
        setProvider(saved.provider);
        setApiKey(saved.apiKey);
        setBaseUrl(saved.baseUrl);
        setModel(saved.model);
      } else {
        setProvider('deepseek');
        setApiKey('');
        setBaseUrl(DEFAULT_BASE_URLS.deepseek);
        setModel(PROVIDER_MODELS.deepseek[0]);
      }
      setShowKey(false);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleProviderChange = (newProvider: AIConfig['provider']) => {
    setProvider(newProvider);
    if (newProvider !== 'custom') {
      setBaseUrl(DEFAULT_BASE_URLS[newProvider]);
      setModel(PROVIDER_MODELS[newProvider][0]);
    } else {
      setBaseUrl('');
      setModel('');
    }
  };

  const handleSave = () => {
    setAIConfig({ provider, apiKey, baseUrl, model });
    onClose();
  };

  const models = PROVIDER_MODELS[provider];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-md mx-4 overflow-hidden shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold font-serif">AI 配置</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Provider */}
          <div>
            <label className="text-xs text-muted-foreground font-sans mb-1 block">提供商</label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as AIConfig['provider'])}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            >
              {PROVIDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}{opt.badge ? ` [${opt.badge}]` : ''}
                </option>
              ))}
            </select>
            {PROVIDER_OPTIONS.find((o) => o.value === provider)?.badge && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {PROVIDER_OPTIONS.find((o) => o.value === provider)!.badge}
              </span>
            )}
          </div>

          {/* API Key */}
          <div>
            <label className="text-xs text-muted-foreground font-sans mb-1 block">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入 API Key"
                className="w-full px-3 py-2 pr-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-accent transition-colors text-muted-foreground"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Base URL (only for custom) */}
          {provider === 'custom' && (
            <div>
              <label className="text-xs text-muted-foreground font-sans mb-1 block">Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>
          )}

          {/* Model */}
          <div>
            <label className="text-xs text-muted-foreground font-sans mb-1 block">模型</label>
            {provider === 'custom' ? (
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="输入模型名称"
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            ) : (
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              >
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-md border border-border text-sm hover:bg-accent transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="flex-1 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
