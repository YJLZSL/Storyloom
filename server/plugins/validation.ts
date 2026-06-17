import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

export const validationPlugin = fp(async (app: FastifyInstance): Promise<void> => {
  // Fastify 内置 JSON Schema 验证，这里只做额外配置
  // 设置默认的响应 schema
  app.addHook('onRoute', (routeOptions) => {
    // 如果路由没有设置响应 schema，添加默认的
    if (!routeOptions.schema?.response) {
      routeOptions.schema = routeOptions.schema || {};
      routeOptions.schema.response = {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {},
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      };
    }
  });
});
