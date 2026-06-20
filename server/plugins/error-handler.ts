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

    // JSON 解析错误
    if ('code' in error && (error as FastifyError).code === 'FST_ERR_CTP_INVALID_JSON_BODY') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: '请求体 JSON 格式无效',
        },
      });
    }

    // 未知错误
    const statusCode = 'statusCode' in error ? (error as FastifyError).statusCode : 500;
    const isDev = process.env.NODE_ENV !== 'production';
    const errCode = (error as FastifyError).code;

    if (!statusCode || statusCode >= 500) {
      // 兜底：即使 fastify logger 被关，也要把 5xx 详情打到 stdout，
      // Electron 会被 setupLogging 重定向到 %APPDATA%\Storyloom\app.log。
      // eslint-disable-next-line no-console
      console.error('[5xx]', request.method, request.url, errCode || 'NO_CODE', '-', error.message, error.stack || '');
      request.log.error(error);
    }

    return reply.status(statusCode || 500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: isDev
          ? error.message
          : `服务器内部错误${errCode ? ` (${errCode})` : ''}`,
      },
    });
  });

  // 注意：404 处理在 server/index.ts 中统一设置（生产模式需要 SPA fallback）
});
