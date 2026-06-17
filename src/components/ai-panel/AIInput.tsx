import { useEffect, useRef } from 'react';
import { Send, Square } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface AIInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

const MIN_ROWS = 3;
const MAX_ROWS = 8;
const LINE_HEIGHT = 22; // px，约等于 text-sm 行高

export function AIInput({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled,
}: AIInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自适应高度：min 3 行，max 8 行
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const minHeight = LINE_HEIGHT * MIN_ROWS;
    const maxHeight = LINE_HEIGHT * MAX_ROWS;
    const scrollHeight = el.scrollHeight;
    el.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送，Shift+Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && value.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="shrink-0 space-y-2">
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息…（Enter 发送，Shift+Enter 换行）"
          disabled={disabled}
          rows={MIN_ROWS}
          className="flex-1 min-h-[66px] max-h-[176px] resize-none text-sm py-2 leading-[22px]"
        />
        {isStreaming ? (
          <button
            onClick={onStop}
            className="p-2 rounded-md bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity shrink-0"
            title="停止生成"
          >
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!value.trim() || disabled}
            className="p-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
            title="发送"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
