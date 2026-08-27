import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType | null = null;
  private readonly logger = new Logger(RedisService.name);

  async onModuleInit() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = createClient({ url });
    this.client.on('error', (err) => this.logger.error('Redis error', err));
    await this.client.connect();
    this.logger.log(`Connected to Redis (${url})`);
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }

  async setRevoked(token: string, ttlSeconds: number) {
    if (!this.client) throw new Error('Redis client not initialized');
    await this.client.set(token, '1', { EX: ttlSeconds });
  }

  async isRevoked(token: string) {
    if (!this.client) return false;
    const v = await this.client.get(token);
    return !!v;
  }
}
