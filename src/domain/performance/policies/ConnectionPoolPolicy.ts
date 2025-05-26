import { ConnectionPoolMetrics } from '../entities/PerformanceMetric.js';

/**
 * ConnectionPoolPolicy
 *
 * Policy for evaluating connection pool status and providing recommendations.
 * Implements the policy pattern from DDD.
 */
export class ConnectionPoolPolicy {
  constructor(
    private readonly warningThreshold: number = 70,
    private readonly criticalThreshold: number = 90,
    private readonly minIdleConnections: number = 2
  ) {}

  /**
   * Evaluates connection pool metrics and determines if they require attention.
   * @param metrics Connection pool metrics
   * @returns boolean indicating if the connection pool status is concerning
   */
  evaluate(metrics: ConnectionPoolMetrics): boolean {
    return (
      metrics.utilization > this.warningThreshold ||
      metrics.idleConnections < this.minIdleConnections
    );
  }

  /**
   * Gets the health status of the connection pool.
   * @param metrics Connection pool metrics
   * @returns Health status as string
   */
  getHealthStatus(metrics: ConnectionPoolMetrics): 'healthy' | 'warning' | 'critical' {
    if (metrics.utilization >= this.criticalThreshold) {
      return 'critical';
    } else if (metrics.utilization >= this.warningThreshold) {
      return 'warning';
    }
    return 'healthy';
  }

  /**
   * Provides recommendations for improving connection pool performance.
   * @param metrics Connection pool metrics
   * @returns Array of recommendation strings
   */
  getRecommendations(metrics: ConnectionPoolMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.utilization >= this.criticalThreshold) {
      recommendations.push('Increase maximum pool size immediately');
      recommendations.push('Check for connection leaks in application code');
    } else if (metrics.utilization >= this.warningThreshold) {
      recommendations.push('Consider increasing maximum pool size');
      recommendations.push('Monitor connection usage patterns');
    }

    if (metrics.idleConnections < this.minIdleConnections) {
      recommendations.push('Increase minimum pool size to ensure availability');
    }

    if (metrics.activeConnections > metrics.totalConnections * 0.9) {
      recommendations.push('Implement connection request timeout to prevent hanging requests');
    }

    return recommendations;
  }
}
