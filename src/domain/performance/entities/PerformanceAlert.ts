export interface AlertId {
  readonly value: string;
}

export type AlertType =
  | 'connection_pool_high_utilization'
  | 'slow_query_detected'
  | 'high_cpu_usage'
  | 'high_memory_usage'
  | 'high_disk_usage'
  | 'connection_timeout'
  | 'query_timeout';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export class PerformanceAlert {
  private _status: AlertStatus = 'active';
  private _acknowledgedAt?: Date;
  private _resolvedAt?: Date;

  constructor(
    private readonly _id: AlertId,
    private readonly _type: AlertType,
    private readonly _severity: AlertSeverity,
    private readonly _message: string,
    private readonly _details: Record<string, any>,
    private readonly _createdAt: Date = new Date()
  ) {}

  get id(): AlertId {
    return this._id;
  }

  get type(): AlertType {
    return this._type;
  }

  get severity(): AlertSeverity {
    return this._severity;
  }

  get message(): string {
    return this._message;
  }

  get details(): Record<string, any> {
    return { ...this._details };
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get status(): AlertStatus {
    return this._status;
  }

  get acknowledgedAt(): Date | undefined {
    return this._acknowledgedAt;
  }

  get resolvedAt(): Date | undefined {
    return this._resolvedAt;
  }

  acknowledge(): void {
    if (this._status === 'resolved') {
      throw new Error('Cannot acknowledge a resolved alert');
    }
    this._status = 'acknowledged';
    this._acknowledgedAt = new Date();
  }

  resolve(): void {
    this._status = 'resolved';
    this._resolvedAt = new Date();
  }

  isActive(): boolean {
    return this._status === 'active';
  }

  isAcknowledged(): boolean {
    return this._status === 'acknowledged';
  }

  isResolved(): boolean {
    return this._status === 'resolved';
  }

  getDuration(): number {
    const endTime = this._resolvedAt || new Date();
    return endTime.getTime() - this._createdAt.getTime();
  }

  isCritical(): boolean {
    return this._severity === 'critical';
  }

  shouldEscalate(thresholdMinutes: number = 30): boolean {
    if (this._status !== 'active') return false;

    const now = new Date();
    const minutesSinceCreated = (now.getTime() - this._createdAt.getTime()) / (1000 * 60);

    return minutesSinceCreated > thresholdMinutes;
  }
}
