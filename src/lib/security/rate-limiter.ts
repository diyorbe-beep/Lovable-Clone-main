import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { getFallbackCache } from '@/lib/cache/fallback-cache';

// Initialize Redis with fallback handling
let redis: Redis | null = null;
let fallbackCache: any = null;

try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  fallbackCache = getFallbackCache(redis);
} catch (error) {
  console.warn('Redis initialization failed, using fallback cache:', error);
  // Create a dummy Redis client for rate limiter
  redis = null;
  fallbackCache = getFallbackCache(null);
}

// Rate limiters with Redis fallback
export const apiRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'api_limit',
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 60, // Block for 60 seconds if limit exceeded
});

export const authRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'auth_limit',
  points: 5, // Number of requests
  duration: 900, // Per 15 minutes
  blockDuration: 900, // Block for 15 minutes if limit exceeded
});

export const generationRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'generation_limit',
  points: 10, // Number of generations
  duration: 3600, // Per hour
  blockDuration: 3600, // Block for 1 hour if limit exceeded
});

export const wsRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'ws_limit',
  points: 50, // Number of WebSocket messages
  duration: 60, // Per 60 seconds
  blockDuration: 60,
});

export async function checkRateLimit(
  limiter: RateLimiterRedis,
  identifier: string,
  points?: number
) {
  // If Redis is not available, use fallback cache
  if (!redis) {
    return await checkRateLimitFallback(limiter, identifier, points);
  }

  try {
    await limiter.consume(identifier, points);
    return { success: true };
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    return {
      success: false,
      error: 'Rate limit exceeded',
      retryAfter: secs,
      totalHits: rejRes.totalHits,
      remainingPoints: rejRes.remainingPoints,
    };
  }
}

// Fallback rate limiting using memory cache
async function checkRateLimitFallback(
  limiter: RateLimiterRedis,
  identifier: string,
  points?: number
) {
  try {
    // Extract rate limit settings from limiter
    const keyPrefix = (limiter as any).keyPrefix || 'rate_limit';
    const limitPoints = points || (limiter as any).points || 100;
    const duration = (limiter as any).duration || 60;
    
    // Use fallback cache for rate limiting
    const result = await fallbackCache.rateLimit(
      `${keyPrefix}:${identifier}`,
      limitPoints,
      duration
    );
    
    if (result.allowed) {
      return { success: true };
    } else {
      return {
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        totalHits: limitPoints - result.remaining,
        remainingPoints: result.remaining,
      };
    }
  } catch (error) {
    console.error('Fallback rate limiting failed:', error);
    // Allow request if rate limiting fails completely
    return { success: true };
  }
}

// Health check for rate limiting
export async function rateLimitHealthCheck(): Promise<{
  redis: boolean;
  fallback: boolean;
  source: 'redis' | 'memory' | 'error';
}> {
  try {
    if (redis) {
      await redis.ping();
      return { redis: true, fallback: false, source: 'redis' };
    }
  } catch (error) {
    console.warn('Redis health check failed:', error);
  }

  try {
    const health = await fallbackCache.healthCheck();
    return { 
      redis: false, 
      fallback: health.memory, 
      source: health.redis ? 'redis' : 'memory' 
    };
  } catch (error) {
    console.error('Fallback cache health check failed:', error);
    return { redis: false, fallback: false, source: 'error' };
  }
}
