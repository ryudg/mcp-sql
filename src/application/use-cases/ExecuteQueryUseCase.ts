import { QueryDomainService } from '../../domain/query/services/QueryDomainService.js';
import { QueryResult } from '../../domain/query/entities/Query.js';
import { QueryString } from '../../domain/query/value-objects/QueryString.js';
import { QueryExecutionError } from '../../domain/query/errors/QueryExecutionError.js';

export interface ExecuteQueryRequest {
  sql: string;
  parameters?: any[];
}

export interface ExecuteQueryResponse {
  success: boolean;
  result?: QueryResult;
  error?: string;
}

/**
 * ExecuteQueryUseCase
 *
 * Application use case for executing database queries.
 * Implements the use case pattern from Clean Architecture.
 */
export class ExecuteQueryUseCase {
  constructor(private readonly queryDomainService: QueryDomainService) {}

  /**
   * Executes a query with the given SQL and parameters.
   * @param request The query execution request
   * @returns Response with query result or error
   */
  async execute(request: ExecuteQueryRequest): Promise<ExecuteQueryResponse> {
    try {
      // Create QueryString value object to validate SQL
      const queryString = new QueryString(request.sql);

      // Create and validate query
      const query = await this.queryDomainService.createQuery(
        queryString.value,
        request.parameters || []
      );

      // Execute query
      const result = await this.queryDomainService.executeQuery(query.id);

      return {
        success: true,
        result,
      };
    } catch (error) {
      // Preserve domain errors
      if (error instanceof QueryExecutionError) {
        throw error;
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
