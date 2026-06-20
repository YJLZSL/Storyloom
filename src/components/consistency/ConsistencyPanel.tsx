import { useState, useMemo, useCallback } from 'react';
import { LoadingIcon, CautionIcon, ErrorIcon, RightIcon, CheckIcon } from '@/lib/icons';
import { useEvents, useCharacters, useWorldSettings, useForeshadowings } from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useUIStore } from '@/stores/useUIStore';
import {
  runAllChecks,
  ISSUE_TYPE_LABELS,
  SEVERITY_LABELS,
  type ConsistencyIssue,
  type IssueSeverity,
} from '@/lib/consistency-check';

export function ConsistencyPanel() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const scrollToEvent = useTimelineStore((s) => s.scrollToEvent);
  const setSelectedEvent = useTimelineStore((s) => s.setSelectedEvent);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const { data: eventsData } = useEvents(workspaceId);
  const { data: characters } = useCharacters(workspaceId);
  const { data: worldSettings } = useWorldSettings(workspaceId);
  const { data: foreshadowings } = useForeshadowings(workspaceId);

  const [checkTrigger, setCheckTrigger] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  const events = eventsData?.items ?? [];

  // 运行检查（依赖 checkTrigger 用于手动重新检查；依赖 foreshadowings 用于伏笔变更联动）
  const issues: ConsistencyIssue[] = useMemo(() => {
    if (!characters || !worldSettings) return [];
    return runAllChecks({
      events,
      characters,
      worldSettings,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, characters, worldSettings, foreshadowings, checkTrigger]);

  const errorIssues = issues.filter((i) => i.severity === 'error');
  const warningIssues = issues.filter((i) => i.severity === 'warning');

  const handleRecheck = useCallback(() => {
    setIsChecking(true);
    setCheckTrigger((n) => n + 1);
    setTimeout(() => setIsChecking(false), 400);
  }, []);

  const handleJumpToEvent = useCallback((eventId: string) => {
    setSelectedEvent(eventId);
    scrollToEvent(eventId);
    setActivePanel('event-editor');
  }, [setSelectedEvent, scrollToEvent, setActivePanel]);

  return (
    <div className="h-full flex flex-col">
      {/* 顶部操作栏 */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={handleRecheck}
          disabled={isChecking}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-primary/10 hover:bg-primary/20 text-primary transition-colors font-sans disabled:opacity-50"
        >
          <LoadingIcon size={12} spin={isChecking} />
          重新检查
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-destructive">
            <ErrorIcon size={12} />
            {errorIssues.length}
          </span>
          <span className="flex items-center gap-1 text-warning">
            <CautionIcon size={12} />
            {warningIssues.length}
          </span>
        </div>
      </div>

      {/* 检查结果 */}
      <div className="flex-1 overflow-auto space-y-3">
        {issues.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckIcon size={40} className="text-success mb-3" />
            <p className="text-sm font-medium text-foreground font-sans">未发现一致性问题</p>
            <p className="text-xs text-muted-foreground mt-1 font-sans">所有检查项均通过</p>
          </div>
        )}

        {errorIssues.length > 0 && (
          <IssueGroup
            title="错误"
            severity="error"
            issues={errorIssues}
            onJumpToEvent={handleJumpToEvent}
          />
        )}

        {warningIssues.length > 0 && (
          <IssueGroup
            title="警告"
            severity="warning"
            issues={warningIssues}
            onJumpToEvent={handleJumpToEvent}
          />
        )}
      </div>
    </div>
  );
}

function IssueGroup({
  title,
  severity,
  issues,
  onJumpToEvent,
}: {
  title: string;
  severity: IssueSeverity;
  issues: ConsistencyIssue[];
  onJumpToEvent: (eventId: string) => void;
}) {
  const isError = severity === 'error';
  const Icon = isError ? ErrorIcon : CautionIcon;
  const headerColor = isError ? 'text-destructive' : 'text-warning';
  const borderColor = isError ? 'border-destructive/30' : 'border-warning/30';
  const bgColor = isError ? 'bg-destructive/5' : 'bg-warning/5';

  return (
    <div>
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-t-md ${bgColor} ${borderColor} border`}>
        <Icon size={14} className={headerColor} />
        <span className={`text-xs font-medium font-sans ${headerColor}`}>
          {title} ({issues.length})
        </span>
      </div>
      <div className={`border ${borderColor} border-t-0 rounded-b-md divide-y divide-border/50`}>
        {issues.map((issue, idx) => (
          <IssueItem key={idx} issue={issue} onJumpToEvent={onJumpToEvent} />
        ))}
      </div>
    </div>
  );
}

function IssueItem({
  issue,
  onJumpToEvent,
}: {
  issue: ConsistencyIssue;
  onJumpToEvent: (eventId: string) => void;
}) {
  const typeLabel = ISSUE_TYPE_LABELS[issue.type];
  const severityLabel = SEVERITY_LABELS[issue.severity];
  const hasEvent = issue.eventIds.length > 0;

  return (
    <div
      data-panel-item
      className="px-3 py-2 hover:bg-accent/30 transition-colors"
    >
      <div className="flex items-start gap-2">
        <span className="text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5 px-1 py-0.5 rounded bg-muted/50">
          {typeLabel}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-foreground font-sans leading-relaxed">
            {issue.message}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground font-mono">
              {severityLabel}
            </span>
            {hasEvent && (
              <button
                onClick={() => onJumpToEvent(issue.eventIds[0])}
                className="flex items-center gap-0.5 text-[10px] text-primary hover:underline font-sans"
              >
                跳转
                <RightIcon size={10} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
