import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { streamAIChat } from '@/services/ai-stream.js';
import type { AIChatMessage as StreamChatMessage } from '@/services/ai-stream.js';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore.js';
import { useTimelineStore } from '@/stores/useTimelineStore.js';
import { useEvent } from '@/services/api-hooks.js';
import { getAIConfig } from '@/lib/ai-config.js';
import {
  AnalysisIcon,
  IdeaIcon,
  PencilIcon,
  RobotIcon,
  SettingConfigIcon,
  SearchIcon,
  MenuUnfoldIcon,
  MenuFoldIcon,
} from '@/lib/icons';
import { TCard, TButton, TTag, TBadge } from '@/components/ui-tdesign';
import { AIConfigPanel } from './AIConfigPanel.js';
import { AIMessage } from './AIMessage.js';
import { AIConversationList } from './AIConversationList.js';
import { AIInput } from './AIInput.js';
import { useAIConversations } from './useAIConversations.js';

interface FeatureItem {
  key: string;
  title: string;
  description: string;
  icon: typeof AnalysisIcon;
  fn: string;
  primaryText: string;
  secondaryText: string;
}

const FEATURES: FeatureItem[] = [
  {
    key: 'analyze',
    title: '内容分析',
    description: '梳理结构、提炼要点',
    icon: SearchIcon,
    fn: '分析',
    primaryText: '一键分析',
    secondaryText: '自定义',
  },
  {
    key: 'inspire',
    title: '灵感启发',
    description: '打开思路、激发创意',
    icon: IdeaIcon,
    fn: '启发灵感，围绕',
    primaryText: '一键启发',
    secondaryText: '自定义',
  },
  {
    key: 'revise',
    title: '修改建议',
    description: '优化表达与逻辑',
    icon: PencilIcon,
    fn: '提出修改建议，针对',
    primaryText: '一键建议',
    secondaryText: '自定义',
  },
  {
    key: 'split',
    title: '结构拆分',
    description: '拆分章节与情节结构',
    icon: AnalysisIcon,
    fn: '拆分结构，针对',
    primaryText: '打开工作区',
    secondaryText: '选择场景',
  },
];

const PROVIDER_LABELS: Record<string, string> = {
  deepseek: 'DeepSeek',
  kimi: 'Kimi',
  glm: '智谱 GLM',
  minimax: 'MiniMax',
  siliconflow: 'SiliconFlow',
  openai: 'OpenAI',
  custom: '自定义',
};

