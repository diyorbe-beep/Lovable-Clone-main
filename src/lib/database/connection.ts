import { PrismaClient } from '@/generated/prisma';
import Logger from '@/lib/monitoring/logger';

// Singleton pattern for Prisma client
class PrismaManager {
  private static instance: PrismaClient | null = null;
  private static isConnecting = false;
  private static connectionPromise: Promise<PrismaClient> | null = null;

  // Get singleton instance with proper connection management
  static async getInstance(): Promise<PrismaClient> {
    if (this.instance && !this.isConnecting) {
      return this.instance;
    }

    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = this.createConnection();

    try {
      this.instance = await this.connectionPromise;
      return this.instance;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  private static async createConnection(): Promise<PrismaClient> {
    try {
      Logger.info('Creating Prisma database connection');

      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        // Connection pooling settings
        __internal: {
          engine: {
            // Connection pool size
            connectionLimit: 20,
            // Connection timeout
            connectTimeout: 10000,
            // Query timeout
            queryTimeout: 30000,
            // Pool timeout
            poolTimeout: 10000,
          },
        },
      });

      // Test the connection
      await prisma.$connect();
      Logger.info('Prisma database connection established');

      return prisma;
    } catch (error) {
      Logger.error('Failed to create Prisma connection', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Database connection failed');
    }
  }

  // Graceful disconnect
  static async disconnect(): Promise<void> {
    if (this.instance) {
      try {
        Logger.info('Disconnecting Prisma database connection');
        await this.instance.$disconnect();
        this.instance = null;
        Logger.info('Prisma database connection disconnected');
      } catch (error) {
        Logger.error('Error disconnecting Prisma', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  // Health check
  static async healthCheck(): Promise<boolean> {
    try {
      const prisma = await this.getInstance();
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      Logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  // Get connection stats
  static async getConnectionStats(): Promise<{
    connected: boolean;
    connectionCount?: number;
    poolSize?: number;
  }> {
    try {
      const prisma = await this.getInstance();
      
      // Test connection
      const connected = await this.healthCheck();
      
      return {
        connected,
        // Note: Prisma doesn't expose connection pool stats directly
        // This would need to be implemented at the database level
        connectionCount: connected ? 1 : 0,
        poolSize: 20, // From our configuration
      };
    } catch (error) {
      return {
        connected: false,
        connectionCount: 0,
      };
    }
  }

  // Reset connection (for error recovery)
  static async resetConnection(): Promise<void> {
    Logger.warn('Resetting Prisma database connection');
    await this.disconnect();
    // Next call to getInstance() will create new connection
  }
}

// Export singleton getter
export const prisma = {
  async getInstance() {
    return await PrismaManager.getInstance();
  },
  
  async disconnect() {
    return await PrismaManager.disconnect();
  },
  
  async healthCheck() {
    return await PrismaManager.healthCheck();
  },
  
  async getConnectionStats() {
    return await PrismaManager.getConnectionStats();
  },
  
  async resetConnection() {
    return await PrismaManager.resetConnection();
  },
};

// Graceful shutdown handling
process.on('SIGINT', async () => {
  Logger.info('Received SIGINT, gracefully shutting down database connection');
  await PrismaManager.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  Logger.info('Received SIGTERM, gracefully shutting down database connection');
  await PrismaManager.disconnect();
  process.exit(0);
});

process.on('beforeExit', async () => {
  Logger.info('Process exiting, disconnecting database connection');
  await PrismaManager.disconnect();
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  Logger.error('Uncaught exception, disconnecting database connection', {
    error: error.message,
  });
  await PrismaManager.disconnect();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  Logger.error('Unhandled rejection, disconnecting database connection', {
    reason: String(reason),
    promise: String(promise),
  });
  await PrismaManager.disconnect();
  process.exit(1);
});

export default PrismaManager;
