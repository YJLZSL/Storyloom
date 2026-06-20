import { useMemo, useCallback } from 'react';
import {
  useEvents,
  useCharacters,
  useWorldSettings,
  useConnections,
} from '@/services/api-hooks';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useUIStore } from '@/stores/useUIStore';
import { useSelectionStore } from '@/stores/useSelectionStore';
import { LEGEND_ITEMS } from '@/lib/colors';
import {
  RelationshipGraph,
  type GraphNode,
  type GraphLink,
} from './RelationshipGraph';

export function RelationshipView() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const selectEvent = useSelectionStore((s) => s.selectEvent);
  const selectCharacter = useSelectionStore((s) => s.selectCharacter);
  const selectWorldSetting = useSelectionStore((s) => s.selectWorldSetting);
  const setViewMode = useTimelineStore((s) => s.setViewMode);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const selectedEventId = useSelectionStore((s) => s.selectedEventId);
  const selectedCharacterId = useSelectionStore((s) => s.selectedCharacterId);

  const { data: eventsData, isLoading: eventsLoading } = useEvents(workspaceId);
  const { data: characters, isLoading: charsLoading } = useCharacters(workspaceId);
  const { data: worldSettings, isLoading: wsLoading } = useWorldSettings(workspaceId);
  const { data: connections, isLoading: connLoading } = useConnections(workspaceId);

  const events = eventsData?.items ?? [];

  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const degreeMap = new Map<string, number>();
    const rawLinks: { source: string; target: string }[] = [];
    const seen = new Set<string>();

    const addLink = (source: string, target: string) => {
      if (!nodeMap.has(source) || !nodeMap.has(target)) return;
      const key = `${source}|${target}`;
      if (seen.has(key)) return;
      seen.add(key);
      rawLinks.push({ source, target });
      degreeMap.set(source, (degreeMap.get(source) ?? 0) + 1);
      degreeMap.set(target, (degreeMap.get(target) ?? 0) + 1);
    };

    for (const c of characters ?? []) {
      const id = `char:${c.id}`;
      nodeMap.set(id, {
        id,
        rawId: c.id,
        type: 'character',
        label: c.name,
        degree: 0,
      });
    }

    for (const e of events) {
      const id = `event:${e.id}`;
      nodeMap.set(id, {
        id,
        rawId: e.id,
        type: 'event',
        label: e.title,
        degree: 0,
      });
    }

    for (const w of worldSettings ?? []) {
      const id = `ws:${w.id}`;
      nodeMap.set(id, {
        id,
        rawId: w.id,
        type: 'world-setting',
        label: w.key,
        degree: 0,
      });
    }

    for (const conn of connections ?? []) {
      addLink(`event:${conn.sourceEventId}`, `event:${conn.targetEventId}`);
    }

    for (const e of events) {
      for (const charId of e.characterIds ?? []) {
        addLink(`event:${e.id}`, `char:${charId}`);
      }
      for (const wsId of e.worldSettingIds ?? []) {
        addLink(`event:${e.id}`, `ws:${wsId}`);
      }
    }

    const nodeList: GraphNode[] = [];
    for (const node of nodeMap.values()) {
      node.degree = degreeMap.get(node.id) ?? 0;
      nodeList.push(node);
    }

    const linkList: GraphLink[] = rawLinks.map((l) => ({
      source: l.source,
      target: l.target,
    }));

    return { nodes: nodeList, links: linkList };
  }, [events, characters, worldSettings, connections]);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (node.type === 'event') {
        selectEvent(node.rawId);
        setViewMode('timeline');
      } else if (node.type === 'character') {
        selectCharacter(node.rawId);
        setActivePanel('characters');
      } else {
        selectWorldSetting(node.rawId);
        setActivePanel('worldview');
      }
    },
    [selectEvent, selectCharacter, selectWorldSetting, setViewMode, setActivePanel],
  );

  const highlightedNodeIds = useMemo(() => {
    if (!selectedEventId && !selectedCharacterId) return null;
    const ids = new Set<string>();
    if (selectedEventId) {
      const eventNodeId = `event:${selectedEventId}`;
      ids.add(eventNodeId);
      const event = events.find((e) => e.id === selectedEventId);
      if (event) {
        for (const cid of event.characterIds ?? []) ids.add(`char:${cid}`);
        for (const wid of event.worldSettingIds ?? []) ids.add(`ws:${wid}`);
      }
      for (const conn of connections ?? []) {
        if (conn.sourceEventId === selectedEventId) ids.add(`event:${conn.targetEventId}`);
        if (conn.targetEventId === selectedEventId) ids.add(`event:${conn.sourceEventId}`);
      }
    }
    if (selectedCharacterId) {
      ids.add(`char:${selectedCharacterId}`);
    }
    return ids;
  }, [selectedEventId, selectedCharacterId, events, connections]);

  const isLoading = eventsLoading || charsLoading || wsLoading || connLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">加载关系数据…</p>
      </div>
    );
  }

  if (nodes.length === 0 && links.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-center text-sm text-muted-foreground">
          暂无关系数据，添加角色和关联以可视化关系
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <RelationshipGraph
        nodes={nodes}
        links={links}
        onNodeClick={handleNodeClick}
        highlightedNodeIds={highlightedNodeIds}
      />
      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5 rounded-md border border-border bg-card/80 px-3 py-2 text-xs backdrop-blur">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.type} className="flex items-center gap-2">
            <span
              className="inline-block size-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
