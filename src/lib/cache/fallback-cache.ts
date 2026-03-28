export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export interface CacheResult<T> {
  data: T | null;
  source: 'redis' | 'memory' | 'none';
  error?: string;
}

// Simple in-memory cache implementation
class MemoryCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  private maxSize = 1000; // Limit memory usage
  private defaultTTL = 300; // 5 minutes

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set<T>(key: string, value: T, ttl: number = this.defaultTTL): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (typeof oldestKey === 'string') {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data: value,
      expiry: Date.now() + (ttl * 1000),
    });
  }

  del(key: string): void {
    this.cache.delete(key);
  }

  exists(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses
    };
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Hybrid cache with Redis fallback to memory
export class FallbackCache {
  private redis: any; // Redis client
  private memoryCache: MemoryCache;
  private redisAvailable: boolean = true;
  private lastRedisCheck: number = 0;
  private redisCheckInterval: number = 30000; // 30 seconds
  private defaultPrefix: string;

  constructor(redisClient: any, defaultPrefix = 'lovable:') {
    this.redis = redisClient;
    this.memoryCache = new MemoryCache();
    this.defaultPrefix = defaultPrefix;
  }

  private getKey(key: string, prefix?: string): string {
    const prefixStr = prefix || this.defaultPrefix;
    return `${prefixStr}${key}`;
  }

