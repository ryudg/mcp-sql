/**
 * PerformanceAlertTriggeredEvent Domain Event
 *
 * Represents an event that occurs when a performance threshold has been exceeded.
 * Contains information about the alert type, severity, and measurements.
 */
export class PerformanceAlertTriggeredEvent {
  constructor(
    readonly alertId: string,
    readonly alertType: 'QUERY_PERFORMANCE' | 'CONNECTION_POOL' | 'SYSTEM_RESOURCES',
    readonly severity: 'INFO' | 'WARNING' | 'CRITICAL',
    readonly message: string,
    readonly measurements: Record<string, number>,
    readonly timestamp: Date = new Date()
  ) {}

  /**
   * Checks if the alert is critical.
   * @returns boolean indicating if the alert is critical
   */
  isCritical(): boolean {
    return this.severity === 'CRITICAL';
  }

  /**
   * Creates a summary of the performance alert event.
   * @returns Summary string
   */
  getSummary(): string {
    return `[${this.severity}] ${this.alertType} alert: ${this.message}`;
  }

  /**
   * Gets the recommended action based on the alert type and severity.
   * @returns Recommendation string
   */
  getRecommendation(): string {
    switch (this.alertType) {
      case 'QUERY_PERFORMANCE':
        return this.isCritical()
          ? 'Review and optimize the slow queries immediately'
          : 'Consider optimizing frequently executed queries';

      case 'CONNECTION_POOL':
        return this.isCritical()
          ? 'Increase connection pool size or reduce connection usage'
          : 'Monitor connection pool usage trends';

      case 'SYSTEM_RESOURCES':
        return this.isCritical()
          ? 'Scale up resources or reduce system load immediately'
          : 'Plan for resource allocation adjustment';

      default:
        return 'Review system performance metrics';
    }
  }
}
