import Fastify from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import staticPlugin from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { initDatabase, checkDatabaseIntegrity } from './db/migrate.js';
import { getDb, getSqlite, DATA_DIR, closeDb } from './db/index.js';
import { errorHandler } from './plugins/error-handler.js';
import { databasePlugin } from './plugins/database.js';
import { validationPlugin } from './plugins/validation.js';
import { workspacesRoutes } from './routes/workspaces.js';
import { eventsRoutes } from './routes/events.js';
import { tracksRoutes } from './routes/tracks.js';
import { charactersRoutes } from './routes/characters.js';
import { connectionsRoutes } from './routes/connections.js';
import { foreshadowingsRoutes } from './routes/foreshadowings.js';
import { worldSettingsRoutes } from './routes/world-settings.js';
import { aiRoutes } from './routes/ai.js';
import type { HealthCheckResponse } from '../shared/types.js';

export async function createApp(options?: { logger?: boolean }) {
  const app = Fastify({
    logger: options?.logger ?? (process.env.NODE_ENV !== 'production'),
    bodyLimit: 5 * 1024 * 1024, // 5MB
  });

  // 注册插件
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  await app.register(cors, {
    origin: isDev ? true : (origin, callback) => {
      // 生产模式仅允许 file:// 和 localhost
      if (!origin || origin.startsWith('file://') || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
  });
  await app.register(compress, {
    // Ensure charset is preserved in compressed responses
    removeContentLengthHeader: false,
  });
  await app.register(errorHandler);
  await app.register(databasePlugin);
  await app.register(validationPlugin);

  // Force UTF-8 charset on all JSON responses to prevent Chinese encoding issues (?????)
  app.addHook('onSend', async (_request, reply, payload) => {
    const contentType = reply.getHeader('content-type') as string | undefined;
    if (contentType && contentType.includes('application/json') && !contentType.includes('charset')) {
      reply.header('content-type', `${contentType}; charset=utf-8`);
    }
    return payload;
  });

  // 初始化数据库
  await initDatabase();

  // 注册路由
  await app.register(workspacesRoutes, { prefix: '/api/workspaces' });
  await app.register(eventsRoutes, { prefix: '/api/workspaces/:workspaceId/events' });
  await app.register(tracksRoutes, { prefix: '/api/workspaces/:workspaceId/tracks' });
  await app.register(charactersRoutes, { prefix: '/api/workspaces/:workspaceId/characters' });
  await app.register(connectionsRoutes, { prefix: '/api/workspaces/:workspaceId/connections' });
  await app.register(foreshadowingsRoutes, { prefix: '/api/workspaces/:workspaceId/foreshadowings' });
  await app.register(worldSettingsRoutes, { prefix: '/api/workspaces/:workspaceId/world-settings' });
  await app.register(aiRoutes, { prefix: '/api/ai' });

  // 健康检查
  app.get('/api/health', async () => {
    const integrity = checkDatabaseIntegrity();
    const sqlite = getSqlite();
    const walMode = sqlite.pragma('journal_mode', { simple: true }) as string;
    const db = getDb();
    const { workspaces } = await import('./db/schema.js');
    const workspaceCount = db.select().from(workspaces).all().length;

    return {
      success: true,
      data: {
        status: integrity ? 'ok' : 'degraded',
        timestamp: Date.now(),
        database: {
          connected: true,
          walMode: walMode === 'wal',
          integrity,
          workspaceCount,
        },
      } satisfies HealthCheckResponse,
    };
  });

  // 生产模式 Web 服务器：静态文件服务（Electron 模式不需要，由 loadFile 直接加载）
  if (process.env.STATIC_DIR) {
    let distPath = process.env.STATIC_DIR;
    if (!distPath) {
      const moduleDir = path.dirname(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')));
      const moduleDistPath = path.join(moduleDir, 'dist');
      const cwdDistPath = path.resolve(process.cwd(), 'dist');
      distPath = fs.existsSync(moduleDistPath) ? moduleDistPath : cwdDistPath;
    }

    await app.register(staticPlugin, {
      root: distPath,
      prefix: '/',
      wildcard: false,
    });

    // SPA fallback（Web 服务器模式）
    app.setNotFoundHandler((_request, reply) => {
      if (_request.url.startsWith('/api')) {
        reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'API 端点不存在' },
        });
      } else {
        reply.sendFile('index.html');
      }
    });
  } else {
    // API-only 模式（Electron 或开发模式）：仅 API 404
    app.setNotFoundHandler((_request, reply) => {
      reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: '请求的资源不存在' },
      });
    });
  }

  return app;
}

export async function startServer(port?: number): Promise<void> {
  const app = await createApp();

  const serverPort = port || parseInt(process.env.PORT || '3001', 10);

  try {
    await app.listen({ port: serverPort, host: '0.0.0.0' });
    console.log(`Server running on port ${serverPort}`);
  } catch (err) {
    app.log.error(err);
    throw err;
  }
}

// 直接运行时启动服务器（仅当作为主入口执行时）
// 使用 process.argv[1] 判断，避免被 import 时误触发
const isDirectRun = process.argv[1] && (
  process.argv[1].includes('server/index.ts') ||
  process.argv[1].includes('server/index.js') ||
  process.argv[1].includes('server\\index.ts') ||
  process.argv[1].includes('server\\index.js')
);
if (isDirectRun) {
  startServer().catch((err) => {
    console.error('[server] 启动失败:', err);
    process.exit(1);
  });
}
