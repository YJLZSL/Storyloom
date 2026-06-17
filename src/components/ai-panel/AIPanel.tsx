import { useState, useRef, useCallback, useEffect } from 'react';
import { Settings, PanelLeftOpen, PanelLeftClose, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { streamAIChat } from '@/services/ai-stream.js';
import type { AIChatMessage as StreamChatMessage } from '@/services/ai-stream.js';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore.js';
import { useTimelineStore } from '@/stores/useTimelineStore.js';
import { useEvent } from '@/services/api-hooks.js';
import { AIConfigPanel } from './AIConfigPanel.js';
import { AIMessage } from './AIMessage.js';
import { AIConversationList } from './AIConversationList.js';
import { AIInput } from './AIInput.js';
import { useAIConversations } from './useAIConversations.js';

const FUNCTIONS = ['续写', '润色', '翻译', '总结', '创意', '代码'];

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

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleFunction = (fn: string) => {
    setInput(`请帮我${fn}以下内容：`);
  };

  const messages = currentConversation?.messages ?? [];

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowList((v) => !v)}
            className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title={showList ? '隐藏对话列表' : '显示对话列表'}
          >
            {showList ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
          <span className="text-xs text-muted-foreground">
            {currentConversation ? currentConversation.title : 'AI 助手'}
          </span>
        </div>
        <button
          onClick={() => setConfigOpen(true)}
          className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title="AI 配置"
        >
          <Settings className="w-4 h-4" />
        </button>
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
          {/* 选中事件上下文提示 */}
          {selectedEvent && (
            <div className="px-3 py-1.5 bg-primary/5 border-b border-border text-[11px] text-muted-foreground shrink-0">
              <span className="text-primary font-medium">上下文：</span>
              选中事件「{selectedEvent.title}」
            </div>
          )}

          {/* 消息列表 */}
          <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  {isStreaming ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <span className="text-primary text-lg">✦</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentConversation
                    ? '输入消息开始对话…'
                    : '点击左上角按钮新建对话，或直接输入消息自动创建。'}
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

          {/* 快捷功能 */}
          <div className="px-3 pt-2 shrink-0">
            <div className="flex flex-wrap gap-1">
              {FUNCTIONS.map((fn) => (
                <button
                  key={fn}
                  onClick={() => handleFunction(fn)}
                  disabled={isStreaming}
                  className="px-2 py-0.5 rounded text-[10px] bg-accent hover:bg-accent/80 transition-colors disabled:opacity-50"
                >
                  {fn}
                </button>
              ))}
            </div>
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
