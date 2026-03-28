import { Logger } from '@/lib/monitoring/logger';
import { MetricsCollector } from '@/lib/monitoring/metrics';
import { cache } from '@/lib/cache/redis-cache';

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
  actions?: Array<{
    label: string;
    url?: string;
    action?: string;
    primary?: boolean;
  }>;
}

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
  types: {
    info: boolean;
    success: boolean;
    warning: boolean;
    error: boolean;
  };
  categories: {
    system: boolean;
    billing: boolean;
    projects: boolean;
    collaboration: boolean;
    ai: boolean;
  };
}

export class NotificationService {
  private static readonly NOTIFICATION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
  
  static async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const fullNotification: Notification = {
      ...notification,
      id,
      createdAt: now,
      read: false,
      expiresAt: notification.expiresAt || new Date(now.getTime() + this.NOTIFICATION_TTL * 1000),
    };

    try {
      // Store in cache
      await cache.set(`notification:${id}`, fullNotification, {
        ttl: this.NOTIFICATION_TTL,
      });

      // Add to user's notification list
      await this.addToUserNotifications(fullNotification.userId, id);

      // Send real-time notification if user is online
      await this.sendRealTimeNotification(fullNotification);

      // Log notification creation
      Logger.info('Notification created', {
        id,
        userId: fullNotification.userId,
        type: fullNotification.type,
        title: fullNotification.title,
      });

      // Record metrics
      MetricsCollector.recordPerformance('notification_created', Date.now() - now.getTime());

      return fullNotification;
    } catch (error) {
      Logger.error('Failed to create notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: fullNotification.userId,
        type: fullNotification.type,
      });
      
      MetricsCollector.recordError('notification_creation_failed');
      throw error;
    }
  }

  static async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: string;
    } = {}
  ): Promise<Notification[]> {
    try {
      const userNotificationIds = await this.getUserNotificationIds(userId);
      
      let notifications: Notification[] = [];
      
      // Fetch notifications in batches
      for (const id of userNotificationIds) {
        const notification = await cache.get<Notification>(`notification:${id}`);
        if (notification) {
          // Apply filters
          if (options.unreadOnly && notification.read) continue;
          if (options.type && notification.type !== options.type) continue;
          
          notifications.push(notification);
        }
      }

      // Sort by creation date (newest first)
      notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Apply pagination
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      
      return notifications.slice(offset, offset + limit);
    } catch (error) {
      Logger.error('Failed to get user notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return [];
    }
  }

  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notification = await cache.get<Notification>(`notification:${notificationId}`);
      
      if (!notification || notification.userId !== userId) {
        return false;
      }

      notification.read = true;
      await cache.set(`notification:${notificationId}`, notification, {
        ttl: this.NOTIFICATION_TTL,
      });

      Logger.info('Notification marked as read', {
        notificationId,
        userId,
      });

      return true;
    } catch (error) {
      Logger.error('Failed to mark notification as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId,
        userId,
      });
      return false;
    }
  }

  static async markAllAsRead(userId: string): Promise<number> {
    try {
      const notifications = await this.getUserNotifications(userId, { unreadOnly: true });
      let markedCount = 0;

      for (const notification of notifications) {
        if (await this.markAsRead(notification.id, userId)) {
          markedCount++;
        }
      }

      Logger.info('Marked all notifications as read', {
        userId,
        count: markedCount,
      });

      return markedCount;
    } catch (error) {
      Logger.error('Failed to mark all notifications as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return 0;
    }
  }

  static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notification = await cache.get<Notification>(`notification:${notificationId}`);
      
      if (!notification || notification.userId !== userId) {
        return false;
      }

      // Remove from cache
      await cache.del(`notification:${notificationId}`);

      // Remove from user's notification list
      await this.removeFromUserNotifications(userId, notificationId);

      Logger.info('Notification deleted', {
        notificationId,
        userId,
      });

      return true;
    } catch (error) {
      Logger.error('Failed to delete notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId,
        userId,
      });
      return false;
    }
  }

  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const notifications = await this.getUserNotifications(userId, { unreadOnly: true });
      return notifications.length;
    } catch (error) {
      Logger.error('Failed to get unread count', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return 0;
    }
  }

  static async createSystemNotification(
    userId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type,
      title,
      message,
      data,
      category: 'system',
    });
  }

  static async createBillingNotification(
    userId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type,
      title,
      message,
      data,
      category: 'billing',
    });
  }

  static async createProjectNotification(
    userId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type,
      title,
      message,
      data,
      category: 'projects',
    });
  }

  static async createCollaborationNotification(
    userId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type,
      title,
      message,
      data,
      category: 'collaboration',
    });
  }

  static async createAINotification(
    userId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type,
      title,
      message,
      data,
      category: 'ai',
    });
  }

  private static async addToUserNotifications(userId: string, notificationId: string): Promise<void> {
    try {
      const key = `user_notifications:${userId}`;
      const currentIds = await cache.get<string[]>(key) || [];
      
      // Add to the beginning of the array
      const updatedIds = [notificationId, ...currentIds];
      
      // Keep only the most recent 100 notifications
      const limitedIds = updatedIds.slice(0, 100);
      
      await cache.set(key, limitedIds, {
        ttl: this.NOTIFICATION_TTL,
      });
    } catch (error) {
      Logger.error('Failed to add notification to user list', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        notificationId,
      });
    }
  }

  private static async removeFromUserNotifications(userId: string, notificationId: string): Promise<void> {
    try {
      const key = `user_notifications:${userId}`;
      const currentIds = await cache.get<string[]>(key) || [];
      
      const updatedIds = currentIds.filter(id => id !== notificationId);
      
      await cache.set(key, updatedIds, {
        ttl: this.NOTIFICATION_TTL,
      });
    } catch (error) {
      Logger.error('Failed to remove notification from user list', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        notificationId,
      });
    }
  }

  private static async getUserNotificationIds(userId: string): Promise<string[]> {
    try {
      const key = `user_notifications:${userId}`;
      return await cache.get<string[]>(key) || [];
    } catch (error) {
      Logger.error('Failed to get user notification IDs', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return [];
    }
  }

  private static async sendRealTimeNotification(notification: Notification): Promise<void> {
    try {
      // In a real application, this would use WebSocket or Server-Sent Events
      // to send real-time notifications to connected clients
      
      Logger.info('Real-time notification sent', {
        notificationId: notification.id,
        userId: notification.userId,
        type: notification.type,
      });
      
      // For now, we'll just log it
      // In production, you would:
      // 1. Check if user is connected via WebSocket
      // 2. Send notification through WebSocket
      // 3. Or queue for Server-Sent Events
      
    } catch (error) {
      Logger.error('Failed to send real-time notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId: notification.id,
        userId: notification.userId,
      });
    }
  }

  static async cleanupExpiredNotifications(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago
      
      // This would typically be run as a background job
      // For now, we'll just log the action
      
      Logger.info('Cleaning up expired notifications', {
        cutoffDate: cutoffDate.toISOString(),
      });
      
      return 0; // Return count of cleaned notifications
    } catch (error) {
      Logger.error('Failed to cleanup expired notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  static async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    try {
      const notifications = await this.getUserNotifications(userId);
      
      const stats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        byType: {} as Record<string, number>,
        byCategory: {} as Record<string, number>,
      };

      notifications.forEach(notification => {
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
        stats.byCategory[notification.category || 'general'] = (stats.byCategory[notification.category || 'general'] || 0) + 1;
      });

      return stats;
    } catch (error) {
      Logger.error('Failed to get notification stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      
      return {
        total: 0,
        unread: 0,
        byType: {},
        byCategory: {},
      };
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService;