export function AIPanel() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const selectedEventId = useTimelineStore((s) => s.selectedEventId);

  // 获取选中事件详情（上下文感知）
  const { data: selectedEvent } = useEvent(workspaceId, selectedEventId);

  const {
    conversations,
    currentConversation,
    currentConversationId,
    createConversation,
    deleteConversation,
    switchConversation,
    addMessage,
    updateMessage,
    removeLastMessage,
  } = useAIConversations(workspaceId);

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [showList, setShowList] = useState(false);
  const [modelInfo, setModelInfo] = useState<{ provider: string; model: string } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 同步当前模型配置
  const refreshModelInfo = useCallback(() => {
    const cfg = getAIConfig();
    if (cfg) {
      setModelInfo({ provider: cfg.provider, model: cfg.model });
    } else {
      setModelInfo({ provider: 'deepseek', model: 'deepseek-v4-flash (免费)' });
    }
  }, []);

  useEffect(() => {
    refreshModelInfo();
  }, [refreshModelInfo]);

  useEffect(() => {
    if (!configOpen) refreshModelInfo();
  }, [configOpen, refreshModelInfo]);

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages, scrollToBottom]);

  // 构建选中事件的上下文提示
  const buildEventContext = useCallback((): string | null => {
    if (!selectedEvent) return null;
    const title = selectedEvent.title || '未命名事件';
    const start = selectedEvent.startTime
      ? new Date(selectedEvent.startTime).toLocaleString('zh-CN')
      : '未设定';
    const end = selectedEvent.endTime
      ? new Date(selectedEvent.endTime).toLocaleString('zh-CN')
      : '未设定';
    const desc = selectedEvent.description || '无描述';
    return `当前选中事件：${title}（${start}~${end}），描述：${desc}`;
  }, [selectedEvent]);

  const handleSend = () => {
    const userText = input.trim();
    if (!userText || isStreaming || !workspaceId) return;

    // 确保存在当前对话
    let convId = currentConversationId;
    if (!convId) {
      convId = createConversation();
      if (!convId) return;
    }

    setInput('');
    sendMessage(userText, convId);
  };

  const sendMessage = (userText: string, convId: string) => {
    // 构建上下文系统消息
    const contextParts: string[] = [];
    const eventCtx = buildEventContext();
    if (eventCtx) {
      contextParts.push(eventCtx);
    }

    // 当前对话历史
    const history = currentConversation?.messages ?? [];

    // 添加用户消息
    addMessage(convId, { role: 'user', content: userText });
    // 添加 assistant 占位消息
    const placeholderId = addMessage(convId, { role: 'assistant', content: '' });

    // 构建发送给 API 的消息数组
    const messagesForAPI: StreamChatMessage[] = [];
    if (contextParts.length > 0) {
      messagesForAPI.push({ role: 'system', content: contextParts.join('\n\n') });
    }
    for (const m of history) {
      if (m.role === 'system') continue;
      messagesForAPI.push({ role: m.role, content: m.content });
    }
    messagesForAPI.push({ role: 'user', content: userText });

    setIsStreaming(true);
    let assistantContent = '';
    let degradedError: string | null = null;

    abortRef.current = streamAIChat({
      messages: messagesForAPI,
      onChunk: (chunk) => {
        assistantContent += chunk;
        updateMessage(convId, placeholderId, { content: assistantContent });
      },
      onDegraded: (err) => {
        degradedError = err;
        toast.warning('AI 调用失败，已切换模拟模式');
      },
      onDone: () => {
        if (degradedError) {
          updateMessage(convId, placeholderId, {
            content: assistantContent,
            degraded: true,
            error: degradedError,
          });
        }
        setIsStreaming(false);
        abortRef.current = null;
      },
      onError: (err) => {
        const errMsg = `错误: ${err.message}`;
        updateMessage(convId, placeholderId, { content: errMsg });
        setIsStreaming(false);
        abortRef.current = null;
      },
    });
  };

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
    // 移除未收到内容的空 assistant 占位消息
    if (currentConversationId) {
      const conv = currentConversation;
      if (conv && conv.messages.length > 0) {
        const last = conv.messages[conv.messages.length - 1];
        if (last.role === 'assistant' && last.content === '') {
          removeLastMessage(currentConversationId);
        }
      }
    }
  };

  const handleNewConversation = () => {
    if (isStreaming) handleStop();
    createConversation();
    setInput('');
  };

  const handleDeleteConversation = (id: string) => {
    if (isStreaming) handleStop();
    deleteConversation(id);
  };

  const handleSwitchConversation = (id: string) => {
    if (isStreaming) handleStop();
    switchConversation(id);
  };

  const handleFunction = (fn: string, custom = false) => {
    if (custom) {
      setInput(`请帮我${fn}：\n`);
    } else {
      setInput(`请帮我${fn}以下内容：\n`);
    }
  };

  const messages = currentConversation?.messages ?? [];

  const currentModelDisplay = modelInfo?.model || '未配置模型';
  const currentProviderLabel = modelInfo?.provider ? PROVIDER_LABELS[modelInfo.provider] || modelInfo.provider : '未知来源';

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1">
          <TButton
            variant="text"
            shape="square"
            size="small"
            onClick={() => setShowList((v) => !v)}
            title={showList ? '隐藏对话列表' : '显示对话列表'}
            icon={showList ? <MenuFoldIcon size={16} /> : <MenuUnfoldIcon size={16} />}
          />
          <span className="text-xs text-muted-foreground">
            {currentConversation ? currentConversation.title : 'AI 助手'}
          </span>
        </div>
        <TButton
          variant="text"
          shape="square"
          size="small"
          onClick={() => setConfigOpen(true)}
          title="AI 配置"
          icon={<SettingConfigIcon size={16} />}
        />
      </div>

      <AIConfigPanel open={configOpen} onClose={() => setConfigOpen(false)} />

      {/* 主体：可选对话列表 + 消息区 */}
      <div className="flex-1 flex overflow-hidden">
        {showList && (
          <div className="w-36 shrink-0 border-r border-border bg-card/50">
            <AIConversationList
              conversations={conversations}
              currentConversationId={currentConversationId}
              onCreate={handleNewConversation}
              onSwitch={handleSwitchConversation}
              onDelete={handleDeleteConversation}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 棕色渐变横幅 */}
          <div className="shrink-0 mx-3 mt-3 rounded-xl overflow-hidden bg-gradient-to-r from-amber-800 to-amber-600 text-white shadow-sm">
            <div className="px-4 py-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-white/15 backdrop-blur-sm">
                <RobotIcon size={28} theme="filled" fill="#fff" />
              </div>
              <div>
                <div className="text-base font-semibold tracking-wide">AI 创作助手</div>
                <div className="text-xs text-white/80 mt-0.5">智能分析 · 创意启发 · 写作辅助</div>
              </div>
            </div>
          </div>

          {/* 模型信息条 */}
          <div className="shrink-0 mx-3 mt-2 px-3 py-2 rounded-lg border border-border bg-card/80 flex items-center gap-2 flex-wrap">
            <TTag variant="light" size="small" theme="primary">
              AI 配置已就绪
            </TTag>
            <span className="text-[11px] text-muted-foreground">当前模型</span>
            <TBadge count={currentModelDisplay} shape="round" color="var(--td-brand-color-light)" />
            <span className="text-[11px] text-muted-foreground">来源</span>
            <TTag variant="light" size="small" theme="default">
              {currentProviderLabel}
            </TTag>
            <div className="ml-auto">
              <TButton
                variant="text"
                size="small"
                theme="primary"
                onClick={() => setConfigOpen(true)}
              >
                切换模型
              </TButton>
            </div>
          </div>

          {/* 顶部功能卡片 */}
          <div className="px-3 pt-3 pb-2 shrink-0">
            <div className="grid grid-cols-2 gap-2">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <TCard
                    key={feature.key}
                    bordered
                    hoverShadow
                    size="small"
                    className="overflow-hidden"
                    avatar={
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <Icon size={34} />
                      </div>
                    }
                    title={feature.title}
                    description={feature.description}
                    footer={
                      <div className="flex items-center gap-1.5">
                        <TButton
                          theme="primary"
                          size="small"
                          disabled={isStreaming}
                          onClick={() => handleFunction(feature.fn)}
                        >
                          {feature.primaryText}
                        </TButton>
                        <TButton
                          variant="outline"
                          size="small"
                          disabled={isStreaming}
                          onClick={() => handleFunction(feature.fn, true)}
                        >
                          {feature.secondaryText}
                        </TButton>
                      </div>
                    }
                  />
                );
              })}
            </div>
          </div>

          {/* 消息列表 */}
          <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <p className="text-sm text-muted-foreground">
                  选择一个功能开始，或直接输入你的问题
                </p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isLast = i === messages.length - 1;
                const isStreamingPlaceholder =
                  msg.role === 'assistant' && msg.content === '' && isLast && isStreaming;
                return (
                  <AIMessage
                    key={msg.id}
                    message={msg}
                    isStreaming={isStreamingPlaceholder}
                  />
                );
              })
            )}
          </div>

          {/* 输入区 */}
          <div className="p-3 shrink-0">
            <AIInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              onStop={handleStop}
              isStreaming={isStreaming}
              disabled={!workspaceId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
