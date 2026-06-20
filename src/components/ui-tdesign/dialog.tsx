import type { ReactNode } from 'react';
import { Dialog as TDialog } from 'tdesign-react';
import type { TdDialogProps } from 'tdesign-react';

export interface DialogProps
  extends Omit<TdDialogProps, 'visible' | 'onClose' | 'children' | 'header' | 'footer' | 'body'> {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  header?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

export function Dialog({
  open,
  onOpenChange,
  header,
  footer,
  children,
  ...rest
}: DialogProps) {
  return (
    <TDialog
      {...rest}
      visible={open}
      onClose={() => onOpenChange?.(false)}
      header={header as TdDialogProps['header']}
      footer={footer === undefined ? undefined : (footer as TdDialogProps['footer'])}
    >
      {children}
    </TDialog>
  );
}
