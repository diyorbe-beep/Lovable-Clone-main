// Performance optimization utilities

export class PerformanceOptimizer {
  // Memoization cache
  private static memoCache = new Map<string, { value: any; timestamp: number }>();
  private static readonly MEMO_TTL = 5 * 60 * 1000; // 5 minutes

  // Simple memoization
  static memo<T extends (...args: any[]) => any>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T {
    return ((...args: Parameters<T>) => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      const cached = this.memoCache.get(key);
      
      if (cached && Date.now() - cached.timestamp < this.MEMO_TTL) {
        return cached.value;
      }
      
      const result = fn(...args);
      this.memoCache.set(key, { value: result, timestamp: Date.now() });
      
      return result;
    }) as T;
  }

  // Batch operations
  static async batch<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    batchSize = 10
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
    }
    
    return results;
  }

  // Lazy loading
  static lazy<T>(factory: () => T): () => T {
    let instance: T | undefined;
    
    return () => {
      if (instance === undefined) {
        instance = factory();
      }
      return instance;
    };
  }

  // Throttle expensive operations
  static throttle<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): T {
    let lastCall = 0;
    
    return ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return fn(...args);
      }
    }) as T;
  }

  // Debounce frequent operations
  static debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): T {
    let timeout: NodeJS.Timeout;
    
    return ((...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    }) as T;
  }

  // Request animation frame for smooth UI
  static raf<T extends (...args: any[]) => any>(fn: T): T {
    return ((...args: Parameters<T>) => {
      return new Promise(resolve => {
        requestAnimationFrame(() => {
          resolve(fn(...args));
        });
      });
    }) as T;
  }

  // Idle callback for non-critical operations
  static idle<T extends (...args: any[]) => any>(fn: T): Promise<ReturnType<T>> {
    return new Promise(resolve => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          resolve(fn());
        });
      } else {
        // Fallback for browsers without idle callback
        setTimeout(() => resolve(fn()), 1);
      }
    });
  }

  // Cleanup memo cache
  static cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.memoCache.entries()) {
      if (now - value.timestamp > this.MEMO_TTL) {
        this.memoCache.delete(key);
      }
    }
  }

  // Performance monitoring
  static measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    console.log(`${name}: ${end - start}ms`);
    return result;
  }

  // Async performance monitoring
  static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    console.log(`${name}: ${end - start}ms`);
    return result;
  }
}

// Performance hooks for React components
export const usePerformanceOptimization = () => {
  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      PerformanceOptimizer.cleanup();
    };
  }, []);
};

// Export singleton
export const performanceOptimizer = PerformanceOptimizer;

// Auto-cleanup interval
setInterval(() => {
  PerformanceOptimizer.cleanup();
}, 60000); // Cleanup every minute
