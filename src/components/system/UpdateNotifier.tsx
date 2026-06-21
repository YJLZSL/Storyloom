import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { DialogPlugin } from 'tdesign-react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useUIStore } from '@/stores/useUIStore';
import {
  isPackaged,
  isTauri,
  openExternal,
  onUpdaterEvent,
  checkUpdate,
  downloadUpdate,
  installUpdate,
} from '@/lib/tauri-api';

const REPO_RELEASES_URL = 'https://github.com/YJLZSL/Storyloom/releases';

export function UpdateNotifier() {
  const { t } = useTranslation();
  const autoCheck = useSettingsStore((s) => s.autoCheckUpdates);
  const [progressToastId, setProgressToastId] = useState<string | number | null>(null);
  const downloadedRef = useRef(false);

  useEffect(() => {
    if (!isTauri()) return;
    const off = onUpdaterEvent((evt) => handleEvent(evt));
    return off;
  }, []);

  useEffect(() => {
    if (!autoCheck) return;
    if (!isPackaged()) return;
    if (!isTauri()) return;
    const timer = window.setTimeout(() => {
      checkUpdate().catch(() => {
        // silently ignore auto-check failures
      });
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [autoCheck]);

  function openExternalFn(url: string) {
    if (isTauri()) {
      void openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener');
    }
  }

  function handleEvent(evt: import('@/lib/tauri-api').UpdateEventPayload) {
    switch (evt.kind) {
      case 'checking':
        // 静默
        break;

      case 'not-available':
        // 静默，不打扰用户
        break;

      case 'error':
        // 静默处理更新错误，但输出日志便于调试
        console.error('[Storyloom Update] Error:', evt.message);
        break;

      case 'available': {
        const version = evt.version ?? '?';
        const notes = (evt.releaseNotes || '').slice(0, 800);
        if (!useUIStore.getState().settingsOpen) {
          const dialog = DialogPlugin.confirm({
            header: t('update.available', { version }),
            body: notes
              ? t('update.availableDesc', { notes })
              : t('update.availableDesc', { notes: '—' }),
            confirmBtn: t('update.downloadNow'),
            cancelBtn: t('update.later'),
            onConfirm: () => {
              downloadUpdate().then((res) => {
                if (!res.ok) {
                  toast.error(`${t('update.downloading', { percent: 0 })} ${res.error ?? ''}`);
                }
              });
              dialog.hide();
            },
            onClose: () => dialog.hide(),
          });
          // 同步追加"打开发布页"操作（toast）
          toast(t('update.available', { version }), {
            duration: 8000,
            action: {
              label: t('update.openReleasePage'),
              onClick: () => openExternalFn(REPO_RELEASES_URL),
            },
          });
        }
        break;
      }

      case 'progress': {
        const percent = evt.percent ?? 0;
        const text = t('update.downloading', { percent });
        if (progressToastId == null) {
          const id = toast.loading(text, { duration: Infinity });
          setProgressToastId(id);
        } else {
          toast.loading(text, { id: progressToastId });
        }
        break;
      }

      case 'downloaded': {
        if (progressToastId != null) {
          toast.dismiss(progressToastId);
          setProgressToastId(null);
        }
        if (downloadedRef.current) return;
        downloadedRef.current = true;
        if (!useUIStore.getState().settingsOpen) {
          const dialog = DialogPlugin.confirm({
            header: t('update.downloaded'),
            confirmBtn: t('update.installNow'),
            cancelBtn: t('update.installLater'),
            onConfirm: () => {
              void installUpdate();
              dialog.hide();
            },
            onClose: () => dialog.hide(),
          });
        }
        break;
      }
    }
  }

  return null;
}
