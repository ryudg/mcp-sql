import { Query } from '../../domain/query/entities/Query.js';
import { QueryId } from '../../domain/query/value-objects/QueryId.js';
import { QueryRepository } from '../../domain/query/repositories/QueryRepository.js';

/**
 * InMemoryQueryRepository
 *
 * In-memory implementation of QueryRepository interface.
 * Used for development, testing, and caching.
 */
export class InMemoryQueryRepository implements QueryRepository {
  private queries: Map<string, Query> = new Map();

  /**
   * Saves a query to the in-memory repository.
   * @param query The query to save
   */
  async save(query: Query): Promise<void> {
    this.queries.set(query.id.value, query);
  }

  /**
   * Finds a query by its ID.
   * @param id The query ID
   * @returns The query if found, null otherwise
   */
  async findById(id: QueryId): Promise<Query | null> {
    const query = this.queries.get(id.value);
    return query || null;
  }

  /**
   * Finds queries matching a pattern.
   * @param pattern The search pattern
   * @returns Array of matching queries
   */
  async findByPattern(pattern: string): Promise<Query[]> {
    const regex = new RegExp(pattern, 'i');
    return Array.from(this.queries.values()).filter(query => regex.test(query.sql));
  }

  /**
   * Gets aggregated statistics about queries.
   * @returns Query statistics
   */
  async getStatistics(): Promise<any> {
    const queries = Array.from(this.queries.values());

    // Calculate aggregate statistics
    const totalQueries = queries.length;
    const executedQueries = queries.filter(q => q.statistics.executionCount > 0);
    const totalExecutions = executedQueries.reduce(
      (sum, q) => sum + q.statistics.executionCount,
      0
    );
    const avgExecutionTime =
      executedQueries.length > 0
        ? executedQueries.reduce((sum, q) => sum + q.statistics.averageExecutionTime, 0) /
          executedQueries.length
        : 0;

    // Find slow queries (> 1000ms)
    const slowQueries = executedQueries.filter(q => q.statistics.averageExecutionTime > 1000);

    return {
      totalQueries,
      executedQueries: executedQueries.length,
      totalExecutions,
      avgExecutionTime,
      slowQueries: slowQueries.length,
      slowQueriesList: slowQueries.map(q => ({
        id: q.id.value,
        sql: q.sql,
        avgExecutionTime: q.statistics.averageExecutionTime,
        executionCount: q.statistics.executionCount,
      })),
    };
  }

  /**
   * Deletes a query by its ID.
   * @param id The query ID
   * @returns True if deleted, false if not found
   */
  async delete(id: QueryId): Promise<boolean> {
    return this.queries.delete(id.value);
  }

  /**
   * Clears all queries from the repository.
   */
  async clear(): Promise<void> {
    this.queries.clear();
  }
}
