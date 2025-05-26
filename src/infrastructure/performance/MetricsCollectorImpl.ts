import { MetricsCollector } from '../../domain/performance/services/PerformanceDomainService.js';
import { DatabaseConnectionManager } from '../../database/connection/connection.manager.js';
import { Logger } from '../../core/logger.js';

export class MetricsCollectorImpl implements MetricsCollector {
  constructor(
    private readonly dbManager: DatabaseConnectionManager,
    private readonly logger: Logger
  ) {}

  async collectCurrentMetrics(): Promise<{
    connectionPool: any;
    query: any;
    system: any;
  }> {
    try {
      const [connectionPoolMetrics, queryMetrics, systemMetrics] = await Promise.all([
        this.collectConnectionPoolMetrics(),
        this.collectQueryMetrics(),
        this.collectSystemMetrics(),
      ]);

      return {
        connectionPool: connectionPoolMetrics,
        query: queryMetrics,
        system: systemMetrics,
      };
    } catch (error) {
      this.logger.error('Failed to collect metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async collectConnectionPoolMetrics(): Promise<{
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    utilization: number;
  }> {
    try {
      const connectionStats = this.dbManager.getConnectionStats();

      const totalConnections = connectionStats.total || 0;
      const activeConnections = connectionStats.active || 0;
      const idleConnections = totalConnections - activeConnections;
      const utilization =
        totalConnections > 0 ? Math.round((activeConnections / totalConnections) * 100) : 0;

      return {
        totalConnections,
        activeConnections,
        idleConnections,
        utilization,
      };
    } catch (error) {
      this.logger.error('Failed to collect connection pool metrics', { error });
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        utilization: 0,
      };
    }
  }

  private async collectQueryMetrics(): Promise<{
    totalQueries: number;
    slowQueries: number;
    averageExecutionTime: number;
    maxExecutionTime: number;
    minExecutionTime: number;
  }> {
    try {
      // 실제 구현에서는 쿼리 통계를 수집해야 함
      // 현재는 더미 데이터 반환
      return {
        totalQueries: Math.floor(Math.random() * 1000) + 100,
        slowQueries: Math.floor(Math.random() * 10),
        averageExecutionTime: Math.floor(Math.random() * 1000) + 100,
        maxExecutionTime: Math.floor(Math.random() * 5000) + 1000,
        minExecutionTime: Math.floor(Math.random() * 100) + 10,
      };
    } catch (error) {
      this.logger.error('Failed to collect query metrics', { error });
      return {
        totalQueries: 0,
        slowQueries: 0,
        averageExecutionTime: 0,
        maxExecutionTime: 0,
        minExecutionTime: 0,
      };
    }
  }

  private async collectSystemMetrics(): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  }> {
    try {
      // Node.js 시스템 메트릭 수집
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
      const usedMemory = memoryUsage.heapUsed;

      // CPU 사용률은 간단한 추정치 (실제로는 더 정확한 측정 필요)
      const cpuUsage = Math.floor(Math.random() * 100); // 더미 데이터

      // 메모리 사용률 계산
      const memoryUsagePercent = totalMemory > 0 ? Math.round((usedMemory / totalMemory) * 100) : 0;

      // 디스크 사용률 (더미 데이터)
      const diskUsage = Math.floor(Math.random() * 100);

      return {
        cpuUsage,
        memoryUsage: memoryUsagePercent,
        diskUsage,
      };
    } catch (error) {
      this.logger.error('Failed to collect system metrics', { error });
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
      };
    }
  }
}
