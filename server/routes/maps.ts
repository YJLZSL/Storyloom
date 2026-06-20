import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { maps, workspaces } from '../db/schema.js';
import {
  workspaceIdParam,
  mapIdParam,
  createMapBody,
  updateMapBody,
} from '../lib/validation.js';
import type { CreateMapRequest, UpdateMapRequest } from '../../shared/types.js';

export async function mapsRoutes(app: FastifyInstance) {
  // GET / — 列出工作区下所有地图
  app.get<{ Params: { workspaceId: string } }>('/', {
    schema: { params: workspaceIdParam },
  }, async (request, reply) => {
    const { workspaceId } = request.params;

    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    const result = app.db.select().from(maps)
      .where(eq(maps.workspaceId, workspaceId))
      .orderBy(maps.name)
      .all();
    return { success: true, data: result };
  });

  // POST / — 创建地图
  app.post<{ Params: { workspaceId: string }; Body: CreateMapRequest }>('/', {
    schema: { params: workspaceIdParam, body: createMapBody },
  }, async (request, reply) => {
    const { workspaceId } = request.params;
    const { id: bodyId, name, backgroundAssetId, width, height, markersJson } = request.body;
    const now = new Date();
    const id = bodyId || uuidv4();

    // 校验 workspace 存在
    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    if (bodyId) {
      const existing = app.db.select().from(maps).where(eq(maps.id, id)).get();
      if (existing) {
        return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: '地图 ID 已存在' } });
      }
    }

    const result = app.db.insert(maps).values({
      id,
      workspaceId,
      name,
      backgroundAssetId: backgroundAssetId || null,
      width: width || 1920,
      height: height || 1080,
      markersJson: markersJson || '[]',
      createdAt: now,
      updatedAt: now,
    }).returning().get();

    return reply.status(201).send({ success: true, data: result });
  });

  // PATCH /:mapId — 更新地图
  app.patch<{ Params: { workspaceId: string; mapId: string }; Body: UpdateMapRequest }>('/:mapId', {
    schema: { params: mapIdParam, body: updateMapBody },
  }, async (request, reply) => {
    const { workspaceId, mapId } = request.params;
    const updates = request.body;

    const existing = app.db.select().from(maps)
      .where(and(eq(maps.id, mapId), eq(maps.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '地图不存在' } });
    }

    const setFields: Record<string, unknown> = {};
    if (updates.name !== undefined) setFields.name = updates.name;
    if (updates.backgroundAssetId !== undefined) setFields.backgroundAssetId = updates.backgroundAssetId;
    if (updates.width !== undefined) setFields.width = updates.width;
    if (updates.height !== undefined) setFields.height = updates.height;
    if (updates.markersJson !== undefined) setFields.markersJson = updates.markersJson;

    const result = app.db.update(maps).set({
      ...setFields,
      updatedAt: new Date(),
    }).where(eq(maps.id, mapId))
      .returning().get();

    return { success: true, data: result };
  });

  // DELETE /:mapId — 删除地图
  app.delete<{ Params: { workspaceId: string; mapId: string } }>('/:mapId', {
    schema: { params: mapIdParam },
  }, async (request, reply) => {
    const { workspaceId, mapId } = request.params;

    const existing = app.db.select().from(maps)
      .where(and(eq(maps.id, mapId), eq(maps.workspaceId, workspaceId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '地图不存在' } });
    }

    app.db.delete(maps).where(eq(maps.id, mapId)).run();
    return { success: true, data: { id: mapId } };
  });
}
