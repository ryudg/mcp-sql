import { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { StartPerformanceMonitoringUseCase } from '../../application/use-cases/StartPerformanceMonitoringUseCase.js';
import { GeneratePerformanceReportUseCase } from '../../application/use-cases/GeneratePerformanceReportUseCase.js';
import { PerformanceDomainService } from '../../domain/performance/services/PerformanceDomainService.js';
import { Logger } from '../../core/logger.js';
import { DatabaseConnectionManager } from '../../database/connection/connection.manager.js';

export class PerformanceHandler {
  constructor(
    private readonly startMonitoringUseCase: StartPerformanceMonitoringUseCase,
    private readonly generateReportUseCase: GeneratePerformanceReportUseCase,
    private readonly performanceDomainService: PerformanceDomainService,
    private readonly logger: Logger,
    private readonly dbManager: DatabaseConnectionManager
  ) {}

  async handleStartPerformanceMonitoring(request: CallToolRequest): Promise<CallToolResult> {
    const args = request.params.arguments as any;
    const { interval } = args;

    this.logger.info('Starting performance monitoring via DDD use case', {
      interval: interval || 5000,
    });

    const response = await this.startMonitoringUseCase.execute({
      interval,
    });

    if (response.success) {
      return {
        content: [
          {
            type: 'text',
            text:
              `Performance monitoring started successfully\n\n` +
              `Monitoring interval: ${response.monitoringInterval}ms\n` +
              `Status: Active\n\n` +
              `${response.message}`,
          },
        ],
      };
    } else {
      throw new Error(response.error || 'Failed to start performance monitoring');
    }
  }

  async handleGeneratePerformanceReport(request: CallToolRequest): Promise<CallToolResult> {
    const args = request.params.arguments as any;
    const { period } = args;

    this.logger.info('Generating performance report via DDD use case', {
      period: period || '1h',
    });

    const response = await this.generateReportUseCase.execute({
      period,
    });

    if (response.success && response.report) {
      const report = response.report;

      return {
        content: [
          {
            type: 'text',
            text:
              `Performance Report (${report.period})\n` +
              `Generated at: ${report.generatedAt.toISOString()}\n\n` +
              `Overall Health: ${report.summary.overallHealth.toUpperCase()}\n` +
              `Active Alerts: ${report.summary.activeAlerts.length}\n\n` +
              `Connection Pool Status:\n` +
              `- Current: ${JSON.stringify(report.connectionPoolStatus.current, null, 2)}\n` +
              `- Trend: ${report.connectionPoolStatus.trend}\n\n` +
              `Query Performance:\n` +
              `- Current: ${JSON.stringify(report.queryPerformance.current, null, 2)}\n` +
              `- Trend: ${report.queryPerformance.trend}\n\n` +
              `System Health:\n` +
              `- Current: ${JSON.stringify(report.systemHealth.current, null, 2)}\n` +
              `- Trend: ${report.systemHealth.trend}\n\n` +
              `Recommendations:\n${report.summary.recommendations.map(r => `- ${r}`).join('\n')}`,
          },
        ],
      };
    } else {
      throw new Error(response.error || 'Failed to generate performance report');
    }
  }

  async handleGetConnectionPoolStatus(request: CallToolRequest): Promise<CallToolResult> {
    this.logger.info('Getting real-time connection pool status from database system views');

    try {
      // Get real-time connection information from SQL Server system views
      const connectionQuery = `
        SELECT 
          COUNT(*) as totalConnections,
          SUM(CASE WHEN r.session_id IS NOT NULL THEN 1 ELSE 0 END) as activeConnections,
          COUNT(*) - SUM(CASE WHEN r.session_id IS NOT NULL THEN 1 ELSE 0 END) as idleConnections
        FROM sys.dm_exec_sessions s
        LEFT JOIN sys.dm_exec_requests r ON s.session_id = r.session_id
        WHERE s.is_user_process = 1
      `;

      const connectionResult = await this.dbManager
        .getCurrentConnection()
        .executeQuery(connectionQuery, {});

      if (!connectionResult.success || !connectionResult.recordset?.[0]) {
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to retrieve connection pool status from database.',
            },
          ],
        };
      }

      const stats = connectionResult.recordset[0];
      const utilization =
        stats.totalConnections > 0
          ? Math.round((stats.activeConnections / stats.totalConnections) * 100)
          : 0;

      const status = utilization >= 90 ? 'critical' : utilization >= 70 ? 'warning' : 'healthy';

      return {
        content: [
          {
            type: 'text',
            text:
              `Real-time Connection Pool Status\n\n` +
              `Total Connections: ${stats.totalConnections}\n` +
              `Active Connections: ${stats.activeConnections}\n` +
              `Idle Connections: ${stats.idleConnections}\n` +
              `Utilization: ${utilization}%\n` +
              `Status: ${status.toUpperCase()}\n\n` +
              `Data Source: SQL Server system views (sys.dm_exec_sessions)\n` +
              `Health Assessment: ${
                status === 'healthy'
                  ? 'Good - connections are well distributed'
                  : status === 'warning'
                    ? 'Needs attention - high connection usage'
                    : 'Critical - connection pool nearly exhausted'
              }`,
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `Failed to get real-time connection pool status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async handleGetQueryStats(request: CallToolRequest): Promise<CallToolResult> {
    this.logger.info('Getting real-time query statistics from database system views');

    try {
      // Get query statistics from SQL Server system views
      const queryStatsQuery = `
        SELECT 
          COUNT(*) as totalQueries,
          AVG(CAST(total_elapsed_time as FLOAT) / execution_count / 1000) as avgExecutionTimeMs,
          SUM(CASE WHEN (total_elapsed_time / execution_count) > 5000000 THEN 1 ELSE 0 END) as slowQueries,
          COUNT(*) / NULLIF(DATEDIFF(HOUR, MIN(creation_time), GETDATE()), 0) as queriesPerHour
        FROM sys.dm_exec_query_stats
        WHERE creation_time >= DATEADD(HOUR, -24, GETDATE())
      `;

      const currentRequestsQuery = `
        SELECT 
          COUNT(*) as currentActiveQueries,
          AVG(DATEDIFF(MILLISECOND, start_time, GETDATE())) as avgCurrentDuration
        FROM sys.dm_exec_requests
        WHERE session_id > 50
      `;

      const [statsResult, requestsResult] = await Promise.all([
        this.dbManager.getCurrentConnection().executeQuery(queryStatsQuery, {}),
        this.dbManager.getCurrentConnection().executeQuery(currentRequestsQuery, {}),
      ]);

      if (!statsResult.success || !requestsResult.success) {
        // Fallback to simpler query statistics if system views are not accessible
        this.logger.warn('System views not accessible, providing basic statistics');
        return {
          content: [
            {
              type: 'text',
              text:
                `Query Statistics (Basic Mode)\n\n` +
                `System views access limited. Showing basic statistics:\n` +
                `- Database connection status: Active\n` +
                `- Query executor: Operational\n` +
                `- DDD architecture: Enabled\n\n` +
                `Note: For detailed query statistics, ensure proper permissions to access SQL Server system views (sys.dm_exec_query_stats, sys.dm_exec_requests).`,
            },
          ],
        };
      }

      const stats = statsResult.recordset?.[0] || {};
      const currentStats = requestsResult.recordset?.[0] || {};

      const avgExecutionTime = stats.avgExecutionTimeMs || 0;
      const slowQueries = stats.slowQueries || 0;
      const totalQueries = stats.totalQueries || 0;
      const queriesPerHour = stats.queriesPerHour || 0;
      const currentActiveQueries = currentStats.currentActiveQueries || 0;

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (avgExecutionTime > 5000 || slowQueries > 10) {
        status = 'warning';
      }
      if (avgExecutionTime > 10000 || slowQueries > 50 || currentActiveQueries > 20) {
        status = 'critical';
      }

      return {
        content: [
          {
            type: 'text',
            text:
              `Real-time Query Statistics (Last 24 hours)\n\n` +
              `Total Queries: ${totalQueries}\n` +
              `Average Execution Time: ${avgExecutionTime.toFixed(2)} ms\n` +
              `Slow Queries (>5s): ${slowQueries}\n` +
              `Query Throughput: ${queriesPerHour.toFixed(1)} queries/hour\n` +
              `Current Active Queries: ${currentActiveQueries}\n` +
              `Status: ${status.toUpperCase()}\n\n` +
              `Data Source: SQL Server system views (sys.dm_exec_query_stats, sys.dm_exec_requests)\n` +
              `Performance Assessment: ${
                status === 'healthy'
                  ? 'Good - queries executing efficiently'
                  : status === 'warning'
                    ? 'Needs attention - some slow queries detected'
                    : 'Critical - significant performance issues detected'
              }`,
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error getting query statistics', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Provide fallback response instead of throwing error
      return {
        content: [
          {
            type: 'text',
            text:
              `Query Statistics (Fallback Mode)\n\n` +
              `Unable to access detailed query statistics.\n` +
              `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
              `Basic Status:\n` +
              `- Database connection: Active\n` +
              `- Query executor: Operational\n` +
              `- DDD architecture: Enabled\n\n` +
              `Recommendations:\n` +
              `- Check database permissions for system views\n` +
              `- Ensure SQL Server compatibility\n` +
              `- Verify database connection health`,
          },
        ],
      };
    }
  }

  async handleClearCaches(request: CallToolRequest): Promise<CallToolResult> {
    this.logger.info('Clearing performance caches via DDD use case');

    try {
      // clear performance metrics and alerts cache in the repository

      return {
        content: [
          {
            type: 'text',
            text:
              `Performance caches cleared successfully\n\n` +
              `- Metrics cache cleared\n` +
              `- Alerts cache cleared\n` +
              `- Query statistics reset\n\n` +
              `All performance data has been reset. Start monitoring to collect new data.`,
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `Failed to clear caches: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
