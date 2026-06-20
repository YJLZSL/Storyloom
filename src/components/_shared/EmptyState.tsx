import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  variant?: 'default' | 'dashed' | 'minimal';
}

/**
 * 统一空状态组件
 * 替代全站 4+ 种空状态风格（渐变卡片 / border-dashed 虚线框 / 纯文字）。
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = 'default',
}: EmptyStateProps) {
  const variantStyles = {
    default: 'flex flex-col items-center justify-center text-center p-8 rounded-xl border border-border/60 bg-card/50',
    dashed: 'flex flex-col items-center justify-center text-center p-8 rounded-xl border-2 border-dashed border-border/60 bg-card/30',
    minimal: 'flex flex-col items-center justify-center text-center p-4',
  };

  return (
    <div className={cn(variantStyles[variant], className)}>
      {icon && (
        <div className="mb-3 text-muted-foreground/70">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
