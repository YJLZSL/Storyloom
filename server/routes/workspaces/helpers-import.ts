import type { FastifyInstance } from 'fastify';
import { eq, inArray } from 'drizzle-orm';
import {
  events, tracks, characters, eventCharacters, eventWorldSettings,
  connections, foreshadowings, worldSettings, outlineVersions, scenes, beats,
  choices, flags, maps, assets, characterAssets, eventAssets, sceneAssets,
} from '../../db/schema.js';
import type { ExportData } from '../../../shared/types.js';

const toDate = (v: unknown): Date | undefined =>
  v == null ? undefined : v instanceof Date ? v : new Date(v as number);

function clearExisting(app: FastifyInstance, id: string): void {
  const existingEventIds = app.db.select({ id: events.id }).from(events).where(eq(events.workspaceId, id)).all().map(e => e.id);
  if (existingEventIds.length) {
    app.db.delete(eventCharacters).where(inArray(eventCharacters.eventId, existingEventIds)).run();
    app.db.delete(eventWorldSettings).where(inArray(eventWorldSettings.eventId, existingEventIds)).run();
    app.db.delete(eventAssets).where(inArray(eventAssets.eventId, existingEventIds)).run();
  }
  const existingSceneIds = app.db.select({ id: scenes.id }).from(scenes).where(eq(scenes.workspaceId, id)).all().map(s => s.id);
  if (existingSceneIds.length) {
    const existingBeatIds = app.db.select({ id: beats.id }).from(beats).where(inArray(beats.sceneId, existingSceneIds)).all().map(b => b.id);
    if (existingBeatIds.length) {
      app.db.delete(choices).where(inArray(choices.beatId, existingBeatIds)).run();
    }
    app.db.delete(sceneAssets).where(inArray(sceneAssets.sceneId, existingSceneIds)).run();
  }
  app.db.delete(events).where(eq(events.workspaceId, id)).run();
  app.db.delete(tracks).where(eq(tracks.workspaceId, id)).run();
  app.db.delete(characters).where(eq(characters.workspaceId, id)).run();
  app.db.delete(connections).where(eq(connections.workspaceId, id)).run();
  app.db.delete(foreshadowings).where(eq(foreshadowings.workspaceId, id)).run();
  app.db.delete(worldSettings).where(eq(worldSettings.workspaceId, id)).run();
  app.db.delete(outlineVersions).where(eq(outlineVersions.workspaceId, id)).run();
  app.db.delete(flags).where(eq(flags.workspaceId, id)).run();
  app.db.delete(scenes).where(eq(scenes.workspaceId, id)).run();
  app.db.delete(maps).where(eq(maps.workspaceId, id)).run();
  app.db.delete(assets).where(eq(assets.workspaceId, id)).run();
}

