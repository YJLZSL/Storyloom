import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { tracks } from '../db/schema.js';
import { workspaceIdParam, trackIdParam, createTrackBody, updateTrackBody } from '../lib/validation.js';
import type { CreateTrackRequest, UpdateTrackRequest } from '../../shared/types.js';

export async function tracksRoutes(app: FastifyInstance) {
  // GET / — 列出轨道
  app.get<{ Params: { workspaceId: string } }>('/', {
    schema: { params: workspaceIdParam },
  }, async (request) => {
    const { workspaceId } = request.params;
    const result = app.db.select().from(tracks)
      .where(eq(tracks.workspaceId, workspaceId))
      .orderBy(asc(tracks.orderIndex))
      .all();
    return { success: true, data: result };
  });

  // POST / — 创建轨道
  app.post<{ Params: { workspaceId: string }; Body: CreateTrackRequest }>('/', {
    schema: { params: workspaceIdParam, body: createTrackBody },
  }, async (request, reply) => {
    const { workspaceId } = request.params;
    const { id: bodyId, name, color, orderIndex, isVisible } = request.body;
    const id = bodyId || uuidv4();

    if (bodyId) {
      const existing = app.db.select().from(tracks).where(eq(tracks.id, id)).get();
      if (existing) {
        return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: '轨道 ID 已存在' } });
      }
    }

    const result = app.db.insert(tracks).values({
      id,
      workspaceId,
      name,
      color: color || '#3b82f6',
      orderIndex: orderIndex ?? 0,
      isVisible: isVisible ?? true,
    }).returning().get();

    return { success: true, data: result };
  });

  // PATCH /:trackId — 更新轨道
  app.patch<{ Params: { workspaceId: string; trackId: string }; Body: UpdateTrackRequest }>('/:trackId', {
    schema: { params: trackIdParam, body: updateTrackBody },
  }, async (request, reply) => {
    const { workspaceId, trackId } = request.params;
    const updates = request.body;

    const existing = app.db.select().from(tracks)
      .where(and(eq(tracks.id, trackId), eq(tracks.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '轨道不存在' } });
    }

    const allowedFields: Record<string, unknown> = {};
    if (updates.name !== undefined) allowedFields.name = updates.name;
    if (updates.color !== undefined) allowedFields.color = updates.color;
    if (updates.orderIndex !== undefined) allowedFields.orderIndex = updates.orderIndex;
    if (updates.isVisible !== undefined) allowedFields.isVisible = updates.isVisible;
    const result = app.db.update(tracks).set(allowedFields)
      .where(eq(tracks.id, trackId))
      .returning().get();

    return { success: true, data: result };
  });

  // DELETE /:trackId — 删除轨道
  app.delete<{ Params: { workspaceId: string; trackId: string } }>('/:trackId', {
    schema: { params: trackIdParam },
  }, async (request, reply) => {
    const { workspaceId, trackId } = request.params;

    const existing = app.db.select().from(tracks)
      .where(and(eq(tracks.id, trackId), eq(tracks.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '轨道不存在' } });
    }

    app.db.delete(tracks).where(eq(tracks.id, trackId)).run();
    return { success: true, data: { id: trackId } };
  });
}
