import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { bookmarks, workspaces, events } from '../db/schema.js';
import {
  workspaceIdParam,
  bookmarkIdParam,
  createBookmarkBody,
  updateBookmarkBody,
} from '../lib/validation.js';
import type { CreateBookmarkRequest, UpdateBookmarkRequest } from '../../shared/types.js';

export async function bookmarksRoutes(app: FastifyInstance) {
  // GET / — 列出工作区下所有书签
  app.get<{ Params: { workspaceId: string } }>('/', {
    schema: { params: workspaceIdParam },
  }, async (request, reply) => {
    const { workspaceId } = request.params;
    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }
    const result = app.db.select().from(bookmarks)
      .where(eq(bookmarks.workspaceId, workspaceId))
      .orderBy(bookmarks.createdAt)
      .all();
    return { success: true, data: result };
  });

  // POST / — 创建书签
  app.post<{ Params: { workspaceId: string }; Body: CreateBookmarkRequest }>('/', {
    schema: { params: workspaceIdParam, body: createBookmarkBody },
  }, async (request, reply) => {
    const { workspaceId } = request.params;
    const { eventId, name, color } = request.body;
    const now = new Date();

    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }
    const event = app.db.select().from(events).where(eq(events.id, eventId)).get();
    if (!event) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '事件不存在' } });
    }

    const id = uuidv4();
    const result = app.db.insert(bookmarks).values({
      id, workspaceId, eventId, name, color: color || '#3b82f6', createdAt: now,
    }).returning().get();
    return reply.status(201).send({ success: true, data: result });
  });

  // PATCH /:bookmarkId — 更新书签
  app.patch<{ Params: { workspaceId: string; bookmarkId: string }; Body: UpdateBookmarkRequest }>('/:bookmarkId', {
    schema: { params: bookmarkIdParam, body: updateBookmarkBody },
  }, async (request, reply) => {
    const { workspaceId, bookmarkId } = request.params;
    const updates = request.body;
    const existing = app.db.select().from(bookmarks)
      .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '书签不存在' } });
    }
    const setFields: Record<string, unknown> = {};
    if (updates.name !== undefined) setFields.name = updates.name;
    if (updates.color !== undefined) setFields.color = updates.color;
    if (updates.eventId !== undefined) setFields.eventId = updates.eventId;
    const result = app.db.update(bookmarks).set(setFields).where(eq(bookmarks.id, bookmarkId)).returning().get();
    return { success: true, data: result };
  });

  // DELETE /:bookmarkId — 删除书签
  app.delete<{ Params: { workspaceId: string; bookmarkId: string } }>('/:bookmarkId', {
    schema: { params: bookmarkIdParam },
  }, async (request, reply) => {
    const { workspaceId, bookmarkId } = request.params;
    const existing = app.db.select().from(bookmarks)
      .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '书签不存在' } });
    }
    app.db.delete(bookmarks).where(eq(bookmarks.id, bookmarkId)).run();
    return { success: true, data: { id: bookmarkId } };
  });
}
