import { PrismaClient } from '@/generated/prisma';
import { prisma } from './connection';
import Logger from '@/lib/monitoring/logger';
import { MetricsCollector } from '@/lib/monitoring/metrics';

export class DatabaseQuery {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second

  // Wrapper for all database operations with retry logic
  static async execute<T>(
    operation: (client: PrismaClient) => Promise<T>,
    operationName: string = 'database_query'
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const client = await prisma.getInstance();
        const result = await operation(client);
        
        // Record successful operation
        const duration = Date.now() - startTime;
        MetricsCollector.recordDatabaseQuery('SELECT', operationName, duration);
        
        Logger.debug('Database query successful', {
          operation: operationName,
          attempt,
          duration,
        });

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        Logger.warn(`Database query failed (attempt ${attempt}/${this.MAX_RETRIES})`, {
          operation: operationName,
          error: lastError.message,
        });

        // Don't retry on certain errors
        if (this.isNonRetryableError(lastError)) {
          Logger.error('Non-retryable database error', {
            operation: operationName,
            error: lastError.message,
          });
          throw lastError;
        }

        // If this is the last attempt, throw the error
        if (attempt === this.MAX_RETRIES) {
          Logger.error('Database query failed after all retries', {
            operation: operationName,
            attempts: this.MAX_RETRIES,
            error: lastError.message,
          });
          
          // Record failed operation
          const duration = Date.now() - startTime;
          MetricsCollector.recordError('database_query_failed');
          MetricsCollector.recordDatabaseQuery('SELECT', operationName, duration);
          
          throw lastError;
        }

        // Wait before retrying
        await this.delay(this.RETRY_DELAY * attempt);
        
        // Reset connection on certain errors
        if (this.shouldResetConnection(lastError)) {
          Logger.warn('Resetting database connection due to error', {
            operation: operationName,
            error: lastError.message,
          });
          await prisma.resetConnection();
        }
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('Database query failed');
  }

  // Transaction wrapper
  static async executeTransaction<T>(
    operations: (client: PrismaClient) => Promise<T>,
    operationName: string = 'database_transaction'
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const client = await prisma.getInstance();
      
      const result = await client.$transaction(async (tx) => {
        return await operations(tx);
      });

      const duration = Date.now() - startTime;
      MetricsCollector.recordDatabaseQuery('TRANSACTION', operationName, duration);
      
      Logger.info('Database transaction successful', {
        operation: operationName,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));
      
      Logger.error('Database transaction failed', {
        operation: operationName,
        error: err.message,
        duration,
      });

      MetricsCollector.recordError('database_transaction_failed');
      MetricsCollector.recordDatabaseQuery('TRANSACTION', operationName, duration);
      
      throw err;
    }
  }

  // Batch operations
  static async executeBatch<T>(
    operations: Array<() => Promise<T>>,
    operationName: string = 'database_batch'
  ): Promise<T[]> {
    const startTime = Date.now();

    try {
      const client = await prisma.getInstance();
      
      // Execute operations in parallel with connection pooling
      const promises = operations.map(async (operation, index) => {
        try {
          return await operation();
        } catch (error) {
          Logger.error(`Batch operation ${index} failed`, {
            operation: operationName,
            index,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        }
      });

      const results = await Promise.allSettled(promises);
      
      // Check for any rejected promises
      const rejected = results.filter(result => result.status === 'rejected');
      if (rejected.length > 0) {
        const errors = rejected.map(result => 
          result.status === 'rejected' ? result.reason.message : 'Unknown error'
        );
        Logger.error('Some batch operations failed', {
          operation: operationName,
          failedCount: rejected.length,
          totalCount: operations.length,
          errors,
        });
        throw new Error(`Batch operation failed: ${rejected.length}/${operations.length} operations failed`);
      }

      const successfulResults = results.map(result => 
        result.status === 'fulfilled' ? result.value : null
      ).filter(Boolean) as T[];

      const duration = Date.now() - startTime;
      MetricsCollector.recordDatabaseQuery('BATCH', operationName, duration);
      
      Logger.info('Batch operations successful', {
        operation: operationName,
        count: operations.length,
        duration,
      });

      return successfulResults;
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));
      
      Logger.error('Batch operations failed', {
        operation: operationName,
        error: err.message,
        duration,
      });

      MetricsCollector.recordError('database_batch_failed');
      MetricsCollector.recordDatabaseQuery('BATCH', operationName, duration);
      
      throw err;
    }
  }

  // Health check wrapper
  static async healthCheck(): Promise<{
    healthy: boolean;
    latency: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const isHealthy = await prisma.healthCheck();
      const latency = Date.now() - startTime;

      return {
        healthy: isHealthy,
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));

      return {
        healthy: false,
        latency,
        error: err.message,
      };
    }
  }

  // Helper methods
  private static isNonRetryableError(error: Error): boolean {
    const nonRetryableMessages = [
      'unique constraint',
      'foreign key constraint',
      'not null constraint',
      'check constraint',
      'invalid input syntax',
      'division by zero',
      'syntax error',
    ];

    return nonRetryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  private static shouldResetConnection(error: Error): boolean {
    const resetMessages = [
      'connection',
      'timeout',
      'pool',
      'network',
      'ECONNRESET',
      'ETIMEDOUT',
    ];

    return resetMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export convenience methods for common operations
export const db = {
  // Find operations
  findMany: <T>(
    model: string,
    query: any,
    operationName?: string
  ) => DatabaseQuery.execute(
    (client) => (client as any)[model].findMany(query),
    operationName || `findMany_${model}`
  ),

  findUnique: <T>(
    model: string,
    query: any,
    operationName?: string
  ) => DatabaseQuery.execute(
    (client) => (client as any)[model].findUnique(query),
    operationName || `findUnique_${model}`
  ),

  findFirst: <T>(
    model: keyof PrismaClient,
    query: any,
    operationName?: string
  ) => DatabaseQuery.execute(
    (client) => (client[model] as any).findFirst(query),
    operationName || `findFirst_${model}`
  ),

  // Create operations
  create: <T>(
    model: keyof PrismaClient,
    data: any,
    operationName?: string
  ) => DatabaseQuery.execute(
    (client) => (client[model] as any).create(data),
    operationName || `create_${model}`
  ),

  // Update operations
  update: <T>(
    model: keyof PrismaClient,
    data: any,
    operationName?: string
  ) => DatabaseQuery.execute(
    (client) => (client[model] as any).update(data),
    operationName || `update_${model}`
  ),

  // Delete operations
  delete: <T>(
    model: keyof PrismaClient,
    data: any,
    operationName?: string
  ) => DatabaseQuery.execute(
    (client) => (client[model] as any).delete(data),
    operationName || `delete_${model}`
  ),

  // Count operations
  count: (
    model: keyof PrismaClient,
    query: any,
    operationName?: string
  ) => DatabaseQuery.execute(
    (client) => (client[model] as any).count(query),
    operationName || `count_${model}`
  ),

  // Transaction
  transaction: <T>(
    operations: (client: PrismaClient) => Promise<T>,
    operationName?: string
  ) => DatabaseQuery.executeTransaction(operations, operationName),

  // Health check
  healthCheck: () => DatabaseQuery.healthCheck(),
};

export default DatabaseQuery;
