import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { createReadStream, existsSync, mkdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { pipeline } from 'stream/promises';
import { assets, workspaces, characters, events, scenes, characterAssets, eventAssets, sceneAssets } from '../db/schema.js';
import {
  workspaceIdParam,
  assetIdParam,
  createAssetBody,
  bindCharacterAssetBody,
  bindEventAssetBody,
  bindSceneAssetBody,
} from '../lib/validation.js';
import type { CreateAssetRequest, BindCharacterAssetRequest, BindEventAssetRequest, BindSceneAssetRequest } from '../../shared/types.js';
import { DATA_DIR } from '../db/index.js';

// 资产物理文件存储根目录
function getAssetsDir(workspaceId: string): string {
  return join(DATA_DIR, 'assets', workspaceId);
}

// 根据 SHA-256 计算物理文件路径
function getAssetPath(workspaceId: string, sha256: string): string {
  return join(getAssetsDir(workspaceId), sha256.slice(0, 2), sha256);
}

// 缩略图缓存目录
function getThumbsDir(): string {
  return join(DATA_DIR, 'assets', '.thumbs');
}

function getThumbPath(sha256: string, w: number, h: number): string {
  return join(getThumbsDir(), `${sha256}_${w}x${h}.webp`);
}

export async function assetsRoutes(app: FastifyInstance) {
  // GET / — 列出工作区下所有资产
  app.get<{ Params: { workspaceId: string }; Querystring: { kind?: string } }>('/', {
    schema: { params: workspaceIdParam },
  }, async (request, reply) => {
    const { workspaceId } = request.params;
    const { kind } = request.query;

    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    let query = app.db.select().from(assets).where(eq(assets.workspaceId, workspaceId));
    if (kind) {
      query = app.db.select().from(assets).where(and(eq(assets.workspaceId, workspaceId), eq(assets.kind, kind)));
    }
    const result = query.all();
    return { success: true, data: result };
  });

  // POST /upload — 通过 multipart 上传资产文件
  app.post<{ Params: { workspaceId: string } }>('/upload', {
    schema: { params: workspaceIdParam },
  }, async (request, reply) => {
    const { workspaceId } = request.params;

    // 校验 workspace 存在
    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    let file;
    try {
      file = await request.file();
    } catch (err) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: '无法解析上传文件' } });
    }

    if (!file) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: '未上传文件' } });
    }

    // 读取文件 buffer
    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // 检查文件大小限制
    if (buffer.length > 50 * 1024 * 1024) {
      return reply.status(413).send({ success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: '文件大小超过 50MB 限制' } });
    }

    // 计算 SHA-256
    const sha256 = createHash('sha256').update(buffer).digest('hex');

    // 检查是否已存在相同 SHA-256 的资产（去重）
    const existingAsset = app.db.select().from(assets)
      .where(and(eq(assets.workspaceId, workspaceId), eq(assets.sha256, sha256)))
      .get();

    if (existingAsset) {
      return { success: true, data: existingAsset, deduped: true };
    }

    // 获取文件元信息
    const kind = (request.query as Record<string, string>)['kind'] || 'scene';
    const fileName = file.filename || 'unnamed';
    const mimeType = file.mimetype || 'application/octet-stream';

    // 尝试获取图片宽高
    let width: number | null = null;
    let height: number | null = null;
    if (mimeType.startsWith('image/')) {
      try {
        const sharp = (await import('sharp')).default;
        const metadata = await sharp(buffer).metadata();
        width = metadata.width ?? null;
        height = metadata.height ?? null;
      } catch {
        // sharp 不可用时忽略
      }
    }

    // 写入物理文件（SHA-256 内容寻址）
    const filePath = getAssetPath(workspaceId, sha256);
    const fileDir = dirname(filePath);
    if (!existsSync(fileDir)) {
      mkdirSync(fileDir, { recursive: true });
    }

    // 写入文件
    const { writeFile } = await import('fs/promises');
    await writeFile(filePath, buffer);

    // 插入数据库记录
    const id = uuidv4();
    const now = new Date();
    const result = app.db.insert(assets).values({
      id,
      workspaceId,
      kind,
      fileName,
      mimeType,
      fileSize: buffer.length,
      sha256,
      width,
      height,
      metadataJson: '{}',
      createdAt: now,
    }).returning().get();

    return reply.status(201).send({ success: true, data: result });
  });

  // POST / — 创建资产元数据记录（无物理文件，用于外部导入等场景）
  app.post<{ Params: { workspaceId: string }; Body: CreateAssetRequest }>('/', {
    schema: { params: workspaceIdParam, body: createAssetBody },
  }, async (request, reply) => {
    const { workspaceId } = request.params;
    const { id: bodyId, kind, fileName, mimeType, fileSize, sha256, width, height, metadataJson } = request.body;

    const ws = app.db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!ws) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '工作区不存在' } });
    }

    const id = bodyId || uuidv4();

    // 检查 SHA-256 去重
    const existingAsset = app.db.select().from(assets)
      .where(and(eq(assets.workspaceId, workspaceId), eq(assets.sha256, sha256)))
      .get();
    if (existingAsset) {
      return { success: true, data: existingAsset, deduped: true };
    }

    const now = new Date();
    const result = app.db.insert(assets).values({
      id,
      workspaceId,
      kind,
      fileName,
      mimeType,
      fileSize,
      sha256,
      width: width ?? null,
      height: height ?? null,
      metadataJson: metadataJson || '{}',
      createdAt: now,
    }).returning().get();

    return reply.status(201).send({ success: true, data: result });
  });

  // GET /:assetId/file — 直接 stream 物理文件
  app.get<{ Params: { assetId: string } }>('/:assetId/file', {
    schema: { params: assetIdParam },
  }, async (request, reply) => {
    const { assetId } = request.params;

    const asset = app.db.select().from(assets).where(eq(assets.id, assetId)).get();
    if (!asset) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '资产不存在' } });
    }

    const filePath = getAssetPath(asset.workspaceId, asset.sha256);
    if (!existsSync(filePath)) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '物理文件不存在' } });
    }

    // ETag 缓存
    const ifNoneMatch = request.headers['if-none-match'];
    if (ifNoneMatch === `"${asset.sha256}"`) {
      return reply.status(304).send();
    }

    reply.header('ETag', `"${asset.sha256}"`);
    reply.header('Content-Type', asset.mimeType);
    reply.header('Content-Length', asset.fileSize);
    reply.header('Cache-Control', 'public, max-age=31536000, immutable');

    const stream = createReadStream(filePath);
    return reply.send(stream);
  });

  // GET /:assetId/thumbnail — 生成缩略图
  app.get<{ Params: { assetId: string }; Querystring: { w?: string; h?: string } }>('/:assetId/thumbnail', {
    schema: { params: assetIdParam },
  }, async (request, reply) => {
    const { assetId } = request.params;
    const w = parseInt(request.query.w || '120', 10);
    const h = parseInt(request.query.h || '120', 10);

    // Clamp 尺寸
    const thumbW = Math.min(Math.max(w, 16), 512);
    const thumbH = Math.min(Math.max(h, 16), 512);

    const asset = app.db.select().from(assets).where(eq(assets.id, assetId)).get();
    if (!asset) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '资产不存在' } });
    }

    if (!asset.mimeType.startsWith('image/')) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: '仅图片资产支持缩略图' } });
    }

    const filePath = getAssetPath(asset.workspaceId, asset.sha256);
    if (!existsSync(filePath)) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '物理文件不存在' } });
    }

    const thumbPath = getThumbPath(asset.sha256, thumbW, thumbH);

    // 检查缓存
    if (!existsSync(thumbPath)) {
      try {
        const sharp = (await import('sharp')).default;
        const thumbDir = getThumbsDir();
        if (!existsSync(thumbDir)) {
          mkdirSync(thumbDir, { recursive: true });
        }
        await sharp(filePath)
          .resize(thumbW, thumbH, { fit: 'cover' })
          .webp({ quality: 80 })
          .toFile(thumbPath);
      } catch (err) {
        return reply.status(500).send({ success: false, error: { code: 'THUMBNAIL_ERROR', message: '缩略图生成失败' } });
      }
    }

    reply.header('Content-Type', 'image/webp');
    reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    const stream = createReadStream(thumbPath);
    return reply.send(stream);
  });

  // GET /:assetId — 获取资产详情
  app.get<{ Params: { assetId: string } }>('/:assetId', {
    schema: { params: assetIdParam },
  }, async (request, reply) => {
    const { assetId } = request.params;

    const asset = app.db.select().from(assets).where(eq(assets.id, assetId)).get();
    if (!asset) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '资产不存在' } });
    }

    return { success: true, data: asset };
  });

  // DELETE /:assetId — 删除资产（含物理文件清理）
  app.delete<{ Params: { assetId: string } }>('/:assetId', {
    schema: { params: assetIdParam },
  }, async (request, reply) => {
    const { assetId } = request.params;

    const asset = app.db.select().from(assets).where(eq(assets.id, assetId)).get();
    if (!asset) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '资产不存在' } });
    }

    // 删除数据库记录（关联表通过 FK cascade 自动清理）
    app.db.delete(assets).where(eq(assets.id, assetId)).run();

    // 检查是否有其它资产记录引用同一 sha256
    const otherRefs = app.db.select().from(assets)
      .where(eq(assets.sha256, asset.sha256))
      .all();

    if (otherRefs.length === 0) {
      // 无其它引用，删除物理文件
      const filePath = getAssetPath(asset.workspaceId, asset.sha256);
      if (existsSync(filePath)) {
        const { unlink } = await import('fs/promises');
        await unlink(filePath);
      }
      // 清理缩略图缓存
      const thumbDir = getThumbsDir();
      if (existsSync(thumbDir)) {
        const { readdir, unlink } = await import('fs/promises');
        const thumbs = await readdir(thumbDir);
        for (const thumb of thumbs) {
          if (thumb.startsWith(`${asset.sha256}_`)) {
            await unlink(join(thumbDir, thumb));
          }
        }
      }
    }

    return { success: true, data: { id: assetId } };
  });

  // --- 资产关联绑定 ---

  // POST /characters/:charId/assets — 绑定角色资产
  app.post<{ Params: { charId: string }; Body: BindCharacterAssetRequest }>('/characters/:charId/assets', {
    schema: {
      params: { type: 'object', required: ['charId'], properties: { charId: { type: 'string' } } },
      body: bindCharacterAssetBody,
    },
  }, async (request, reply) => {
    const { charId } = request.params;
    const { assetId, role, displayOrder } = request.body;

    // 校验角色存在
    const char = app.db.select().from(characters).where(eq(characters.id, charId)).get();
    if (!char) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '角色不存在' } });
    }

    // 校验资产存在
    const asset = app.db.select().from(assets).where(eq(assets.id, assetId)).get();
    if (!asset) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '资产不存在' } });
    }

    app.db.insert(characterAssets).values({
      characterId: charId,
      assetId,
      role,
      displayOrder: displayOrder ?? 0,
    }).onConflictDoUpdate({
      target: [characterAssets.characterId, characterAssets.assetId, characterAssets.role],
      set: { displayOrder: displayOrder ?? 0 },
    }).run();

    return reply.status(201).send({ success: true, data: { characterId: charId, assetId, role } });
  });

  // POST /events/:eventId/assets — 绑定事件资产
  app.post<{ Params: { eventId: string }; Body: BindEventAssetRequest }>('/events/:eventId/assets', {
    schema: {
      params: { type: 'object', required: ['eventId'], properties: { eventId: { type: 'string' } } },
      body: bindEventAssetBody,
    },
  }, async (request, reply) => {
    const { eventId } = request.params;
    const { assetId, role } = request.body;

    const event = app.db.select().from(events).where(eq(events.id, eventId)).get();
    if (!event) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '事件不存在' } });
    }

    const asset = app.db.select().from(assets).where(eq(assets.id, assetId)).get();
    if (!asset) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '资产不存在' } });
    }

    app.db.insert(eventAssets).values({
      eventId,
      assetId,
      role,
    }).onConflictDoNothing().run();

    return reply.status(201).send({ success: true, data: { eventId, assetId, role } });
  });

  // POST /scenes/:sceneId/assets — 绑定场景资产
  app.post<{ Params: { sceneId: string }; Body: BindSceneAssetRequest }>('/scenes/:sceneId/assets', {
    schema: {
      params: { type: 'object', required: ['sceneId'], properties: { sceneId: { type: 'string' } } },
      body: bindSceneAssetBody,
    },
  }, async (request, reply) => {
    const { sceneId } = request.params;
    const { assetId, role } = request.body;

    const scene = app.db.select().from(scenes).where(eq(scenes.id, sceneId)).get();
    if (!scene) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '场景不存在' } });
    }

    const asset = app.db.select().from(assets).where(eq(assets.id, assetId)).get();
    if (!asset) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: '资产不存在' } });
    }

    app.db.insert(sceneAssets).values({
      sceneId,
      assetId,
      role,
    }).onConflictDoNothing().run();

    return reply.status(201).send({ success: true, data: { sceneId, assetId, role } });
  });

  // GET /characters/:charId/assets — 获取角色绑定的资产列表
  app.get<{ Params: { charId: string } }>('/characters/:charId/assets', {
    schema: { params: { type: 'object', required: ['charId'], properties: { charId: { type: 'string' } } } },
  }, async (request) => {
    const { charId } = request.params;
    const result = app.db.select().from(characterAssets)
      .where(eq(characterAssets.characterId, charId))
      .orderBy(characterAssets.displayOrder)
      .all();
    return { success: true, data: result };
  });

  // GET /events/:eventId/assets — 获取事件绑定的资产列表
  app.get<{ Params: { eventId: string } }>('/events/:eventId/assets', {
    schema: { params: { type: 'object', required: ['eventId'], properties: { eventId: { type: 'string' } } } },
  }, async (request) => {
    const { eventId } = request.params;
    const result = app.db.select().from(eventAssets)
      .where(eq(eventAssets.eventId, eventId))
      .all();
    return { success: true, data: result };
  });

  // GET /scenes/:sceneId/assets — 获取场景绑定的资产列表
  app.get<{ Params: { sceneId: string } }>('/scenes/:sceneId/assets', {
    schema: { params: { type: 'object', required: ['sceneId'], properties: { sceneId: { type: 'string' } } } },
  }, async (request) => {
    const { sceneId } = request.params;
    const result = app.db.select().from(sceneAssets)
      .where(eq(sceneAssets.sceneId, sceneId))
      .all();
    return { success: true, data: result };
  });
}
