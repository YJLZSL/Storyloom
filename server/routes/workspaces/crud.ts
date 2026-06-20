import type { FastifyPluginAsync } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import {
  workspaces,
  events,
  tracks,
  characters,
  connections,
  foreshadowings,
  worldSettings,
  autoSaves,
  outlineVersions,
  scenes,
  flags,
  maps,
  assets,
} from '../../db/schema.js';
import { idParam, createWorkspaceBody, updateWorkspaceBody } from '../../lib/validation.js';
import type { CreateWorkspaceRequest, UpdateWorkspaceRequest } from '../../../shared/types.js';

function isOnlyQuestionMarks(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && /^[?？]+$/.test(trimmed);
}

function validateWorkspaceInput(
  body: Partial<Record<string, unknown>>,
  isCreate: boolean,
): { valid: false; message: string } | { valid: true } {
  const { name, description } = body;

  if (isCreate) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return { valid: false, message: '工作区名称不能为空' };
    }
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return { valid: false, message: '工作区名称不能为空' };
    }
    if (isOnlyQuestionMarks(name)) {
      return { valid: false, message: '工作区名称不能全为问号' };
    }
  }

  if (description !== undefined) {
    if (typeof description !== 'string') {
      return { valid: false, message: '工作区描述格式不正确' };
    }
    const trimmed = description.trim();
    if (trimmed.length > 0 && isOnlyQuestionMarks(trimmed)) {
      return { valid: false, message: '工作区描述不能全为问号' };
    }
  }

  return { valid: true };
}

export const crudRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => {
    const result = app.db.select().from(workspaces).orderBy(desc(workspaces.updatedAt)).all();
    return { success: true, data: result };
  });

  app.get<{ Params: { id: string } }>('/:id', {
    schema: { params: idParam },
  }, async (request, reply) => {
    const { id } = request.params;
    const result = app.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!result) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }
    return { success: true, data: result };
  });

  app.post<{ Body: CreateWorkspaceRequest }>('/', {
    schema: { body: createWorkspaceBody },
  }, async (request, reply) => {
    const { name, description } = request.body;

    const validation = validateWorkspaceInput({ name, description }, true);
    if (!validation.valid) {
      return reply.status(400).send({ error: validation.message });
    }

    const now = new Date();
    const id = uuidv4();

    const result = app.db.insert(workspaces).values({
      id,
      name,
      description: description || '',
      settingsJson: '{}',
      createdAt: now,
      updatedAt: now,
    }).returning().get();

    const defaultTrackId = uuidv4();
    app.db.insert(tracks).values({
      id: defaultTrackId,
      workspaceId: id,
      name: '主线',
      color: '#3b82f6',
      orderIndex: 0,
      isVisible: true,
    }).run();

    return { success: true, data: result };
  });

  app.patch<{ Params: { id: string }; Body: UpdateWorkspaceRequest }>('/:id', {
    schema: { params: idParam, body: updateWorkspaceBody },
  }, async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;

    const existing = app.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    const validation = validateWorkspaceInput(updates as Partial<Record<string, unknown>>, false);
    if (!validation.valid) {
      return reply.status(400).send({ error: validation.message });
    }

    const allowedFields: Record<string, unknown> = {};
    if (updates.name !== undefined) allowedFields.name = updates.name;
    if (updates.description !== undefined) allowedFields.description = updates.description;
    if (updates.settingsJson !== undefined) allowedFields.settingsJson = updates.settingsJson;
    if (updates.calendarConfigJson !== undefined) allowedFields.calendarConfigJson = updates.calendarConfigJson;
    const result = app.db.update(workspaces).set({
      ...allowedFields,
      updatedAt: new Date(),
    }).where(eq(workspaces.id, id)).returning().get();

    return { success: true, data: result };
  });

  app.delete<{ Params: { id: string } }>('/:id', {
    schema: { params: idParam },
  }, async (request, reply) => {
    const { id } = request.params;

    const existing = app.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    app.sqlite.transaction(() => {
      app.db.delete(events).where(eq(events.workspaceId, id)).run();
      app.db.delete(tracks).where(eq(tracks.workspaceId, id)).run();
      app.db.delete(characters).where(eq(characters.workspaceId, id)).run();
      app.db.delete(connections).where(eq(connections.workspaceId, id)).run();
      app.db.delete(foreshadowings).where(eq(foreshadowings.workspaceId, id)).run();
      app.db.delete(worldSettings).where(eq(worldSettings.workspaceId, id)).run();
      app.db.delete(autoSaves).where(eq(autoSaves.workspaceId, id)).run();
      app.db.delete(outlineVersions).where(eq(outlineVersions.workspaceId, id)).run();
      app.db.delete(flags).where(eq(flags.workspaceId, id)).run();
      app.db.delete(scenes).where(eq(scenes.workspaceId, id)).run();
      app.db.delete(maps).where(eq(maps.workspaceId, id)).run();
      app.db.delete(assets).where(eq(assets.workspaceId, id)).run();
      app.db.delete(workspaces).where(eq(workspaces.id, id)).run();
    })();

    return { success: true, data: { id } };
  });
};
