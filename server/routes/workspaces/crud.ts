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
  bookmarks,
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
  app.get('/', async (request, reply) => {
    try {
      app.log.info('[GET /workspaces] 查询所有工作区');
      const result = app.db.select().from(workspaces).orderBy(desc(workspaces.updatedAt)).all();
      app.log.info({ count: result.length }, '[GET /workspaces] 查询成功');
      return { success: true, data: result };
    } catch (err: any) {
      app.log.error({ err: err.message }, '[GET /workspaces] 查询失败');
      return reply.status(500).send({ success: false, error: { code: 'QUERY_FAILED', message: '查询工作区失败' } });
    }
  });

  app.get<{ Params: { id: string } }>('/:id', {
    schema: { params: idParam },
  }, async (request, reply) => {
    const { id } = request.params;
    try {
      app.log.info({ workspaceId: id }, '[GET /workspaces/:id] 查询工作区');
      const result = app.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
      if (!result) {
        app.log.warn({ workspaceId: id }, '[GET /workspaces/:id] 工作区不存在');
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
      }
      app.log.info({ workspaceId: id, name: result.name }, '[GET /workspaces/:id] 查询成功');
      return { success: true, data: result };
    } catch (err: any) {
      app.log.error({ err: err.message, workspaceId: id }, '[GET /workspaces/:id] 查询失败');
      return reply.status(500).send({ success: false, error: { code: 'QUERY_FAILED', message: '查询工作区失败' } });
    }
  });

  app.post<{ Body: CreateWorkspaceRequest }>('/', {
    schema: { body: createWorkspaceBody },
  }, async (request, reply) => {
    const { name, description } = request.body;

    const validation = validateWorkspaceInput({ name, description }, true);
    if (!validation.valid) {
      app.log.warn({ reason: validation.message }, '[POST /workspaces] 校验失败');
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_FAILED', message: validation.message } });
    }

    try {
      const now = new Date();
      const id = uuidv4();
      app.log.info({ name, workspaceId: id }, '[POST /workspaces] 开始创建工作区');

      const result = app.db.insert(workspaces).values({
        id,
        name,
        description: description || '',
        settingsJson: '{}',
        createdAt: now,
        updatedAt: now,
      }).returning().get();

      app.log.info({ workspaceId: id }, '[POST /workspaces] 工作区创建成功，准备创建默认轨道');

      const defaultTrackId = uuidv4();
      app.db.insert(tracks).values({
        id: defaultTrackId,
        workspaceId: id,
        name: '主线',
        color: '#3b82f6',
        orderIndex: 0,
        isVisible: true,
      }).run();

      app.log.info({ workspaceId: id, trackId: defaultTrackId }, '[POST /workspaces] 默认轨道创建成功');
      return { success: true, data: result };
    } catch (err: any) {
      app.log.error({ err: err.message }, '[POST /workspaces] 创建工作区失败');
      return reply.status(500).send({ success: false, error: { code: 'CREATE_FAILED', message: `创建工作区失败: ${err.message}` } });
    }
  });

  app.patch<{ Params: { id: string }; Body: UpdateWorkspaceRequest }>('/:id', {
    schema: { params: idParam, body: updateWorkspaceBody },
  }, async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;

    try {
      app.log.info({ workspaceId: id, updates }, '[PATCH /workspaces/:id] 开始更新工作区');

      const existing = app.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
      if (!existing) {
        app.log.warn({ workspaceId: id }, '[PATCH /workspaces/:id] 工作区不存在');
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
      }

      const validation = validateWorkspaceInput(updates as Partial<Record<string, unknown>>, false);
      if (!validation.valid) {
        app.log.warn({ reason: validation.message }, '[PATCH /workspaces/:id] 校验失败');
        return reply.status(400).send({ success: false, error: { code: 'VALIDATION_FAILED', message: validation.message } });
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

      app.log.info({ workspaceId: id, name: result.name }, '[PATCH /workspaces/:id] 更新成功');
      return { success: true, data: result };
    } catch (err: any) {
      app.log.error({ err: err.message, workspaceId: id }, '[PATCH /workspaces/:id] 更新失败');
      return reply.status(500).send({ success: false, error: { code: 'UPDATE_FAILED', message: `更新工作区失败: ${err.message}` } });
    }
  });

  app.delete<{ Params: { id: string } }>('/:id', {
    schema: { params: idParam },
  }, async (request, reply) => {
    const { id } = request.params;

    const existing = app.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    app.log.info({ workspaceId: id }, '[DELETE] 开始删除工作区');

    try {
      app.sqlite.transaction(() => {
        const tables = [
          { name: 'events', table: events },
          { name: 'tracks', table: tracks },
          { name: 'characters', table: characters },
          { name: 'connections', table: connections },
          { name: 'foreshadowings', table: foreshadowings },
          { name: 'worldSettings', table: worldSettings },
          { name: 'autoSaves', table: autoSaves },
          { name: 'outlineVersions', table: outlineVersions },
          { name: 'flags', table: flags },
          { name: 'scenes', table: scenes },
          { name: 'maps', table: maps },
          { name: 'assets', table: assets },
          { name: 'bookmarks', table: bookmarks },
        ];

        for (const { name, table } of tables) {
          try {
            app.db.delete(table).where(eq(table.workspaceId, id)).run();
            app.log.info({ table: name, workspaceId: id }, '[DELETE] 表已清理');
          } catch (err: any) {
            // 表可能不存在，记录但不中断
            app.log.warn({ table: name, err: err.message, workspaceId: id }, '[DELETE] 表清理失败（已忽略）');
          }
        }

        // 清理没有 Drizzle schema 定义的表（仅硬编码 DDL）
        const rawTables = ['revisions', 'ai_conversations', 'ai_cache', 'event_characters', 'event_world_settings', 'event_assets', 'character_assets', 'scene_assets', 'beats', 'choices'];
        for (const rawTable of rawTables) {
          try {
            app.sqlite.prepare(`DELETE FROM ${rawTable} WHERE workspace_id = ?`).run(id);
            app.log.info({ table: rawTable, workspaceId: id }, '[DELETE] 原始表已清理');
          } catch (err: any) {
            app.log.warn({ table: rawTable, err: err.message, workspaceId: id }, '[DELETE] 原始表清理失败（已忽略）');
          }
        }

        app.db.delete(workspaces).where(eq(workspaces.id, id)).run();
        app.log.info({ workspaceId: id }, '[DELETE] 工作区已删除');
      })();
    } catch (err: any) {
      app.log.error({ err: err.message, workspaceId: id }, '[DELETE] 删除工作区失败');
      return reply.status(500).send({
        success: false,
        error: { code: 'DELETE_FAILED', message: `删除工作区失败: ${err.message}` },
      });
    }
  });
};
