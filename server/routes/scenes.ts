import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { scenes, workspaces } from '../db/schema.js';
import {
  workspaceIdParam,
  sceneIdParam,
  createSceneBody,
  updateSceneBody,
  reorderBody,
} from '../lib/validation.js';
import type { CreateSceneRequest, UpdateSceneRequest, ReorderRequest } from '../../shared/types.js';

export async function scenesRoutes(app: FastifyInstance) {
  // GET / — 列出工作区下所有场景（按 sceneOrder 排序）
  app.get<{ Params: { workspaceId: string } }>('/', {
    schema: { params: workspaceIdParam },
  }, async (request, reply) => {
    const { workspaceId } = request.params;

    // 校验 workspace 存在
    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    const result = app.db.select().from(scenes)
      .where(eq(scenes.workspaceId, workspaceId))
      .orderBy(scenes.sceneOrder)
      .all();
    return { success: true, data: result };
  });

  // POST / — 创建场景
  app.post<{ Params: { workspaceId: string }; Body: CreateSceneRequest }>('/', {
    schema: { params: workspaceIdParam, body: createSceneBody },
  }, async (request, reply) => {
    const { workspaceId } = request.params;
    const { id: bodyId, name, backgroundAssetId, bgm, sceneOrder, mapId, settingsJson } = request.body;
    const now = new Date();
    const id = bodyId || uuidv4();

    // 校验 workspace 存在
    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    if (bodyId) {
      const existing = app.db.select().from(scenes).where(eq(scenes.id, id)).get();
      if (existing) {
        return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: '场景 ID 已存在' } });
      }
    }

    // 如果未指定 sceneOrder，自动取最大值 + 1
    let order = sceneOrder ?? 0;
    if (sceneOrder === undefined) {
      const maxOrder = app.db.select().from(scenes)
        .where(eq(scenes.workspaceId, workspaceId))
        .orderBy(scenes.sceneOrder)
        .all()
        .pop()?.sceneOrder ?? -1;
      order = maxOrder + 1;
    }

    const result = app.db.insert(scenes).values({
      id,
      workspaceId,
      name,
      backgroundAssetId: backgroundAssetId || null,
      bgm: bgm || '',
      sceneOrder: order,
      mapId: mapId || null,
      settingsJson: settingsJson || '{}',
      createdAt: now,
      updatedAt: now,
    }).returning().get();

    return reply.status(201).send({ success: true, data: result });
  });

  // PATCH /:sceneId — 更新场景
  app.patch<{ Params: { workspaceId: string; sceneId: string }; Body: UpdateSceneRequest }>('/:sceneId', {
    schema: { params: sceneIdParam, body: updateSceneBody },
  }, async (request, reply) => {
    const { workspaceId, sceneId } = request.params;
    const updates = request.body;

    const existing = app.db.select().from(scenes)
      .where(and(eq(scenes.id, sceneId), eq(scenes.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '场景不存在' } });
    }

    const setFields: Record<string, unknown> = {};
    if (updates.name !== undefined) setFields.name = updates.name;
    if (updates.backgroundAssetId !== undefined) setFields.backgroundAssetId = updates.backgroundAssetId;
    if (updates.bgm !== undefined) setFields.bgm = updates.bgm;
    if (updates.sceneOrder !== undefined) setFields.sceneOrder = updates.sceneOrder;
    if (updates.mapId !== undefined) setFields.mapId = updates.mapId;
    if (updates.settingsJson !== undefined) setFields.settingsJson = updates.settingsJson;

    const result = app.db.update(scenes).set({
      ...setFields,
      updatedAt: new Date(),
    }).where(eq(scenes.id, sceneId))
      .returning().get();

    return { success: true, data: result };
  });

  // DELETE /:sceneId — 删除场景（级联删除 beats → choices）
  app.delete<{ Params: { workspaceId: string; sceneId: string } }>('/:sceneId', {
    schema: { params: sceneIdParam },
  }, async (request, reply) => {
    const { workspaceId, sceneId } = request.params;

    const existing = app.db.select().from(scenes)
      .where(and(eq(scenes.id, sceneId), eq(scenes.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '场景不存在' } });
    }

    app.db.delete(scenes).where(eq(scenes.id, sceneId)).run();
    return { success: true, data: { id: sceneId } };
  });

  // POST /:sceneId/reorder — 批量更新场景排序
  app.post<{ Params: { workspaceId: string }; Body: ReorderRequest }>('/reorder', {
    schema: { params: workspaceIdParam, body: reorderBody },
  }, async (request, reply) => {
    const { workspaceId } = request.params;
    const { items } = request.body;

    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    const now = new Date();
    for (const item of items) {
      app.db.update(scenes).set({
        sceneOrder: item.order,
        updatedAt: now,
      }).where(and(eq(scenes.id, item.id), eq(scenes.workspaceId, workspaceId)))
        .run();
    }

    return { success: true, data: { updated: items.length } };
  });
}
