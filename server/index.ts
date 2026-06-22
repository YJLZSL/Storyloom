import Fastify from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import staticPlugin from '@fastify/static';
import multipart from '@fastify/multipart';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { initDatabase, checkDatabaseIntegrity } from './db/migrate.js';
import { closeDb } from './db/index.js';
import { errorHandler } from './plugins/error-handler.js';
import { databasePlugin } from './plugins/database.js';
import { validationPlugin } from './plugins/validation.js';
import { workspacesRoutes } from './routes/workspaces/index.js';
import { eventsRoutes } from './routes/events.js';
import { tracksRoutes } from './routes/tracks.js';
import { charactersRoutes } from './routes/characters.js';
import { connectionsRoutes } from './routes/connections.js';
import { foreshadowingsRoutes } from './routes/foreshadowings.js';
import { worldSettingsRoutes } from './routes/world-settings.js';
import { outlineVersionsRoutes } from './routes/outline-versions.js';
import { scenesRoutes } from './routes/scenes.js';
import { beatsRoutes } from './routes/beats.js';
import { choicesRoutes } from './routes/choices.js';
import { flagsRoutes } from './routes/flags.js';
import { mapsRoutes } from './routes/maps.js';
import { bookmarksRoutes } from './routes/bookmarks.js';
import { notesRoutes } from './routes/notes.js';
import { assetsRoutes } from './routes/assets.js';
import { revisionsRoutes } from './routes/revisions.js';
import { aiConversationsRoutes } from './routes/ai-conversations.js';
import { aiRoutes } from './routes/ai.js';
import { searchRoutes } from './routes/search.js';
import type { HealthCheckResponse } from '../shared/types.js';

export async function createApp(options?: { logger?: boolean }) {
  // 在 Electron 桌面端 prod 下也启用 fastify logger（main.ts 注入 STORYLOOM_ELECTRON=1），
  // 让 5xx 错误能落到 stdout（被 setupLogging 重定向到 app.log）。
  // 浏览器 prod（如未来部署 web 版）仍然关 logger。
  const isElectron = process.env.STORYLOOM_ELECTRON === '1';
  const isSidecar = process.env.STORYLOOM_SIDECAR === '1';
  const enableLogger =
    options?.logger ?? (process.env.NODE_ENV !== 'production' || isElectron || isSidecar);
  let loggerConfig: boolean | { level: string; stream: fs.WriteStream } = enableLogger;
  if (isSidecar) {
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const logPath = path.join(dataDir, 'app.log');
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });
    loggerConfig = { level: 'info', stream: logStream };
  }
  const app = Fastify({
    logger: loggerConfig,
    bodyLimit: 5 * 1024 * 1024, // 5MB
  });

  // 注册插件
  const isDev = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) && !isSidecar;
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
  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
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
  await app.register(outlineVersionsRoutes, { prefix: '/api/workspaces/:workspaceId/outline-versions' });
  // 视觉小说路由 (v1.2)
  await app.register(scenesRoutes, { prefix: '/api/workspaces/:workspaceId/scenes' });
  await app.register(beatsRoutes, { prefix: '/api/scenes/:sceneId/beats' });
  await app.register(choicesRoutes, { prefix: '/api/beats/:beatId/choices' });
  await app.register(flagsRoutes, { prefix: '/api/workspaces/:workspaceId/flags' });
  await app.register(mapsRoutes, { prefix: '/api/workspaces/:workspaceId/maps' });
  await app.register(bookmarksRoutes, { prefix: '/api/workspaces/:workspaceId/bookmarks' });
  await app.register(notesRoutes, { prefix: '/api/workspaces/:workspaceId' });
  await app.register(assetsRoutes, { prefix: '/api/workspaces/:workspaceId/assets' });
  await app.register(revisionsRoutes, { prefix: '/api/workspaces/:workspaceId/revisions' });
  await app.register(searchRoutes, { prefix: '/api/workspaces/:workspaceId' });
  await app.register(aiRoutes, { prefix: '/api/ai' });
  await app.register(aiConversationsRoutes, { prefix: '/api/ai/conversations' });

  // 数据库健康检查（详细表级检查）
  const { healthRoutes } = await import('./routes/health.js');
  await app.register(healthRoutes);

  // 基础健康检查
  app.get('/api/health', async () => {
    const integrity = checkDatabaseIntegrity();
    // 同步通过 app.sqlite（fastify decorate 注入）读取 PRAGMA，避免动态 import
    const walModeRaw = app.sqlite.pragma('journal_mode', { simple: true }) as string;
    const userVersion = app.sqlite.pragma('user_version', { simple: true }) as number;
    const walMode = (walModeRaw || '').toLowerCase();
    const { workspaces } = await import('./db/schema.js');
    const workspaceCount = app.db.select().from(workspaces).all().length;

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
        dbStats: {
          walMode,
          userVersion,
        },
      } satisfies HealthCheckResponse,
    };
  });

  // 生产模式 Web 服务器：静态文件服务（Electron 模式不需要，由 loadFile 直接加载）
  if (process.env.STATIC_DIR) {
    const distPath = process.env.STATIC_DIR;

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
    app.log.info(`Server running on port ${serverPort}`);
  } catch (err) {
    app.log.error(err);
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      throw new Error(`port ${serverPort} in use`, { cause: err });
    }
    throw err;
  }

  // graceful shutdown：监听 SIGTERM / SIGINT
  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      app.log.warn(`再次收到 ${signal}，立即强制退出`);
      process.exit(1);
    }
    shuttingDown = true;
    app.log.info(`收到 ${signal}，开始优雅关闭…`);

    const forceExitTimer = setTimeout(() => {
      app.log.error('优雅关闭超时（5s），强制退出');
      process.exit(1);
    }, 5000);
    forceExitTimer.unref?.();

    (async () => {
      try {
        await app.close();
      } catch (err) {
        app.log.error({ err }, 'app.close() 失败');
      }
      try {
        closeDb();
      } catch (err) {
        app.log.error({ err }, 'closeDb() 失败');
      }
      clearTimeout(forceExitTimer);
      process.exit(0);
    })();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// 直接运行时启动服务器（仅当作为主入口执行时）
// 在 sidecar 模式下，由 sidecar-entry.js 显式调用 startServer，不自动启动
const isDirectRun = (() => {
  if (process.env.STORYLOOM_SIDECAR === '1') return false;
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    const entryUrl = pathToFileURL(entry).href;
    const fileUrl = pathToFileURL(__filename).href;
    // 兼容 tsx：entry 可能使用 .ts 或 .tsx，fileUrl 使用 .js
    return entryUrl === fileUrl ||
      entryUrl.replace('.tsx', '.ts') === fileUrl.replace('.js', '.ts') ||
      entry.endsWith('server/index.ts') || entry.endsWith('server/index.tsx');
  } catch {
    return false;
  }
})();
if (isDirectRun) {
  startServer().catch((err) => {
    // CLI / standalone entry — fastify 实例尚未创建，console 输出至终端
    // eslint-disable-next-line no-console
    console.error('[server] 启动失败:', err);
    process.exit(1);
  });
}
