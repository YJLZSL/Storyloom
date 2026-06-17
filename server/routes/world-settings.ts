import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { worldSettings } from '../db/schema.js';
import { workspaceIdParam, settingIdParam, createWorldSettingBody, updateWorldSettingBody } from '../lib/validation.js';
import type { CreateWorldSettingRequest, UpdateWorldSettingRequest } from '../../shared/types.js';

export async function worldSettingsRoutes(app: FastifyInstance) {
  // GET / — 列出世界观设定
  app.get<{ Params: { workspaceId: string }; Querystring: { category?: string } }>('/', {
    schema: { params: workspaceIdParam },
  }, async (request) => {
    const { workspaceId } = request.params;
    const { category } = request.query;

    const conditions = [eq(worldSettings.workspaceId, workspaceId)];
    if (category) {
      conditions.push(eq(worldSettings.category, category));
    }

    const result = app.db.select().from(worldSettings)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .all();
    return { success: true, data: result };
  });

  // POST / — 创建世界观设定
  app.post<{ Params: { workspaceId: string }; Body: CreateWorldSettingRequest }>('/', {
    schema: { params: workspaceIdParam, body: createWorldSettingBody },
  }, async (request, reply) => {
    const { workspaceId } = request.params;
    const { id: bodyId, category, key, value, description } = request.body;
    const id = bodyId || uuidv4();

    if (bodyId) {
      const existing = app.db.select().from(worldSettings).where(eq(worldSettings.id, id)).get();
      if (existing) {
        return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: '设定 ID 已存在' } });
      }
    }

    const result = app.db.insert(worldSettings).values({
      id,
      workspaceId,
      category,
      key,
      value: value || '',
      description: description || '',
    }).returning().get();

    return { success: true, data: result };
  });

  // PATCH /:settingId — 更新世界观设定
  app.patch<{ Params: { workspaceId: string; settingId: string }; Body: UpdateWorldSettingRequest }>('/:settingId', {
    schema: { params: settingIdParam, body: updateWorldSettingBody },
  }, async (request, reply) => {
    const { workspaceId, settingId } = request.params;
    const updates = request.body;

    const existing = app.db.select().from(worldSettings)
      .where(and(eq(worldSettings.id, settingId), eq(worldSettings.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '设定不存在' } });
    }

    const allowedFields: Record<string, unknown> = {};
    if (updates.category !== undefined) allowedFields.category = updates.category;
    if (updates.key !== undefined) allowedFields.key = updates.key;
    if (updates.value !== undefined) allowedFields.value = updates.value;
    if (updates.description !== undefined) allowedFields.description = updates.description;
    const result = app.db.update(worldSettings).set(allowedFields)
      .where(eq(worldSettings.id, settingId))
      .returning().get();

    return { success: true, data: result };
  });

  // DELETE /:settingId — 删除世界观设定
  app.delete<{ Params: { workspaceId: string; settingId: string } }>('/:settingId', {
    schema: { params: settingIdParam },
  }, async (request, reply) => {
    const { workspaceId, settingId } = request.params;

    const existing = app.db.select().from(worldSettings)
      .where(and(eq(worldSettings.id, settingId), eq(worldSettings.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '设定不存在' } });
    }

    app.db.delete(worldSettings).where(eq(worldSettings.id, settingId)).run();
    return { success: true, data: { id: settingId } };
  });
}
