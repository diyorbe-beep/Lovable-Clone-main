// Simple concurrency utilities for production stability

export class SimpleLock {
  private locks = new Map<string, number>();
  
  async acquire(key: string, timeout = 5000): Promise<boolean> {
    const start = Date.now();
    
    while (this.locks.has(key)) {
      if (Date.now() - start > timeout) {
        return false; // Timeout
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    this.locks.set(key, Date.now());
    return true;
  }
  
  release(key: string): void {
    this.locks.delete(key);
  }
  
  // Cleanup stale locks
  cleanup(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.locks.entries()) {
      if (now - timestamp > 30000) { // 30 seconds
        this.locks.delete(key);
      }
    }
  }
}

export const globalLock = new SimpleLock();

// Simple version check for optimistic locking
export function generateVersion(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function isValidVersion(version: string): boolean {
  return typeof version === 'string' && version.includes('-');
}

// Timeout wrapper for async operations
export function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number,
  fallback?: T
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]).catch(error => {
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  });
}

// Safe async execution with error handling
export async function safeExecute<T>(
  operation: () => Promise<T>,
  fallback?: T,
  logError = true
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    if (logError) {
      console.error('Safe execution failed:', error);
    }
    return fallback;
  }
}

// Debounce for frequent operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle for performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
