import type { FastifyInstance } from 'fastify';
import { chatCompletion, chatCompletionStream, testConnection, hasApiKey } from '../services/ai-proxy.js';
import { aiChatBody, aiTestBody } from '../lib/validation.js';
import type { AIChatRequest } from '../../shared/types.js';

export async function aiRoutes(app: FastifyInstance) {

  // POST /chat — AI 对话
  app.post<{ Body: AIChatRequest }>('/chat', {
    schema: { body: aiChatBody },
  }, async (request, reply) => {
    const chatRequest = request.body;

    // 流式响应
    if (chatRequest.stream) {
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      let aborted = false;
      request.raw.on('close', () => {
        aborted = true;
      });

      try {
        for await (const chunk of chatCompletionStream(chatRequest)) {
          if (aborted) break;
          // 降级元数据直接转发，不包装为 content
          if (chunk.startsWith('{"degraded":')) {
            reply.raw.write(`data: ${chunk}\n\n`);
          } else {
            reply.raw.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          }
        }
        if (!aborted) {
          reply.raw.write('data: [DONE]\n\n');
        }
      } catch (err) {
        if (!aborted) {
          reply.raw.write(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : '未知错误' })}\n\n`);
        }
      }

      reply.raw.end();
      return;
    }

    // 非流式响应
    const result = await chatCompletion(chatRequest);
    return { success: true, data: result };
  });

  // POST /test — 测试 AI 连接（改用 POST 避免 API Key 出现在 URL 中）
  app.post<{ Body: { provider?: 'siliconflow' | 'openai'; apiKey?: string } }>('/test', {
    schema: { body: aiTestBody },
  }, async (request) => {
    const { provider = 'siliconflow', apiKey } = request.body;

    const hasKey = hasApiKey(provider, apiKey);
    if (!hasKey) {
      return {
        success: true,
        data: {
          connected: false,
          message: '未配置 API Key，当前使用模拟模式',
          mode: 'simulated',
        },
      };
    }

    const result = await testConnection(provider, apiKey);
    return {
      success: true,
      data: {
        connected: result.success,
        message: result.message,
        mode: result.success ? 'api' : 'simulated',
      },
    };
  });
}
