import type { FastifyInstance } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { outlineVersions } from '../db/schema.js';
import { workspaceIdParam } from '../lib/validation.js';
import type { CreateOutlineVersionRequest } from '../../shared/types.js';

const outlineVersionIdParam = {
  type: 'object',
  required: ['workspaceId', 'versionId'],
  properties: {
    workspaceId: { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
    versionId: { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
  },
} as const;

const createOutlineVersionBody = {
  type: 'object',
  required: ['content'],
  properties: {
    id: { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
    content: { type: 'string', minLength: 1 },
    description: { type: 'string', maxLength: 500 },
  },
} as const;

export async function outlineVersionsRoutes(app: FastifyInstance) {
  // GET / — 列出版本（按 createdAt 降序）
  app.get<{ Params: { workspaceId: string } }>('/', {
    schema: { params: workspaceIdParam },
  }, async (request) => {
    const { workspaceId } = request.params;
    const result = app.db.select().from(outlineVersions)
      .where(eq(outlineVersions.workspaceId, workspaceId))
      .orderBy(desc(outlineVersions.createdAt))
      .all();
    return { success: true, data: result };
  });

  // GET /:versionId — 详情
  app.get<{ Params: { workspaceId: string; versionId: string } }>('/:versionId', {
    schema: { params: outlineVersionIdParam },
  }, async (request, reply) => {
    const { workspaceId, versionId } = request.params;
    const result = app.db.select().from(outlineVersions)
      .where(and(eq(outlineVersions.id, versionId), eq(outlineVersions.workspaceId, workspaceId)))
      .get();
    if (!result) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '大纲版本不存在' } });
    }
    return { success: true, data: result };
  });

  // POST / — 创建版本
  app.post<{ Params: { workspaceId: string }; Body: CreateOutlineVersionRequest }>('/', {
    schema: { params: workspaceIdParam, body: createOutlineVersionBody },
  }, async (request, reply) => {
    const { workspaceId } = request.params;
    const { id: bodyId, content, description } = request.body;
    const now = new Date();
    const id = bodyId || uuidv4();

    if (bodyId) {
      const existing = app.db.select().from(outlineVersions).where(eq(outlineVersions.id, id)).get();
      if (existing) {
        return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: '版本 ID 已存在' } });
      }
    }

    const result = app.db.insert(outlineVersions).values({
      id,
      workspaceId,
      content,
      description: description || '',
      createdAt: now,
    }).returning().get();

    return { success: true, data: result };
  });

  // POST /:versionId/restore — 回滚（仅返回 content，由前端决定如何应用）
  app.post<{ Params: { workspaceId: string; versionId: string } }>('/:versionId/restore', {
    schema: { params: outlineVersionIdParam },
  }, async (request, reply) => {
    const { workspaceId, versionId } = request.params;
    const existing = app.db.select().from(outlineVersions)
      .where(and(eq(outlineVersions.id, versionId), eq(outlineVersions.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '大纲版本不存在' } });
    }
    return { success: true, data: { content: existing.content, description: existing.description } };
  });

  // DELETE /:versionId — 删除版本
  app.delete<{ Params: { workspaceId: string; versionId: string } }>('/:versionId', {
    schema: { params: outlineVersionIdParam },
  }, async (request, reply) => {
    const { workspaceId, versionId } = request.params;
    const existing = app.db.select().from(outlineVersions)
      .where(and(eq(outlineVersions.id, versionId), eq(outlineVersions.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '大纲版本不存在' } });
    }
    app.db.delete(outlineVersions).where(eq(outlineVersions.id, versionId)).run();
    return { success: true, data: { id: versionId } };
  });
}
