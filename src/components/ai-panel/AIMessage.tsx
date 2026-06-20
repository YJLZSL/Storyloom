import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RobotIcon, UserIcon, CautionIcon } from '@/lib/icons';
import type { AIChatMessage } from './useAIConversations';

interface AIMessageProps {
  message: AIChatMessage;
  isStreaming?: boolean;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export const AIMessage = memo(function AIMessage({ message, isStreaming }: AIMessageProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`ai-message flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {isAssistant && (
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
          <RobotIcon size={16} className="text-primary" />
        </div>
      )}

      <div className={`max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          ) : (
            <div className="ai-markdown break-words">
              {message.content ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ ...props }) => (
                      <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2" />
                    ),
                    code: ({ className, children, ...props }) => {
                      const isInline = !className;
                      if (isInline) {
                        return (
                          <code className="px-1 py-0.5 rounded bg-background/50 text-foreground text-[0.85em]" {...props}>
                            {children}
                          </code>
                        );
                      }
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                    pre: ({ children, ...props }) => (
                      <pre
                        className="my-2 p-3 rounded-md bg-background/80 border border-border overflow-x-auto text-[0.85em] leading-relaxed"
                        {...props}
                      >
                        {children}
                      </pre>
                    ),
                    ul: ({ children, ...props }) => (
                      <ul className="my-1 pl-5 list-disc space-y-0.5" {...props}>
                        {children}
                      </ul>
                    ),
                    ol: ({ children, ...props }) => (
                      <ol className="my-1 pl-5 list-decimal space-y-0.5" {...props}>
                        {children}
                      </ol>
                    ),
                    h1: ({ children, ...props }) => (
                      <h1 className="text-base font-semibold mt-2 mb-1 first:mt-0" {...props}>{children}</h1>
                    ),
                    h2: ({ children, ...props }) => (
                      <h2 className="text-sm font-semibold mt-2 mb-1 first:mt-0" {...props}>{children}</h2>
                    ),
                    h3: ({ children, ...props }) => (
                      <h3 className="text-sm font-medium mt-2 mb-1 first:mt-0" {...props}>{children}</h3>
                    ),
                    p: ({ children, ...props }) => (
                      <p className="my-1 first:mt-0 last:mb-0 leading-relaxed" {...props}>{children}</p>
                    ),
                    blockquote: ({ children, ...props }) => (
                      <blockquote className="my-1 pl-3 border-l-2 border-border text-muted-foreground" {...props}>
                        {children}
                      </blockquote>
                    ),
                    table: ({ children, ...props }) => (
                      <div className="my-2 overflow-x-auto">
                        <table className="min-w-full text-xs border border-border rounded" {...props}>
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children, ...props }) => (
                      <th className="px-2 py-1 border border-border bg-background/50 font-medium text-left" {...props}>
                        {children}
                      </th>
                    ),
                    td: ({ children, ...props }) => (
                      <td className="px-2 py-1 border border-border" {...props}>{children}</td>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : isStreaming ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <span>思考中</span>
                  <span className="inline-flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '120ms' }} />
                    <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '240ms' }} />
                  </span>
                </span>
              ) : null}
            </div>
          )}
        </div>

        {/* 降级错误提示 */}
        {message.degraded && message.error && (
          <div className="mt-1 flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400">
            <CautionIcon size={12} className="shrink-0" />
            <span className="break-all">{message.error}</span>
          </div>
        )}

        <span className="mt-0.5 text-[10px] text-muted-foreground/70">{formatTime(message.createdAt)}</span>
      </div>

      {isUser && (
        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
          <UserIcon size={16} className="text-secondary-foreground" />
        </div>
      )}
    </div>
  );
});
