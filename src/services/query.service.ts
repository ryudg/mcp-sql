import { DatabaseConnectionManager } from "../database/connection/connection.manager.js";
import { Logger } from "../core/logger.js";
import {
  QueryResult,
  QueryOptions,
  SqlParameter,
} from "../types/database.types.js";

/**
 * Query Execution Service
 *
 * Provides advanced functionality for database query execution.
 */
export class QueryService {
  private queryHistory: Array<{
    query: string;
    timestamp: Date;
    executionTime: number;
    success: boolean;
    error?: string;
  }> = [];

  constructor(
    private dbManager: DatabaseConnectionManager,
    private logger: Logger
  ) {}

  /**
   * Execute single query
   */
  async executeQuery(
    query: string,
    options?: QueryOptions
  ): Promise<QueryResult> {
    const startTime = Date.now();

    try {
      this.logger.info("Starting query execution", {
        query: query.substring(0, 100) + (query.length > 100 ? "..." : ""),
        options,
      });

      const connection = this.dbManager.getCurrentConnection();
      const result = await connection.executeQuery(query, options);

      // Add to query history
      const executionTime = Date.now() - startTime;
      this.queryHistory.push({
        query,
        timestamp: new Date(),
        executionTime,
        success: true,
      });

      this.logger.logQuery(query, executionTime, true);
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error("Query execution failed", {
        query: query.substring(0, 100) + (query.length > 100 ? "..." : ""),
        executionTime,
        error: error instanceof Error ? error.message : String(error),
      });

      // Add to query history
      this.queryHistory.push({
        query,
        timestamp: new Date(),
        executionTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Execute batch queries
   */
  async executeBatch(queries: string[]): Promise<QueryResult[]> {
    this.logger.info("Starting batch query execution", {
      queryCount: queries.length,
    });

    const results: QueryResult[] = [];
    const startTime = Date.now();

    try {
      for (const query of queries) {
        const result = await this.executeQuery(query);
        results.push(result);
      }

      const totalExecutionTime = Date.now() - startTime;
      this.logger.info("Batch query execution completed", {
        queryCount: queries.length,
        totalExecutionTime,
        successCount: results.filter((r) => r.success).length,
      });

      return results;
    } catch (error) {
      this.logger.error("Batch query execution failed", {
        queryCount: queries.length,
        completedQueries: results.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get query execution statistics
   */
  getQueryStats(): any {
    const totalQueries = this.queryHistory.length;
    const successfulQueries = this.queryHistory.filter((q) => q.success).length;
    const failedQueries = totalQueries - successfulQueries;

    const executionTimes = this.queryHistory.map((q) => q.executionTime);
    const averageExecutionTime =
      executionTimes.length > 0
        ? Math.round(
            executionTimes.reduce((sum, time) => sum + time, 0) /
              executionTimes.length
          )
        : 0;

    const slowestQuery = this.queryHistory.reduce(
      (slowest, current) =>
        current.executionTime > slowest.executionTime ? current : slowest,
      this.queryHistory[0] || {
        executionTime: 0,
        query: "",
        timestamp: new Date(),
      }
    );

    const fastestQuery = this.queryHistory.reduce(
      (fastest, current) =>
        current.executionTime < fastest.executionTime ? current : fastest,
      this.queryHistory[0] || {
        executionTime: 0,
        query: "",
        timestamp: new Date(),
      }
    );

    return {
      totalQueries,
      successfulQueries,
      failedQueries,
      successRate:
        totalQueries > 0
          ? Math.round((successfulQueries / totalQueries) * 100)
          : 0,
      averageExecutionTime,
      slowestQuery: {
        query:
          slowestQuery.query.substring(0, 100) +
          (slowestQuery.query.length > 100 ? "..." : ""),
        executionTime: slowestQuery.executionTime,
        timestamp: slowestQuery.timestamp,
      },
      fastestQuery: {
        query:
          fastestQuery.query.substring(0, 100) +
          (fastestQuery.query.length > 100 ? "..." : ""),
        executionTime: fastestQuery.executionTime,
        timestamp: fastestQuery.timestamp,
      },
    };
  }

  /**
   * Get query history
   */
  getQueryHistory(limit?: number): any[] {
    const history = [...this.queryHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Clear query history
   */
  clearHistory(): void {
    this.queryHistory = [];
    this.logger.info("Query history cleared");
  }

  /**
   * Execute queries within a transaction
   */
  async executeInTransaction(
    queries: Array<{ query: string; parameters?: SqlParameter[] }>
  ): Promise<QueryResult[]> {
    this.logger.info("Transaction started", { queryCount: queries.length });

    const results: QueryResult[] = [];

    try {
      // Start transaction
      await this.executeQuery("BEGIN TRANSACTION");

      for (const { query, parameters } of queries) {
        const result = await this.executeQuery(query, { parameters });
        results.push(result);

        if (!result.success) {
          throw new Error(`Transaction query failed: ${result.error}`);
        }
      }

      // Commit transaction
      await this.executeQuery("COMMIT TRANSACTION");

      this.logger.info("Transaction completed successfully", {
        queryCount: queries.length,
      });

      return results;
    } catch (error) {
      // Transaction rollback
      try {
        await this.executeQuery("ROLLBACK TRANSACTION");
        this.logger.info("Transaction rollback completed");
      } catch (rollbackError) {
        this.logger.error("Transaction rollback failed", { rollbackError });
      }

      this.logger.error("Transaction failed", {
        completedQueries: results.length,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Get query execution plan
   */
  async getExecutionPlan(query: string): Promise<QueryResult> {
    const planQuery = `SET SHOWPLAN_ALL ON\n${query}\nSET SHOWPLAN_ALL OFF`;
    return this.executeQuery(planQuery);
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.executeQuery("SELECT 1 as test");
      return result.success && result.recordset?.[0]?.test === 1;
    } catch {
      return false;
    }
  }
}
