import type { FastifyInstance } from 'fastify';
import { eq, and, desc, gte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { revisions, workspaces } from '../db/schema.js';
import { workspaceIdParam } from '../lib/validation.js';
import type { CreateRevisionRequest } from '../../shared/types.js';

const ENTITY_TYPES = ['event', 'scene', 'beat', 'character', 'track', 'foreshadowing', 'worldsetting', 'connection', 'flag', 'map', 'choice'];

const revisionBodySchema = {
  type: 'object',
  required: ['entityType', 'entityId', 'op'],
  properties: {
    entityType: { type: 'string', enum: ENTITY_TYPES },
    entityId: { type: 'string', minLength: 1 },
    op: { type: 'string', enum: ['create', 'update', 'delete'] },
    beforeJson: { type: 'string' },
    afterJson: { type: 'string' },
    summary: { type: 'string', maxLength: 500 },
  },
} as const;

const revisionIdParam = {
  type: 'object',
  required: ['workspaceId', 'revisionId'],
  properties: {
    workspaceId: { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
    revisionId: { type: 'string', minLength: 1 },
  },
} as const;

export async function revisionsRoutes(app: FastifyInstance) {
  // GET / — 列出工作区的操作历史（支持按 entityType 和 since 过滤）
  app.get<{ Params: { workspaceId: string }; Querystring: { entityType?: string; since?: string; limit?: string } }>('/', {
    schema: { params: workspaceIdParam },
  }, async (request, reply) => {
    const { workspaceId } = request.params;
    const { entityType, since, limit } = request.query;

    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    const maxLimit = Math.min(parseInt(limit || '100', 10), 500);
    let query = app.db.select().from(revisions)
      .where(eq(revisions.workspaceId, workspaceId));

    // 构建过滤条件
    const conditions = [eq(revisions.workspaceId, workspaceId)];
    if (entityType && ENTITY_TYPES.includes(entityType)) {
      conditions.push(eq(revisions.entityType, entityType));
    }
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        conditions.push(gte(revisions.createdAt, sinceDate));
      }
    }

    const result = app.db.select().from(revisions)
      .where(and(...conditions))
      .orderBy(desc(revisions.createdAt))
      .limit(maxLimit)
      .all();

    return { success: true, data: result };
  });

  // POST / — 手动创建修订记录
  app.post<{ Params: { workspaceId: string }; Body: CreateRevisionRequest }>('/', {
    schema: { params: workspaceIdParam, body: revisionBodySchema },
  }, async (request, reply) => {
    const { workspaceId } = request.params;
    const { entityType, entityId, op, beforeJson, afterJson, summary } = request.body;

    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    const id = uuidv4();
    const now = new Date();

    const result = app.db.insert(revisions).values({
      id,
      workspaceId,
      entityType,
      entityId,
      op,
      beforeJson: beforeJson || '{}',
      afterJson: afterJson || '{}',
      summary: summary || '',
      createdAt: now,
    }).returning().get();

    return reply.status(201).send({ success: true, data: result });
  });

  // GET /:revisionId — 获取单条修订记录详情
  app.get<{ Params: { workspaceId: string; revisionId: string } }>('/:revisionId', {
    schema: { params: revisionIdParam },
  }, async (request, reply) => {
    const { workspaceId, revisionId } = request.params;

    const revision = app.db.select().from(revisions)
      .where(and(eq(revisions.id, revisionId), eq(revisions.workspaceId, workspaceId)))
      .get();

    if (!revision) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '修订记录不存在' } });
    }

    return { success: true, data: revision };
  });

  // POST /:revisionId/restore — 用 beforeJson 反向还原
  app.post<{ Params: { workspaceId: string; revisionId: string } }>('/:revisionId/restore', {
    schema: { params: revisionIdParam },
  }, async (request, reply) => {
    const { workspaceId, revisionId } = request.params;

    const revision = app.db.select().from(revisions)
      .where(and(eq(revisions.id, revisionId), eq(revisions.workspaceId, workspaceId)))
      .get();

    if (!revision) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '修订记录不存在' } });
    }

    // 返回 beforeJson 让前端执行还原操作
    // 实际的数据还原由前端调用对应的 PATCH/DELETE/POST 端点完成
    return {
      success: true,
      data: {
        revisionId,
        entityType: revision.entityType,
        entityId: revision.entityId,
        op: revision.op,
        restoreData: revision.beforeJson ? JSON.parse(revision.beforeJson) : null,
        summary: `还原 ${revision.entityType} "${revision.entityId}" 到 ${revision.createdAt.toISOString()} 的状态`,
      },
    };
  });
}
