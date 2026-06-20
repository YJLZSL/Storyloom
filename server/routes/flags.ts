import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { flags, workspaces } from '../db/schema.js';
import {
  workspaceIdParam,
  flagIdParam,
  createFlagBody,
  updateFlagBody,
} from '../lib/validation.js';
import type { CreateFlagRequest, UpdateFlagRequest } from '../../shared/types.js';

export async function flagsRoutes(app: FastifyInstance) {
  // GET / — 列出工作区下所有标志变量
  app.get<{ Params: { workspaceId: string } }>('/', {
    schema: { params: workspaceIdParam },
  }, async (request, reply) => {
    const { workspaceId } = request.params;

    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    const result = app.db.select().from(flags)
      .where(eq(flags.workspaceId, workspaceId))
      .orderBy(flags.name)
      .all();
    return { success: true, data: result };
  });

  // POST / — 创建标志变量
  app.post<{ Params: { workspaceId: string }; Body: CreateFlagRequest }>('/', {
    schema: { params: workspaceIdParam, body: createFlagBody },
  }, async (request, reply) => {
    const { workspaceId } = request.params;
    const { id: bodyId, name, defaultValueJson, description } = request.body;
    const id = bodyId || uuidv4();

    // 校验 workspace 存在
    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    if (bodyId) {
      const existing = app.db.select().from(flags).where(eq(flags.id, id)).get();
      if (existing) {
        return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: '标志变量 ID 已存在' } });
      }
    }

    // 检查同一工作区内 name 唯一性
    const nameExists = app.db.select().from(flags)
      .where(and(eq(flags.workspaceId, workspaceId), eq(flags.name, name)))
      .get();
    if (nameExists) {
      return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: `标志变量名 "${name}" 已存在` } });
    }

    const result = app.db.insert(flags).values({
      id,
      workspaceId,
      name,
      defaultValueJson: defaultValueJson || 'null',
      description: description || '',
    }).returning().get();

    return reply.status(201).send({ success: true, data: result });
  });

  // PATCH /:flagId — 更新标志变量
  app.patch<{ Params: { workspaceId: string; flagId: string }; Body: UpdateFlagRequest }>('/:flagId', {
    schema: { params: flagIdParam, body: updateFlagBody },
  }, async (request, reply) => {
    const { workspaceId, flagId } = request.params;
    const updates = request.body;

    const existing = app.db.select().from(flags)
      .where(and(eq(flags.id, flagId), eq(flags.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '标志变量不存在' } });
    }

    // 如果要改名，检查唯一性
    if (updates.name !== undefined && updates.name !== existing.name) {
      const nameExists = app.db.select().from(flags)
        .where(and(eq(flags.workspaceId, workspaceId), eq(flags.name, updates.name)))
        .get();
      if (nameExists) {
        return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: `标志变量名 "${updates.name}" 已存在` } });
      }
    }

    const setFields: Record<string, unknown> = {};
    if (updates.name !== undefined) setFields.name = updates.name;
    if (updates.defaultValueJson !== undefined) setFields.defaultValueJson = updates.defaultValueJson;
    if (updates.description !== undefined) setFields.description = updates.description;

    const result = app.db.update(flags).set(setFields)
      .where(eq(flags.id, flagId))
      .returning().get();

    return { success: true, data: result };
  });

  // DELETE /:flagId — 删除标志变量
  app.delete<{ Params: { workspaceId: string; flagId: string } }>('/:flagId', {
    schema: { params: flagIdParam },
  }, async (request, reply) => {
    const { workspaceId, flagId } = request.params;

    const existing = app.db.select().from(flags)
      .where(and(eq(flags.id, flagId), eq(flags.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '标志变量不存在' } });
    }

    app.db.delete(flags).where(eq(flags.id, flagId)).run();
    return { success: true, data: { id: flagId } };
  });
}
