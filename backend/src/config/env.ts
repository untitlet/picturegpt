import { config } from 'dotenv';

config();

export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',
  DB_HOST: process.env.DB_HOST || 'postgres',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_USER: process.env.DB_USER || 'aiuser',
  DB_PASSWORD: process.env.DB_PASSWORD || 'aipassword',
  DB_NAME: process.env.DB_NAME || 'aigenerator',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379',

  // OpenRouter
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',

  // Bitrix24
  BITRIX24_CLIENT_ID: process.env.BITRIX24_CLIENT_ID || '',
  BITRIX24_CLIENT_SECRET: process.env.BITRIX24_CLIENT_SECRET || '',
  BITRIX24_REDIRECT_URI: process.env.BITRIX24_REDIRECT_URI || '',

  // Security
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',

  // App
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  STORAGE_PATH: process.env.STORAGE_PATH || './storage',

  // S3/MinIO Object Storage
  S3_ENDPOINT: process.env.S3_ENDPOINT || 'http://minio:9000',
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || 'minio_admin',
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || 'minio_secure_password',
  S3_BUCKET: process.env.S3_BUCKET || 'bx-images',

  // Worker
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),

  // Frontend
  VITE_API_URL: process.env.VITE_API_URL || '/api',
};

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'OPENROUTER_API_KEY',
  'ENCRYPTION_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!env[envVar as keyof typeof env]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export default env;
