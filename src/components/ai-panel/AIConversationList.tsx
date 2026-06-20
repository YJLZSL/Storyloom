import { PlusIcon, DeleteIcon, MessageIcon } from '@/lib/icons';
import type { AIConversation } from './useAIConversations';

interface AIConversationListProps {
  conversations: AIConversation[];
  currentConversationId: string | null;
  onCreate: () => void;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AIConversationList({
  conversations,
  currentConversationId,
  onCreate,
  onSwitch,
  onDelete,
}: AIConversationListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
        <span className="text-[11px] font-medium text-muted-foreground">对话列表</span>
        <button
          onClick={onCreate}
          className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title="新建对话"
        >
          <PlusIcon size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-auto py-1">
        {conversations.length === 0 ? (
          <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
            暂无对话，点击 + 新建
          </div>
        ) : (
          <ul className="space-y-0.5 px-1">
            {conversations.map((conv) => {
              const isActive = conv.id === currentConversationId;
              return (
                <li key={conv.id}>
                  <div
                    className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                      isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                    }`}
                    onClick={() => onSwitch(conv.id)}
                  >
                    <MessageIcon size={14} className="shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-xs">{conv.title || '新对话'}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-all text-muted-foreground"
                      title="删除对话"
                    >
                      <DeleteIcon size={12} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
