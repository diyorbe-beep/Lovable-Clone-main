import { Logger } from '@/lib/monitoring/logger';
import { MetricsCollector } from '@/lib/monitoring/metrics';
import { cache } from '@/lib/cache/redis-cache';
import { safetyGuard } from '@/lib/utils/safety';

export interface ScalingMetrics {
  cpu: number;
  memory: number;
  activeConnections: number;
  requestsPerSecond: number;
  responseTime: number;
  errorRate: number;
  queueLength: number;
  diskUsage: number;
}

export interface ScalingPolicy {
  minInstances: number;
  maxInstances: number;
  targetCPU: number;
  targetMemory: number;
  targetResponseTime: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
}

export interface ScalingEvent {
  id: string;
  type: 'scale_up' | 'scale_down' | 'scale_out' | 'scale_in';
  timestamp: Date;
  metrics: ScalingMetrics;
  reason: string;
  instanceCount: number;
  targetInstanceCount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export class AutoScalingManager {
  private static instance: AutoScalingManager;
  private currentInstances: number = 1;
  private lastScaleTime: number = 0;
  private scalingHistory: ScalingEvent[] = [];
  private metricsHistory: ScalingMetrics[] = [];
  private isScaling: boolean = false;
  
  private readonly defaultPolicy: ScalingPolicy = {
    minInstances: 1,
    maxInstances: 10,
    targetCPU: 70,
    targetMemory: 75,
    targetResponseTime: 500,
    scaleUpCooldown: 300000, // 5 minutes
    scaleDownCooldown: 600000, // 10 minutes
    scaleUpThreshold: 80,
    scaleDownThreshold: 30
  };

  private constructor() {
    this.initializeMonitoring();
    this.startMetricsCollection();
  }

  static getInstance(): AutoScalingManager {
    if (!AutoScalingManager.instance) {
      AutoScalingManager.instance = new AutoScalingManager();
    }
    return AutoScalingManager.instance;
  }

  private initializeMonitoring(): void {
    // Set up monitoring intervals
    setInterval(() => {
      this.collectMetrics();
    }, 30000); // Every 30 seconds

    setInterval(() => {
      this.evaluateScaling();
    }, 60000); // Every minute
  }

  private startMetricsCollection(): void {
    // Start collecting system metrics
    Logger.info('Auto-scaling monitoring initialized');
  }

  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.getCurrentMetrics();
      this.metricsHistory.push(metrics);
      
      // Keep only last 100 metrics
      if (this.metricsHistory.length > 100) {
        this.metricsHistory = this.metricsHistory.slice(-100);
      }
      
      // Record metrics
      this.recordMetrics(metrics);
    } catch (error) {
      Logger.error('Failed to collect metrics:', error);
    }
  }

  private async getCurrentMetrics(): Promise<ScalingMetrics> {
    // Collect current system metrics
    const now = Date.now();
    
    // Get CPU usage
    const cpu = await this.getCPUUsage();
    
    // Get memory usage
    const memory = await this.getMemoryUsage();
    
    // Get active connections
    const activeConnections = await this.getActiveConnections();
    
    // Get requests per second
    const requestsPerSecond = await this.getRequestsPerSecond();
    
    // Get response time
    const responseTime = await this.getAverageResponseTime();
    
    // Get error rate
    const errorRate = await this.getErrorRate();
    
    // Get queue length
    const queueLength = await this.getQueueLength();
    
    // Get disk usage
    const diskUsage = await this.getDiskUsage();

    return {
      cpu,
      memory,
      activeConnections,
      requestsPerSecond,
      responseTime,
      errorRate,
      queueLength,
      diskUsage
    };
  }

  private async getCPUUsage(): Promise<number> {
    // Get CPU usage percentage
    // In a real app, this would use system monitoring tools
    
    if (typeof process !== 'undefined' && process.cpuUsage) {
      const usage = process.cpuUsage();
      return (usage.user + usage.system) / 1000000 * 100; // Convert to percentage
    }
    
    // Mock implementation for browser
    return Math.random() * 100;
  }

  private async getMemoryUsage(): Promise<number> {
    // Get memory usage percentage
    
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return (usage.heapUsed / usage.heapTotal) * 100;
    }
    
    // Mock implementation for browser
    if (performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      return (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
    }
    
    return Math.random() * 100;
  }

  private async getActiveConnections(): Promise<number> {
    // Get number of active connections
    try {
      const cached = await cache.get('active_connections');
      return cached || 0;
    } catch (error) {
      return 0;
    }
  }

  private async getRequestsPerSecond(): Promise<number> {
    // Get requests per second
    try {
      const cached = await cache.get('requests_per_second');
      return cached || 0;
    } catch (error) {
      return 0;
    }
  }

  private async getAverageResponseTime(): Promise<number> {
    // Get average response time in milliseconds
    try {
      const cached = await cache.get('avg_response_time');
      return cached || 0;
    } catch (error) {
      return 0;
    }
  }

  private async getErrorRate(): Promise<number> {
    // Get error rate percentage
    try {
      const cached = await cache.get('error_rate');
      return cached || 0;
    } catch (error) {
      return 0;
    }
  }

  private async getQueueLength(): Promise<number> {
    // Get queue length
    try {
      const cached = await cache.get('queue_length');
      return cached || 0;
    } catch (error) {
      return 0;
    }
  }

  private async getDiskUsage(): Promise<number> {
    // Get disk usage percentage
    // In a real app, this would use system monitoring tools
    return Math.random() * 100;
  }

  private recordMetrics(metrics: ScalingMetrics): void {
    // Record metrics for monitoring
    MetricsCollector.recordPerformance('auto_scaling_cpu', metrics.cpu);
    MetricsCollector.recordPerformance('auto_scaling_memory', metrics.memory);
    MetricsCollector.recordPerformance('auto_scaling_connections', metrics.activeConnections);
    MetricsCollector.recordPerformance('auto_scaling_rps', metrics.requestsPerSecond);
    MetricsCollector.recordPerformance('auto_scaling_response_time', metrics.responseTime);
    MetricsCollector.recordPerformance('auto_scaling_error_rate', metrics.errorRate);
    MetricsCollector.recordPerformance('auto_scaling_queue_length', metrics.queueLength);
    MetricsCollector.recordPerformance('auto_scaling_disk_usage', metrics.diskUsage);
  }

  private async evaluateScaling(): Promise<void> {
    if (this.isScaling) {
      return; // Already scaling
    }

    const metrics = await this.getCurrentMetrics();
    const policy = this.defaultPolicy;
    const now = Date.now();

    // Check cooldown period
    if (now - this.lastScaleTime < policy.scaleUpCooldown && now - this.lastScaleTime < policy.scaleDownCooldown) {
      return;
    }

    // Evaluate scaling conditions
    const shouldScaleUp = this.shouldScaleUp(metrics, policy);
    const shouldScaleDown = this.shouldScaleDown(metrics, policy);

    if (shouldScaleUp && this.currentInstances < policy.maxInstances) {
      await this.scaleUp(metrics, 'High resource usage');
    } else if (shouldScaleDown && this.currentInstances > policy.minInstances) {
      await this.scaleDown(metrics, 'Low resource usage');
    }
  }

  private shouldScaleUp(metrics: ScalingMetrics, policy: ScalingPolicy): boolean {
    // Check if we should scale up
    const conditions = [
      metrics.cpu > policy.scaleUpThreshold,
      metrics.memory > policy.scaleUpThreshold,
      metrics.responseTime > policy.targetResponseTime,
      metrics.queueLength > 100, // Queue length threshold
      metrics.requestsPerSecond > this.currentInstances * 100 // RPS per instance threshold
    ];

    return conditions.some(condition => condition);
  }

  private shouldScaleDown(metrics: ScalingMetrics, policy: ScalingPolicy): boolean {
    // Check if we should scale down
    const conditions = [
      metrics.cpu < policy.scaleDownThreshold,
      metrics.memory < policy.scaleDownThreshold,
      metrics.responseTime < policy.targetResponseTime / 2,
      metrics.queueLength < 10,
      metrics.requestsPerSecond < this.currentInstances * 50
    ];

    // All conditions must be met to scale down
    return conditions.every(condition => condition);
  }

  private async scaleUp(metrics: ScalingMetrics, reason: string): Promise<void> {
    this.isScaling = true;
    const targetInstances = Math.min(this.currentInstances + 1, this.defaultPolicy.maxInstances);
    
    const scalingEvent: ScalingEvent = {
      id: this.generateEventId(),
      type: 'scale_up',
      timestamp: new Date(),
      metrics,
      reason,
      instanceCount: this.currentInstances,
      targetInstanceCount: targetInstances,
      status: 'pending'
    };

    this.scalingHistory.push(scalingEvent);
    
    try {
      Logger.info(`Initiating scale up from ${this.currentInstances} to ${targetInstances} instances`, {
        reason,
        metrics
      });

      scalingEvent.status = 'in_progress';
      
      // Implement actual scaling logic
      await this.performScaling('up', targetInstances);
      
      this.currentInstances = targetInstances;
      this.lastScaleTime = Date.now();
      scalingEvent.status = 'completed';
      
      Logger.info(`Scale up completed. Current instances: ${this.currentInstances}`);
      
      // Record scaling event
      MetricsCollector.recordEvent('auto_scaling_scale_up', {
        instances: targetInstances,
        reason,
        metrics
      });
      
    } catch (error) {
      scalingEvent.status = 'failed';
      Logger.error('Scale up failed:', error);
    } finally {
      this.isScaling = false;
    }
  }

  private async scaleDown(metrics: ScalingMetrics, reason: string): Promise<void> {
    this.isScaling = true;
    const targetInstances = Math.max(this.currentInstances - 1, this.defaultPolicy.minInstances);
    
    const scalingEvent: ScalingEvent = {
      id: this.generateEventId(),
      type: 'scale_down',
      timestamp: new Date(),
      metrics,
      reason,
      instanceCount: this.currentInstances,
      targetInstanceCount: targetInstances,
      status: 'pending'
    };

    this.scalingHistory.push(scalingEvent);
    
    try {
      Logger.info(`Initiating scale down from ${this.currentInstances} to ${targetInstances} instances`, {
        reason,
        metrics
      });

      scalingEvent.status = 'in_progress';
      
      // Implement actual scaling logic
      await this.performScaling('down', targetInstances);
      
      this.currentInstances = targetInstances;
      this.lastScaleTime = Date.now();
      scalingEvent.status = 'completed';
      
      Logger.info(`Scale down completed. Current instances: ${this.currentInstances}`);
      
      // Record scaling event
      MetricsCollector.recordEvent('auto_scaling_scale_down', {
        instances: targetInstances,
        reason,
        metrics
      });
      
    } catch (error) {
      scalingEvent.status = 'failed';
      Logger.error('Scale down failed:', error);
    } finally {
      this.isScaling = false;
    }
  }

  private async performScaling(direction: 'up' | 'down', targetInstances: number): Promise<void> {
    // Implement actual scaling logic
    // In a real app, this would integrate with your cloud provider's auto-scaling API
    
    // Mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        Logger.info(`Scaling ${direction} to ${targetInstances} instances completed`);
        resolve();
      }, 5000); // Simulate scaling time
    });
  }

  private generateEventId(): string {
    return `scale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods
  getCurrentInstances(): number {
    return this.currentInstances;
  }

  getScalingHistory(): ScalingEvent[] {
    return this.scalingHistory;
  }

  getMetricsHistory(): ScalingMetrics[] {
    return this.metricsHistory;
  }

  async forceScaleUp(targetInstances: number): Promise<void> {
    if (targetInstances <= this.currentInstances) {
      throw new Error('Target instances must be greater than current instances');
    }
    
    if (targetInstances > this.defaultPolicy.maxInstances) {
      throw new Error('Target instances exceeds maximum limit');
    }

    const metrics = await this.getCurrentMetrics();
    await this.scaleUp(metrics, 'Manual scale up');
  }

  async forceScaleDown(targetInstances: number): Promise<void> {
    if (targetInstances >= this.currentInstances) {
      throw new Error('Target instances must be less than current instances');
    }
    
    if (targetInstances < this.defaultPolicy.minInstances) {
      throw new Error('Target instances below minimum limit');
    }

    const metrics = await this.getCurrentMetrics();
    await this.scaleDown(metrics, 'Manual scale down');
  }

  updatePolicy(policy: Partial<ScalingPolicy>): void {
    Object.assign(this.defaultPolicy, policy);
    Logger.info('Auto-scaling policy updated', policy);
  }

  getPolicy(): ScalingPolicy {
    return { ...this.defaultPolicy };
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    instances: number;
    lastScaleTime: Date;
    scalingHistory: number;
    metrics?: ScalingMetrics;
  }> {
    try {
      const metrics = await this.getCurrentMetrics();
      return {
        healthy: !this.isScaling && metrics.errorRate < 5 && metrics.responseTime < 1000,
        instances: this.currentInstances,
        lastScaleTime: new Date(this.lastScaleTime),
        scalingHistory: this.scalingHistory.length,
        metrics
      };
    } catch (error) {
      return {
        healthy: false,
        instances: this.currentInstances,
        lastScaleTime: new Date(this.lastScaleTime),
        scalingHistory: this.scalingHistory.length
      };
    }
  }

  // Advanced scaling strategies
  async implementPredictiveScaling(): Promise<void> {
    // Implement predictive scaling based on historical data
    const prediction = await this.predictLoad();
    
    if (prediction.predictedInstances > this.currentInstances) {
      await this.scaleUp(await this.getCurrentMetrics(), 'Predictive scale up');
    } else if (prediction.predictedInstances < this.currentInstances - 1) {
      await this.scaleDown(await this.getCurrentMetrics(), 'Predictive scale down');
    }
  }

  private async predictLoad(): Promise<{ predictedInstances: number; confidence: number }> {
    // Predict future load based on historical data
    // This would use machine learning algorithms in a real implementation
    
    if (this.metricsHistory.length < 10) {
      return { predictedInstances: this.currentInstances, confidence: 0 };
    }
    
    // Simple linear regression for demonstration
    const recentMetrics = this.metricsHistory.slice(-10);
    const avgCPU = recentMetrics.reduce((sum, m) => sum + m.cpu, 0) / recentMetrics.length;
    const avgRPS = recentMetrics.reduce((sum, m) => sum + m.requestsPerSecond, 0) / recentMetrics.length;
    
    // Predict based on current trends
    const predictedInstances = Math.ceil((avgRPS / 100) * (avgCPU / 70));
    const confidence = Math.min(0.9, recentMetrics.length / 100);
    
    return {
      predictedInstances: Math.max(this.defaultPolicy.minInstances, Math.min(this.defaultPolicy.maxInstances, predictedInstances)),
      confidence
    };
  }

  async implementLoadBasedScaling(): Promise<void> {
    // Implement load-based scaling
    const metrics = await this.getCurrentMetrics();
    const loadScore = this.calculateLoadScore(metrics);
    
    if (loadScore > 0.8 && this.currentInstances < this.defaultPolicy.maxInstances) {
      await this.scaleUp(metrics, 'Load-based scale up');
    } else if (loadScore < 0.3 && this.currentInstances > this.defaultPolicy.minInstances) {
      await this.scaleDown(metrics, 'Load-based scale down');
    }
  }

  private calculateLoadScore(metrics: ScalingMetrics): number {
    // Calculate a composite load score
    const weights = {
      cpu: 0.3,
      memory: 0.25,
      responseTime: 0.2,
      queueLength: 0.15,
      errorRate: 0.1
    };
    
    const normalizedMetrics = {
      cpu: Math.min(metrics.cpu / 100, 1),
      memory: Math.min(metrics.memory / 100, 1),
      responseTime: Math.min(metrics.responseTime / 1000, 1),
      queueLength: Math.min(metrics.queueLength / 200, 1),
      errorRate: Math.min(metrics.errorRate / 10, 1)
    };
    
    return Object.entries(weights).reduce((score, [metric, weight]) => {
      return score + (normalizedMetrics[metric as keyof typeof normalizedMetrics] * weight);
    }, 0);
  }

  async implementScheduledScaling(): Promise<void> {
    // Implement scheduled scaling based on time patterns
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    // Scale up during business hours
    if (hour >= 9 && hour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5) {
      const targetInstances = Math.ceil(this.defaultPolicy.maxInstances * 0.8);
      if (this.currentInstances < targetInstances) {
        await this.scaleUp(await this.getCurrentMetrics(), 'Scheduled scale up');
      }
    }
    // Scale down during off hours
    else if ((hour < 6 || hour > 22) || dayOfWeek === 0 || dayOfWeek === 6) {
      const targetInstances = Math.ceil(this.defaultPolicy.minInstances * 1.5);
      if (this.currentInstances > targetInstances) {
        await this.scaleDown(await this.getCurrentMetrics(), 'Scheduled scale down');
      }
    }
  }
}

// Export singleton instance
export const autoScalingManager = AutoScalingManager.getInstance();
