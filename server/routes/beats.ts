import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { beats, scenes } from '../db/schema.js';
import {
  sceneIdParam,
  beatIdParam,
  createBeatBody,
  updateBeatBody,
  reorderBody,
} from '../lib/validation.js';
import type { CreateBeatRequest, UpdateBeatRequest, ReorderRequest } from '../../shared/types.js';

export async function beatsRoutes(app: FastifyInstance) {
  // GET / — 列出场景下所有节拍（按 beatOrder 排序）
  app.get<{ Params: { sceneId: string } }>('/', {
    schema: { params: { type: 'object', required: ['sceneId'], properties: { sceneId: { type: 'string' } } } },
  }, async (request, reply) => {
    const { sceneId } = request.params;

    // 校验 scene 存在
    const scene = app.db.select().from(scenes).where(eq(scenes.id, sceneId)).get();
    if (!scene) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '场景不存在' } });
    }

    const result = app.db.select().from(beats)
      .where(eq(beats.sceneId, sceneId))
      .orderBy(beats.beatOrder)
      .all();
    return { success: true, data: result };
  });

  // POST / — 创建节拍
  app.post<{ Params: { sceneId: string }; Body: CreateBeatRequest }>('/', {
    schema: {
      params: { type: 'object', required: ['sceneId'], properties: { sceneId: { type: 'string' } } },
      body: createBeatBody,
    },
  }, async (request, reply) => {
    const { sceneId } = request.params;
    const { id: bodyId, kind, characterId, portraitAssetId, text, metadataJson, beatOrder } = request.body;
    const now = new Date();
    const id = bodyId || uuidv4();

    // 校验 scene 存在
    const scene = app.db.select().from(scenes).where(eq(scenes.id, sceneId)).get();
    if (!scene) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '场景不存在' } });
    }

    if (bodyId) {
      const existing = app.db.select().from(beats).where(eq(beats.id, id)).get();
      if (existing) {
        return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: '节拍 ID 已存在' } });
      }
    }

    // 如果未指定 beatOrder，自动取最大值 + 1
    let order = beatOrder ?? 0;
    if (beatOrder === undefined) {
      const allBeats = app.db.select().from(beats)
        .where(eq(beats.sceneId, sceneId))
        .orderBy(beats.beatOrder)
        .all();
      order = allBeats.length > 0 ? (allBeats[allBeats.length - 1].beatOrder + 1) : 0;
    }

    const result = app.db.insert(beats).values({
      id,
      sceneId,
      kind,
      characterId: characterId || null,
      portraitAssetId: portraitAssetId || null,
      text: text || '',
      metadataJson: metadataJson || '{}',
      beatOrder: order,
      createdAt: now,
      updatedAt: now,
    }).returning().get();

    return reply.status(201).send({ success: true, data: result });
  });

  // PATCH /:beatId — 更新节拍
  app.patch<{ Params: { sceneId: string; beatId: string }; Body: UpdateBeatRequest }>('/:beatId', {
    schema: { params: beatIdParam, body: updateBeatBody },
  }, async (request, reply) => {
    const { sceneId, beatId } = request.params;
    const updates = request.body;

    const existing = app.db.select().from(beats)
      .where(and(eq(beats.id, beatId), eq(beats.sceneId, sceneId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '节拍不存在' } });
    }

    const setFields: Record<string, unknown> = {};
    if (updates.kind !== undefined) setFields.kind = updates.kind;
    if (updates.characterId !== undefined) setFields.characterId = updates.characterId;
    if (updates.portraitAssetId !== undefined) setFields.portraitAssetId = updates.portraitAssetId;
    if (updates.text !== undefined) setFields.text = updates.text;
    if (updates.metadataJson !== undefined) setFields.metadataJson = updates.metadataJson;
    if (updates.beatOrder !== undefined) setFields.beatOrder = updates.beatOrder;

    const result = app.db.update(beats).set({
      ...setFields,
      updatedAt: new Date(),
    }).where(eq(beats.id, beatId))
      .returning().get();

    return { success: true, data: result };
  });

  // DELETE /:beatId — 删除节拍（级联删除 choices）
  app.delete<{ Params: { sceneId: string; beatId: string } }>('/:beatId', {
    schema: { params: beatIdParam },
  }, async (request, reply) => {
    const { sceneId, beatId } = request.params;

    const existing = app.db.select().from(beats)
      .where(and(eq(beats.id, beatId), eq(beats.sceneId, sceneId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '节拍不存在' } });
    }

    app.db.delete(beats).where(eq(beats.id, beatId)).run();
    return { success: true, data: { id: beatId } };
  });

  // POST /reorder — 批量更新节拍排序
  app.post<{ Params: { sceneId: string }; Body: ReorderRequest }>('/reorder', {
    schema: {
      params: { type: 'object', required: ['sceneId'], properties: { sceneId: { type: 'string' } } },
      body: reorderBody,
    },
  }, async (request, reply) => {
    const { sceneId } = request.params;
    const { items } = request.body;

    const scene = app.db.select().from(scenes).where(eq(scenes.id, sceneId)).get();
    if (!scene) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '场景不存在' } });
    }

    const now = new Date();
    for (const item of items) {
      app.db.update(beats).set({
        beatOrder: item.order,
        updatedAt: now,
      }).where(and(eq(beats.id, item.id), eq(beats.sceneId, sceneId)))
        .run();
    }

    return { success: true, data: { updated: items.length } };
  });
}
