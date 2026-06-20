import { useSelectionStore, type SelectionEntity } from '@/stores/useSelectionStore';
import { useTimelineStore } from '@/stores/useTimelineStore';
import { useUIStore } from '@/stores/useUIStore';
import { useViewStore } from '@/stores/useViewStore';

export type RevealEntityType = SelectionEntity | 'connection';

const SELECTORS: Record<string, string> = {
  event: 'data-event-id',
  character: 'data-entity-id',
  foreshadowing: 'data-entity-id',
  worldSetting: 'data-entity-id',
  scene: 'data-scene-id',
  beat: 'data-beat-id',
  choice: 'data-choice-id',
};

/**
 * 在已渲染的 DOM 中定位并平滑滚动到指定实体元素。
 * 由 revealInBestView 在切换视图/面板后异步调用。
 */
export function scrollSelectedIntoView(entityType: RevealEntityType, id: string, container?: HTMLElement | null) {
  const attr = SELECTORS[entityType];
  if (!attr) return;

  const scopedContainer = container ?? document;
  const target = scopedContainer.querySelector(`[${attr}="${id}"]`);

  if (target && 'scrollIntoView' in target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }
}

/**
 * 选择实体并将其揭示到最佳视图/面板。
 * - event: 时间轴视图 + 滚动到事件
 * - character: 角色面板
 * - foreshadowing: 伏笔面板
 * - worldSetting: 世界观面板
 * - scene: event-editor 面板（script-editor 面板实现前临时映射）
 * - beat: 时间轴视图 + 滚动到事件
 * - choice: 树状视图
 * - connection: 关联面板
 */
export function revealInBestView(entityType: RevealEntityType, id: string) {
  const selection = useSelectionStore.getState();
  const timeline = useTimelineStore.getState();
  const ui = useUIStore.getState();
  const view = useViewStore.getState();

  switch (entityType) {
    case 'event':
      selection.selectEvent(id);
      view.setActiveView('timeline');
      timeline.scrollToEvent(id);
      break;

    case 'character':
      selection.selectCharacter(id);
      ui.setActivePanel('characters');
      break;

    case 'foreshadowing':
      selection.selectForeshadowing(id);
      ui.setActivePanel('foreshadowing');
      break;

    case 'worldSetting':
      selection.selectWorldSetting(id);
      ui.setActivePanel('worldview');
      break;

    case 'scene':
      selection.selectScene(id);
      // TODO: 后续应切换到专门的 script-editor / scenes 面板
      ui.setActivePanel('event-editor');
      break;

    case 'beat':
      selection.selectBeat(id);
      view.setActiveView('timeline');
      break;

    case 'choice':
      selection.selectChoice(id);
      view.setActiveView('tree');
      break;

    case 'connection':
      ui.setActivePanel('connections');
      break;

    default:
      break;
  }
}
