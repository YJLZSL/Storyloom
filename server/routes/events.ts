import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, between, like, desc, asc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { events, eventCharacters, eventWorldSettings, characters } from '../db/schema.js';
import { workspaceIdParam, eventIdParam, createEventBody, updateEventBody } from '../lib/validation.js';
import type { CreateEventRequest, UpdateEventRequest, EventFilterParams, BatchOperation, BatchEventsRequest } from '../../shared/types.js';

export async function eventsRoutes(app: FastifyInstance) {

  // 验证工作区存在的辅助函数
  async function validateWorkspace(workspaceId: string, reply: FastifyReply): Promise<boolean> {
    const { workspaces } = await import('../db/schema.js');
    const ws = app.db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!ws) {
      reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
      return false;
    }
    return true;
  }

  function escapeLike(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  }

  // GET / — 列出事件（支持分页、过滤、排序）
  app.get<{ Params: { workspaceId: string }; Querystring: EventFilterParams }>('/', async (request) => {
    const { workspaceId } = request.params;
    const { trackId, search, startDate, endDate, sortBy = 'orderIndex', sortOrder = 'asc', page = 1, pageSize = 200 } = request.query;

    const conditions = [eq(events.workspaceId, workspaceId)];

    if (trackId) {
      conditions.push(eq(events.trackId, trackId));
    }

    if (search) {
      const escapedSearch = escapeLike(search);
      conditions.push(sql`${events.title} LIKE ${`%${escapedSearch}%`} ESCAPE '\\'`);
    }

    if (startDate && endDate) {
      conditions.push(between(events.startTime, new Date(startDate), new Date(endDate)));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const orderColumn = sortBy === 'startTime' ? events.startTime
      : sortBy === 'createdAt' ? events.createdAt
      : sortBy === 'updatedAt' ? events.updatedAt
      : events.orderIndex;

    const orderFn = sortOrder === 'desc' ? desc : asc;

    // 获取总数
    const countResult = app.db.select({ count: sql<number>`count(*)` }).from(events)
      .where(whereClause).get();
    const total = countResult?.count ?? 0;

    // 分页查询
    const offset = (page - 1) * pageSize;
    const items = app.db.select().from(events)
      .where(whereClause)
      .orderBy(orderFn(orderColumn))
      .limit(pageSize)
      .offset(offset)
      .all();

    // 批量获取事件的角色关联和世界观关联
    const eventIds = items.map((e) => e.id);
    let charMap: Map<string, string[]> = new Map();
    let wsMap: Map<string, string[]> = new Map();

    if (eventIds.length > 0) {
      const charRows = app.db.select({
        eventId: eventCharacters.eventId,
        characterId: eventCharacters.characterId,
      })
        .from(eventCharacters)
        .where(sql`${eventCharacters.eventId} IN (${sql.join(eventIds.map(id => sql`${id}`), sql`, `)})`)
        .all();

      for (const row of charRows) {
        const arr = charMap.get(row.eventId) || [];
        arr.push(row.characterId);
        charMap.set(row.eventId, arr);
      }

      const wsRows = app.db.select({
        eventId: eventWorldSettings.eventId,
        worldSettingId: eventWorldSettings.worldSettingId,
      })
        .from(eventWorldSettings)
        .where(sql`${eventWorldSettings.eventId} IN (${sql.join(eventIds.map(id => sql`${id}`), sql`, `)})`)
        .all();

      for (const row of wsRows) {
        const arr = wsMap.get(row.eventId) || [];
        arr.push(row.worldSettingId);
        wsMap.set(row.eventId, arr);
      }
    }

    const enrichedItems = items.map((e) => ({
      ...e,
      characterIds: charMap.get(e.id) || [],
      worldSettingIds: wsMap.get(e.id) || [],
    }));

    return {
      success: true,
      data: {
        items: enrichedItems,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  });

  // GET /:eventId — 获取事件详情
  app.get<{ Params: { workspaceId: string; eventId: string } }>('/:eventId', async (request, reply) => {
    const { workspaceId, eventId } = request.params;

    const event = app.db.select().from(events)
      .where(and(eq(events.id, eventId), eq(events.workspaceId, workspaceId)))
      .get();

    if (!event) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '事件不存在' } });
    }

    // 获取关联角色
    const relatedChars = app.db.select({
      characterId: eventCharacters.characterId,
      roleDescription: eventCharacters.roleDescription,
      characterName: characters.name,
    })
      .from(eventCharacters)
      .innerJoin(characters, eq(eventCharacters.characterId, characters.id))
      .where(eq(eventCharacters.eventId, eventId))
      .all();

    // 获取关联世界观设定
    const relatedWs = app.db.select({
      worldSettingId: eventWorldSettings.worldSettingId,
    })
      .from(eventWorldSettings)
      .where(eq(eventWorldSettings.eventId, eventId))
      .all();

    const characterIds = relatedChars.map((c) => c.characterId);
    const worldSettingIds = relatedWs.map((w) => w.worldSettingId);

    return { success: true, data: { ...event, characters: relatedChars, characterIds, worldSettingIds } };
  });

  // POST / — 创建事件
  app.post<{ Params: { workspaceId: string }; Body: CreateEventRequest }>('/', {
    schema: { params: workspaceIdParam, body: createEventBody },
  }, async (request, reply) => {
    const { workspaceId } = request.params;
    if (!await validateWorkspace(workspaceId, reply)) return;
    const body = request.body;
    const now = new Date();
    const id = body.id || uuidv4();

    // Validate id uniqueness when provided
    if (body.id) {
      const existing = app.db.select().from(events).where(eq(events.id, id)).get();
      if (existing) {
        return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: '事件 ID 已存在' } });
      }
    }

    const result = app.sqlite.transaction(() => {
      const event = app.db.insert(events).values({
        id,
        workspaceId,
        trackId: body.trackId || null,
        title: body.title,
        summary: body.summary || '',
        description: body.description || '',
        location: body.location || '',
        startTime: body.startTime ? new Date(body.startTime) : null,
        endTime: body.endTime ? new Date(body.endTime) : null,
        orderIndex: body.orderIndex ?? 0,
        narrativeOrder: body.narrativeOrder ?? 0,
        color: body.color || '',
        tagsJson: body.tagsJson || '[]',
        createdAt: now,
        updatedAt: now,
      }).returning().get();

      // 处理角色关联
      if (body.characterIds?.length) {
        for (const charId of body.characterIds) {
          app.db.insert(eventCharacters).values({
            eventId: id,
            characterId: charId,
            roleDescription: '',
          }).run();
        }
      }

      // 处理世界观设定关联
      if (body.worldSettingIds?.length) {
        for (const wsId of body.worldSettingIds) {
          app.db.insert(eventWorldSettings).values({
            eventId: id,
            worldSettingId: wsId,
          }).run();
        }
      }

      return event;
    })();

    return { success: true, data: result };
  });

  // PATCH /:eventId — 更新事件
  app.patch<{ Params: { workspaceId: string; eventId: string }; Body: UpdateEventRequest }>('/:eventId', {
    schema: { params: eventIdParam, body: updateEventBody },
  }, async (request, reply) => {
    const { workspaceId, eventId } = request.params;
    const body = request.body;

    const existing = app.db.select().from(events)
      .where(and(eq(events.id, eventId), eq(events.workspaceId, workspaceId)))
      .get();

    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '事件不存在' } });
    }

    const result = app.sqlite.transaction(() => {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (body.trackId !== undefined) updateData.trackId = body.trackId;
      if (body.title !== undefined) updateData.title = body.title;
      if (body.summary !== undefined) updateData.summary = body.summary;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.location !== undefined) updateData.location = body.location;
      if (body.startTime !== undefined) updateData.startTime = body.startTime ? new Date(body.startTime) : null;
      if (body.endTime !== undefined) updateData.endTime = body.endTime ? new Date(body.endTime) : null;
      if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex;
      if (body.narrativeOrder !== undefined) updateData.narrativeOrder = body.narrativeOrder;
      if (body.color !== undefined) updateData.color = body.color;
      if (body.tagsJson !== undefined) updateData.tagsJson = body.tagsJson;

      const updated = app.db.update(events).set(updateData)
        .where(eq(events.id, eventId))
        .returning().get();

      // 更新角色关联
      if (body.characterIds !== undefined) {
        // 删除旧的关联
        app.db.delete(eventCharacters).where(eq(eventCharacters.eventId, eventId)).run();
        // 添加新的关联
        for (const charId of body.characterIds) {
          app.db.insert(eventCharacters).values({
            eventId,
            characterId: charId,
            roleDescription: '',
          }).run();
        }
      }

      // 更新世界观设定关联
      if (body.worldSettingIds !== undefined) {
        // 删除旧的关联
        app.db.delete(eventWorldSettings).where(eq(eventWorldSettings.eventId, eventId)).run();
        // 添加新的关联
        for (const wsId of body.worldSettingIds) {
          app.db.insert(eventWorldSettings).values({
            eventId,
            worldSettingId: wsId,
          }).run();
        }
      }

      return updated;
    })();

    return { success: true, data: result };
  });

  // DELETE /:eventId — 删除事件
  app.delete<{ Params: { workspaceId: string; eventId: string } }>('/:eventId', {
    schema: { params: eventIdParam },
  }, async (request, reply) => {
    const { workspaceId, eventId } = request.params;

    const existing = app.db.select().from(events)
      .where(and(eq(events.id, eventId), eq(events.workspaceId, workspaceId)))
      .get();

    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '事件不存在' } });
    }

    app.db.delete(events).where(eq(events.id, eventId)).run();

    return { success: true, data: { id: eventId } };
  });

  // POST /batch — 批量操作
  app.post<{ Params: { workspaceId: string }; Body: BatchEventsRequest }>('/batch', async (request, reply) => {
    const { workspaceId } = request.params;
    if (!await validateWorkspace(workspaceId, reply)) return;
    const { operations } = request.body;
    const results: unknown[] = [];

    app.sqlite.transaction(() => {
      for (const op of operations) {
        switch (op.type) {
          case 'create': {
            const data = op.data as CreateEventRequest;
            const id = uuidv4();
            const now = new Date();
            const event = app.db.insert(events).values({
              id,
              workspaceId,
              trackId: data.trackId || null,
              title: data.title,
              summary: data.summary || '',
              description: data.description || '',
              location: data.location || '',
              startTime: data.startTime ? new Date(data.startTime) : null,
              endTime: data.endTime ? new Date(data.endTime) : null,
              orderIndex: data.orderIndex ?? 0,
              color: data.color || '',
              tagsJson: data.tagsJson || '[]',
              createdAt: now,
              updatedAt: now,
            }).returning().get();
            results.push(event);
            break;
          }
          case 'update': {
            const data = op.data as { id: string } & Partial<UpdateEventRequest>;
            const updateData: Record<string, unknown> = { updatedAt: new Date() };
            if (data.title !== undefined) updateData.title = data.title;
            if (data.summary !== undefined) updateData.summary = data.summary;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.location !== undefined) updateData.location = data.location;
            if (data.orderIndex !== undefined) updateData.orderIndex = data.orderIndex;
            if (data.color !== undefined) updateData.color = data.color;
            if (data.tagsJson !== undefined) updateData.tagsJson = data.tagsJson;
            const updated = app.db.update(events).set(updateData)
              .where(and(eq(events.id, data.id), eq(events.workspaceId, workspaceId)))
              .returning().get();
            results.push(updated);
            break;
          }
          case 'delete': {
            const data = op.data as { id: string };
            app.db.delete(events).where(and(eq(events.id, data.id), eq(events.workspaceId, workspaceId))).run();
            results.push({ id: data.id, deleted: true });
            break;
          }
          case 'reorder': {
            const data = op.data as Array<{ id: string; orderIndex: number }>;
            for (const item of data) {
              app.db.update(events).set({ orderIndex: item.orderIndex, updatedAt: new Date() })
                .where(and(eq(events.id, item.id), eq(events.workspaceId, workspaceId)))
                .run();
            }
            results.push({ reordered: data.length });
            break;
          }
        }
      }
    })();

    return { success: true, data: results };
  });
}
