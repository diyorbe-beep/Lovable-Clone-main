import Redis from 'ioredis';
import { getFallbackCache } from './fallback-cache';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export class RedisCache {
  private redis: Redis | null;
  private fallbackCache: any;
  private defaultPrefix: string;

  constructor(redisUrl?: string, defaultPrefix = 'lovable:') {
    this.defaultPrefix = defaultPrefix;
    
    try {
      const url = redisUrl || process.env.REDIS_URL;
      if (!url) {
        throw new Error('Redis URL not provided');
      }
      this.redis = new Redis(url);
      this.fallbackCache = getFallbackCache(this.redis);
    } catch (error) {
      console.warn('Redis initialization failed, using fallback cache:', error);
      this.redis = null;
      this.fallbackCache = getFallbackCache(null);
    }
  }

  private getKey(key: string, prefix?: string): string {
    return `${prefix || this.defaultPrefix}${key}`;
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const result = await this.fallbackCache.get(key, options);
      return result.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      await this.fallbackCache.set(key, value, options);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string, options?: CacheOptions): Promise<void> {
    try {
      await this.fallbackCache.del(key, options);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const result = await this.fallbackCache.exists(key, options);
      return result.data || false;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async increment(key: string, amount = 1, options?: CacheOptions): Promise<number> {
    try {
      const result = await this.fallbackCache.increment(key, amount, options);
      return result.data || 0;
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  async decrement(key: string, amount = 1, options?: CacheOptions): Promise<number> {
    try {
      const result = await this.fallbackCache.increment(key, -amount, options);
      return result.data || 0;
    } catch (error) {
      console.error('Cache decrement error:', error);
      return 0;
    }
  }

  async getTTL(key: string, options?: CacheOptions): Promise<number> {
    try {
      if (this.redis) {
        const fullKey = this.getKey(key, options?.prefix);
        return await this.redis.ttl(fullKey);
      }
      return -1;
    } catch (error) {
      console.error('Cache TTL error:', error);
      return -1;
    }
  }

  async setTTL(key: string, ttl: number, options?: CacheOptions): Promise<void> {
    try {
      if (this.redis) {
        const fullKey = this.getKey(key, options?.prefix);
        await this.redis.expire(fullKey, ttl);
      }
    } catch (error) {
      console.error('Cache set TTL error:', error);
    }
  }

  async clear(prefix?: string): Promise<void> {
    try {
      await this.fallbackCache.clear(prefix);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  async mget<T>(keys: string[], options?: CacheOptions): Promise<(T | null)[]> {
    try {
      const promises = keys.map(key => this.get<T>(key, options));
      return Promise.all(promises);
    } catch (error) {
      console.error('Cache mget error:', error);
      return new Array(keys.length).fill(null);
    }
  }

  async mset<T>(entries: Array<{ key: string; value: T }>, options?: CacheOptions): Promise<void> {
    try {
      const promises = entries.map(entry => this.set(entry.key, entry.value, options));
      await Promise.all(promises);
    } catch (error) {
      console.error('Cache mset error:', error);
    }
  }

  // Cache with automatic refresh
  async getWithRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    await this.set(key, fresh, options);
    return fresh;
  }

  // Cache with write-through pattern
  async setWithWriteThrough<T>(
    key: string,
    value: T,
    writer: (value: T) => Promise<void>,
    options?: CacheOptions
  ): Promise<void> {
    await this.set(key, value, options);
    await writer(value);
  }

  // Cache invalidation patterns
  async invalidatePattern(pattern: string, options?: CacheOptions): Promise<void> {
    await this.clear(options?.prefix ? `${options.prefix}:${pattern}` : pattern);
  }

  // Distributed lock
  async acquireLock(
    key: string,
    ttl = 10,
    options?: CacheOptions
  ): Promise<string | null> {
    try {
      if (this.redis) {
        const lockKey = this.getKey(`lock:${key}`, options?.prefix);
        const identifier = `${Date.now()}-${Math.random()}`;
        
        const result = await this.redis.set(lockKey, identifier, 'PX', ttl * 1000, 'NX');
        return result === 'OK' ? identifier : null;
      }
      return null;
    } catch (error) {
      console.error('Cache acquire lock error:', error);
      return null;
    }
  }

  async releaseLock(
    key: string,
    identifier: string,
    options?: CacheOptions
  ): Promise<boolean> {
    try {
      if (this.redis) {
        const lockKey = this.getKey(`lock:${key}`, options?.prefix);
        
        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        
        const result = await this.redis.eval(script, 1, lockKey, identifier);
        return result === 1;
      }
      return false;
    } catch (error) {
      console.error('Cache release lock error:', error);
      return false;
    }
  }

  // Rate limiting
  async rateLimit(
    key: string,
    limit: number,
    window: number,
    options?: CacheOptions
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const result = await this.fallbackCache.rateLimit(key, limit, window, options);
      return {
        allowed: result.allowed,
        remaining: result.remaining,
        resetTime: result.resetTime
      };
    } catch (error) {
      console.error('Rate limit error:', error);
      return { allowed: true, remaining: limit, resetTime: Date.now() + window * 1000 };
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const health = await this.fallbackCache.healthCheck();
      return health.redis || health.memory;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  // Disconnect
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Singleton instance
export const cache = new RedisCache();
