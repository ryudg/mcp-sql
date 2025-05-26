import {
  PerformanceMetric,
  PerformanceAlert,
  PerformanceSummary,
} from '../../types/performance.types.js';

/**
 * Performance Reporter - Single responsibility: Generate performance reports
 * Simple reporting for MCP-SQL database operations
 */
export class PerformanceReporter {
  /**
   * Generate performance summary from metrics
   */
  generateSummary(
    metrics: PerformanceMetric[],
    alerts: PerformanceAlert[],
    timeRange: string = '1h'
  ): PerformanceSummary {
    if (metrics.length === 0) {
      return {
        averageCpuUsage: 0,
        averageMemoryUsage: 0,
        totalQueries: 0,
        averageQueryTime: 0,
        peakConnections: 0,
        errorRate: 0,
        timeRange,
      };
    }

    return {
      averageCpuUsage: this.calculateAverage(metrics, 'cpuUsage'),
      averageMemoryUsage: this.calculateAverage(metrics, 'memoryUsage'),
      totalQueries: this.estimateTotalQueries(metrics),
      averageQueryTime: this.calculateAverage(metrics, 'avgQueryTime'),
      peakConnections: Math.max(...metrics.map(m => m.connectionCount || 0)),
      errorRate: this.calculateAverage(metrics, 'errorRate'),
      timeRange,
    };
  }

  /**
   * Generate simple performance report
   */
  generateReport(
    metrics: PerformanceMetric[],
    alerts: PerformanceAlert[],
    timeRange: string = '1h'
  ): {
    summary: PerformanceSummary;
    metrics: PerformanceMetric[];
    alerts: PerformanceAlert[];
    recommendations: string[];
  } {
    const summary = this.generateSummary(metrics, alerts, timeRange);
    const recommendations = this.generateRecommendations(summary, alerts);

    return {
      summary,
      metrics,
      alerts,
      recommendations,
    };
  }

  /**
   * Get connection pool status summary
   */
  getConnectionPoolSummary(currentMetric: PerformanceMetric | null): {
    totalConnections: number;
    activeConnections: number;
    utilization: number;
    status: 'healthy' | 'warning' | 'critical';
  } {
    if (!currentMetric) {
      return {
        totalConnections: 0,
        activeConnections: 0,
        utilization: 0,
        status: 'warning',
      };
    }

    const utilization = currentMetric.connectionPoolUtilization || 0;
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (utilization > 90) {
      status = 'critical';
    } else if (utilization > 75) {
      status = 'warning';
    }

    return {
      totalConnections: currentMetric.connectionCount || 0,
      activeConnections: currentMetric.activeQueries || 0,
      utilization,
      status,
    };
  }

  // Private helper methods
  private calculateAverage(metrics: PerformanceMetric[], field: keyof PerformanceMetric): number {
    const values = metrics.map(m => m[field] as number).filter(v => v !== undefined && v !== null);

    if (values.length === 0) return 0;

    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / values.length) * 100) / 100;
  }

  private estimateTotalQueries(metrics: PerformanceMetric[]): number {
    return metrics.reduce((total, metric) => {
      return total + (metric.queryThroughput || 0);
    }, 0);
  }

  private generateRecommendations(
    summary: PerformanceSummary,
    alerts: PerformanceAlert[]
  ): string[] {
    const recommendations: string[] = [];
    const criticalAlerts = alerts.filter(a => a.type === 'critical' && !a.resolved);

    // Critical alerts
    if (criticalAlerts.length > 0) {
      recommendations.push(
        `🚨 CRITICAL: ${criticalAlerts.length} critical issues require immediate attention`
      );
    }

    // Performance recommendations
    if (summary.averageQueryTime > 1000) {
      recommendations.push('⚡ Consider optimizing slow queries or adding database indexes');
    }

    if (summary.averageCpuUsage > 80) {
      recommendations.push(
        '🔥 High CPU usage detected. Consider query optimization or scaling resources'
      );
    }

    if (summary.averageMemoryUsage > 85) {
      recommendations.push(
        '💾 High memory usage detected. Consider adjusting connection pool size'
      );
    }

    if (summary.errorRate > 5) {
      recommendations.push(
        '❌ High error rate detected. Review database connectivity and query validity'
      );
    }

    // Default recommendation if no issues
    if (recommendations.length === 0) {
      recommendations.push('✅ Database performance is within acceptable parameters');
    }

    return recommendations;
  }
}
