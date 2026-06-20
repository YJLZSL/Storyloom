import { useState, useEffect } from 'react';
import { EyesIcon, EyesOffIcon } from '@/lib/icons';
import { TDialog, TButton, TInput, TSelect, TOption, TTag } from '@/components/ui-tdesign';
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
  const currentBadge = PROVIDER_OPTIONS.find((o) => o.value === provider)?.badge;

  return (
    <TDialog
      visible={open}
      onClose={onClose}
      header="AI 配置"
      closeOnOverlayClick={false}
      width="480px"
      footer={
        <div className="flex gap-2">
          <TButton variant="outline" size="small" onClick={onClose} className="flex-1">
            取消
          </TButton>
          <TButton
            theme="primary"
            size="small"
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="flex-1"
          >
            保存
          </TButton>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {/* Provider */}
        <div>
          <label className="text-xs text-muted-foreground font-sans mb-1 block">提供商</label>
          <div className="flex items-center gap-2">
            <TSelect
              value={provider}
              onChange={(val) => handleProviderChange(val as AIConfig['provider'])}
              className="flex-1"
            >
              {PROVIDER_OPTIONS.map((opt) => (
                <TOption key={opt.value} value={opt.value} label={`${opt.label}${opt.badge ? ` [${opt.badge}]` : ''}`} />
              ))}
            </TSelect>
            {currentBadge && (
              <TTag variant="light" size="small" theme="success">
                {currentBadge}
              </TTag>
            )}
          </div>
        </div>

        {/* API Key */}
        <div>
          <label className="text-xs text-muted-foreground font-sans mb-1 block">API Key</label>
          <TInput
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(val) => setApiKey((val ?? '').toString())}
            placeholder="输入 API Key"
            suffix={
              <TButton
                variant="text"
                shape="square"
                size="small"
                className="p-0 w-6 h-6 min-h-0"
                onClick={() => setShowKey((v) => !v)}
                icon={showKey ? <EyesOffIcon size={16} /> : <EyesIcon size={16} />}
              />
            }
          />
        </div>

        {/* Base URL (only for custom) */}
        {provider === 'custom' && (
          <div>
            <label className="text-xs text-muted-foreground font-sans mb-1 block">Base URL</label>
            <TInput
              type="text"
              value={baseUrl}
              onChange={(val) => setBaseUrl((val ?? '').toString())}
              placeholder="https://api.example.com/v1"
            />
          </div>
        )}

        {/* Model */}
        <div>
          <label className="text-xs text-muted-foreground font-sans mb-1 block">模型</label>
          {provider === 'custom' ? (
            <TInput
              type="text"
              value={model}
              onChange={(val) => setModel((val ?? '').toString())}
              placeholder="输入模型名称"
            />
          ) : (
            <TSelect
              value={model}
              onChange={(val) => setModel(val as string)}
            >
              {models.map((m) => (
                <TOption key={m} value={m} label={m} />
              ))}
            </TSelect>
          )}
        </div>
      </div>
    </TDialog>
  );
}
