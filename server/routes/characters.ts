import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { characters, eventCharacters, events } from '../db/schema.js';
import { workspaceIdParam, characterIdParam, createCharacterBody, updateCharacterBody } from '../lib/validation.js';
import type { CreateCharacterRequest, UpdateCharacterRequest } from '../../shared/types.js';

export async function charactersRoutes(app: FastifyInstance) {
  // GET / — 列出角色
  app.get<{ Params: { workspaceId: string } }>('/', {
    schema: { params: workspaceIdParam },
  }, async (request) => {
    const { workspaceId } = request.params;
    const result = app.db.select().from(characters)
      .where(eq(characters.workspaceId, workspaceId))
      .all();
    return { success: true, data: result };
  });

  // POST / — 创建角色
  app.post<{ Params: { workspaceId: string }; Body: CreateCharacterRequest }>('/', {
    schema: { params: workspaceIdParam, body: createCharacterBody },
  }, async (request, reply) => {
    const { workspaceId } = request.params;
    const { id: bodyId, name, role, description, avatarUrl, traitsJson } = request.body;
    const id = bodyId || uuidv4();

    if (bodyId) {
      const existing = app.db.select().from(characters).where(eq(characters.id, id)).get();
      if (existing) {
        return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: '角色 ID 已存在' } });
      }
    }

    const result = app.db.insert(characters).values({
      id,
      workspaceId,
      name,
      role: role || '',
      description: description || '',
      avatarUrl: avatarUrl || '',
      traitsJson: traitsJson || '[]',
    }).returning().get();

    return { success: true, data: result };
  });

  // PATCH /:charId — 更新角色
  app.patch<{ Params: { workspaceId: string; charId: string }; Body: UpdateCharacterRequest }>('/:charId', {
    schema: { params: characterIdParam, body: updateCharacterBody },
  }, async (request, reply) => {
    const { workspaceId, charId } = request.params;
    const updates = request.body;

    const existing = app.db.select().from(characters)
      .where(and(eq(characters.id, charId), eq(characters.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '角色不存在' } });
    }

    const allowedFields: Record<string, unknown> = {};
    if (updates.name !== undefined) allowedFields.name = updates.name;
    if (updates.role !== undefined) allowedFields.role = updates.role;
    if (updates.description !== undefined) allowedFields.description = updates.description;
    if (updates.avatarUrl !== undefined) allowedFields.avatarUrl = updates.avatarUrl;
    if (updates.traitsJson !== undefined) allowedFields.traitsJson = updates.traitsJson;
    const result = app.db.update(characters).set(allowedFields)
      .where(eq(characters.id, charId))
      .returning().get();

    return { success: true, data: result };
  });

  // DELETE /:charId — 删除角色
  app.delete<{ Params: { workspaceId: string; charId: string } }>('/:charId', {
    schema: { params: characterIdParam },
  }, async (request, reply) => {
    const { workspaceId, charId } = request.params;

    const existing = app.db.select().from(characters)
      .where(and(eq(characters.id, charId), eq(characters.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '角色不存在' } });
    }

    app.db.delete(characters).where(eq(characters.id, charId)).run();
    return { success: true, data: { id: charId } };
  });

  // GET /:charId/events — 获取角色关联事件
  app.get<{ Params: { workspaceId: string; charId: string } }>('/:charId/events', {
    schema: { params: characterIdParam },
  }, async (request, reply) => {
    const { workspaceId, charId } = request.params;

    const existing = app.db.select().from(characters)
      .where(and(eq(characters.id, charId), eq(characters.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '角色不存在' } });
    }

    const result = app.db.select({
      id: events.id,
      title: events.title,
      startTime: events.startTime,
      endTime: events.endTime,
      location: events.location,
      roleDescription: eventCharacters.roleDescription,
    })
      .from(eventCharacters)
      .innerJoin(events, eq(eventCharacters.eventId, events.id))
      .where(eq(eventCharacters.characterId, charId))
      .all();

    return { success: true, data: result };
  });
}
