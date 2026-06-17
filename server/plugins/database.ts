import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { getDb, getSqlite, closeDb } from '../db/index.js';

export const databasePlugin = fp(async (app: FastifyInstance): Promise<void> => {
  // 将数据库实例挂载为 Fastify 装饰器
  app.decorate('db', getDb());
  app.decorate('sqlite', getSqlite());

  // 应用关闭时清理数据库连接
  app.addHook('onClose', (_instance, done) => {
    closeDb();
    done();
  });
});

// TypeScript 类型扩展
declare module 'fastify' {
  interface FastifyInstance {
    db: ReturnType<typeof getDb>;
    sqlite: ReturnType<typeof getSqlite>;
  }
}
