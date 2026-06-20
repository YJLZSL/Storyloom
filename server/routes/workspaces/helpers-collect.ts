import type { FastifyInstance } from 'fastify';
import { eq, inArray } from 'drizzle-orm';
import {
  workspaces, events, tracks, characters, eventCharacters, eventWorldSettings,
  connections, foreshadowings, worldSettings, outlineVersions, scenes, beats,
  choices, flags, maps, assets, characterAssets, eventAssets, sceneAssets,
} from '../../db/schema.js';

export function collectExportData(app: FastifyInstance, id: string, ws: typeof workspaces.$inferSelect) {
  const wsEvents = app.db.select({ id: events.id }).from(events).where(eq(events.workspaceId, id)).all();
  const wsEventIds = wsEvents.map(e => e.id);
  const wsScenes = app.db.select().from(scenes).where(eq(scenes.workspaceId, id)).all();
  const wsSceneIds = wsScenes.map(s => s.id);

  return {
    workspace: ws,
    events: app.db.select().from(events).where(eq(events.workspaceId, id)).all(),
    tracks: app.db.select().from(tracks).where(eq(tracks.workspaceId, id)).all(),
    characters: app.db.select().from(characters).where(eq(characters.workspaceId, id)).all(),
    eventCharacters: wsEventIds.length
      ? app.db.select().from(eventCharacters).where(inArray(eventCharacters.eventId, wsEventIds)).all()
      : [],
    eventWorldSettings: wsEventIds.length
      ? app.db.select().from(eventWorldSettings).where(inArray(eventWorldSettings.eventId, wsEventIds)).all()
      : [],
    connections: app.db.select().from(connections).where(eq(connections.workspaceId, id)).all(),
    foreshadowings: app.db.select().from(foreshadowings).where(eq(foreshadowings.workspaceId, id)).all(),
    worldSettings: app.db.select().from(worldSettings).where(eq(worldSettings.workspaceId, id)).all(),
    outlineVersions: app.db.select().from(outlineVersions).where(eq(outlineVersions.workspaceId, id)).all(),
    scenes: wsScenes,
    beats: wsSceneIds.length
      ? app.db.select().from(beats).where(inArray(beats.sceneId, wsSceneIds)).all()
      : [],
    choices: wsSceneIds.length ? (() => {
      const wsBeats = app.db.select({ id: beats.id }).from(beats).where(inArray(beats.sceneId, wsSceneIds)).all();
      const wsBeatIds = wsBeats.map(b => b.id);
      return wsBeatIds.length
        ? app.db.select().from(choices).where(inArray(choices.beatId, wsBeatIds)).all()
        : [];
    })() : [],
    flags: app.db.select().from(flags).where(eq(flags.workspaceId, id)).all(),
    maps: app.db.select().from(maps).where(eq(maps.workspaceId, id)).all(),
    assets: app.db.select().from(assets).where(eq(assets.workspaceId, id)).all(),
    characterAssets: wsEventIds.length ? (() => {
      const wsChars = app.db.select({ id: characters.id }).from(characters).where(eq(characters.workspaceId, id)).all();
      const wsCharIds = wsChars.map(c => c.id);
      return wsCharIds.length
        ? app.db.select().from(characterAssets).where(inArray(characterAssets.characterId, wsCharIds)).all()
        : [];
    })() : [],
    eventAssets: wsEventIds.length
      ? app.db.select().from(eventAssets).where(inArray(eventAssets.eventId, wsEventIds)).all()
      : [],
    sceneAssets: wsSceneIds.length
      ? app.db.select().from(sceneAssets).where(inArray(sceneAssets.sceneId, wsSceneIds)).all()
      : [],
  };
}
