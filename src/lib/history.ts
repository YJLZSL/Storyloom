import { useHistoryStore, type HistoryEntityType, type HistoryRecord } from '@/stores/historyStore.js';

export function pushHistoryRecord(record: Omit<HistoryRecord, 'id'>) {
  useHistoryStore.getState().push({
    ...record,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  });
}

export function clearHistory() {
  useHistoryStore.getState().clear();
}

export function buildUpdateRecord<T extends Record<string, unknown>>(
  entityType: HistoryEntityType,
  workspaceId: string,
  entityId: string,
  before: T,
  after: T,
): HistoryRecord | null {
  const changed: Partial<T> = {};
  for (const key of Object.keys(after) as Array<keyof T>) {
    if (before[key] !== after[key]) {
      changed[key] = before[key];
    }
  }
  if (Object.keys(changed).length === 0) return null;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    workspaceId,
    entityType,
    action: 'update',
    entityId,
    data: changed as Record<string, unknown>,
    meta: { after },
  };
}
