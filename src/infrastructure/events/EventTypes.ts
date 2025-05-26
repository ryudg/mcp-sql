/**
 * Event Types
 *
 * Constants for all domain events in the system.
 * Used with the EventBus for type-safe event publishing and subscription.
 */
export const EventTypes = {
  // Query domain events
  QUERY_EXECUTED: 'query.executed',
  QUERY_FAILED: 'query.failed',
  QUERY_SLOW: 'query.slow',
  QUERY_BATCH_COMPLETED: 'query.batch.completed',

  // Schema domain events
  SCHEMA_CHANGED: 'schema.changed',
  TABLE_CREATED: 'schema.table.created',
  TABLE_ALTERED: 'schema.table.altered',
  TABLE_DROPPED: 'schema.table.dropped',

  // Performance domain events
  PERFORMANCE_ALERT_TRIGGERED: 'performance.alert.triggered',
  PERFORMANCE_MONITORING_STARTED: 'performance.monitoring.started',
  PERFORMANCE_MONITORING_STOPPED: 'performance.monitoring.stopped',
  PERFORMANCE_REPORT_GENERATED: 'performance.report.generated',

  // Database domain events
  DATABASE_CONNECTED: 'database.connected',
  DATABASE_DISCONNECTED: 'database.disconnected',
  CONNECTION_POOL_EXHAUSTED: 'database.connection.pool.exhausted',
  CONNECTION_POOL_RECOVERED: 'database.connection.pool.recovered',

  // System events
  SYSTEM_STARTUP: 'system.startup',
  SYSTEM_SHUTDOWN: 'system.shutdown',
  SYSTEM_ERROR: 'system.error',
  CACHE_CLEARED: 'system.cache.cleared',
} as const;

/**
 * Type for all possible event types
 */
export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
