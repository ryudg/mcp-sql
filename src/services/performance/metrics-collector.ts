import { DatabaseConnectionManager } from "../../database/connection/connection.manager.js";
import { Logger } from "../../core/logger.js";
import { PerformanceMetric } from "../../types/performance.types.js";

/**
 * Metrics Collector - Single responsibility: Collect performance metrics
 * Simple and focused on actual system metrics needed for MCP-SQL
 */
export class MetricsCollector {
  private queryExecutionTimes: number[] = [];

  constructor(
    private dbManager: DatabaseConnectionManager,
    private logger: Logger
  ) {}

  /**
   * Collect current performance metrics
   */
  async collectMetrics(): Promise<PerformanceMetric> {
    try {
      const metric: PerformanceMetric = {
        timestamp: new Date(),
        cpuUsage: await this.getCpuUsage(),
        memoryUsage: await this.getMemoryUsage(),
        connectionCount: await this.getConnectionCount(),
        activeQueries: await this.getActiveQueryCount(),
        avgQueryTime: await this.getAverageQueryTime(),
        queryThroughput: await this.getQueryThroughput(),
        connectionPoolUtilization: await this.getConnectionPoolUtilization(),
        errorRate: await this.getErrorRate(),
      };

      return metric;
    } catch (error) {
      this.logger.error("Failed to collect metrics", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Record query execution time
   */
  recordQueryTime(executionTime: number): void {
    this.queryExecutionTimes.push(executionTime);

    // Keep only last 1000 entries
    if (this.queryExecutionTimes.length > 1000) {
      this.queryExecutionTimes = this.queryExecutionTimes.slice(-1000);
    }
  }

  /**
   * Clear recorded metrics
   */
  clearMetrics(): void {
    this.queryExecutionTimes = [];
  }

  // Private methods for metric collection
  private async getCpuUsage(): Promise<number> {
    // Simple CPU usage estimation
    const usage = process.cpuUsage();
    const totalUsage = usage.user + usage.system;
    return Math.min(100, (totalUsage / 1000000) % 100); // Convert to percentage
  }

  private async getMemoryUsage(): Promise<number> {
    const usage = process.memoryUsage();
    const totalMemory = usage.heapTotal + usage.external;
    const usedMemory = usage.heapUsed;
    return (usedMemory / totalMemory) * 100;
  }

  private async getConnectionCount(): Promise<number> {
    const stats = this.dbManager.getConnectionStats();
    return stats.total;
  }

  private async getActiveQueryCount(): Promise<number> {
    // Estimate based on connection activity
    const stats = this.dbManager.getConnectionStats();
    return stats.active;
  }

  private async getAverageQueryTime(): Promise<number> {
    if (this.queryExecutionTimes.length === 0) {
      return 0;
    }

    const recentTimes = this.queryExecutionTimes.slice(-100); // Last 100 queries
    return (
      recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length
    );
  }

  private async getQueryThroughput(): Promise<number> {
    // Estimate queries per second based on recent activity
    const recentQueries = this.queryExecutionTimes.slice(-60); // Last minute estimate
    return recentQueries.length;
  }

  private async getConnectionPoolUtilization(): Promise<number> {
    const stats = this.dbManager.getConnectionStats();
    // Simple utilization calculation
    return stats.total > 0 ? (stats.active / stats.total) * 100 : 0;
  }

  private async getErrorRate(): Promise<number> {
    // Simple error rate estimation
    return 0; // Will be enhanced with actual error tracking
  }
}
