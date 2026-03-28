import { performance } from 'perf_hooks';

// Simple in-memory metrics store (in production, use Redis or similar)
const metrics = new Map<string, any>();

export class MetricsCollector {
  // Request metrics
  static recordRequest(method: string, path: string, statusCode: number, duration: number) {
    const key = `request:${method}:${path}`;
    const existing = metrics.get(key) || {
      count: 0,
      totalDuration: 0,
      statusCodes: {},
      avgDuration: 0,
    };

    existing.count++;
    existing.totalDuration += duration;
    existing.avgDuration = existing.totalDuration / existing.count;
    existing.statusCodes[statusCode] = (existing.statusCodes[statusCode] || 0) + 1;

    metrics.set(key, existing);
  }

  // Database query metrics
  static recordDatabaseQuery(operation: string, table: string, duration: number) {
    const key = `db:${operation}:${table}`;
    const existing = metrics.get(key) || {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      slowQueries: 0,
    };

    existing.count++;
    existing.totalDuration += duration;
    existing.avgDuration = existing.totalDuration / existing.count;

    if (duration > 1000) { // Slow query threshold
      existing.slowQueries++;
    }

    metrics.set(key, existing);
  }

  // AI generation metrics
  static recordAIGeneration(model: string, tokens: number, duration: number) {
    const key = `ai:${model}`;
    const existing = metrics.get(key) || {
      count: 0,
      totalTokens: 0,
      totalDuration: 0,
      avgTokens: 0,
      avgDuration: 0,
      tokensPerSecond: 0,
    };

    existing.count++;
    existing.totalTokens += tokens;
    existing.totalDuration += duration;
    existing.avgTokens = existing.totalTokens / existing.count;
    existing.avgDuration = existing.totalDuration / existing.count;
    existing.tokensPerSecond = tokens / (duration / 1000);

    metrics.set(key, existing);
  }

  // User activity metrics
  static recordUserActivity(userId: string, action: string) {
    const key = `user:${action}`;
    const existing = metrics.get(key) || {
      count: 0,
      uniqueUsers: new Set(),
    };

    existing.count++;
    existing.uniqueUsers.add(userId);

    metrics.set(key, existing);
  }

  // Error metrics
  static recordError(error: string, context?: string) {
    const key = `error:${error}`;
    const existing = metrics.get(key) || {
      count: 0,
      contexts: new Set(),
    };

    existing.count++;
    if (context) {
      existing.contexts.add(context);
    }

    metrics.set(key, existing);
  }

  // Performance metrics
  static recordPerformance(operation: string, duration: number) {
    const key = `perf:${operation}`;
    const existing = metrics.get(key) || {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
    };

    existing.count++;
    existing.totalDuration += duration;
    existing.avgDuration = existing.totalDuration / existing.count;
    existing.minDuration = Math.min(existing.minDuration, duration);
    existing.maxDuration = Math.max(existing.maxDuration, duration);

    metrics.set(key, existing);
  }

  // Get metrics
  static getMetrics() {
    const result: any = {};

    for (const [key, value] of metrics.entries()) {
      result[key] = {
        ...value,
        // Convert Sets to arrays for serialization
        uniqueUsers: value.uniqueUsers ? Array.from(value.uniqueUsers) : undefined,
        contexts: value.contexts ? Array.from(value.contexts) : undefined,
      };
    }

    return result;
  }

  // Get specific metric
  static getMetric(key: string) {
    const metric = metrics.get(key);
    if (!metric) return null;

    return {
      ...metric,
      uniqueUsers: metric.uniqueUsers ? Array.from(metric.uniqueUsers) : undefined,
      contexts: metric.contexts ? Array.from(metric.contexts) : undefined,
    };
  }

  // Reset metrics
  static resetMetrics() {
    metrics.clear();
  }

  // Get health status
  static getHealthStatus() {
    const now = Date.now();
    const last5min = now - 5 * 60 * 1000;

    return {
      status: 'healthy',
      timestamp: new Date(now).toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      metrics: {
        total: metrics.size,
        requests: this.getRequestMetrics(last5min),
        errors: this.getErrorMetrics(last5min),
        performance: this.getPerformanceMetrics(last5min),
      },
    };
  }

  private static getRequestMetrics(since: number) {
    const requestMetrics: Record<string, unknown> = {};

    for (const [key, value] of metrics.entries()) {
      if (key.startsWith('request:')) {
        requestMetrics[key] = {
          ...value,
          recentCount: value.recentCount || 0, // Would need to track this separately
        };
      }
    }

    return requestMetrics;
  }

  private static getErrorMetrics(since: number) {
    const errorMetrics: Record<string, unknown> = {};

    for (const [key, value] of metrics.entries()) {
      if (key.startsWith('error:')) {
        errorMetrics[key] = {
          ...value,
          recentCount: value.recentCount || 0, // Would need to track this separately
        };
      }
    }

    return errorMetrics;
  }

  private static getPerformanceMetrics(since: number) {
    const perfMetrics: Record<string, unknown> = {};

    for (const [key, value] of metrics.entries()) {
      if (key.startsWith('perf:')) {
        perfMetrics[key] = {
          ...value,
          recentAvgDuration: value.recentAvgDuration || 0, // Would need to track this separately
        };
      }
    }

    return perfMetrics;
  }
}

// Performance measurement decorator
export function measurePerformance(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const start = performance.now();
    try {
      const result = await method.apply(this, args);
      const duration = performance.now() - start;
      
      MetricsCollector.recordPerformance(`${target.constructor.name}.${propertyName}`, duration);
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      MetricsCollector.recordPerformance(`${target.constructor.name}.${propertyName}`, duration);
      const msg =
        error instanceof Error ? error.message : String(error);
      MetricsCollector.recordError(msg, `${target.constructor.name}.${propertyName}`);
      
      throw error;
    }
  };

  return descriptor;
}

// Simple performance timer
export class Timer {
  private start: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.start = performance.now();
  }

  end() {
    const duration = performance.now() - this.start;
    MetricsCollector.recordPerformance(this.operation, duration);
    return duration;
  }
}
