import { QueryRepository } from '../repositories/QueryRepository.js';
import { QueryExecutor } from '../repositories/QueryExecutor.js';
import { Query, QueryResult } from '../entities/Query.js';
import { QueryId } from '../value-objects/QueryId.js';
import { QueryString } from '../value-objects/QueryString.js';
import { QueryExecutionError } from '../errors/QueryExecutionError.js';
import { QueryExecutedEvent } from '../events/QueryExecutedEvent.js';
import { EventBus } from '../../../infrastructure/events/EventBus.js';
import { EventTypes } from '../../../infrastructure/events/EventTypes.js';

/**
 * QueryDomainService
 *
 * Domain service for query-related operations.
 * Implements domain logic for query creation, validation, and execution.
 */
export class QueryDomainService {
  private eventBus: EventBus;

  constructor(
    private readonly queryRepository: QueryRepository,
    private readonly queryExecutor: QueryExecutor
  ) {
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Creates a new query with validation.
   * @param sql The SQL query string
   * @param parameters Query parameters
   * @returns Promise with the query ID
   */
  async createQuery(sql: string, parameters: any[] = []): Promise<{ id: string }> {
    try {
      // Create value objects
      const queryString = new QueryString(sql);
      const queryId = new QueryId();

      // Create and validate query entity
      const query = new Query(queryId, queryString, parameters);
      if (!query.validate()) {
        throw new Error('Invalid query');
      }

      // Store query
      await this.queryRepository.save(query);

      return { id: queryId.value };
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to create query');
    }
  }

  /**
   * Executes a query by ID.
   * @param queryId The ID of the query to execute
   * @returns Promise with query result
   */
  async executeQuery(queryId: string): Promise<QueryResult> {
    try {
      // Get query from repository
      const query = await this.queryRepository.findById(new QueryId(queryId));
      if (!query) {
        throw new Error(`Query with ID ${queryId} not found`);
      }

      // Execute query
      const startTime = Date.now();
      const result = await this.queryExecutor.execute(query.sql, query.parameters);
      const executionTime = Date.now() - startTime;

      // Update query statistics
      query.updateStatistics(executionTime);
      await this.queryRepository.save(query);

      // Create result with execution time
      const queryResult: QueryResult = {
        rows: result.rows,
        rowCount: result.rowCount,
        executionTime,
        columns: result.columns,
      };

      // Publish query executed event
      const event = new QueryExecutedEvent(
        queryId,
        query.sql,
        executionTime,
        result.rowCount,
        true
      );
      this.eventBus.publish(EventTypes.QUERY_EXECUTED, event);

      // Check if query is slow and publish slow query event if needed
      if (event.isSlow()) {
        this.eventBus.publish(EventTypes.QUERY_SLOW, event);
      }

      return queryResult;
    } catch (error) {
      // Create and publish query failed event
      const failedEvent = new QueryExecutedEvent(
        queryId,
        '',
        0,
        0,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
      this.eventBus.publish(EventTypes.QUERY_FAILED, failedEvent);

      // Throw domain-specific error
      throw new QueryExecutionError(
        queryId,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Gets query statistics by ID.
   * @param queryId The ID of the query
   * @returns Promise with query statistics
   */
  async getQueryStatistics(queryId: string): Promise<any> {
    const query = await this.queryRepository.findById(new QueryId(queryId));
    if (!query) {
      throw new Error(`Query with ID ${queryId} not found`);
    }

    return query.statistics;
  }

  async executeBatchQueries(queryIds: QueryId[]): Promise<QueryResult[]> {
    const queries = await Promise.all(queryIds.map(id => this.queryRepository.findById(id)));

    const validQueries = queries.filter((q): q is Query => q !== null);
    if (validQueries.length !== queryIds.length) {
      throw new Error('Some queries not found');
    }

    const startTime = Date.now();
    const results = await this.queryExecutor.executeBatch(validQueries.map(q => q.sql));
    const totalExecutionTime = Date.now() - startTime;

    // Update statistics for each query
    const avgExecutionTime = totalExecutionTime / validQueries.length;
    await Promise.all(
      validQueries.map(async query => {
        query.updateStatistics(avgExecutionTime);
        await this.queryRepository.save(query);
      })
    );

    return results;
  }

  async optimizeQuery(queryId: QueryId): Promise<string> {
    const query = await this.queryRepository.findById(queryId);
    if (!query) {
      throw new Error(`Query with id ${queryId.value} not found`);
    }

    // Basic query optimization suggestions
    const sql = query.sql.toLowerCase();
    const suggestions: string[] = [];

    if (sql.includes('select *')) {
      suggestions.push('Consider selecting only needed columns instead of using SELECT *');
    }

    if (sql.includes('where') && !sql.includes('index')) {
      suggestions.push('Consider adding indexes for WHERE clause columns');
    }

    if (sql.includes('order by') && !sql.includes('limit')) {
      suggestions.push('Consider adding LIMIT clause when using ORDER BY');
    }

    return suggestions.join('; ') || 'Query appears to be optimized';
  }

  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
