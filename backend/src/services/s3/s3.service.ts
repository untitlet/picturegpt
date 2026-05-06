import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'stream';

interface S3Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
}

export class S3Service {
  private client: S3Client;
  private bucket: string;

  constructor(config: S3Config) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      region: config.region || 'us-east-1',
      forcePathStyle: true, // Required for MinIO
    });
    this.bucket = config.bucket;
  }

  /**
   * Upload a buffer to S3
   */
  async uploadBuffer(
    key: string,
    buffer: Buffer,
    contentType: string = 'application/octet-stream'
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.client.send(command);
    return this.getPublicUrl(key);
  }

  /**
   * Upload a stream to S3
   */
  async uploadStream(
    key: string,
    stream: Readable,
    contentType: string = 'application/octet-stream'
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: stream,
      ContentType: contentType,
    });

    await this.client.send(command);
    return this.getPublicUrl(key);
  }

  /**
   * Get a file from S3 as a buffer
   */
  async getFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    const body = response.Body as Readable;
    
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      body.on('data', (chunk) => chunks.push(chunk));
      body.on('end', () => resolve(Buffer.concat(chunks)));
      body.on('error', reject);
    });
  }

  /**
   * Get a signed URL for temporary access
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * Get public URL for a key
   */
  getPublicUrl(key: string): string {
    // For MinIO with anonymous download enabled
    return `${this.client.config.endpoint}/${this.bucket}/${key}`;
  }

  /**
   * Generate a unique key for uploaded files
   */
  generateKey(filename: string, prefix: string = 'images'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = filename.split('.').pop() || 'jpg';
    return `${prefix}/${timestamp}-${random}.${ext}`;
  }
}
