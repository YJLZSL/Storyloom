import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TButton, TSwitch } from '@/components/ui-tdesign';
import { useSettingsStore } from '@/stores/useSettingsStore';
import packageJson from '../../../package.json';

const APP_VERSION = (packageJson as { version?: string }).version ?? 'unknown';
const REPO_RELEASES_URL = 'https://github.com/YJLZSL/Storyloom/releases';

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export function UpdateTab() {
  const { t } = useTranslation();
  const autoCheck = useSettingsStore((s) => s.autoCheckUpdates);
  const setAutoCheck = useSettingsStore((s) => s.setAutoCheckUpdates);

  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [newVersion, setNewVersion] = useState<string | undefined>(undefined);
  const [releaseNotes, setReleaseNotes] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);
  const [currentVersion, setCurrentVersion] = useState<string | undefined>(undefined);

  const isPackaged = window.electronAPI?.isPackaged ?? false;
  const canCheck = isPackaged && !!window.updater;

  useEffect(() => {
    if (!window.updater) return;
    const off = window.updater.onEvent((evt) => {
      switch (evt.kind) {
        case 'checking':
          setStatus('checking');
          break;
        case 'not-available':
          setStatus('up-to-date');
          setCurrentVersion(evt.version);
          break;
        case 'available':
          setStatus('available');
          setNewVersion(evt.version);
          setReleaseNotes(evt.releaseNotes ?? '');
          break;
        case 'progress':
          setStatus('downloading');
          setProgress(evt.percent);
          break;
        case 'downloaded':
          setStatus('downloaded');
          break;
        case 'error':
          setStatus('error');
          setErrorMsg(evt.message);
          break;
      }
    });
    return off;
  }, []);

  function openReleasePage() {
    if (window.electronAPI?.openExternal) {
      void window.electronAPI.openExternal(REPO_RELEASES_URL);
    } else {
      window.open(REPO_RELEASES_URL, '_blank', 'noopener');
    }
  }

  async function handleCheck() {
    if (!window.updater) return;
    setStatus('checking');
    try {
      const res = await window.updater.check();
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(res.error ?? 'unknown');
      }
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }

  function handleDownload() {
    window.updater?.download().catch((e) => {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : String(e));
    });
  }

  function handleInstall() {
    void window.updater?.install();
  }

  const truncatedNotes =
    releaseNotes && releaseNotes.length > 1000
      ? `${releaseNotes.slice(0, 1000)}…`
      : releaseNotes;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium">{t('update.currentVersion')}</span>
        <span className="text-sm text-muted-foreground">v{APP_VERSION}</span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">{t('update.autoCheck')}</label>
          <span className="text-xs text-muted-foreground">{t('update.autoCheckDesc')}</span>
        </div>
        <TSwitch value={autoCheck} onChange={(v) => setAutoCheck(Boolean(v))} />
      </div>

      <div className="flex flex-col gap-2">
        <TButton
          disabled={!canCheck || status === 'checking' || status === 'downloading'}
          onClick={handleCheck}
        >
          {t('update.checkNow')}
        </TButton>
        {!canCheck && (
          <span className="text-xs text-muted-foreground">{t('update.devUnavailable')}</span>
        )}
      </div>

      {status === 'checking' && (
        <div className="text-sm text-muted-foreground">{t('update.checking')}</div>
      )}

      {status === 'up-to-date' && (
        <div className="text-sm text-muted-foreground">
          {t('update.upToDate', { version: currentVersion ?? APP_VERSION })}
        </div>
      )}

      {status === 'available' && (
        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium">
            {t('update.newVersion', { version: newVersion ?? '?' })}
          </div>
          {truncatedNotes && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t('update.releaseNotes')}
              </span>
              <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground max-h-60 overflow-auto rounded border bg-muted/40 p-2">
                {truncatedNotes}
              </pre>
            </div>
          )}
          <div className="flex items-center gap-3">
            <TButton onClick={handleDownload}>{t('update.download')}</TButton>
            <button
              type="button"
              className="text-xs text-primary underline-offset-2 hover:underline"
              onClick={openReleasePage}
            >
              {t('update.openReleasePage')}
            </button>
          </div>
        </div>
      )}

      {status === 'downloading' && (
        <div className="flex flex-col gap-2">
          <div className="w-full h-2 bg-muted rounded overflow-hidden">
            <div
              className="bg-primary h-2 rounded transition-[width] duration-200"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {t('update.downloading', { percent: progress ?? 0 })}
          </span>
        </div>
      )}

      {status === 'downloaded' && (
        <div className="flex flex-col gap-2">
          <div className="text-sm text-muted-foreground">{t('update.downloaded')}</div>
          <TButton onClick={handleInstall}>{t('update.restartInstall')}</TButton>
        </div>
      )}

      {status === 'error' && (
        <div className="text-sm text-destructive">
          {t('update.errorMessage', { message: errorMsg ?? '' })}
        </div>
      )}
    </div>
  );
}
