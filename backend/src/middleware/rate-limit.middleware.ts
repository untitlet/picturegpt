import rateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';

export async function registerRateLimiting(app: FastifyInstance) {
  await app.register(rateLimit, {
    max: 100, // Default limit
    timeWindow: '1 minute',
    allowList: ['127.0.0.1', '::1'], // Whitelist localhost
    keyGenerator: (request) => {
      // Use user ID if authenticated, otherwise IP
      return request.user?.id || request.ip;
    },
  });

  // Stricter limits for AI endpoints
  app.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith('/api/generate')) {
      const rateLimitContext = (reply as any).context;
      if (rateLimitContext) {
        // Override for generation endpoints: 10 requests per minute
        request.server.rateLimit({
          max: 10,
          timeWindow: '1 minute',
        });
      }
    }

    if (request.url.startsWith('/api/analyze')) {
      // Even stricter for analysis (expensive operations)
      request.server.rateLimit({
        max: 5,
        timeWindow: '1 minute',
      });
    }
  });
}
