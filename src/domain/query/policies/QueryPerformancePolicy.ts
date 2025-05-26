import { QueryExecutedEvent } from '../events/QueryExecutedEvent.js';

/**
 * QueryPerformancePolicy
 *
 * Policy for evaluating query performance and providing recommendations.
 * Implements the policy pattern from DDD.
 */
export class QueryPerformancePolicy {
  constructor(
    private readonly slowQueryThreshold: number = 1000,
    private readonly criticalQueryThreshold: number = 5000
  ) {}

  /**
   * Evaluates a query execution event and determines if it requires attention.
   * @param event The query executed event
   * @returns boolean indicating if the query performance is concerning
   */
  evaluate(event: QueryExecutedEvent): boolean {
    return event.executionTime > this.slowQueryThreshold;
  }

  /**
   * Gets the severity level of a query execution event.
   * @param event The query executed event
   * @returns Severity level as string
   */
  getSeverity(event: QueryExecutedEvent): 'normal' | 'slow' | 'critical' {
    if (event.executionTime > this.criticalQueryThreshold) {
      return 'critical';
    } else if (event.executionTime > this.slowQueryThreshold) {
      return 'slow';
    }
    return 'normal';
  }

  /**
   * Provides recommendations for improving query performance.
   * @param event The query executed event
   * @returns Array of recommendation strings
   */
  getRecommendations(event: QueryExecutedEvent): string[] {
    const recommendations: string[] = [];
    const sql = event.sql.toLowerCase();

    // Basic recommendations based on query analysis
    if (event.executionTime > this.slowQueryThreshold) {
      recommendations.push('Consider adding appropriate indexes for this query');

      if (sql.includes('select *')) {
        recommendations.push('Avoid using SELECT * and specify only needed columns');
      }

      if (!sql.includes('where') && (sql.includes('update') || sql.includes('delete'))) {
        recommendations.push('Add WHERE clause to limit the scope of data modification');
      }

      if (sql.includes("like '%")) {
        recommendations.push('Leading wildcards in LIKE clauses prevent index usage');
      }

      if (event.rowCount > 1000) {
        recommendations.push('Consider pagination for large result sets');
      }
    }

    return recommendations;
  }
}
