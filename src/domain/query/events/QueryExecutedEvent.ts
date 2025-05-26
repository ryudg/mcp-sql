/**
 * QueryExecutedEvent Domain Event
 *
 * Represents an event that occurs when a query has been executed.
 * Contains information about the execution result and performance metrics.
 */
export class QueryExecutedEvent {
  constructor(
    readonly queryId: string,
    readonly sql: string,
    readonly executionTime: number,
    readonly rowCount: number,
    readonly success: boolean,
    readonly errorMessage?: string,
    readonly timestamp: Date = new Date()
  ) {}

  /**
   * Checks if the query execution was slow based on a threshold.
   * @param threshold Threshold in milliseconds
   * @returns boolean indicating if the query was slow
   */
  isSlow(threshold: number = 1000): boolean {
    return this.executionTime > threshold;
  }

  /**
   * Creates a summary of the execution event.
   * @returns Summary string
   */
  getSummary(): string {
    return `Query ${this.success ? 'succeeded' : 'failed'} in ${this.executionTime}ms with ${this.rowCount} rows`;
  }
}
