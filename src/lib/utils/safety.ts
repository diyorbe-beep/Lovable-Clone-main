// Safety utilities for production stability

export class SafetyGuard {
  // Null/undefined checks
  static safeGet<T>(obj: any, path: string, fallback?: T): T | undefined {
    try {
      const keys = path.split('.');
      let result = obj;
      
      for (const key of keys) {
        if (result == null || result[key] == null) {
          return fallback;
        }
        result = result[key];
      }
      
      return result;
    } catch {
      return fallback;
    }
  }

  // Safe JSON parsing
  static safeJsonParse<T>(json: string, fallback?: T): T | undefined {
    try {
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  }

  // Safe number parsing
  static safeParseNumber(value: any, fallback = 0): number {
    const parsed = Number(value);
    return isNaN(parsed) ? fallback : parsed;
  }

  // Safe string operations
  static safeString(value: any, fallback = ''): string {
    return value == null ? fallback : String(value);
  }

  // Safe array operations
  static safeArray<T>(value: any, fallback: T[] = []): T[] {
    if (!Array.isArray(value)) {
      return fallback;
    }
    return value;
  }

  // Validate required fields
  static validateRequired(obj: any, requiredFields: string[]): string[] {
    const missing: string[] = [];
    
    for (const field of requiredFields) {
      if (this.safeGet(obj, field) == null) {
        missing.push(field);
      }
    }
    
    return missing;
  }

  // Sanitize user input
  static sanitizeInput(input: any): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .slice(0, 1000); // Limit length
  }

  // Validate email format
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate URL format
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Safe promise execution with timeout
  static async safePromise<T>(
    promise: Promise<T>,
    timeout = 10000,
    fallback?: T
  ): Promise<T | undefined> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Promise timeout')), timeout);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } catch (error) {
      console.warn('Promise failed or timed out:', error);
      return fallback;
    }
  }

  // Batch processing with error isolation
  static async safeBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: {
      batchSize?: number;
      continueOnError?: boolean;
      timeout?: number;
    } = {}
  ): Promise<Array<{ success: boolean; result?: R; error?: string }>> {
    const {
      batchSize = 10,
      continueOnError = true,
      timeout = 5000
    } = options;

    const results: Array<{ success: boolean; result?: R; error?: string }> = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (item) => {
          return await this.safePromise(
            processor(item),
            timeout
          );
        })
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push({
            success: true,
            result: result.value
          });
        } else {
          if (continueOnError) {
            results.push({
              success: false,
              error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
            });
          } else {
            throw result.reason;
          }
        }
      }
    }

    return results;
  }

  // Memory usage monitoring
  static getMemoryUsage(): {
    used: number;
    total: number;
    percentage: number;
  } {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      const used = usage.heapUsed;
      const total = usage.heapTotal;
      
      return {
        used: Math.round(used / 1024 / 1024), // MB
        total: Math.round(total / 1024 / 1024), // MB
        percentage: Math.round((used / total) * 100)
      };
    }
    
    // Browser fallback
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
      };
    }
    
    return { used: 0, total: 0, percentage: 0 };
  }

  // Check memory pressure
  static isMemoryPressure(threshold = 80): boolean {
    const usage = this.getMemoryUsage();
    return usage.percentage > threshold;
  }

  // Safe async iteration
  static async safeAsyncForEach<T>(
    items: T[],
    processor: (item: T, index: number) => Promise<void>,
    options: {
      continueOnError?: boolean;
      timeout?: number;
    } = {}
  ): Promise<void> {
    const { continueOnError = true, timeout = 5000 } = options;

    for (let i = 0; i < items.length; i++) {
      try {
        await this.safePromise(
          processor(items[i], i),
          timeout
        );
      } catch (error) {
        if (!continueOnError) {
          throw error;
        }
        console.warn(`Async forEach failed at index ${i}:`, error);
      }
    }
  }

  // Rate limiting helper
  static createRateLimiter(maxCalls: number, timeWindow: number) {
    const calls: number[] = [];
    
    return () => {
      const now = Date.now();
      
      // Remove old calls outside the time window
      while (calls.length > 0 && calls[0] < now - timeWindow) {
        calls.shift();
      }
      
      if (calls.length >= maxCalls) {
        throw new Error('Rate limit exceeded');
      }
      
      calls.push(now);
    };
  }

  // Circuit breaker pattern
  static createCircuitBreaker<T extends (...args: any[]) => any>(
    fn: T,
    options: {
      failureThreshold?: number;
      resetTimeout?: number;
      monitoringPeriod?: number;
    } = {}
  ) {
    const {
      failureThreshold = 5,
      resetTimeout = 60000,
      monitoringPeriod = 10000
    } = options;

    let failures = 0;
    let lastFailureTime = 0;
    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
      return new Promise((resolve, reject) => {
        const now = Date.now();

        // Check if circuit should reset
        if (state === 'OPEN' && now - lastFailureTime > resetTimeout) {
          state = 'HALF_OPEN';
          failures = 0;
        }

        // Reject if circuit is open
        if (state === 'OPEN') {
          reject(new Error('Circuit breaker is OPEN'));
          return;
        }

        // Execute function
        Promise.resolve(fn(...args))
          .then((result) => {
            // Reset failures on success
            if (state === 'HALF_OPEN') {
              state = 'CLOSED';
            }
            failures = 0;
            resolve(result);
          })
          .catch((error) => {
            failures++;
            lastFailureTime = now;

            // Open circuit if threshold reached
            if (failures >= failureThreshold) {
              state = 'OPEN';
            }

            reject(error);
          });
      });
    };
  }
}

// Export singleton
export const safetyGuard = SafetyGuard;
