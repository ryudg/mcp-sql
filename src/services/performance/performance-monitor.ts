import { Logger } from "../../core/logger.js";
import { MetricsCollector } from "./metrics-collector.js";
import {
  PerformanceMetric,
  PerformanceAlert,
  PerformanceConfig,
  PerformanceThresholds,
} from "../../types/performance.types.js";

/**
 * Performance Monitor - Single responsibility: Control monitoring and alerts
 * Simple monitoring control for MCP-SQL database operations
 */
export class PerformanceMonitor {
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private config: PerformanceConfig;

  constructor(
    private metricsCollector: MetricsCollector,
    private logger: Logger,
    config?: Partial<PerformanceConfig>
  ) {
    // Default configuration for MCP-SQL
    this.config = {
      thresholds: {
        slowQueryThreshold: 1000, // 1 second
        highCpuThreshold: 80,
        highMemoryThreshold: 85,
        maxConnections: 100,
        maxErrorRate: 5,
      },
      monitoringInterval: 5000, // 5 seconds
      maxMetricsHistory: 1000,
      ...config,
    };
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(customInterval?: number): void {
    if (this.isMonitoring) {
      this.logger.warn("Performance monitoring is already running");
      return;
    }

    const interval = customInterval || this.config.monitoringInterval;
    this.isMonitoring = true;

    this.logger.info("Performance monitoring started", {
      intervalMs: interval,
    });

    this.monitoringInterval = setInterval(async () => {
      await this.collectAndCheckMetrics();
    }, interval);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      this.logger.warn("Performance monitoring is not running");
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.logger.info("Performance monitoring stopped", {
      totalMetrics: this.metrics.length,
      totalAlerts: this.alerts.length,
    });
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): PerformanceMetric | null {
    return this.metrics.length > 0
      ? this.metrics[this.metrics.length - 1]
      : null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit: number = 100): PerformanceMetric[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter((alert) => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): PerformanceAlert[] {
    return this.alerts;
  }

  /**
   * Clear all metrics and alerts
   */
  clearMetrics(): void {
    this.metrics = [];
    this.alerts = [];
    this.metricsCollector.clearMetrics();
    this.logger.info("Performance metrics and alerts history cleared");
  }

  /**
   * Record slow query for monitoring
   */
  recordSlowQuery(query: string, executionTime: number): void {
    this.metricsCollector.recordQueryTime(executionTime);

    if (executionTime > this.config.thresholds.slowQueryThreshold) {
      this.generateAlert(
        "warning",
        "queryTime",
        executionTime,
        this.config.thresholds.slowQueryThreshold,
        `Slow query detected: ${executionTime}ms (threshold: ${this.config.thresholds.slowQueryThreshold}ms)`
      );

      this.logger.warn("Slow query detected", {
        query: query.substring(0, 100) + (query.length > 100 ? "..." : ""),
        executionTime: `${executionTime}ms`,
        threshold: `${this.config.thresholds.slowQueryThreshold}ms`,
      });
    }
  }

  // Private methods
  private async collectAndCheckMetrics(): Promise<void> {
    try {
      const metric = await this.metricsCollector.collectMetrics();
      this.addMetric(metric);
      this.checkThresholds(metric);
    } catch (error) {
      this.logger.error("Failed to collect metrics during monitoring", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Limit history size
    if (this.metrics.length > this.config.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.config.maxMetricsHistory);
    }
  }

  private checkThresholds(metric: PerformanceMetric): void {
    const thresholds = this.config.thresholds;

    // Check CPU usage
    if (metric.cpuUsage && metric.cpuUsage > thresholds.highCpuThreshold) {
      this.generateAlert(
        "warning",
        "cpuUsage",
        metric.cpuUsage,
        thresholds.highCpuThreshold,
        `High CPU usage: ${metric.cpuUsage}%`
      );
    }

    // Check memory usage
    if (
      metric.memoryUsage &&
      metric.memoryUsage > thresholds.highMemoryThreshold
    ) {
      this.generateAlert(
        "warning",
        "memoryUsage",
        metric.memoryUsage,
        thresholds.highMemoryThreshold,
        `High memory usage: ${metric.memoryUsage}%`
      );
    }

    // Check connection count
    if (
      metric.connectionCount &&
      metric.connectionCount > thresholds.maxConnections
    ) {
      this.generateAlert(
        "critical",
        "connectionCount",
        metric.connectionCount,
        thresholds.maxConnections,
        `Connection limit exceeded: ${metric.connectionCount}`
      );
    }

    // Check error rate
    if (metric.errorRate && metric.errorRate > thresholds.maxErrorRate) {
      this.generateAlert(
        "critical",
        "errorRate",
        metric.errorRate,
        thresholds.maxErrorRate,
        `High error rate: ${metric.errorRate}%`
      );
    }
  }

  private generateAlert(
    type: "warning" | "critical" | "info",
    metric: string,
    currentValue: number,
    threshold: number,
    message: string
  ): void {
    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      metric,
      threshold,
      currentValue,
      message,
      timestamp: new Date(),
      resolved: false,
    };

    this.alerts.push(alert);

    // Log alert based on severity
    if (type === "critical") {
      this.logger.error("Critical performance alert", alert);
    } else if (type === "warning") {
      this.logger.warn("Performance warning", alert);
    } else {
      this.logger.info("Performance info", alert);
    }

    // Limit alerts history
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }
}
