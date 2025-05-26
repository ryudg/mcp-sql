import { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DatabaseConnectionManager } from '../../database/connection/connection.manager.js';
import { Logger } from '../../core/logger.js';
import { QueryService } from '../../services/query.service.js';
import { SchemaService } from '../../services/schema.service.js';
import { PerformanceService } from '../../services/performance/performance.service.js';

/**
 * MCP Tool Handler Integration Class
 *
 * Receives all tool calls and routes them to appropriate services.
 */
export class ToolHandlers {
  private queryService: QueryService | null = null;
  private schemaService: SchemaService | null = null;
  private performanceService: PerformanceService | null = null;

  constructor(
    private dbManager: DatabaseConnectionManager,
    private logger: Logger
  ) {
    // Services will be initialized lazily when first needed in handleToolCall
  }

  /**
   * Handle tool calls
   */
  async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    const { name, arguments: args } = request.params;

    this.logger.info(`Tool call: ${name}`, { arguments: args });

    try {
      // Wait for services to initialize if not ready
      if (!this.queryService || !this.schemaService || !this.performanceService) {
        await this.initializeServices();
      }

      switch (name) {
        case 'execute_query':
          return await this.handleExecuteQuery(args);
        case 'get_schema':
          return await this.handleGetSchema(args);
        case 'list_tables':
          return await this.handleListTables(args);
        case 'describe_table':
          return await this.handleDescribeTable(args);
        case 'get_connection_pool_status':
          return await this.handleGetConnectionPoolStatus(args);
        case 'start_performance_monitoring':
          return await this.handleStartPerformanceMonitoring(args);
        case 'start_batch_processing':
          return await this.handleStartBatchProcessing(args);
        case 'generate_performance_report':
          return await this.handleGeneratePerformanceReport(args);
        case 'get_query_stats':
          return await this.handleGetQueryStats(args);
        case 'get_schema_statistics':
          return await this.handleGetSchemaStatistics(args);
        case 'clear_caches':
          return await this.handleClearCaches(args);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Tool call failed: ${name}`, {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Initialize services
   */
  private async initializeServices(): Promise<void> {
    try {
      // Create default connection if none exists
      await this.ensureConnection();

      const adapter = this.dbManager.getCurrentConnection();

      // Initialize services
      this.queryService = new QueryService(this.dbManager, this.logger);
      this.schemaService = new SchemaService(this.dbManager, this.logger);
      this.performanceService = new PerformanceService(this.dbManager, this.logger);
    } catch (error) {
      this.logger.error('Service initialization failed', { error });
      throw error;
    }
  }

  /**
   * Ensure connection exists and create if needed
   */
  private async ensureConnection(): Promise<void> {
    try {
      // Check if current connection exists
      if (this.dbManager.getConnectionStats().total === 0) {
        await this.dbManager.createDefaultConnection();
      }
    } catch (error) {
      this.logger.error('Failed to create default connection', { error });
      throw error;
    }
  }

  /**
   * Execute query handler
   */
  private async handleExecuteQuery(args: any): Promise<CallToolResult> {
    const { query, parameters } = args;

    if (!query || typeof query !== 'string') {
      throw new Error('Query was not provided.');
    }

    if (!this.queryService) {
      throw new Error('Query service is not initialized.');
    }

    const result = await this.queryService.executeQuery(query, { parameters });

    if (result.success) {
      return {
        content: [
          {
            type: 'text',
            text:
              `Query execution completed\n\n` +
              `Execution time: ${result.executionTime}ms\n` +
              `Affected rows: ${result.rowsAffected || 0} rows\n\n` +
              `Results:\n${JSON.stringify(result.recordset || result.data, null, 2)}`,
          },
        ],
      };
    } else {
      throw new Error(result.error || 'Query execution failed');
    }
  }

  /**
   * Get schema handler
   */
  private async handleGetSchema(args: any): Promise<CallToolResult> {
    const { include_system_tables = false } = args;

    if (!this.schemaService) {
      throw new Error('Schema service is not initialized.');
    }

    const schema = await this.schemaService.getSchema(include_system_tables);

    return {
      content: [
        {
          type: 'text',
          text:
            `Database schema information\n\n` +
            `Schema name: ${schema.name}\n` +
            `Number of tables: ${schema.tables?.length || 0}\n` +
            `Number of views: ${schema.views?.length || 0}\n` +
            `Number of procedures: ${schema.procedures?.length || 0}\n\n` +
            `Detailed information:\n${JSON.stringify(schema, null, 2)}`,
        },
      ],
    };
  }

  /**
   * List tables handler
   */
  private async handleListTables(args: any): Promise<CallToolResult> {
    const { pattern } = args;

    if (!this.schemaService) {
      throw new Error('Schema service is not initialized.');
    }

    const tables = await this.schemaService.getTables(pattern);

    // Get column counts for each table
    const tablesWithColumnCounts = await Promise.all(
      tables.map(async table => {
        try {
          // Get column count using a simple query
          const columnCountQuery = `
            SELECT COUNT(*) as column_count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = '${table.name}'
          `;
          const result = await this.dbManager.getCurrentConnection().executeQuery(columnCountQuery);
          const columnCount = (result.success && result.recordset?.[0]?.column_count) || 0;

          return {
            ...table,
            columnCount,
          };
        } catch (error) {
          return {
            ...table,
            columnCount: 0,
          };
        }
      })
    );

    return {
      content: [
        {
          type: 'text',
          text:
            `Table list (total ${tables.length} tables)\n\n` +
            tablesWithColumnCounts
              .map(
                (table, index) =>
                  `${index + 1}. ${table.schema}.${table.name} (${table.type})\n` +
                  `   Columns: ${table.columnCount}`
              )
              .join('\n'),
        },
      ],
    };
  }

  /**
   * Describe table handler
   */
  private async handleDescribeTable(args: any): Promise<CallToolResult> {
    const { table_name } = args;

    if (!table_name) {
      throw new Error('Table name was not provided.');
    }

    if (!this.schemaService) {
      throw new Error('Schema service is not initialized.');
    }

    const tableInfo = await this.schemaService.getTableInfo(table_name);

    return {
      content: [
        {
          type: 'text',
          text:
            `Table detailed information: ${tableInfo.name}\n\n` +
            `Schema: ${tableInfo.schema}\n` +
            `Type: ${tableInfo.type}\n` +
            `Number of columns: ${tableInfo.columns.length}\n` +
            `Primary keys: ${tableInfo.primaryKeys.length}\n` +
            `Foreign keys: ${tableInfo.foreignKeys?.length || 0}\n` +
            `Indexes: ${tableInfo.indexes?.length || 0}\n\n` +
            `Column information:\n` +
            tableInfo.columns
              .map(
                (col, index) =>
                  `${index + 1}. ${col.name}: ${col.dataType}${
                    col.maxLength ? `(${col.maxLength})` : ''
                  }\n` +
                  `   ${col.isNullable ? 'NULL allowed' : 'NOT NULL'}` +
                  `${col.isPrimaryKey ? ' PK' : ''}` +
                  `${col.isIdentity ? ' IDENTITY' : ''}`
              )
              .join('\n'),
        },
      ],
    };
  }

  /**
   * Get connection pool status handler
   */
  private async handleGetConnectionPoolStatus(args: any): Promise<CallToolResult> {
    if (!this.performanceService) {
      throw new Error('Performance service is not initialized.');
    }

    const poolStatus = this.performanceService.getConnectionPoolStatus();
    const connectionStats = this.dbManager.getConnectionStats();

    return {
      content: [
        {
          type: 'text',
          text:
            `Connection pool status\n\n` +
            `Total connections: ${poolStatus.totalConnections}\n` +
            `Active connections: ${poolStatus.activeConnections}\n` +
            `Pool utilization: ${poolStatus.utilization.toFixed(1)}%\n` +
            `Status: ${poolStatus.status}\n\n` +
            `Connection list:\n` +
            connectionStats.connections
              .map((conn, index) => `${index + 1}. ${conn.id}: ${conn.type} (${conn.status})`)
              .join('\n'),
        },
      ],
    };
  }

  /**
   * Start performance monitoring handler
   */
  private async handleStartPerformanceMonitoring(args: any): Promise<CallToolResult> {
    const { interval = 5000 } = args;

    if (!this.performanceService) {
      throw new Error('Performance service is not initialized.');
    }

    this.performanceService.startMonitoring(interval);

    return {
      content: [
        {
          type: 'text',
          text:
            `Performance monitoring started\n\n` +
            `Monitoring interval: ${interval}ms\n` +
            `Real-time tracking CPU, memory, connection status.\n` +
            `Alerts are sent automatically if thresholds are exceeded.`,
        },
      ],
    };
  }

  /**
   * Start batch processing handler
   */
  private async handleStartBatchProcessing(args: any): Promise<CallToolResult> {
    const { queries } = args;

    if (!Array.isArray(queries)) {
      throw new Error('Query array was not provided.');
    }

    if (!this.queryService) {
      throw new Error('Query service is not initialized.');
    }

    const results = await this.queryService.executeBatch(queries);
    const successCount = results.filter(r => r.success).length;

    return {
      content: [
        {
          type: 'text',
          text:
            `Batch processing completed\n\n` +
            `Total queries: ${queries.length}\n` +
            `Success: ${successCount}\n` +
            `Failure: ${queries.length - successCount}\n\n` +
            `Detailed results:\n` +
            results
              .map(
                (result, index) =>
                  `${index + 1}. ${result.success ? 'SUCCESS' : 'FAILED'} ${result.executionTime}ms` +
                  (result.error ? ` - ${result.error}` : '')
              )
              .join('\n'),
        },
      ],
    };
  }

  /**
   * Generate performance report handler
   */
  private async handleGeneratePerformanceReport(args: any): Promise<CallToolResult> {
    const { period = '1h' } = args;

    if (!this.performanceService) {
      throw new Error('Performance service is not initialized.');
    }

    const report = this.performanceService.generatePerformanceReport(period);

    return {
      content: [
        {
          type: 'text',
          text:
            `Performance report (${period})\n\n` +
            `Summary statistics:\n` +
            `  Average CPU usage: ${report.summary.averageCpuUsage.toFixed(1)}%\n` +
            `   Average memory usage: ${report.summary.averageMemoryUsage.toFixed(1)}%\n` +
            `   Average query time: ${report.summary.averageQueryTime.toFixed(1)}ms\n` +
            `   Peak connection count: ${report.summary.peakConnections}\n\n` +
            `Recommendations:\n` +
            report.recommendations.map((rec: string) => `  • ${rec}`).join('\n'),
        },
      ],
    };
  }

  /**
   * Get query stats handler
   */
  private async handleGetQueryStats(args: any): Promise<CallToolResult> {
    if (!this.queryService) {
      throw new Error('Query service is not initialized.');
    }

    const stats = this.queryService.getQueryStats();

    return {
      content: [
        {
          type: 'text',
          text:
            `Query execution statistics\n\n` +
            `Total queries: ${stats.totalQueries}\n` +
            `Successful: ${stats.successfulQueries}\n` +
            `Failed: ${stats.failedQueries}\n` +
            `Average execution time: ${stats.averageExecutionTime}ms\n\n` +
            (stats.slowestQuery
              ? `Slowest query:\n` +
                `   Time: ${stats.slowestQuery.executionTime}ms\n` +
                `   Query: ${stats.slowestQuery.query}\n\n`
              : '') +
            (stats.fastestQuery
              ? `Fastest query:\n` +
                `   Time: ${stats.fastestQuery.executionTime}ms\n` +
                `   Query: ${stats.fastestQuery.query}`
              : ''),
        },
      ],
    };
  }

  /**
   * Get schema statistics handler
   */ private async handleGetSchemaStatistics(args: any): Promise<CallToolResult> {
    if (!this.schemaService) {
      throw new Error('Schema service is not initialized.');
    }

    const stats = await this.schemaService.getSchemaStatistics();

    return {
      content: [
        {
          type: 'text',
          text:
            `Schema statistics\n\n` +
            `Total tables: ${stats.totalTables}\n` +
            `Total views: ${stats.totalViews}\n` +
            `Total procedures: ${stats.totalProcedures}\n` +
            `Total functions: ${stats.totalFunctions}\n` +
            `Total columns: ${stats.totalColumns}\n` +
            `Total indexes: ${stats.totalIndexes}\n` +
            `Average columns per table: ${stats.averageColumnsPerTable}\n\n` +
            (stats.largestTable
              ? `Largest table (by columns):\n` +
                `   Name: ${stats.largestTable.name}\n` +
                `   Column count: ${stats.largestTable.columns?.length || 0}\n` +
                `   Type: ${stats.largestTable.type}`
              : 'Table information not available'),
        },
      ],
    };
  }

  /**
   * Clear caches handler
   */
  private async handleClearCaches(args: any): Promise<CallToolResult> {
    if (!this.schemaService || !this.queryService || !this.performanceService) {
      throw new Error('Services are not initialized.');
    }

    this.schemaService.clearCache();
    this.queryService.clearHistory();
    this.performanceService.clearMetrics();

    return {
      content: [
        {
          type: 'text',
          text:
            `Caches cleared\n\n` +
            `Schema cache cleared\n` +
            `Query history cleared\n` +
            `Performance metrics cleared\n\n` +
            `All caches have been cleared.`,
        },
      ],
    };
  }
}
