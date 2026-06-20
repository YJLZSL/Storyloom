import type { FastifyPluginAsync } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { workspaces, autoSaves } from '../../db/schema.js';
import { idParam, autoSaveBody } from '../../lib/validation.js';
import { recoverFromAutoSave } from '../../services/auto-save.js';

export const autoSavesRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Params: { id: string }; Body: { dataJson: string } }>('/:id/auto-saves', {
    schema: { params: idParam, body: autoSaveBody },
  }, async (request, reply) => {
    const { id } = request.params;
    const { dataJson } = request.body;

    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    const saveId = uuidv4();
    const result = app.db.insert(autoSaves).values({
      id: saveId,
      workspaceId: id,
      dataJson,
      createdAt: new Date(),
    }).returning().get();

    const saves = app.db.select().from(autoSaves)
      .where(eq(autoSaves.workspaceId, id))
      .orderBy(desc(autoSaves.createdAt))
      .all();

    if (saves.length > 20) {
      const toDelete = saves.slice(20);
      for (const s of toDelete) {
        app.db.delete(autoSaves).where(eq(autoSaves.id, s.id)).run();
      }
    }

    return { success: true, data: result };
  });

  app.get<{ Params: { id: string } }>('/:id/auto-saves', {
    schema: { params: idParam },
  }, async (request) => {
    const { id } = request.params;
    const result = app.db.select().from(autoSaves)
      .where(eq(autoSaves.workspaceId, id))
      .orderBy(desc(autoSaves.createdAt))
      .limit(20)
      .all();
    return { success: true, data: result };
  });

  app.get<{ Params: { id: string } }>('/:id/auto-saves/latest', {
    schema: { params: idParam },
  }, async (request, reply) => {
    const { id } = request.params;
    const result = app.db.select().from(autoSaves)
      .where(eq(autoSaves.workspaceId, id))
      .orderBy(desc(autoSaves.createdAt))
      .limit(1)
      .get();
    if (!result) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '无自动保存数据' } });
    }
    return { success: true, data: result };
  });

  app.post<{ Params: { id: string } }>('/:id/auto-saves/recover', {
    schema: { params: idParam },
  }, async (request) => {
    const { id } = request.params;
    const recovered = recoverFromAutoSave(id);
    return { success: true, data: { recovered } };
  });
};
