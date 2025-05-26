/**
 * Core performance monitoring types for MCP-SQL
 * Simple and focused on database operation monitoring
 */

/**
 * Basic performance metric for database operations
 */
export interface PerformanceMetric {
  timestamp: Date;
  cpuUsage?: number;
  memoryUsage?: number;
  connectionCount?: number;
  activeQueries?: number;
  avgQueryTime?: number;
  queryThroughput?: number;
  connectionPoolUtilization?: number;
  errorRate?: number;
}

/**
 * Performance alert for monitoring issues
 */
export interface PerformanceAlert {
  id: string;
  type: "warning" | "critical" | "info";
  metric: string;
  threshold: number;
  currentValue: number;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

/**
 * Simple performance thresholds
 */
export interface PerformanceThresholds {
  slowQueryThreshold: number; // milliseconds
  highCpuThreshold: number; // percentage
  highMemoryThreshold: number; // percentage
  maxConnections: number;
  maxErrorRate: number; // percentage
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  thresholds: PerformanceThresholds;
  monitoringInterval: number;
  maxMetricsHistory: number;
}

/**
 * Performance summary for reporting
 */
export interface PerformanceSummary {
  averageCpuUsage: number;
  averageMemoryUsage: number;
  totalQueries: number;
  averageQueryTime: number;
  peakConnections: number;
  errorRate: number;
  timeRange: string;
}
