import { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ExecuteQueryUseCase } from '../../application/use-cases/ExecuteQueryUseCase.js';
import { Logger } from '../../core/logger.js';
import { QueryExecutionError } from '../../domain/query/errors/QueryExecutionError.js';

/**
 * QueryHandler
 *
 * Handles MCP protocol requests related to query execution.
 * Translates between MCP protocol and application layer.
 */
export class QueryHandler {
  constructor(
    private readonly executeQueryUseCase: ExecuteQueryUseCase,
    private readonly logger: Logger
  ) {}

  /**
   * Handles execute_query tool requests.
   * @param request MCP tool request
   * @returns MCP tool result
   */
  async handleExecuteQuery(request: CallToolRequest): Promise<CallToolResult> {
    const args = request.params.arguments as any;
    const { query, parameters } = args;

    if (!query || typeof query !== 'string') {
      return this.createErrorResponse('Query was not provided or is not a string');
    }

    this.logger.info('Executing query via DDD use case', {
      queryLength: query.length,
      hasParameters: !!parameters,
    });

    try {
      const response = await this.executeQueryUseCase.execute({
        sql: query,
        parameters,
      });

      if (response.success && response.result) {
        return {
          content: [
            {
              type: 'text',
              text:
                `Query execution completed\n\n` +
                `Execution time: ${response.result.executionTime}ms\n` +
                `Row count: ${response.result.rowCount} rows\n\n` +
                `Results:\n${JSON.stringify(response.result.rows, null, 2)}`,
            },
          ],
        };
      } else {
        return this.createErrorResponse(response.error || 'Query execution failed');
      }
    } catch (error) {
      // Use domain-specific error handling if available
      if (error instanceof QueryExecutionError) {
        return this.createErrorResponse(error.getHumanReadableMessage());
      }

      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * Handles start_batch_processing tool requests.
   * @param request MCP tool request
   * @returns MCP tool result
   */
  async handleBatchProcessing(request: CallToolRequest): Promise<CallToolResult> {
    const args = request.params.arguments as any;
    const { queries } = args;

    if (!Array.isArray(queries)) {
      return this.createErrorResponse('Queries array was not provided');
    }

    this.logger.info('Executing batch queries via DDD use case', {
      queryCount: queries.length,
    });

    const results = [];
    for (const query of queries) {
      try {
        const response = await this.executeQueryUseCase.execute({
          sql: query,
          parameters: [],
        });
        results.push(response);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return {
      content: [
        {
          type: 'text',
          text:
            `Batch execution completed\n\n` +
            `Total queries: ${results.length}\n` +
            `Successful: ${successCount}\n` +
            `Failed: ${failureCount}\n\n` +
            `Results:\n${JSON.stringify(results, null, 2)}`,
        },
      ],
    };
  }

  /**
   * Creates a standardized error response.
   * @param message Error message
   * @returns MCP tool result with error
   */
  private createErrorResponse(message: string): CallToolResult {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
}
