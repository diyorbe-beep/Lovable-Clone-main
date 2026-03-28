import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/cache/redis-cache';
import { MetricsCollector } from '@/lib/monitoring/metrics';

export interface PerformanceConfig {
  enableResponseCache?: boolean;
  enableCompression?: boolean;
  enableRateLimiting?: boolean;
  cacheTTL?: number;
  compressionThreshold?: number;
}

export class PerformanceMiddleware {
  private config: PerformanceConfig;

  constructor(config: PerformanceConfig = {}) {
    this.config = {
      enableResponseCache: true,
      enableCompression: true,
      enableRateLimiting: true,
      cacheTTL: 300, // 5 minutes
      compressionThreshold: 1024, // 1KB
      ...config
    };
  }

  async middleware(request: NextRequest): Promise<NextResponse | null> {
    const startTime = Date.now();
    const url = request.url;
    const method = request.method;

    // Skip performance middleware for certain routes
    if (this.shouldSkipPerformanceMiddleware(url)) {
      return null;
    }

    // Rate limiting
    if (this.config.enableRateLimiting) {
      const rateLimitResult = await this.checkRateLimit(request);
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { 
            status: 429,
            headers: {
              'Retry-After': rateLimitResult.retryAfter.toString(),
              'X-RateLimit-Limit': rateLimitResult.limit.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            }
          }
        );
      }
    }

    // Response caching for GET requests
    if (this.config.enableResponseCache && method === 'GET') {
      const cachedResponse = await this.getCachedResponse(url);
      if (cachedResponse) {
        const response = NextResponse.json(cachedResponse.data);
        response.headers.set('X-Cache', 'HIT');
        response.headers.set('X-Cache-TTL', cachedResponse.ttl.toString());
        return response;
      }
    }

    // Continue to next middleware/route handler
    return null;
  }

  async postMiddleware(
    request: NextRequest, 
    response: NextResponse, 
    startTime: number
  ): Promise<NextResponse> {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const url = request.url;
    const method = request.method;

    // Record performance metrics
    MetricsCollector.recordPerformance(`${method} ${url}`, duration);

    // Add performance headers
    response.headers.set('X-Response-Time', `${duration}ms`);
    response.headers.set('X-Server-Timestamp', endTime.toString());

    // Cache GET responses
    if (this.config.enableResponseCache && method === 'GET' && response.status === 200) {
      const responseData = await response.json();
      await this.cacheResponse(url, responseData, this.config.cacheTTL!);
      response.headers.set('X-Cache', 'MISS');
    }

    // Compression for large responses
    if (this.config.enableCompression && this.shouldCompress(response)) {
      response.headers.set('Content-Encoding', 'gzip');
    }

    return response;
  }

  private shouldSkipPerformanceMiddleware(url: string): boolean {
    const skipPatterns = [
      '/api/webhooks/',
      '/api/health',
      '/_next/',
      '/api/auth/',
      '/admin/'
    ];

    return skipPatterns.some(pattern => url.includes(pattern));
  }

  private async checkRateLimit(request: NextRequest): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter: number;
  }> {
    const clientIp = this.getClientIP(request);
    const key = `rate_limit:${clientIp}`;
    const limit = 100; // requests per hour
    const window = 3600; // 1 hour

    const result = await cache.rateLimit(key, limit, window);

    return {
      allowed: result.allowed,
      limit,
      remaining: result.remaining,
      resetTime: result.resetTime,
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
    };
  }

  private async getCachedResponse(url: string): Promise<{ data: any; ttl: number } | null> {
    const cacheKey = `response_cache:${this.hashUrl(url)}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      const ttl = await cache.getTTL(cacheKey);
      return { data: cached, ttl: Math.max(0, ttl) };
    }

    return null;
  }

  private async cacheResponse(url: string, data: any, ttl: number): Promise<void> {
    const cacheKey = `response_cache:${this.hashUrl(url)}`;
    await cache.set(cacheKey, data, { ttl });
  }

  private shouldCompress(response: NextResponse): boolean {
    const contentLength = response.headers.get('content-length');
    if (!contentLength) return false;

    const size = parseInt(contentLength);
    return size >= this.config.compressionThreshold!;
  }

  private getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for') ||
           request.headers.get('x-real-ip') ||
           request.ip ||
           'unknown';
  }

  private hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// Lazy loading optimization
export class LazyLoader {
  private static loadedModules = new Map<string, any>();

  static async load<T>(key: string, loader: () => Promise<T>): Promise<T> {
    if (this.loadedModules.has(key)) {
      return this.loadedModules.get(key);
    }

    const module = await loader();
    this.loadedModules.set(key, module);
    return module;
  }

  static preload(keys: string[], loaders: Array<() => Promise<any>>): Promise<void> {
    const promises = keys.map((key, index) => 
      this.load(key, loaders[index]).catch(() => null)
    );
    return Promise.all(promises).then(() => {});
  }
}

// Memory optimization
export class MemoryOptimizer {
  private static cache = new Map<string, { data: any; expiry: number }>();
  private static maxSize = 1000;
  private static defaultTTL = 300000; // 5 minutes

  static get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  static set(key: string, data: any, ttl: number = this.defaultTTL): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }

  static delete(key: string): void {
    this.cache.delete(key);
  }

  static clear(): void {
    this.cache.clear();
  }

  static cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  static getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0 // Would need to track hits/misses
    };
  }
}

// Resource pooling
export class ResourcePool<T> {
  private pool: T[] = [];
  private factory: () => T | Promise<T>;
  private destroyer?: (resource: T) => void | Promise<void>;
  private maxSize: number;
  private minSize: number;
  private currentSize = 0;
  private waitingQueue: Array<(resource: T) => void> = [];

  constructor(options: {
    factory: () => T | Promise<T>;
    destroyer?: (resource: T) => void | Promise<void>;
    maxSize?: number;
    minSize?: number;
  }) {
    this.factory = options.factory;
    this.destroyer = options.destroyer;
    this.maxSize = options.maxSize || 10;
    this.minSize = options.minSize || 2;
  }

  async acquire(): Promise<T> {
    // Return available resource from pool
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }

    // Create new resource if under max size
    if (this.currentSize < this.maxSize) {
      this.currentSize++;
      return await this.factory();
    }

    // Wait for resource to become available
    return new Promise((resolve) => {
      this.waitingQueue.push(resolve);
    });
  }

  async release(resource: T): Promise<void> {
    // Return to waiting queue if someone is waiting
    if (this.waitingQueue.length > 0) {
      const resolve = this.waitingQueue.shift()!;
      resolve(resource);
      return;
    }

    // Return to pool
    this.pool.push(resource);

    // Destroy excess resources
    if (this.pool.length > this.minSize) {
      const excessResource = this.pool.pop()!;
      if (this.destroyer) {
        await this.destroyer(excessResource);
      }
      this.currentSize--;
    }
  }

  async destroy(): Promise<void> {
    // Destroy all resources in pool
    const allResources = [...this.pool, ...this.waitingQueue];
    this.pool = [];
    this.waitingQueue = [];

    if (this.destroyer) {
      await Promise.all(allResources.map(resource => this.destroyer!(resource)));
    }

    this.currentSize = 0;
  }

  getStats(): { poolSize: number; waitingQueue: number; totalSize: number } {
    return {
      poolSize: this.pool.length,
      waitingQueue: this.waitingQueue.length,
      totalSize: this.currentSize
    };
  }
}

// Cleanup interval for memory optimization
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    MemoryOptimizer.cleanup();
  }, 60000); // Cleanup every minute
}

// Export singleton instance
export const performanceMiddleware = new PerformanceMiddleware();
