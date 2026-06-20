import { useState } from 'react';
import faviconUrl from '/favicon.svg?url';
import { SettingIcon, LinkIcon, RemindIcon, FolderOpenIcon } from '@/lib/icons';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { TButton, TTooltip, TDrawer } from '@/components/ui-tdesign';
import { useUIStore } from '@/stores/useUIStore';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';
import { LanguageSelector } from '@/components/layout/LanguageSelector';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import packageJson from '../../../package.json';

const APP_VERSION = (packageJson as { version?: string }).version ?? 'unknown';
const GITHUB_URL = 'https://github.com/YJLZSL/Storyloom';

function openLogFolder() {
  const api = (window as unknown as { electronAPI?: { openLogFolder?: () => Promise<void> } })
    .electronAPI;
  if (api?.openLogFolder) {
    void api.openLogFolder();
  } else {
    toast.info('日志路径', {
      description: '%APPDATA%\\Storyloom\\app.log（仅 Electron 桌面端可用）',
    });
  }
}

export function EmptyShell() {
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
        <header className="flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <img src={faviconUrl} alt="Storyloom" className="size-7" />
            <span className="font-serif text-base font-semibold tracking-wide">Storyloom · 絮织</span>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSelector />
            <TTooltip content="设置" placement="bottom">
              <TButton
                variant="text"
                size="small"
                shape="square"
                icon={<SettingIcon />}
                aria-label="设置"
                onClick={() => setSettingsOpen(true)}
              />
            </TTooltip>
            <TTooltip content="关于" placement="bottom">
              <TButton
                variant="text"
                size="small"
                shape="square"
                icon={<RemindIcon size={16} />}
                aria-label="关于"
                onClick={() => setAboutOpen(true)}
              />
            </TTooltip>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-auto">
          <WorkspaceSelector />
        </main>

        <TDrawer
          visible={aboutOpen}
          onClose={() => setAboutOpen(false)}
          header="关于 Storyloom"
          size="360px"
          placement="right"
          footer={null}
        >
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-center gap-3">
              <img src={faviconUrl} alt="Storyloom" className="size-10" />
              <div>
                <div className="font-serif text-base font-semibold">Storyloom · 絮织</div>
                <div className="text-xs text-muted-foreground">版本 v{APP_VERSION}</div>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              一款面向叙事创作者的本地优先时间轴工具，把灵感织成可追溯的故事经纬。
            </p>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <LinkIcon className="size-4" />
              GitHub · YJLZSL/Storyloom
            </a>
            <TButton
              variant="outline"
              size="medium"
              onClick={openLogFolder}
              className="self-start"
            >
              <FolderOpenIcon size={16} className="mr-1" />
              查看日志
            </TButton>
            <p className="-mt-2 text-[11px] leading-relaxed text-muted-foreground">
              遇到问题？点击「查看日志」打开本机 <code>app.log</code>，把最近 50 行随反馈一起发来。
            </p>
            <div className="mt-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
              Storyloom 团队 · 2026
            </div>
          </div>
        </TDrawer>

        <SettingsDialog />
        <Toaster position="top-right" richColors />
      </div>
    </TooltipProvider>
  );
}
