import { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  // Basic health check
  fastify.get('/health', async (request, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Readiness check (database + redis)
  fastify.get('/ready', async (request, reply) => {
    try {
      // Check database connection
      await request.server.prisma.$queryRaw`SELECT 1`;
      
      // Check Redis connection (will be added to server decorator)
      const redisStatus = request.server.redis ? 'connected' : 'not_configured';

      return reply.send({ 
        status: 'ready',
        services: {
          database: 'connected',
          redis: redisStatus,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return reply.code(503).send({ 
        status: 'unavailable',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });
}
