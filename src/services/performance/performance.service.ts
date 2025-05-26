import { DatabaseConnectionManager } from '../../database/connection/connection.manager.js';
import { Logger } from '../../core/logger.js';
import { MetricsCollector } from './metrics-collector.js';
import { PerformanceMonitor } from './performance-monitor.js';
import { PerformanceReporter } from './performance-reporter.js';
import {
  PerformanceMetric,
  PerformanceAlert,
  PerformanceSummary,
  PerformanceConfig,
} from '../../types/performance.types.js';

/**
 * Performance Service - Facade pattern for MCP-SQL performance monitoring
 * Simple and focused on database operation monitoring
 */
export class PerformanceService {
  private metricsCollector: MetricsCollector;
  private monitor: PerformanceMonitor;
  private reporter: PerformanceReporter;

  constructor(
    private dbManager: DatabaseConnectionManager,
    private logger: Logger,
    config?: Partial<PerformanceConfig>
  ) {
    this.metricsCollector = new MetricsCollector(dbManager, logger);
    this.monitor = new PerformanceMonitor(this.metricsCollector, logger, config);
    this.reporter = new PerformanceReporter();

    this.logger.info('Performance service initialized for MCP-SQL');
  }

  // Monitoring Control
  startMonitoring(interval?: number): void {
    this.monitor.startMonitoring(interval);
  }

  stopMonitoring(): void {
    this.monitor.stopMonitoring();
  }

  // Metrics Collection
  async collectMetrics(): Promise<PerformanceMetric> {
    return await this.metricsCollector.collectMetrics();
  }

  recordSlowQuery(query: string, executionTime: number): void {
    this.monitor.recordSlowQuery(query, executionTime);
  }

  // Data Access
  getCurrentMetrics(): PerformanceMetric | null {
    return this.monitor.getCurrentMetrics();
  }

  getMetricsHistory(limit?: number): PerformanceMetric[] {
    return this.monitor.getMetricsHistory(limit);
  }

  getActiveAlerts(): PerformanceAlert[] {
    return this.monitor.getActiveAlerts();
  }

  getAllAlerts(): PerformanceAlert[] {
    return this.monitor.getAllAlerts();
  }

  // Reporting
  generatePerformanceReport(timeRange: string = '1h'): {
    summary: PerformanceSummary;
    metrics: PerformanceMetric[];
    alerts: PerformanceAlert[];
    recommendations: string[];
  } {
    const metrics = this.getMetricsHistory();
    const alerts = this.getAllAlerts();
    return this.reporter.generateReport(metrics, alerts, timeRange);
  }

  getConnectionPoolStatus(): {
    totalConnections: number;
    activeConnections: number;
    utilization: number;
    status: 'healthy' | 'warning' | 'critical';
  } {
    const currentMetrics = this.getCurrentMetrics();
    return this.reporter.getConnectionPoolSummary(currentMetrics);
  }

  getQueryStats(): {
    totalQueries: number;
    averageExecutionTime: number;
    slowQueries: number;
    queryThroughput: number;
    status: 'healthy' | 'warning' | 'critical';
  } {
    const currentMetrics = this.getCurrentMetrics();
    const metricsHistory = this.getMetricsHistory(100);

    if (!currentMetrics || metricsHistory.length === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        slowQueries: 0,
        queryThroughput: 0,
        status: 'healthy',
      };
    }

    const totalQueries = metricsHistory.reduce(
      (sum, metric) => sum + (metric.queryThroughput || 0),
      0
    );
    const avgExecutionTime = currentMetrics.avgQueryTime || 0;
    const slowQueries = this.getAllAlerts().filter(alert => alert.metric === 'queryTime').length;
    const queryThroughput = currentMetrics.queryThroughput || 0;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (avgExecutionTime > this.monitor['config'].thresholds.slowQueryThreshold) {
      status = 'warning';
    }
    if (slowQueries > 10) {
      status = 'critical';
    }

    return {
      totalQueries,
      averageExecutionTime: avgExecutionTime,
      slowQueries,
      queryThroughput,
      status,
    };
  }

  // Maintenance
  clearMetrics(): void {
    this.monitor.clearMetrics();
  }

  // Dashboard Data
  getDashboard(): {
    currentMetrics: PerformanceMetric | null;
    activeAlerts: PerformanceAlert[];
    connectionPool: {
      totalConnections: number;
      activeConnections: number;
      utilization: number;
      status: 'healthy' | 'warning' | 'critical';
    };
    summary: PerformanceSummary;
    recommendations: string[];
  } {
    const currentMetrics = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();
    const connectionPool = this.getConnectionPoolStatus();
    const report = this.generatePerformanceReport();

    return {
      currentMetrics,
      activeAlerts,
      connectionPool,
      summary: report.summary,
      recommendations: report.recommendations,
    };
  }
}
