import { PerformanceMetricRepository } from '../../domain/performance/services/PerformanceDomainService.js';
import { PerformanceMetric, MetricId } from '../../domain/performance/entities/PerformanceMetric.js';

export class InMemoryPerformanceMetricRepository implements PerformanceMetricRepository {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private metricsHistory: PerformanceMetric[] = [];
  private readonly maxHistorySize = 1000; // 최대 1000개 메트릭 보관

  async save(metric: PerformanceMetric): Promise<void> {
    this.metrics.set(metric.id.value, metric);

    // 히스토리에 추가 (시간순 정렬 유지)
    this.metricsHistory.push(metric);
    this.metricsHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 최대 크기 초과시 오래된 메트릭 제거
    if (this.metricsHistory.length > this.maxHistorySize) {
      const removedMetrics = this.metricsHistory.splice(this.maxHistorySize);
      removedMetrics.forEach(removedMetric => {
        this.metrics.delete(removedMetric.id.value);
      });
    }
  }

  async findById(id: MetricId): Promise<PerformanceMetric | null> {
    return this.metrics.get(id.value) || null;
  }

  async findRecent(limit: number): Promise<PerformanceMetric[]> {
    return this.metricsHistory.slice(0, limit);
  }

  async findByTimeRange(startTime: Date, endTime: Date): Promise<PerformanceMetric[]> {
    return this.metricsHistory.filter(
      metric => metric.timestamp >= startTime && metric.timestamp <= endTime
    );
  }

  async clear(): Promise<void> {
    this.metrics.clear();
    this.metricsHistory = [];
  }

  // 추가 유틸리티 메서드
  getMetricsCount(): number {
    return this.metricsHistory.length;
  }

  getOldestMetric(): PerformanceMetric | null {
    return this.metricsHistory.length > 0
      ? this.metricsHistory[this.metricsHistory.length - 1]
      : null;
  }

  getLatestMetric(): PerformanceMetric | null {
    return this.metricsHistory.length > 0 ? this.metricsHistory[0] : null;
  }
}
