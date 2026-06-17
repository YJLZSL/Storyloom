import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { connections } from '../db/schema.js';
import { workspaceIdParam, connectionIdParam, createConnectionBody, updateConnectionBody } from '../lib/validation.js';
import type { CreateConnectionRequest, UpdateConnectionRequest, ConnectionType } from '../../shared/types.js';

export async function connectionsRoutes(app: FastifyInstance) {
  // GET / — 列出关联
  app.get<{ Params: { workspaceId: string } }>('/', {
    schema: { params: workspaceIdParam },
  }, async (request) => {
    const { workspaceId } = request.params;
    const result = app.db.select().from(connections)
      .where(eq(connections.workspaceId, workspaceId))
      .all();
    return { success: true, data: result };
  });

  // POST / — 创建关联
  app.post<{ Params: { workspaceId: string }; Body: CreateConnectionRequest }>('/', {
    schema: { params: workspaceIdParam, body: createConnectionBody },
  }, async (request, reply) => {
    const { workspaceId } = request.params;
    const { id: bodyId, sourceEventId, targetEventId, type, description } = request.body;
    const id = bodyId || uuidv4();

    if (bodyId) {
      const existing = app.db.select().from(connections).where(eq(connections.id, id)).get();
      if (existing) {
        return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: '关联 ID 已存在' } });
      }
    }

    const result = app.db.insert(connections).values({
      id,
      workspaceId,
      sourceEventId,
      targetEventId,
      type,
      description: description || '',
    }).returning().get();

    return { success: true, data: result };
  });

  // PATCH /:connId — 更新关联
  app.patch<{ Params: { workspaceId: string; connId: string }; Body: UpdateConnectionRequest }>('/:connId', {
    schema: { params: connectionIdParam, body: updateConnectionBody },
  }, async (request, reply) => {
    const { workspaceId, connId } = request.params;
    const updates = request.body;

    const existing = app.db.select().from(connections)
      .where(and(eq(connections.id, connId), eq(connections.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '关联不存在' } });
    }

    const allowedFields: Record<string, unknown> = {};
    if (updates.type !== undefined) allowedFields.type = updates.type;
    if (updates.description !== undefined) allowedFields.description = updates.description;
    const result = app.db.update(connections).set(allowedFields)
      .where(eq(connections.id, connId))
      .returning().get();

    return { success: true, data: result };
  });

  // DELETE /:connId — 删除关联
  app.delete<{ Params: { workspaceId: string; connId: string } }>('/:connId', {
    schema: { params: connectionIdParam },
  }, async (request, reply) => {
    const { workspaceId, connId } = request.params;

    const existing = app.db.select().from(connections)
      .where(and(eq(connections.id, connId), eq(connections.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '关联不存在' } });
    }

    app.db.delete(connections).where(eq(connections.id, connId)).run();
    return { success: true, data: { id: connId } };
  });
}
