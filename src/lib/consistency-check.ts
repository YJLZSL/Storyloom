import type { TimelineEvent, Character, WorldSetting } from '../../shared/types.js';

export type IssueSeverity = 'error' | 'warning';

export type IssueType =
  | 'event-time-invalid'
  | 'event-missing-title'
  | 'event-missing-time'
  | 'event-duplicate-title'
  | 'character-missing-name'
  | 'worldsetting-missing-key'
  | 'worldsetting-duplicate-key';

export interface ConsistencyIssue {
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  eventIds: string[];
}

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  'event-time-invalid': '时间错误',
  'event-missing-title': '无标题',
  'event-missing-time': '无时间',
  'event-duplicate-title': '标题重复',
  'character-missing-name': '角色无名',
  'worldsetting-missing-key': '设定无名',
  'worldsetting-duplicate-key': '设定重复',
};

export const SEVERITY_LABELS: Record<IssueSeverity, string> = {
  error: '错误',
  warning: '警告',
};

interface CheckInput {
  events: TimelineEvent[];
  characters: Character[];
  worldSettings: WorldSetting[];
}

export function runAllChecks(input: CheckInput): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const { events, characters, worldSettings } = input;

  for (const e of events) {
    if (!e.title || !e.title.trim()) {
      issues.push({
        type: 'event-missing-title',
        severity: 'error',
        message: '存在无标题事件',
        eventIds: [e.id],
      });
    }

    if (e.startTime && e.endTime) {
      const start = new Date(e.startTime).getTime();
      const end = new Date(e.endTime).getTime();
      if (end < start) {
        issues.push({
          type: 'event-time-invalid',
          severity: 'error',
          message: `事件「${e.title || '无标题'}」的结束时间早于开始时间`,
          eventIds: [e.id],
        });
      }
    }

    if (!e.startTime) {
      issues.push({
        type: 'event-missing-time',
        severity: 'warning',
        message: `事件「${e.title || '无标题'}」未设置开始时间`,
        eventIds: [e.id],
      });
    }
  }

  const titleMap = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    if (!e.title) continue;
    const list = titleMap.get(e.title) ?? [];
    list.push(e);
    titleMap.set(e.title, list);
  }
  for (const [title, group] of titleMap) {
    if (group.length > 1) {
      issues.push({
        type: 'event-duplicate-title',
        severity: 'warning',
        message: `存在 ${group.length} 个名为「${title}」的事件`,
        eventIds: group.map((e) => e.id),
      });
    }
  }

  for (const c of characters) {
    if (!c.name || !c.name.trim()) {
      issues.push({
        type: 'character-missing-name',
        severity: 'error',
        message: '存在无名称的角色',
        eventIds: [],
      });
    }
  }

  for (const w of worldSettings) {
    if (!w.key || !w.key.trim()) {
      issues.push({
        type: 'worldsetting-missing-key',
        severity: 'error',
        message: '存在无名称的世界观设定',
        eventIds: [],
      });
    }
  }

  const wsKeyMap = new Map<string, WorldSetting[]>();
  for (const w of worldSettings) {
    if (!w.key) continue;
    const list = wsKeyMap.get(w.key) ?? [];
    list.push(w);
    wsKeyMap.set(w.key, list);
  }
  for (const [key, group] of wsKeyMap) {
    if (group.length > 1) {
      issues.push({
        type: 'worldsetting-duplicate-key',
        severity: 'warning',
        message: `存在 ${group.length} 个名为「${key}」的世界观设定`,
        eventIds: [],
      });
    }
  }

  return issues;
}
