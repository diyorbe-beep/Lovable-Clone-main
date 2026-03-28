import { Logger } from '@/lib/monitoring/logger';
import { safeExecute, debounce } from '@/lib/utils/concurrency';

interface SessionData {
  userId: string;
  sessionId: string;
  createdAt: number;
  lastActivity: number;
  userAgent?: string;
  ipAddress?: string;
}

export class SessionManager {
  private static sessions = new Map<string, SessionData>();
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  static init(): void {
    // Start cleanup interval
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL);

    // Setup unhandled promise rejection handler
    if (typeof process !== 'undefined') {
      process.on('unhandledRejection', (reason, promise) => {
        Logger.error('Unhandled Promise Rejection:', {
          reason: reason instanceof Error ? reason.message : reason,
          promise: promise.toString(),
        });
      });
    }

    // Setup global error handler
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        Logger.error('Global Error:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      });
    }
  }

  static createSession(userId: string, userAgent?: string, ipAddress?: string): string {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    const sessionData: SessionData = {
      userId,
      sessionId,
      createdAt: now,
      lastActivity: now,
      userAgent,
      ipAddress,
    };

    this.sessions.set(sessionId, sessionData);

    Logger.info('Session created', {
      sessionId,
      userId,
      userAgent,
      ipAddress,
    });

    return sessionId;
  }

  static updateActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.lastActivity = Date.now();
    return true;
  }

  static getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (Date.now() - session.lastActivity > this.SESSION_TIMEOUT) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  static destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    this.sessions.delete(sessionId);

    Logger.info('Session destroyed', {
      sessionId,
      userId: session.userId,
      duration: Date.now() - session.createdAt,
    });

    return true;
  }

  static getUserSessions(userId: string): SessionData[] {
    const userSessions: SessionData[] = [];
    
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        // Check if session is still valid
        if (Date.now() - session.lastActivity <= this.SESSION_TIMEOUT) {
          userSessions.push(session);
        } else {
          // Remove expired session
          this.sessions.delete(session.sessionId);
        }
      }
    }

    return userSessions;
  }

  static destroyUserSessions(userId: string): number {
    let destroyedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
        destroyedCount++;
      }
    }

    Logger.info('User sessions destroyed', {
      userId,
      count: destroyedCount,
    });

    return destroyedCount;
  }

  private static cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId);
    }

    if (expiredSessions.length > 0) {
      Logger.info('Expired sessions cleaned up', {
        count: expiredSessions.length,
      });
    }
  }

  static getSessionStats(): {
    totalSessions: number;
    activeUsers: number;
    averageSessionDuration: number;
  } {
    const now = Date.now();
    const userIds = new Set<string>();
    let totalDuration = 0;
    let validSessions = 0;

    for (const session of this.sessions.values()) {
      if (now - session.lastActivity <= this.SESSION_TIMEOUT) {
        userIds.add(session.userId);
        totalDuration += now - session.createdAt;
        validSessions++;
      }
    }

    return {
      totalSessions: validSessions,
      activeUsers: userIds.size,
      averageSessionDuration: validSessions > 0 ? totalDuration / validSessions : 0,
    };
  }

  private static generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Safe wrapper for session operations
  static safeSessionOperation<T>(
    sessionId: string,
    operation: (session: SessionData) => T,
    fallback?: T
  ): T | undefined {
    return safeExecute(() => {
      const session = this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found or expired');
      }
      return operation(session);
    }, fallback);
  }

  // Debounced session update to prevent excessive writes
  static debouncedUpdateActivity = debounce((sessionId: string) => {
    this.updateActivity(sessionId);
  }, 1000); // Debounce for 1 second
}

// Initialize session manager
SessionManager.init();

// Export singleton instance
export const sessionManager = SessionManager;