  private async checkRedisHealth(): Promise<boolean> {
    const now = Date.now();
    
    // Don't check too frequently
    if (now - this.lastRedisCheck < this.redisCheckInterval) {
      return this.redisAvailable;
    }

    this.lastRedisCheck = now;

    try {
      if (this.redis) {
        await this.redis.ping();
        this.redisAvailable = true;
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Redis health check failed, falling back to memory cache:', error);
      this.redisAvailable = false;
      return false;
    }
  }

  async get<T>(key: string, options?: CacheOptions): Promise<CacheResult<T>> {
    const fullKey = this.getKey(key, options?.prefix);
    
    // Try Redis first if available
    if (await this.checkRedisHealth()) {
      try {
        const value = await this.redis.get(fullKey);
        if (value) {
          const parsed = JSON.parse(value);
          // Also store in memory for faster access
          this.memoryCache.set(fullKey, parsed, options?.ttl);
          return { data: parsed, source: 'redis' };
        }
      } catch (error) {
        console.error('Redis get error, falling back to memory:', error);
        this.redisAvailable = false;
      }
    }

    // Fallback to memory cache
    try {
      const value = this.memoryCache.get<T>(fullKey);
      return { data: value, source: 'memory' };
    } catch (error) {
      console.error('Memory cache get error:', error);
      return { data: null, source: 'none', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<CacheResult<void>> {
    const fullKey = this.getKey(key, options?.prefix);
    const serialized = JSON.stringify(value);
    
    // Always set in memory cache
    this.memoryCache.set(fullKey, value, options?.ttl);

    // Try Redis if available
    if (await this.checkRedisHealth()) {
      try {
        if (options?.ttl) {
          await this.redis.setex(fullKey, options.ttl, serialized);
        } else {
          await this.redis.set(fullKey, serialized);
        }
        return { data: undefined, source: 'redis' };
      } catch (error) {
        console.error('Redis set error, using memory cache only:', error);
        this.redisAvailable = false;
        return { data: undefined, source: 'memory', error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return { data: undefined, source: 'memory' };
  }

  async del(key: string, options?: CacheOptions): Promise<CacheResult<void>> {
    const fullKey = this.getKey(key, options?.prefix);
    
    // Delete from memory cache
    this.memoryCache.del(fullKey);

    // Try Redis if available
    if (await this.checkRedisHealth()) {
      try {
        await this.redis.del(fullKey);
        return { data: undefined, source: 'redis' };
      } catch (error) {
        console.error('Redis del error:', error);
        this.redisAvailable = false;
        return { data: undefined, source: 'memory', error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return { data: undefined, source: 'memory' };
  }

  async exists(key: string, options?: CacheOptions): Promise<CacheResult<boolean>> {
    const fullKey = this.getKey(key, options?.prefix);
    
    // Try Redis first if available
    if (await this.checkRedisHealth()) {
      try {
        const exists = await this.redis.exists(fullKey);
        if (exists) {
          return { data: true, source: 'redis' };
        }
      } catch (error) {
        console.error('Redis exists error, falling back to memory:', error);
        this.redisAvailable = false;
      }
    }

    // Fallback to memory cache
    try {
      const exists = this.memoryCache.exists(fullKey);
      return { data: exists, source: 'memory' };
    } catch (error) {
      console.error('Memory cache exists error:', error);
      return { data: false, source: 'none', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async increment(key: string, amount = 1, options?: CacheOptions): Promise<CacheResult<number>> {
    const fullKey = this.getKey(key, options?.prefix);
    
    // Try Redis first if available
    if (await this.checkRedisHealth()) {
      try {
        const result = await this.redis.incrby(fullKey, amount);
        return { data: result, source: 'redis' };
      } catch (error) {
        console.error('Redis increment error, falling back to memory:', error);
        this.redisAvailable = false;
      }
    }

    // Fallback to memory cache (simplified implementation)
    try {
      const current = this.memoryCache.get<number>(fullKey) || 0;
      const newValue = current + amount;
      this.memoryCache.set(fullKey, newValue, options?.ttl);
      return { data: newValue, source: 'memory' };
    } catch (error) {
      console.error('Memory cache increment error:', error);
      return { data: 0, source: 'none', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async clear(prefix?: string): Promise<CacheResult<void>> {
    const pattern = this.getKey('*', prefix);
    
    // Clear memory cache
    this.memoryCache.clear();

    // Try Redis if available
    if (await this.checkRedisHealth()) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        return { data: undefined, source: 'redis' };
      } catch (error) {
        console.error('Redis clear error:', error);
        this.redisAvailable = false;
        return { data: undefined, source: 'memory', error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return { data: undefined, source: 'memory' };
  }

  async healthCheck(): Promise<{
    redis: boolean;
    memory: boolean;
    fallback: boolean;
    stats: {
      redis?: any;
      memory: { size: number; maxSize: number };
    };
  }> {
    const redisHealthy = await this.checkRedisHealth();
    const memoryStats = this.memoryCache.getStats();
    
    return {
      redis: redisHealthy,
      memory: true, // Memory cache is always available
      fallback: !redisHealthy, // Using fallback mode
      stats: {
        redis: redisHealthy ? { status: 'connected' } : { status: 'disconnected' },
        memory: memoryStats,
      },
    };
  }

  // Rate limiting with fallback
  async rateLimit(
    key: string,
    limit: number,
    window: number,
    options?: CacheOptions
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    source: 'redis' | 'memory';
  }> {
    const rateKey = this.getKey(`rate:${key}`, options?.prefix);
    const now = Date.now();
    const windowStart = now - window * 1000;
    
    // Try Redis first if available
    if (await this.checkRedisHealth()) {
      try {
        const pipeline = this.redis.pipeline();
        pipeline.zremrangebyscore(rateKey, '-inf', windowStart);
        pipeline.zcard(rateKey);
        pipeline.zadd(rateKey, now, `${now}-${Math.random()}`);
        pipeline.expire(rateKey, window);
        
        const results = await pipeline.exec();
        const currentCount = results?.[1]?.[1] as number || 0;
        
        return {
          allowed: currentCount < limit,
          remaining: Math.max(0, limit - currentCount - 1),
          resetTime: now + window * 1000,
          source: 'redis'
        };
      } catch (error) {
        console.error('Redis rate limit error, falling back to memory:', error);
        this.redisAvailable = false;
      }
    }

    // Fallback to memory cache (simplified rate limiting)
    try {
      const memoryKey = `rate_limit_${rateKey}`;
      const existing = this.memoryCache.get<{
        count: number;
        windowStart: number;
      }>(memoryKey);
      
      let count = 0;
      if (existing && existing.windowStart > windowStart) {
        count = existing.count;
      }
      
      const newCount = count + 1;
      this.memoryCache.set(memoryKey, {
        count: newCount,
        windowStart: now,
      }, window);
      
      return {
        allowed: newCount <= limit,
        remaining: Math.max(0, limit - newCount),
        resetTime: now + window * 1000,
        source: 'memory'
      };
    } catch (error) {
      console.error('Memory rate limit error:', error);
      return {
        allowed: true, // Allow on error to prevent blocking
        remaining: limit,
        resetTime: now + window * 1000,
        source: 'memory'
      };
    }
  }

  // Cleanup interval for memory cache
  startCleanupInterval(): void {
    setInterval(() => {
      this.memoryCache.cleanup();
    }, 60000); // Cleanup every minute
  }
}

// Create singleton instance
let fallbackCacheInstance: FallbackCache | null = null;

export function getFallbackCache(redisClient: any, prefix?: string): FallbackCache {
  if (!fallbackCacheInstance) {
    fallbackCacheInstance = new FallbackCache(redisClient, prefix);
    fallbackCacheInstance.startCleanupInterval();
  }
  return fallbackCacheInstance;
}
