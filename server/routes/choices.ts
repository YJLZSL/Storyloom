import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { choices, beats } from '../db/schema.js';
import {
  beatIdParam,
  choiceIdParam,
  createChoiceBody,
  updateChoiceBody,
} from '../lib/validation.js';
import type { CreateChoiceRequest, UpdateChoiceRequest } from '../../shared/types.js';

export async function choicesRoutes(app: FastifyInstance) {
  // GET / — 列出 beat 下所有选项（按 choiceOrder 排序）
  app.get<{ Params: { beatId: string } }>('/', {
    schema: { params: { type: 'object', required: ['beatId'], properties: { beatId: { type: 'string' } } } },
  }, async (request, reply) => {
    const { beatId } = request.params;

    // 校验 beat 存在且 kind=choice
    const beat = app.db.select().from(beats).where(eq(beats.id, beatId)).get();
    if (!beat) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '节拍不存在' } });
    }
    if (beat.kind !== 'choice') {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: '只有 kind=choice 的节拍才能挂选项' } });
    }

    const result = app.db.select().from(choices)
      .where(eq(choices.beatId, beatId))
      .orderBy(choices.choiceOrder)
      .all();
    return { success: true, data: result };
  });

  // POST / — 创建选项
  app.post<{ Params: { beatId: string }; Body: CreateChoiceRequest }>('/', {
    schema: {
      params: { type: 'object', required: ['beatId'], properties: { beatId: { type: 'string' } } },
      body: createChoiceBody,
    },
  }, async (request, reply) => {
    const { beatId } = request.params;
    const { id: bodyId, label, nextSceneId, condition, choiceOrder } = request.body;
    const id = bodyId || uuidv4();

    // 校验 beat 存在且 kind=choice
    const beat = app.db.select().from(beats).where(eq(beats.id, beatId)).get();
    if (!beat) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '节拍不存在' } });
    }
    if (beat.kind !== 'choice') {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: '只有 kind=choice 的节拍才能挂选项' } });
    }

    if (bodyId) {
      const existing = app.db.select().from(choices).where(eq(choices.id, id)).get();
      if (existing) {
        return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: '选项 ID 已存在' } });
      }
    }

    // 如果未指定 choiceOrder，自动取最大值 + 1
    let order = choiceOrder ?? 0;
    if (choiceOrder === undefined) {
      const allChoices = app.db.select().from(choices)
        .where(eq(choices.beatId, beatId))
        .orderBy(choices.choiceOrder)
        .all();
      order = allChoices.length > 0 ? (allChoices[allChoices.length - 1].choiceOrder + 1) : 0;
    }

    const result = app.db.insert(choices).values({
      id,
      beatId,
      label,
      nextSceneId: nextSceneId || null,
      condition: condition || '',
      choiceOrder: order,
    }).returning().get();

    return reply.status(201).send({ success: true, data: result });
  });

  // PATCH /:choiceId — 更新选项
  app.patch<{ Params: { beatId: string; choiceId: string }; Body: UpdateChoiceRequest }>('/:choiceId', {
    schema: { params: choiceIdParam, body: updateChoiceBody },
  }, async (request, reply) => {
    const { beatId, choiceId } = request.params;
    const updates = request.body;

    const existing = app.db.select().from(choices)
      .where(and(eq(choices.id, choiceId), eq(choices.beatId, beatId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '选项不存在' } });
    }

    const setFields: Record<string, unknown> = {};
    if (updates.label !== undefined) setFields.label = updates.label;
    if (updates.nextSceneId !== undefined) setFields.nextSceneId = updates.nextSceneId;
    if (updates.condition !== undefined) setFields.condition = updates.condition;
    if (updates.choiceOrder !== undefined) setFields.choiceOrder = updates.choiceOrder;

    const result = app.db.update(choices).set(setFields)
      .where(eq(choices.id, choiceId))
      .returning().get();

    return { success: true, data: result };
  });

  // DELETE /:choiceId — 删除选项
  app.delete<{ Params: { beatId: string; choiceId: string } }>('/:choiceId', {
    schema: { params: choiceIdParam },
  }, async (request, reply) => {
    const { beatId, choiceId } = request.params;

    const existing = app.db.select().from(choices)
      .where(and(eq(choices.id, choiceId), eq(choices.beatId, beatId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '选项不存在' } });
    }

    app.db.delete(choices).where(eq(choices.id, choiceId)).run();
    return { success: true, data: { id: choiceId } };
  });
}
