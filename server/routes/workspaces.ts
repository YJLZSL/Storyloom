import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { workspaces, events, tracks, characters, eventCharacters, eventWorldSettings, connections, foreshadowings, worldSettings, autoSaves } from '../db/schema.js';
import { idParam, createWorkspaceBody, updateWorkspaceBody, autoSaveBody } from '../lib/validation.js';
import { recoverFromAutoSave } from '../services/auto-save.js';
import type { CreateWorkspaceRequest, UpdateWorkspaceRequest, ExportData } from '../../shared/types.js';

export async function workspacesRoutes(app: FastifyInstance) {
  // GET /api/workspaces — 列出所有工作区
  app.get('/', async () => {
    const result = app.db.select().from(workspaces).orderBy(desc(workspaces.updatedAt)).all();
    return { success: true, data: result };
  });

  // GET /api/workspaces/:id — 获取工作区详情
  app.get<{ Params: { id: string } }>('/:id', {
    schema: { params: idParam },
  }, async (request, reply) => {
    const { id } = request.params;
    const result = app.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!result) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }
    return { success: true, data: result };
  });

  // POST /api/workspaces — 创建工作区
  app.post<{ Body: CreateWorkspaceRequest }>('/', {
    schema: { body: createWorkspaceBody },
  }, async (request) => {
    const { name, description } = request.body;
    const now = new Date();
    const id = uuidv4();

    const result = app.db.insert(workspaces).values({
      id,
      name,
      description: description || '',
      settingsJson: '{}',
      createdAt: now,
      updatedAt: now,
    }).returning().get();

    // 创建默认轨道
    const defaultTrackId = uuidv4();
    app.db.insert(tracks).values({
      id: defaultTrackId,
      workspaceId: id,
      name: '主线',
      color: '#3b82f6',
      orderIndex: 0,
      isVisible: true,
    }).run();

    return { success: true, data: result };
  });

  // PATCH /api/workspaces/:id — 更新工作区
  app.patch<{ Params: { id: string }; Body: UpdateWorkspaceRequest }>('/:id', {
    schema: { params: idParam, body: updateWorkspaceBody },
  }, async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;

    const existing = app.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    const allowedFields: Record<string, unknown> = {};
    if (updates.name !== undefined) allowedFields.name = updates.name;
    if (updates.description !== undefined) allowedFields.description = updates.description;
    if (updates.calendarConfigJson !== undefined) allowedFields.calendarConfigJson = updates.calendarConfigJson;
    const result = app.db.update(workspaces).set({
      ...allowedFields,
      updatedAt: new Date(),
    }).where(eq(workspaces.id, id)).returning().get();

    return { success: true, data: result };
  });

  // DELETE /api/workspaces/:id — 删除工作区（级联删除所有关联数据）
  app.delete<{ Params: { id: string } }>('/:id', {
    schema: { params: idParam },
  }, async (request, reply) => {
    const { id } = request.params;

    const existing = app.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    // 使用事务级联删除（SQLite foreign key cascade 已配置，但显式事务更安全）
    app.sqlite.transaction(() => {
      // 删除顺序：先删引用，再删主体
      // event_characters 通过 events 的 cascade 删除
      // connections 通过 events 的 cascade 删除
      app.db.delete(events).where(eq(events.workspaceId, id)).run();
      app.db.delete(tracks).where(eq(tracks.workspaceId, id)).run();
      app.db.delete(characters).where(eq(characters.workspaceId, id)).run();
      app.db.delete(connections).where(eq(connections.workspaceId, id)).run();
      app.db.delete(foreshadowings).where(eq(foreshadowings.workspaceId, id)).run();
      app.db.delete(worldSettings).where(eq(worldSettings.workspaceId, id)).run();
      app.db.delete(autoSaves).where(eq(autoSaves.workspaceId, id)).run();
      app.db.delete(workspaces).where(eq(workspaces.id, id)).run();
    })();

    return { success: true, data: { id } };
  });

  // GET /api/workspaces/:id/export — 导出工作区
  app.get<{ Params: { id: string } }>('/:id/export', async (request, reply) => {
    const { id } = request.params;

    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    // 先查询该工作区的所有事件 ID，用于过滤 eventCharacters
    const wsEvents = app.db.select({ id: events.id }).from(events).where(eq(events.workspaceId, id)).all();
    const wsEventIds = wsEvents.map(e => e.id);

    const exportData: ExportData = {
      version: '4.0',
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
      exportedAt: Date.now(),
    };

    return { success: true, data: exportData };
  });

  // POST /api/workspaces/:id/import — 导入工作区数据
  app.post<{ Params: { id: string }; Body: ExportData; Querystring: { strategy?: string } }>('/:id/import', {
    schema: { params: idParam },
  }, async (request, reply) => {
    const { id } = request.params;
    const data = request.body;
    const strategy = (request.query.strategy || 'skip') as 'skip' | 'overwrite' | 'merge';

    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    /** Convert a timestamp (number or Date) to Date for Drizzle */
    const toDate = (v: unknown): Date | undefined =>
      v == null ? undefined : v instanceof Date ? v : new Date(v as number);

    app.sqlite.transaction(() => {
      // overwrite 策略：先删除目标工作区的所有数据
      if (strategy === 'overwrite') {
        const existingEventIds = app.db.select({ id: events.id }).from(events).where(eq(events.workspaceId, id)).all().map(e => e.id);
        if (existingEventIds.length) {
          app.db.delete(eventCharacters).where(inArray(eventCharacters.eventId, existingEventIds)).run();
          app.db.delete(eventWorldSettings).where(inArray(eventWorldSettings.eventId, existingEventIds)).run();
        }
        app.db.delete(events).where(eq(events.workspaceId, id)).run();
        app.db.delete(tracks).where(eq(tracks.workspaceId, id)).run();
        app.db.delete(characters).where(eq(characters.workspaceId, id)).run();
        app.db.delete(connections).where(eq(connections.workspaceId, id)).run();
        app.db.delete(foreshadowings).where(eq(foreshadowings.workspaceId, id)).run();
        app.db.delete(worldSettings).where(eq(worldSettings.workspaceId, id)).run();
      }

      // 导入轨道
      if (data.tracks?.length) {
        for (const track of data.tracks) {
          const values = { ...track, workspaceId: id } as typeof tracks.$inferInsert;
          const insert = app.db.insert(tracks).values(values);
          if (strategy === 'merge') {
            insert.onConflictDoUpdate({ target: tracks.id, set: values }).run();
          } else {
            insert.onConflictDoNothing().run();
          }
        }
      }

      // 导入事件
      if (data.events?.length) {
        for (const event of data.events) {
          const ev = { ...event, workspaceId: id } as Record<string, unknown>;
          if (ev.startTime != null) ev.startTime = toDate(ev.startTime);
          if (ev.endTime != null) ev.endTime = toDate(ev.endTime);
          if (ev.createdAt != null) ev.createdAt = toDate(ev.createdAt);
          if (ev.updatedAt != null) ev.updatedAt = toDate(ev.updatedAt);
          const values = ev as typeof events.$inferInsert;
          const insert = app.db.insert(events).values(values);
          if (strategy === 'merge') {
            insert.onConflictDoUpdate({ target: events.id, set: values }).run();
          } else {
            insert.onConflictDoNothing().run();
          }
        }
      }

      // 导入角色
      if (data.characters?.length) {
        for (const char of data.characters) {
          const values = { ...char, workspaceId: id } as typeof characters.$inferInsert;
          const insert = app.db.insert(characters).values(values);
          if (strategy === 'merge') {
            insert.onConflictDoUpdate({ target: characters.id, set: values }).run();
          } else {
            insert.onConflictDoNothing().run();
          }
        }
      }

      // 导入事件-角色关联
      if (data.eventCharacters?.length) {
        for (const ec of data.eventCharacters) {
          const values = ec as typeof eventCharacters.$inferInsert;
          const insert = app.db.insert(eventCharacters).values(values);
          if (strategy === 'merge') {
            insert.onConflictDoUpdate({
              target: [eventCharacters.eventId, eventCharacters.characterId],
              set: { roleDescription: values.roleDescription },
            }).run();
          } else {
            insert.onConflictDoNothing().run();
          }
        }
      }

      // 导入事件-世界观设定关联
      if (data.eventWorldSettings?.length) {
        for (const ews of data.eventWorldSettings) {
          app.db.insert(eventWorldSettings).values(ews as typeof eventWorldSettings.$inferInsert)
            .onConflictDoNothing().run();
        }
      }

      // 导入关联
      if (data.connections?.length) {
        for (const conn of data.connections) {
          const values = { ...conn, workspaceId: id } as typeof connections.$inferInsert;
          const insert = app.db.insert(connections).values(values);
          if (strategy === 'merge') {
            insert.onConflictDoUpdate({ target: connections.id, set: values }).run();
          } else {
            insert.onConflictDoNothing().run();
          }
        }
      }

      // 导入伏笔
      if (data.foreshadowings?.length) {
        for (const fs of data.foreshadowings) {
          const fo = { ...fs, workspaceId: id } as Record<string, unknown>;
          if (fo.createdAt != null) fo.createdAt = toDate(fo.createdAt);
          if (fo.updatedAt != null) fo.updatedAt = toDate(fo.updatedAt);
          const values = fo as typeof foreshadowings.$inferInsert;
          const insert = app.db.insert(foreshadowings).values(values);
          if (strategy === 'merge') {
            insert.onConflictDoUpdate({ target: foreshadowings.id, set: values }).run();
          } else {
            insert.onConflictDoNothing().run();
          }
        }
      }

      // 导入世界观设定
      if (data.worldSettings?.length) {
        for (const wSetting of data.worldSettings) {
          const values = { ...wSetting, workspaceId: id } as typeof worldSettings.$inferInsert;
          const insert = app.db.insert(worldSettings).values(values);
          if (strategy === 'merge') {
            insert.onConflictDoUpdate({ target: worldSettings.id, set: values }).run();
          } else {
            insert.onConflictDoNothing().run();
          }
        }
      }
    })();

    return { success: true, data: { imported: true } };
  });

  // POST /api/workspaces/:id/auto-saves — 创建自动保存
  app.post<{ Params: { id: string }; Body: { dataJson: string } }>('/:id/auto-saves', {
    schema: { params: idParam, body: autoSaveBody },
  }, async (request, reply) => {
    const { id } = request.params;
    const { dataJson } = request.body;

    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    const saveId = uuidv4();
    const result = app.db.insert(autoSaves).values({
      id: saveId,
      workspaceId: id,
      dataJson,
      createdAt: new Date(),
    }).returning().get();

    // 清理旧自动保存，保留最近 20 个
    const saves = app.db.select().from(autoSaves)
      .where(eq(autoSaves.workspaceId, id))
      .orderBy(desc(autoSaves.createdAt))
      .all();

    if (saves.length > 20) {
      const toDelete = saves.slice(20);
      for (const s of toDelete) {
        app.db.delete(autoSaves).where(eq(autoSaves.id, s.id)).run();
      }
    }

    return { success: true, data: result };
  });

  // GET /api/workspaces/:id/auto-saves — 列出自动保存
  app.get<{ Params: { id: string } }>('/:id/auto-saves', {
    schema: { params: idParam },
  }, async (request) => {
    const { id } = request.params;
    const result = app.db.select().from(autoSaves)
      .where(eq(autoSaves.workspaceId, id))
      .orderBy(desc(autoSaves.createdAt))
      .limit(20)
      .all();
    return { success: true, data: result };
  });

  // GET /api/workspaces/:id/auto-saves/latest — 获取最新自动保存
  app.get<{ Params: { id: string } }>('/:id/auto-saves/latest', {
    schema: { params: idParam },
  }, async (request, reply) => {
    const { id } = request.params;
    const result = app.db.select().from(autoSaves)
      .where(eq(autoSaves.workspaceId, id))
      .orderBy(desc(autoSaves.createdAt))
      .limit(1)
      .get();
    if (!result) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '无自动保存数据' } });
    }
    return { success: true, data: result };
  });

  // POST /api/workspaces/:id/auto-saves/recover — 从最新自动保存恢复工作区数据
  app.post<{ Params: { id: string } }>('/:id/auto-saves/recover', {
    schema: { params: idParam },
  }, async (request) => {
    const { id } = request.params;
    const recovered = recoverFromAutoSave(id);
    return { success: true, data: { recovered } };
  });
}
