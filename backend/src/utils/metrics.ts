import client, { Counter, Histogram, Registry } from 'prom-client';

const register = new Registry();

// Add default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
export const metrics = {
  // Counters
  jobsProcessed: new Counter({
    name: 'ai_jobs_processed_total',
    help: 'Total number of AI jobs processed',
    labelNames: ['status', 'model'] as const,
    registers: [register],
  }),

  jobsFailed: new Counter({
    name: 'ai_jobs_failed_total',
    help: 'Total number of AI jobs failed',
    labelNames: ['error_type', 'model'] as const,
    registers: [register],
  }),

  bitrixSyncs: new Counter({
    name: 'bitrix_syncs_total',
    help: 'Total number of Bitrix24 sync operations',
    labelNames: ['entity_type', 'status'] as const,
    registers: [register],
  }),

  apiRequests: new Counter({
    name: 'api_requests_total',
    help: 'Total number of API requests',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [register],
  }),

  // Histograms
  jobDuration: new Histogram({
    name: 'ai_job_duration_seconds',
    help: 'Duration of AI jobs in seconds',
    labelNames: ['model', 'type'] as const,
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
    registers: [register],
  }),

  apiResponseTime: new Histogram({
    name: 'api_response_time_seconds',
    help: 'API response time in seconds',
    labelNames: ['method', 'route'] as const,
    buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
    registers: [register],
  }),

  queueSize: new Histogram({
    name: 'queue_size',
    help: 'Current queue size',
    labelNames: ['queue_name'] as const,
    buckets: [0, 1, 5, 10, 20, 50, 100],
    registers: [register],
  }),

  // Gauges
  activeJobs: new client.Gauge({
    name: 'ai_jobs_active',
    help: 'Number of currently active AI jobs',
    labelNames: ['model'] as const,
    registers: [register],
  }),

  s3Uploads: new client.Gauge({
    name: 's3_uploads_total',
    help: 'Total number of S3 uploads',
    labelNames: ['status'] as const,
    registers: [register],
  }),
};

export { register };
export default register;
