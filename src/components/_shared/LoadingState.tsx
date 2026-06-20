import { ReactNode } from 'react';
import { LoadingIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  text?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
}

/**
 * 统一加载状态组件
 * 替代全站 3 处零散 lucide Loader2 + animate-spin。
 */
export function LoadingState({ text, className, size = 'md', children }: LoadingStateProps) {
  const sizeMap = {
    sm: { icon: 16, text: 'text-xs' },
    md: { icon: 20, text: 'text-sm' },
    lg: { icon: 28, text: 'text-base' },
  };

  const s = sizeMap[size];

  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 text-muted-foreground', className)}>
      <LoadingIcon size={s.icon} className="animate-spin" />
      {text && <span className={cn(s.text, 'font-medium')}>{text}</span>}
      {children}
    </div>
  );
}
