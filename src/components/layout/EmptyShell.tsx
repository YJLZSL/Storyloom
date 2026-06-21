import { useState } from 'react';
import faviconUrl from '/favicon.svg?url';
import { SettingIcon, LinkIcon, RemindIcon, FolderOpenIcon, PlusIcon, UploadIcon, BookOpenIcon } from '@/lib/icons';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { TButton, TTooltip, TDrawer } from '@/components/ui-tdesign';
import { useUIStore } from '@/stores/useUIStore';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';
import { LanguageSelector } from '@/components/layout/LanguageSelector';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { isTauri, openExternal, openLogFolder } from '@/lib/tauri-api';
import packageJson from '../../../package.json';

const APP_VERSION = (packageJson as { version?: string }).version ?? 'unknown';
const GITHUB_URL = 'https://github.com/YJLZSL/Storyloom';

function openLogFolderFn() {
  if (isTauri()) {
    void openLogFolder();
  } else {
    toast.info('日志路径', {
      description: 'app.log（仅桌面端可用）',
    });
  }
}

/** 织机 SVG — 抽象几何线条交织 */
function LoomSvg() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="w-full h-auto text-primary"
      style={{ maxHeight: 220 }}
      aria-hidden="true"
    >
      {/* 经线（垂直） — 有 subtle 波动动画 */}
      <g opacity="0.35">
        <line x1="30" y1="20" x2="30" y2="180" stroke="currentColor" strokeWidth="1.5" className="loom-warp" />
        <line x1="55" y1="20" x2="55" y2="180" stroke="currentColor" strokeWidth="1.5" className="loom-warp loom-warp-delay-1" />
        <line x1="80" y1="20" x2="80" y2="180" stroke="currentColor" strokeWidth="1.5" className="loom-warp loom-warp-delay-2" />
        <line x1="105" y1="20" x2="105" y2="180" stroke="currentColor" strokeWidth="1.5" className="loom-warp loom-warp-delay-3" />
        <line x1="130" y1="20" x2="130" y2="180" stroke="currentColor" strokeWidth="1.5" className="loom-warp loom-warp-delay-4" />
        <line x1="155" y1="20" x2="155" y2="180" stroke="currentColor" strokeWidth="1.5" className="loom-warp" />
        <line x1="180" y1="20" x2="180" y2="180" stroke="currentColor" strokeWidth="1.5" className="loom-warp loom-warp-delay-2" />
      </g>
      {/* 纬线（水平） */}
      <g opacity="0.22">
        <line x1="20" y1="50" x2="190" y2="50" stroke="currentColor" strokeWidth="1" />
        <line x1="20" y1="85" x2="190" y2="85" stroke="currentColor" strokeWidth="1" />
        <line x1="20" y1="120" x2="190" y2="120" stroke="currentColor" strokeWidth="1" />
        <line x1="20" y1="155" x2="190" y2="155" stroke="currentColor" strokeWidth="1" />
      </g>
      {/* 编织线动画 */}
      <g opacity="0.4">
        <line x1="20" y1="40" x2="180" y2="40" stroke="currentColor" strokeWidth="1" 
          strokeDasharray="100" strokeDashoffset="100" className="weave-thread" />
        <line x1="20" y1="75" x2="180" y2="75" stroke="currentColor" strokeWidth="1"
          strokeDasharray="100" strokeDashoffset="100" className="weave-thread weave-thread-delay-1" />
        <line x1="20" y1="110" x2="180" y2="110" stroke="currentColor" strokeWidth="1"
          strokeDasharray="100" strokeDashoffset="100" className="weave-thread weave-thread-delay-2" />
      </g>
      {/* 交织点（小圆点） */}
      <g opacity="0.3">
        <circle cx="30" cy="50" r="2.5" fill="currentColor" />
        <circle cx="55" cy="85" r="2.5" fill="currentColor" />
        <circle cx="80" cy="120" r="2.5" fill="currentColor" />
        <circle cx="105" cy="155" r="2.5" fill="currentColor" />
        <circle cx="130" cy="50" r="2.5" fill="currentColor" />
        <circle cx="155" cy="85" r="2.5" fill="currentColor" />
        <circle cx="180" cy="120" r="2.5" fill="currentColor" />
      </g>
      {/* 装饰弧线 — 模拟织布的弧度 */}
      <path
        d="M 20 170 Q 100 190 190 170"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        opacity="0.15"
      />
    </svg>
  );
}

