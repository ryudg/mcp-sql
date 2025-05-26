import { PerformanceDomainService } from '../../domain/performance/services/PerformanceDomainService.js';

export interface StartPerformanceMonitoringRequest {
  interval?: number; // milliseconds
}

export interface StartPerformanceMonitoringResponse {
  success: boolean;
  message: string;
  monitoringInterval?: number;
  error?: string;
}

export class StartPerformanceMonitoringUseCase {
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor(private readonly performanceDomainService: PerformanceDomainService) {}

  async execute(
    request: StartPerformanceMonitoringRequest
  ): Promise<StartPerformanceMonitoringResponse> {
    try {
      if (this.isMonitoring) {
        return {
          success: false,
          message: 'Performance monitoring is already running',
          error: 'Monitoring already active',
        };
      }

      const interval = request.interval || 5000; // 5 seconds

      // immediately collect first metric
      await this.performanceDomainService.collectAndStoreMetrics();

      // start periodic monitoring
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.performanceDomainService.collectAndStoreMetrics();
        } catch (error) {
          console.error('Error collecting metrics:', error);
        }
      }, interval);

      this.isMonitoring = true;

      return {
        success: true,
        message: 'Performance monitoring started successfully',
        monitoringInterval: interval,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to start performance monitoring',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async stop(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
  }

  isActive(): boolean {
    return this.isMonitoring;
  }
}
