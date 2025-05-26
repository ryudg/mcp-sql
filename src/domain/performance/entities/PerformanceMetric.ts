export interface MetricId {
  readonly value: string;
}

export interface ConnectionPoolMetrics {
  readonly totalConnections: number;
  readonly activeConnections: number;
  readonly idleConnections: number;
  readonly utilization: number;
}

export interface QueryMetrics {
  readonly totalQueries: number;
  readonly slowQueries: number;
  readonly averageExecutionTime: number;
  readonly maxExecutionTime: number;
  readonly minExecutionTime: number;
}

export interface SystemMetrics {
  readonly cpuUsage: number;
  readonly memoryUsage: number;
  readonly diskUsage: number;
}

export class PerformanceMetric {
  constructor(
    private readonly _id: MetricId,
    private readonly _timestamp: Date,
    private readonly _connectionPool: ConnectionPoolMetrics,
    private readonly _query: QueryMetrics,
    private readonly _system: SystemMetrics
  ) {}

  get id(): MetricId {
    return this._id;
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  get connectionPool(): ConnectionPoolMetrics {
    return this._connectionPool;
  }

  get query(): QueryMetrics {
    return this._query;
  }

  get system(): SystemMetrics {
    return this._system;
  }

  evaluateConnectionPoolHealth(): 'healthy' | 'warning' | 'critical' {
    const utilization = this._connectionPool.utilization;

    if (utilization >= 90) return 'critical';
    if (utilization >= 70) return 'warning';
    return 'healthy';
  }

  evaluateQueryPerformance(): 'healthy' | 'warning' | 'critical' {
    const avgTime = this._query.averageExecutionTime;
    const slowQueryRatio = this._query.slowQueries / this._query.totalQueries;

    if (avgTime > 5000 || slowQueryRatio > 0.1) return 'critical';
    if (avgTime > 2000 || slowQueryRatio > 0.05) return 'warning';
    return 'healthy';
  }

  evaluateSystemHealth(): 'healthy' | 'warning' | 'critical' {
    const { cpuUsage, memoryUsage, diskUsage } = this._system;

    if (cpuUsage > 90 || memoryUsage > 90 || diskUsage > 90) return 'critical';
    if (cpuUsage > 70 || memoryUsage > 70 || diskUsage > 70) return 'warning';
    return 'healthy';
  }

  getOverallHealth(): 'healthy' | 'warning' | 'critical' {
    const healths = [
      this.evaluateConnectionPoolHealth(),
      this.evaluateQueryPerformance(),
      this.evaluateSystemHealth(),
    ];

    if (healths.includes('critical')) return 'critical';
    if (healths.includes('warning')) return 'warning';
    return 'healthy';
  }
}
