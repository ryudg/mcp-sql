import { QueryResult } from '../entities/Query.js';

/**
 * QueryExecutor Interface
 *
 * Interface for executing SQL queries against a database.
 * Abstracts the actual database implementation.
 */
export interface QueryExecutor {
  /**
   * Executes a SQL query with parameters.
   * @param sql The SQL query string
   * @param parameters The query parameters
   * @returns Promise with query result
   */
  execute(sql: string, parameters: any[]): Promise<QueryResult>;

  /**
   * Executes multiple SQL queries in batch.
   * @param queries Array of SQL query strings
   * @param parameters Array of parameter arrays for each query
   * @returns Promise with array of query results
   */
  executeBatch(queries: string[], parameters?: any[][]): Promise<QueryResult[]>;

  /**
   * Executes a query in a transaction.
   * @param sql The SQL query string
   * @param parameters The query parameters
   * @returns Promise with query result
   */
  executeInTransaction(sql: string, parameters: any[]): Promise<QueryResult>;

  /**
   * Begins a transaction.
   * @returns Promise with transaction ID
   */
  beginTransaction(): Promise<string>;

  /**
   * Commits a transaction.
   * @param transactionId The transaction ID
   */
  commitTransaction(transactionId: string): Promise<void>;

  /**
   * Rolls back a transaction.
   * @param transactionId The transaction ID
   */
  rollbackTransaction(transactionId: string): Promise<void>;
}
