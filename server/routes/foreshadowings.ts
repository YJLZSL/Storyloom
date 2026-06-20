import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { foreshadowings } from '../db/schema.js';
import { workspaceIdParam, foreshadowingIdParam, createForeshadowingBody, updateForeshadowingBody, validateWorkspaceExists } from '../lib/validation.js';
import type { CreateForeshadowingRequest, UpdateForeshadowingRequest, Foreshadowing } from '../../shared/types.js';

function parseRelatedIds(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string');
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

function withRelated<T extends { relatedForeshadowingIds?: unknown }>(row: T): T & { relatedForeshadowingIds: string[] } {
  return { ...row, relatedForeshadowingIds: parseRelatedIds(row.relatedForeshadowingIds) };
}

export async function foreshadowingsRoutes(app: FastifyInstance) {
  // GET / — 列出伏笔
  app.get<{ Params: { workspaceId: string } }>('/', {
    schema: { params: workspaceIdParam },
  }, async (request) => {
    const { workspaceId } = request.params;
    const result = app.db.select().from(foreshadowings)
      .where(eq(foreshadowings.workspaceId, workspaceId))
      .all();
    return { success: true, data: result.map(withRelated) };
  });

  // POST / — 创建伏笔
  app.post<{ Params: { workspaceId: string }; Body: CreateForeshadowingRequest }>('/', {
    schema: { params: workspaceIdParam, body: createForeshadowingBody },
  }, async (request, reply) => {
    const { workspaceId } = request.params;
    if (!await validateWorkspaceExists(app, workspaceId, reply)) return;
    const { id: bodyId, title, description, status, plantedEventId, resolvedEventId, relatedForeshadowingIds } = request.body;
    const now = new Date();
    const id = bodyId || uuidv4();

    if (bodyId) {
      const existing = app.db.select().from(foreshadowings).where(eq(foreshadowings.id, id)).get();
      if (existing) {
        return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: '伏笔 ID 已存在' } });
      }
    }

    const result = app.db.insert(foreshadowings).values({
      id,
      workspaceId,
      title,
      description: description || '',
      status: status || 'planted',
      plantedEventId: plantedEventId || null,
      resolvedEventId: resolvedEventId || null,
      relatedForeshadowingIds: JSON.stringify(Array.isArray(relatedForeshadowingIds) ? relatedForeshadowingIds : []),
      createdAt: now,
      updatedAt: now,
    }).returning().get();

    return { success: true, data: withRelated(result) };
  });

  // PATCH /:foresId — 更新伏笔
  app.patch<{ Params: { workspaceId: string; foresId: string }; Body: UpdateForeshadowingRequest }>('/:foresId', {
    schema: { params: foreshadowingIdParam, body: updateForeshadowingBody },
  }, async (request, reply) => {
    const { workspaceId, foresId } = request.params;
    const updates = request.body;

    const existing = app.db.select().from(foreshadowings)
      .where(and(eq(foreshadowings.id, foresId), eq(foreshadowings.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '伏笔不存在' } });
    }

    const allowedFields: Record<string, unknown> = {};
    if (updates.title !== undefined) allowedFields.title = updates.title;
    if (updates.description !== undefined) allowedFields.description = updates.description;
    if (updates.status !== undefined) allowedFields.status = updates.status;
    if (updates.plantedEventId !== undefined) allowedFields.plantedEventId = updates.plantedEventId;
    if (updates.resolvedEventId !== undefined) allowedFields.resolvedEventId = updates.resolvedEventId;
    if (updates.relatedForeshadowingIds !== undefined) {
      allowedFields.relatedForeshadowingIds = JSON.stringify(
        Array.isArray(updates.relatedForeshadowingIds) ? updates.relatedForeshadowingIds : [],
      );
    }
    const result = app.db.update(foreshadowings).set({
      ...allowedFields,
      updatedAt: new Date(),
    }).where(eq(foreshadowings.id, foresId))
      .returning().get();

    return { success: true, data: withRelated(result) };
  });

  // DELETE /:foresId — 删除伏笔
  app.delete<{ Params: { workspaceId: string; foresId: string } }>('/:foresId', {
    schema: { params: foreshadowingIdParam },
  }, async (request, reply) => {
    const { workspaceId, foresId } = request.params;

    const existing = app.db.select().from(foreshadowings)
      .where(and(eq(foreshadowings.id, foresId), eq(foreshadowings.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '伏笔不存在' } });
    }

    app.db.delete(foreshadowings).where(eq(foreshadowings.id, foresId)).run();
    return { success: true, data: { id: foresId } };
  });
}
