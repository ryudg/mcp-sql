import { PerformanceAlertRepository } from '../../domain/performance/services/PerformanceDomainService.js';
import {
  PerformanceAlert,
  AlertId,
  AlertType,
} from '../../domain/performance/entities/PerformanceAlert.js';

export class InMemoryPerformanceAlertRepository implements PerformanceAlertRepository {
  private alerts: Map<string, PerformanceAlert> = new Map();
  private alertsHistory: PerformanceAlert[] = [];
  private readonly maxHistorySize = 500; // 최대 500개 알림 보관

  async save(alert: PerformanceAlert): Promise<void> {
    const existingAlert = this.alerts.get(alert.id.value);

    this.alerts.set(alert.id.value, alert);

    // 새로운 알림인 경우 히스토리에 추가
    if (!existingAlert) {
      this.alertsHistory.push(alert);
      this.alertsHistory.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // 최대 크기 초과시 오래된 알림 제거
      if (this.alertsHistory.length > this.maxHistorySize) {
        const removedAlerts = this.alertsHistory.splice(this.maxHistorySize);
        removedAlerts.forEach(removedAlert => {
          this.alerts.delete(removedAlert.id.value);
        });
      }
    }
  }

  async findById(id: AlertId): Promise<PerformanceAlert | null> {
    return this.alerts.get(id.value) || null;
  }

  async findActive(): Promise<PerformanceAlert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.isActive());
  }

  async findAll(): Promise<PerformanceAlert[]> {
    return Array.from(this.alerts.values());
  }

  async findByType(type: AlertType): Promise<PerformanceAlert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.type === type);
  }

  // 추가 유틸리티 메서드
  async findAcknowledged(): Promise<PerformanceAlert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.isAcknowledged());
  }

  async findResolved(): Promise<PerformanceAlert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.isResolved());
  }

  async findCritical(): Promise<PerformanceAlert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.isCritical());
  }

  async findEscalationCandidates(thresholdMinutes: number = 30): Promise<PerformanceAlert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.shouldEscalate(thresholdMinutes));
  }

  async getAlertStatistics(): Promise<{
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    critical: number;
    byType: Record<AlertType, number>;
  }> {
    const allAlerts = Array.from(this.alerts.values());

    const stats = {
      total: allAlerts.length,
      active: allAlerts.filter(a => a.isActive()).length,
      acknowledged: allAlerts.filter(a => a.isAcknowledged()).length,
      resolved: allAlerts.filter(a => a.isResolved()).length,
      critical: allAlerts.filter(a => a.isCritical()).length,
      byType: {} as Record<AlertType, number>,
    };

    // 타입별 통계
    const alertTypes: AlertType[] = [
      'connection_pool_high_utilization',
      'slow_query_detected',
      'high_cpu_usage',
      'high_memory_usage',
      'high_disk_usage',
      'connection_timeout',
      'query_timeout',
    ];

    alertTypes.forEach(type => {
      stats.byType[type] = allAlerts.filter(a => a.type === type).length;
    });

    return stats;
  }

  async clear(): Promise<void> {
    this.alerts.clear();
    this.alertsHistory = [];
  }
}
