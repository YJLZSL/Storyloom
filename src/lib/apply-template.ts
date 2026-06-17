import { api } from '../services/api.js';
import { getStoryTemplate } from './story-templates.js';
import type { Track, TimelineEvent, CreateTrackRequest, CreateEventRequest } from '../../shared/types.js';

export async function applyTemplate(workspaceId: string, templateId: string): Promise<void> {
  const template = getStoryTemplate(templateId);
  if (!template) {
    throw new Error(`未找到模板: ${templateId}`);
  }

  const trackIdMap: string[] = [];

  for (let i = 0; i < template.tracks.length; i++) {
    const t = template.tracks[i];
    const body: CreateTrackRequest = {
      name: t.name,
      color: t.color,
      orderIndex: i,
      isVisible: true,
    };
    const track = await api.post<Track>(`/api/workspaces/${workspaceId}/tracks`, body);
    trackIdMap[i] = track.id;
  }

  for (let i = 0; i < template.events.length; i++) {
    const e = template.events[i];
    const body: CreateEventRequest = {
      trackId: trackIdMap[e.trackIndex],
      title: e.title,
      description: e.description,
      startTime: e.startTime,
      endTime: e.endTime,
      orderIndex: i,
      narrativeOrder: i,
    };
    await api.post<TimelineEvent>(`/api/workspaces/${workspaceId}/events`, body);
  }
}