export function importWorkspaceData(
  app: FastifyInstance,
  id: string,
  data: ExportData,
  strategy: 'skip' | 'overwrite' | 'merge',
): void {
  app.sqlite.transaction(() => {
    if (strategy === 'overwrite') clearExisting(app, id);

    if (data.tracks?.length) {
      for (const track of data.tracks) {
        const values = { ...track, workspaceId: id } as typeof tracks.$inferInsert;
        const insert = app.db.insert(tracks).values(values);
        if (strategy === 'merge') insert.onConflictDoUpdate({ target: tracks.id, set: values }).run();
        else insert.onConflictDoNothing().run();
      }
    }
    if (data.events?.length) {
      for (const event of data.events) {
        const ev = { ...event, workspaceId: id } as Record<string, unknown>;
        if (ev.startTime != null) ev.startTime = toDate(ev.startTime);
        if (ev.endTime != null) ev.endTime = toDate(ev.endTime);
        if (ev.createdAt != null) ev.createdAt = toDate(ev.createdAt);
        if (ev.updatedAt != null) ev.updatedAt = toDate(ev.updatedAt);
        const values = ev as typeof events.$inferInsert;
        const insert = app.db.insert(events).values(values);
        if (strategy === 'merge') insert.onConflictDoUpdate({ target: events.id, set: values }).run();
        else insert.onConflictDoNothing().run();
      }
    }
    if (data.characters?.length) {
      for (const char of data.characters) {
        const values = { ...char, workspaceId: id } as typeof characters.$inferInsert;
        const insert = app.db.insert(characters).values(values);
        if (strategy === 'merge') insert.onConflictDoUpdate({ target: characters.id, set: values }).run();
        else insert.onConflictDoNothing().run();
      }
    }
    if (data.eventCharacters?.length) {
      for (const ec of data.eventCharacters) {
        const values = ec as typeof eventCharacters.$inferInsert;
        const insert = app.db.insert(eventCharacters).values(values);
        if (strategy === 'merge') {
          insert.onConflictDoUpdate({
            target: [eventCharacters.eventId, eventCharacters.characterId],
            set: { roleDescription: values.roleDescription },
          }).run();
        } else insert.onConflictDoNothing().run();
      }
    }
    if (data.eventWorldSettings?.length) {
      for (const ews of data.eventWorldSettings) {
        app.db.insert(eventWorldSettings).values(ews as typeof eventWorldSettings.$inferInsert).onConflictDoNothing().run();
      }
    }
    if (data.connections?.length) {
      for (const conn of data.connections) {
        const values = { ...conn, workspaceId: id } as typeof connections.$inferInsert;
        const insert = app.db.insert(connections).values(values);
        if (strategy === 'merge') insert.onConflictDoUpdate({ target: connections.id, set: values }).run();
        else insert.onConflictDoNothing().run();
      }
    }
    if (data.foreshadowings?.length) {
      for (const fs of data.foreshadowings) {
        const fo = { ...fs, workspaceId: id } as Record<string, unknown>;
        if (fo.createdAt != null) fo.createdAt = toDate(fo.createdAt);
        if (fo.updatedAt != null) fo.updatedAt = toDate(fo.updatedAt);
        const values = fo as typeof foreshadowings.$inferInsert;
        const insert = app.db.insert(foreshadowings).values(values);
        if (strategy === 'merge') insert.onConflictDoUpdate({ target: foreshadowings.id, set: values }).run();
        else insert.onConflictDoNothing().run();
      }
    }
    if (data.worldSettings?.length) {
      for (const wSetting of data.worldSettings) {
        const values = { ...wSetting, workspaceId: id } as typeof worldSettings.$inferInsert;
        const insert = app.db.insert(worldSettings).values(values);
        if (strategy === 'merge') insert.onConflictDoUpdate({ target: worldSettings.id, set: values }).run();
        else insert.onConflictDoNothing().run();
      }
    }
    if (data.outlineVersions?.length) {
      for (const ov of data.outlineVersions) {
        const o = { ...ov, workspaceId: id } as Record<string, unknown>;
        if (o.createdAt != null) o.createdAt = toDate(o.createdAt);
        app.db.insert(outlineVersions).values(o as typeof outlineVersions.$inferInsert).onConflictDoNothing().run();
      }
    }
    if (data.assets?.length) {
      for (const a of data.assets) {
        const asset = { ...a, workspaceId: id } as Record<string, unknown>;
        if (asset.createdAt != null) asset.createdAt = toDate(asset.createdAt);
        app.db.insert(assets).values(asset as typeof assets.$inferInsert).onConflictDoNothing().run();
      }
    }
    if (data.maps?.length) {
      for (const m of data.maps) {
        const map = { ...m, workspaceId: id } as Record<string, unknown>;
        if (map.createdAt != null) map.createdAt = toDate(map.createdAt);
        if (map.updatedAt != null) map.updatedAt = toDate(map.updatedAt);
        app.db.insert(maps).values(map as typeof maps.$inferInsert).onConflictDoNothing().run();
      }
    }
    if (data.scenes?.length) {
      for (const s of data.scenes) {
        const sc = { ...s, workspaceId: id } as Record<string, unknown>;
        if (sc.createdAt != null) sc.createdAt = toDate(sc.createdAt);
        if (sc.updatedAt != null) sc.updatedAt = toDate(sc.updatedAt);
        app.db.insert(scenes).values(sc as typeof scenes.$inferInsert).onConflictDoNothing().run();
      }
    }
    if (data.beats?.length) {
      for (const b of data.beats) {
        const beat = { ...b } as Record<string, unknown>;
        if (beat.createdAt != null) beat.createdAt = toDate(beat.createdAt);
        if (beat.updatedAt != null) beat.updatedAt = toDate(beat.updatedAt);
        app.db.insert(beats).values(beat as typeof beats.$inferInsert).onConflictDoNothing().run();
      }
    }
    if (data.choices?.length) {
      for (const c of data.choices) {
        app.db.insert(choices).values(c as typeof choices.$inferInsert).onConflictDoNothing().run();
      }
    }
    if (data.flags?.length) {
      for (const f of data.flags) {
        const flag = { ...f, workspaceId: id } as typeof flags.$inferInsert;
        app.db.insert(flags).values(flag).onConflictDoNothing().run();
      }
    }
    if (data.characterAssets?.length) {
      for (const ca of data.characterAssets) {
        app.db.insert(characterAssets).values(ca as typeof characterAssets.$inferInsert).onConflictDoNothing().run();
      }
    }
    if (data.eventAssets?.length) {
      for (const ea of data.eventAssets) {
        app.db.insert(eventAssets).values(ea as typeof eventAssets.$inferInsert).onConflictDoNothing().run();
      }
    }
    if (data.sceneAssets?.length) {
      for (const sa of data.sceneAssets) {
        app.db.insert(sceneAssets).values(sa as typeof sceneAssets.$inferInsert).onConflictDoNothing().run();
      }
    }
  })();
}
