import { EventBus } from './EventBus.js';
import { EventTypes } from './EventTypes.js';
import { Logger } from '../../core/logger.js';
import { QueryExecutedEvent } from '../../domain/query/events/QueryExecutedEvent.js';
import { SchemaChangedEvent } from '../../domain/query/events/SchemaChangedEvent.js';
import { PerformanceAlertTriggeredEvent } from '../../domain/performance/events/PerformanceAlertTriggeredEvent.js';
import { QueryPerformancePolicy } from '../../domain/query/policies/QueryPerformancePolicy.js';
import { ConnectionPoolPolicy } from '../../domain/performance/policies/ConnectionPoolPolicy.js';

/**
 * EventDispatcher
 *
 * Centralizes event handling logic and connects events to policies.
 * Implements the Observer pattern for domain events.
 */
export class EventDispatcher {
  private static instance: EventDispatcher;
  private eventBus: EventBus;
  private queryPerformancePolicy: QueryPerformancePolicy;
  private connectionPoolPolicy: ConnectionPoolPolicy;

  private constructor(private readonly logger: Logger) {
    this.eventBus = EventBus.getInstance();
    this.queryPerformancePolicy = new QueryPerformancePolicy();
    this.connectionPoolPolicy = new ConnectionPoolPolicy();

    this.registerEventHandlers();
  }

  /**
   * Gets the singleton instance of EventDispatcher.
   * @param logger Logger instance
   * @returns EventDispatcher instance
   */
  public static getInstance(logger: Logger): EventDispatcher {
    if (!EventDispatcher.instance) {
      EventDispatcher.instance = new EventDispatcher(logger);
    }
    return EventDispatcher.instance;
  }

  /**
   * Registers all event handlers with the event bus.
   */
  private registerEventHandlers(): void {
    // Query events
    this.eventBus.subscribe(EventTypes.QUERY_EXECUTED, this.handleQueryExecuted.bind(this));
    this.eventBus.subscribe(EventTypes.QUERY_FAILED, this.handleQueryFailed.bind(this));
    this.eventBus.subscribe(EventTypes.QUERY_SLOW, this.handleSlowQuery.bind(this));

    // Schema events
    this.eventBus.subscribe(EventTypes.SCHEMA_CHANGED, this.handleSchemaChanged.bind(this));

    // Performance events
    this.eventBus.subscribe(
      EventTypes.PERFORMANCE_ALERT_TRIGGERED,
      this.handlePerformanceAlert.bind(this)
    );
  }

  /**
   * Handles query executed events.
   * @param event The query executed event
   */
  private handleQueryExecuted(event: QueryExecutedEvent): void {
    this.logger.debug('Query executed event received', {
      queryId: event.queryId,
      executionTime: event.executionTime,
      rowCount: event.rowCount,
    });

    // Apply query performance policy
    if (this.queryPerformancePolicy.evaluate(event)) {
      const severity = this.queryPerformancePolicy.getSeverity(event);
      const recommendations = this.queryPerformancePolicy.getRecommendations(event);

      this.logger.info(`Query performance issue detected (${severity})`, {
        queryId: event.queryId,
        executionTime: event.executionTime,
        recommendations,
      });

      // Trigger performance alert if critical
      if (severity === 'critical') {
        const alertEvent = new PerformanceAlertTriggeredEvent(
          `query-${event.queryId}`,
          'QUERY_PERFORMANCE',
          'CRITICAL',
          `Slow query detected (${event.executionTime}ms)`,
          { executionTime: event.executionTime },
          event.timestamp
        );

        this.eventBus.publish(EventTypes.PERFORMANCE_ALERT_TRIGGERED, alertEvent);
      }
    }
  }

  /**
   * Handles query failed events.
   * @param event The query failed event
   */
  private handleQueryFailed(event: QueryExecutedEvent): void {
    this.logger.error('Query failed event received', {
      queryId: event.queryId,
      error: event.errorMessage,
    });
  }

  /**
   * Handles slow query events.
   * @param event The slow query event
   */
  private handleSlowQuery(event: QueryExecutedEvent): void {
    this.logger.warn('Slow query detected', {
      queryId: event.queryId,
      executionTime: event.executionTime,
      sql: event.sql.substring(0, 100) + (event.sql.length > 100 ? '...' : ''),
    });
  }

  /**
   * Handles schema changed events.
   * @param event The schema changed event
   */
  private handleSchemaChanged(event: SchemaChangedEvent): void {
    this.logger.info('Schema changed event received', {
      changeType: event.changeType,
      objectType: event.objectType,
      objectName: event.objectName,
    });
  }

  /**
   * Handles performance alert events.
   * @param event The performance alert event
   */
  private handlePerformanceAlert(event: PerformanceAlertTriggeredEvent): void {
    this.logger.warn(`Performance alert: ${event.getSummary()}`, {
      alertType: event.alertType,
      severity: event.severity,
      measurements: event.measurements,
    });

    // Log recommendations
    const recommendation = event.getRecommendation();
    this.logger.info(`Performance recommendation: ${recommendation}`, {
      alertId: event.alertId,
    });
  }
}
