import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SettingsRowProps {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}

/**
 * 统一设置行组件
 * 替代所有 Settings Tab 中自写的 label + description + control 结构。
 */
export function SettingsRow({ label, description, children, className, htmlFor }: SettingsRowProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <label htmlFor={htmlFor} className="text-sm font-medium text-foreground whitespace-normal leading-tight">
          {label}
        </label>
        {description && (
          <span className="text-xs text-muted-foreground leading-relaxed">{description}</span>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
