import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export const errorHandler = fp(async (app: FastifyInstance): Promise<void> => {
  app.setErrorHandler((error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
    // Fastify 验证错误
    if ('validation' in error && error.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    }

    // 数据库约束错误
    if (error.message?.includes('SQLITE_CONSTRAINT')) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'CONSTRAINT_ERROR',
          message: '数据约束冲突',
        },
      });
    }

    // 未知错误
    const statusCode = 'statusCode' in error ? (error as FastifyError).statusCode : 500;
    const isDev = process.env.NODE_ENV !== 'production';

    if (!statusCode || statusCode >= 500) {
      request.log.error(error);
    }

    return reply.status(statusCode || 500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: isDev ? error.message : '服务器内部错误',
      },
    });
  });

  // 注意：404 处理在 server/index.ts 中统一设置（生产模式需要 SPA fallback）
});
