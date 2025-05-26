import { PerformanceDomainService } from '../../domain/performance/services/PerformanceDomainService.js';

export interface GeneratePerformanceReportRequest {
  period?: '1h' | '24h' | '7d';
}

export interface GeneratePerformanceReportResponse {
  success: boolean;
  report?: {
    period: string;
    generatedAt: Date;
    summary: {
      currentMetric: any;
      activeAlerts: any[];
      overallHealth: 'healthy' | 'warning' | 'critical';
      recommendations: string[];
    };
    connectionPoolStatus: {
      current: any;
      trend: string;
    };
    queryPerformance: {
      current: any;
      trend: string;
    };
    systemHealth: {
      current: any;
      trend: string;
    };
  };
  error?: string;
}

export class GeneratePerformanceReportUseCase {
  constructor(private readonly performanceDomainService: PerformanceDomainService) {}

  async execute(
    request: GeneratePerformanceReportRequest
  ): Promise<GeneratePerformanceReportResponse> {
    try {
      const period = request.period || '1h';

      // get performance summary
      const summary = await this.performanceDomainService.getPerformanceSummary(period);

      // create report
      const report = {
        period,
        generatedAt: new Date(),
        summary,
        connectionPoolStatus: {
          current: summary.currentMetric?.connectionPool || null,
          trend: this.analyzeTrend('connectionPool', summary.currentMetric),
        },
        queryPerformance: {
          current: summary.currentMetric?.query || null,
          trend: this.analyzeTrend('query', summary.currentMetric),
        },
        systemHealth: {
          current: summary.currentMetric?.system || null,
          trend: this.analyzeTrend('system', summary.currentMetric),
        },
      };

      return {
        success: true,
        report,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private analyzeTrend(category: string, currentMetric: any): string {
    // simple trend analysis (should compare with past data)
    if (!currentMetric) return 'No data available';

    switch (category) {
      case 'connectionPool':
        const utilization = currentMetric.connectionPool?.utilization || 0;
        if (utilization > 80) return 'High utilization - trending up';
        if (utilization > 50) return 'Moderate utilization - stable';
        return 'Low utilization - stable';

      case 'query':
        const avgTime = currentMetric.query?.averageExecutionTime || 0;
        if (avgTime > 2000) return 'Slow queries detected - needs attention';
        if (avgTime > 1000) return 'Moderate performance - stable';
        return 'Good performance - stable';

      case 'system':
        const cpuUsage = currentMetric.system?.cpuUsage || 0;
        if (cpuUsage > 80) return 'High resource usage - trending up';
        if (cpuUsage > 50) return 'Moderate resource usage - stable';
        return 'Low resource usage - stable';

      default:
        return 'Unknown trend';
    }
  }
}
