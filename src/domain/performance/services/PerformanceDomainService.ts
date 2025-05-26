import { PerformanceMetric, MetricId } from '../entities/PerformanceMetric.js';
import { PerformanceAlert, AlertId, AlertType, AlertSeverity } from '../entities/PerformanceAlert.js';

export interface PerformanceMetricRepository {
  save(metric: PerformanceMetric): Promise<void>;
  findById(id: MetricId): Promise<PerformanceMetric | null>;
  findRecent(limit: number): Promise<PerformanceMetric[]>;
  findByTimeRange(startTime: Date, endTime: Date): Promise<PerformanceMetric[]>;
  clear(): Promise<void>;
}

export interface PerformanceAlertRepository {
  save(alert: PerformanceAlert): Promise<void>;
  findById(id: AlertId): Promise<PerformanceAlert | null>;
  findActive(): Promise<PerformanceAlert[]>;
  findAll(): Promise<PerformanceAlert[]>;
  findByType(type: AlertType): Promise<PerformanceAlert[]>;
}

export interface MetricsCollector {
  collectCurrentMetrics(): Promise<{
    connectionPool: any;
    query: any;
    system: any;
  }>;
}

export class PerformanceDomainService {
  constructor(
    private readonly metricRepository: PerformanceMetricRepository,
    private readonly alertRepository: PerformanceAlertRepository,
    private readonly metricsCollector: MetricsCollector
  ) {}

  async collectAndStoreMetrics(): Promise<PerformanceMetric> {
    const rawMetrics = await this.metricsCollector.collectCurrentMetrics();

    const metricId: MetricId = { value: this.generateMetricId() };
    const metric = new PerformanceMetric(
      metricId,
      new Date(),
      rawMetrics.connectionPool,
      rawMetrics.query,
      rawMetrics.system
    );

    await this.metricRepository.save(metric);

    // create alerts based on metrics
    await this.evaluateAndCreateAlerts(metric);

    return metric;
  }

  async evaluateAndCreateAlerts(metric: PerformanceMetric): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];

    // check connection pool health
    const poolHealth = metric.evaluateConnectionPoolHealth();
    if (poolHealth !== 'healthy') {
      const alert = this.createConnectionPoolAlert(metric, poolHealth);
      alerts.push(alert);
      await this.alertRepository.save(alert);
    }

    // check query performance
    const queryHealth = metric.evaluateQueryPerformance();
    if (queryHealth !== 'healthy') {
      const alert = this.createQueryPerformanceAlert(metric, queryHealth);
      alerts.push(alert);
      await this.alertRepository.save(alert);
    }

    // check system health
    const systemHealth = metric.evaluateSystemHealth();
    if (systemHealth !== 'healthy') {
      const alert = this.createSystemAlert(metric, systemHealth);
      alerts.push(alert);
      await this.alertRepository.save(alert);
    }

    return alerts;
  }

  async getPerformanceSummary(timeRange: string = '1h'): Promise<{
    currentMetric: PerformanceMetric | null;
    activeAlerts: PerformanceAlert[];
    overallHealth: 'healthy' | 'warning' | 'critical';
    recommendations: string[];
  }> {
    const recentMetrics = await this.metricRepository.findRecent(1);
    const currentMetric = recentMetrics[0] || null;
    const activeAlerts = await this.alertRepository.findActive();

    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (currentMetric) {
      overallHealth = currentMetric.getOverallHealth();
    }

    const recommendations = this.generateRecommendations(currentMetric, activeAlerts);

    return {
      currentMetric,
      activeAlerts,
      overallHealth,
      recommendations,
    };
  }

  async acknowledgeAlert(alertId: AlertId): Promise<void> {
    const alert = await this.alertRepository.findById(alertId);
    if (!alert) {
      throw new Error(`Alert with id ${alertId.value} not found`);
    }

    alert.acknowledge();
    await this.alertRepository.save(alert);
  }

  async resolveAlert(alertId: AlertId): Promise<void> {
    const alert = await this.alertRepository.findById(alertId);
    if (!alert) {
      throw new Error(`Alert with id ${alertId.value} not found`);
    }

    alert.resolve();
    await this.alertRepository.save(alert);
  }

  private createConnectionPoolAlert(
    metric: PerformanceMetric,
    health: 'warning' | 'critical'
  ): PerformanceAlert {
    const alertId: AlertId = { value: this.generateAlertId() };
    const severity: AlertSeverity = health === 'critical' ? 'critical' : 'high';

    return new PerformanceAlert(
      alertId,
      'connection_pool_high_utilization',
      severity,
      `Connection pool utilization is ${health}: ${metric.connectionPool.utilization}%`,
      {
        utilization: metric.connectionPool.utilization,
        totalConnections: metric.connectionPool.totalConnections,
        activeConnections: metric.connectionPool.activeConnections,
      }
    );
  }

  private createQueryPerformanceAlert(
    metric: PerformanceMetric,
    health: 'warning' | 'critical'
  ): PerformanceAlert {
    const alertId: AlertId = { value: this.generateAlertId() };
    const severity: AlertSeverity = health === 'critical' ? 'critical' : 'high';

    return new PerformanceAlert(
      alertId,
      'slow_query_detected',
      severity,
      `Query performance is ${health}: avg ${metric.query.averageExecutionTime}ms`,
      {
        averageExecutionTime: metric.query.averageExecutionTime,
        slowQueries: metric.query.slowQueries,
        totalQueries: metric.query.totalQueries,
      }
    );
  }

  private createSystemAlert(
    metric: PerformanceMetric,
    health: 'warning' | 'critical'
  ): PerformanceAlert {
    const alertId: AlertId = { value: this.generateAlertId() };
    const severity: AlertSeverity = health === 'critical' ? 'critical' : 'high';

    return new PerformanceAlert(
      alertId,
      'high_cpu_usage',
      severity,
      `System resources are ${health}`,
      {
        cpuUsage: metric.system.cpuUsage,
        memoryUsage: metric.system.memoryUsage,
        diskUsage: metric.system.diskUsage,
      }
    );
  }

  private generateRecommendations(
    currentMetric: PerformanceMetric | null,
    activeAlerts: PerformanceAlert[]
  ): string[] {
    const recommendations: string[] = [];

    if (!currentMetric) {
      recommendations.push(
        'No current metrics available. Start monitoring to get recommendations.'
      );
      return recommendations;
    }

    // connection pool recommendations
    if (currentMetric.connectionPool.utilization > 80) {
      recommendations.push('Consider increasing connection pool size');
    }

    // query performance recommendations
    if (currentMetric.query.averageExecutionTime > 2000) {
      recommendations.push('Review and optimize slow queries');
      recommendations.push('Consider adding database indexes');
    }

    // system resource recommendations
    if (currentMetric.system.cpuUsage > 70) {
      recommendations.push('Monitor CPU usage and consider scaling resources');
    }

    if (currentMetric.system.memoryUsage > 70) {
      recommendations.push('Monitor memory usage and consider increasing available memory');
    }

    return recommendations;
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
