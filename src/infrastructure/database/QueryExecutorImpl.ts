import { QueryExecutor } from '../../domain/query/repositories/QueryExecutor.js';
import { QueryResult as DomainQueryResult } from '../../domain/query/entities/Query.js';
import { DatabaseConnectionManager } from '../../database/connection/connection.manager.js';
import { Logger } from '../../core/logger.js';
import { EventBus } from '../events/EventBus.js';
import { EventTypes } from '../events/EventTypes.js';
import { QueryOptions, QueryResult as InfraQueryResult, SqlParameter } from '../../types/common.js';

/**
 * QueryExecutorImpl
 *
 * Implementation of QueryExecutor interface that uses DatabaseConnectionManager
 * to execute queries against the database.
 */
export class QueryExecutorImpl implements QueryExecutor {
  private eventBus: EventBus;

  constructor(
    private readonly dbManager: DatabaseConnectionManager,
    private readonly logger: Logger
  ) {
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Executes a SQL query with parameters.
   * @param sql The SQL query string
   * @param parameters The query parameters
   * @returns Promise with query result
   */
  async execute(sql: string, parameters: any[] = []): Promise<DomainQueryResult> {
    this.logger.debug('Executing query', { sql, parametersCount: parameters.length });

    try {
      const connection = this.dbManager.getCurrentConnection();
      const options: QueryOptions = { parameters: parameters as SqlParameter[] };
      const result = await connection.executeQuery(sql, options);

      if (!result.success) {
        throw new Error(result.error || 'Query execution failed');
      }

      return {
        rows: result.recordset || [],
        rowCount: result.recordset?.length || 0,
        executionTime: result.executionTime || 0,
        columns: Object.keys(result.recordset?.[0] || {}),
      };
    } catch (error) {
      this.logger.error('Query execution failed', {
        sql,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Executes multiple SQL queries in batch.
   * @param queries Array of SQL query strings
   * @param parameters Array of parameter arrays for each query
   * @returns Promise with array of query results
   */
  async executeBatch(queries: string[], parameters?: any[][]): Promise<DomainQueryResult[]> {
    this.logger.debug('Executing batch queries', { count: queries.length });

    const results: DomainQueryResult[] = [];

    for (let i = 0; i < queries.length; i++) {
      try {
        const params = parameters && parameters[i] ? parameters[i] : [];
        const result = await this.execute(queries[i], params);
        results.push(result);
      } catch (error) {
        this.logger.error(`Batch query ${i + 1} failed`, {
          sql: queries[i],
          error: error instanceof Error ? error.message : String(error),
        });

        // Add failed result
        results.push({
          rows: [],
          rowCount: 0,
          executionTime: 0,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Publish batch completed event
    this.eventBus.publish(EventTypes.QUERY_BATCH_COMPLETED, {
      totalQueries: queries.length,
      successfulQueries: results.filter(r => !r.error).length,
      failedQueries: results.filter(r => r.error).length,
      timestamp: new Date(),
    });

    return results;
  }

  /**
   * Executes a query in a transaction.
   * @param sql The SQL query string
   * @param parameters The query parameters
   * @returns Promise with query result
   */
  async executeInTransaction(sql: string, parameters: any[] = []): Promise<DomainQueryResult> {
    try {
      await this.beginTransaction();
      const connection = this.dbManager.getCurrentConnection();
      const options: QueryOptions = { parameters: parameters as SqlParameter[] };
      const result = await connection.executeQuery(sql, options);

      if (!result.success) {
        await this.rollbackTransaction('');
        throw new Error(result.error || 'Query execution in transaction failed');
      }

      await this.commitTransaction('');

      return {
        rows: result.recordset || [],
        rowCount: result.recordset?.length || 0,
        executionTime: result.executionTime || 0,
        columns: Object.keys(result.recordset?.[0] || {}),
      };
    } catch (error) {
      await this.rollbackTransaction('');
      this.logger.error('Query execution in transaction failed', {
        sql,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Begins a transaction.
   * @returns Promise with transaction ID
   */
  async beginTransaction(): Promise<string> {
    try {
      const connection = this.dbManager.getCurrentConnection();
      await connection.executeQuery('BEGIN TRANSACTION', {});
      return 'transaction-' + Date.now(); // Generate a simple transaction ID
    } catch (error) {
      throw new Error(
        'Failed to begin transaction: ' + (error instanceof Error ? error.message : String(error))
      );
    }
  }

  /**
   * Commits a transaction.
   * @param transactionId The transaction ID
   */
  async commitTransaction(transactionId: string): Promise<void> {
    try {
      const connection = this.dbManager.getCurrentConnection();
      await connection.executeQuery('COMMIT TRANSACTION', {});
    } catch (error) {
      throw new Error(
        'Failed to commit transaction: ' + (error instanceof Error ? error.message : String(error))
      );
    }
  }

  /**
   * Rolls back a transaction.
   * @param transactionId The transaction ID
   */
  async rollbackTransaction(transactionId: string): Promise<void> {
    try {
      const connection = this.dbManager.getCurrentConnection();
      await connection.executeQuery('ROLLBACK TRANSACTION', {});
    } catch (error) {
      this.logger.error('Failed to rollback transaction', {
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        'Failed to rollback transaction: ' +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }
}