export function EmptyShell() {
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
        {/* 顶部栏 — 增加底部渐变边框 */}
        <header className="relative flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur">
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-primary/30 via-transparent to-primary/30 pointer-events-none" />
          <div className="flex items-center gap-2.5">
            <img src={faviconUrl} alt="Storyloom" className="size-7" />
            <span className="font-serif text-base font-semibold tracking-wide">Storyloom · 织叙</span>
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

        {/* 主体：三栏布局 */}
        <main className="flex flex-1 min-h-0 overflow-hidden">
          {/* 左栏：品牌区 */}
          <aside className="w-1/4 min-w-[240px] max-w-[340px] border-r border-border/40 flex flex-col p-6 overflow-y-auto">
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <LoomSvg />
              <div className="text-center">
                <h1 className="font-serif text-2xl font-bold tracking-wide text-foreground">
                  Storyloom · 织叙
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground tracking-wide">
                  把时间织成故事
                </p>
                <h2 className="mt-2 font-serif text-lg font-bold tracking-wide text-foreground">
                  <span className="typewriter-text">故事从这里开始编织</span>
                </h2>
              </div>
              <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <p className="text-xs text-muted-foreground/70 text-center leading-relaxed max-w-[200px]">
                面向叙事创作者的本地优先时间轴工具，把灵感织成可追溯的故事经纬
              </p>
            </div>
            <div className="text-[11px] text-muted-foreground/50 text-center mt-4">
              v{APP_VERSION}
            </div>
          </aside>

          {/* 中栏：工作区 */}
          <section className="flex-1 overflow-y-auto min-w-0">
            <WorkspaceSelector />
          </section>

          {/* 右栏：快速操作 */}
          <aside className="w-1/5 min-w-[200px] max-w-[260px] border-l border-border/40 p-6 flex flex-col overflow-y-auto">
            <h3 className="font-serif text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
              快速操作
            </h3>
            <div className="flex flex-col gap-2">
              <TButton
                variant="outline"
                size="small"
                className="justify-start gap-2 h-10"
                onClick={() => {
                  const event = new CustomEvent('storyloom-create-workspace');
                  window.dispatchEvent(event);
                }}
              >
                <PlusIcon size={16} />
                新建工作区
              </TButton>
              <TButton
                variant="outline"
                size="small"
                className="justify-start gap-2 h-10"
                onClick={() => {
                  const event = new CustomEvent('storyloom-import');
                  window.dispatchEvent(event);
                }}
              >
                <UploadIcon size={16} />
                导入项目
              </TButton>
              <TButton
                variant="outline"
                size="small"
                className="justify-start gap-2 h-10"
                onClick={() => setSettingsOpen(true)}
              >
                <SettingIcon size={16} />
                设置
              </TButton>
              <TButton
                variant="outline"
                size="small"
                className="justify-start gap-2 h-10"
                onClick={() => setAboutOpen(true)}
              >
                <RemindIcon size={16} />
                关于
              </TButton>
            </div>

            <div className="my-4 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent" />

            <h3 className="font-serif text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
              资源
            </h3>
            <div className="flex flex-col gap-2">
              <TButton
                variant="outline"
                size="small"
                className="justify-start gap-2 h-10"
                onClick={() => {
                  const event = new CustomEvent('storyloom-tutorials');
                  window.dispatchEvent(event);
                }}
              >
                <BookOpenIcon size={16} />
                教程
              </TButton>
              <TButton
                variant="outline"
                size="small"
                className="justify-start gap-2 h-10"
                onClick={() => {
                  if (isTauri()) {
                    void openExternal(GITHUB_URL);
                  } else {
                    window.open(GITHUB_URL, '_blank');
                  }
                }}
              >
                <LinkIcon size={16} />
                GitHub
              </TButton>
            </div>

            <div className="mt-auto pt-4">
              <div className="rounded-xl border border-border/50 bg-card/50 p-3 text-xs text-muted-foreground/70 leading-relaxed">
                <p>
                  首次使用？建议先阅读教程了解 Storyloom 的核心概念：时间轴、轨道、事件与关联。
                </p>
              </div>
            </div>
          </aside>
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
                <div className="font-serif text-base font-semibold">Storyloom · 织叙</div>
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
              onClick={openLogFolderFn}
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
