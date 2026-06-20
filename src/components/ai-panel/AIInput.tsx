import { TInput } from '@/components/ui-tdesign';
import { SendIcon, PauseIcon } from '@/lib/icons';

interface AIInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function AIInput({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled,
}: AIInputProps) {
  const handleEnter = () => {
    if (!isStreaming && value.trim()) {
      onSend();
    }
  };

  return (
    <div className="shrink-0">
      <TInput
        value={value}
        onChange={(val) => onChange((val ?? '').toString())}
        onEnter={handleEnter}
        placeholder="输入消息…（Enter 发送）"
        disabled={disabled}
        size="medium"
        clearable
        suffixIcon={
          isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="p-1 rounded bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
              title="停止生成"
            >
              <PauseIcon size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!value.trim() || disabled}
              className="p-1 rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              title="发送"
            >
              <SendIcon size={16} />
            </button>
          )
        }
      />
    </div>
  );
}
