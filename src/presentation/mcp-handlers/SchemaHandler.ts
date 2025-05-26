import { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { GetSchemaUseCase } from '../../application/use-cases/GetSchemaUseCase.js';
import { GetSchemaStatisticsUseCase } from '../../application/use-cases/GetSchemaStatisticsUseCase.js';
import { SchemaDomainService } from '../../domain/schema/services/SchemaDomainService.js';
import { Logger } from '../../core/logger.js';

export class SchemaHandler {
  constructor(
    private readonly getSchemaUseCase: GetSchemaUseCase,
    private readonly getSchemaStatisticsUseCase: GetSchemaStatisticsUseCase,
    private readonly schemaDomainService: SchemaDomainService,
    private readonly logger: Logger
  ) {}

  async handleGetSchema(request: CallToolRequest): Promise<CallToolResult> {
    const { include_system_tables = false } = request.params.arguments as any;

    this.logger.info('Getting schema via DDD use case', {
      includeSystemTables: include_system_tables,
    });

    // get database name from environment variable
    const databaseName = process.env.DB_DATABASE;
    if (!databaseName) {
      throw new Error('DB_DATABASE environment variable is required');
    }

    const response = await this.getSchemaUseCase.execute({
      databaseName,
      refresh: true,
    });

    if (response.success && response.schema) {
      return {
        content: [
          {
            type: 'text',
            text:
              `Database schema information\n\n` +
              `Schema name: ${response.schema.databaseName}\n` +
              `Number of tables: ${response.schema.tableCount}\n` +
              `Last updated: ${response.schema.lastUpdated}\n\n` +
              `Tables:\n${JSON.stringify(response.schema.tables, null, 2)}`,
          },
        ],
      };
    } else {
      throw new Error(response.error || 'Failed to get schema');
    }
  }

  async handleListTables(request: CallToolRequest): Promise<CallToolResult> {
    const { pattern } = request.params.arguments as any;

    this.logger.info('Listing tables via DDD use case', { pattern });

    const databaseName = process.env.DB_DATABASE;
    if (!databaseName) {
      throw new Error('DB_DATABASE environment variable is required');
    }

    const response = await this.getSchemaUseCase.execute({
      databaseName,
      refresh: true,
    });

    if (response.success && response.schema) {
      let tables = response.schema.tables;

      // Apply pattern filter if provided
      if (pattern) {
        const regex = new RegExp(pattern, 'i');
        tables = tables.filter(table => regex.test(table.name) || regex.test(table.schema));
      }

      return {
        content: [
          {
            type: 'text',
            text:
              `Database tables\n\n` +
              `Total tables: ${tables.length}\n` +
              `Pattern filter: ${pattern || 'none'}\n\n` +
              `Tables:\n${JSON.stringify(tables, null, 2)}`,
          },
        ],
      };
    } else {
      throw new Error(response.error || 'Failed to list tables');
    }
  }

  async handleDescribeTable(request: CallToolRequest): Promise<CallToolResult> {
    const { table_name } = request.params.arguments as any;

    if (!table_name) {
      throw new Error('Table name is required');
    }

    this.logger.info('Describing table via DDD use case', { tableName: table_name });

    const databaseName = process.env.DB_DATABASE;
    if (!databaseName) {
      throw new Error('DB_DATABASE environment variable is required');
    }

    // Get detailed table information using getTableInfo
    const response = await this.getSchemaUseCase.execute({
      databaseName,
      refresh: true,
    });

    if (response.success && response.schema) {
      const table = response.schema.tables.find(t => t.name === table_name);

      if (!table) {
        throw new Error(`Table '${table_name}' not found`);
      }

      // Get detailed table information including columns using domain service
      const detailedTableInfo = await this.schemaDomainService.getTableInfo(table_name);

      return {
        content: [
          {
            type: 'text',
            text:
              `Table description: ${table_name}\n\n` +
              `Schema: ${detailedTableInfo.schema}\n` +
              `Type: ${detailedTableInfo.type}\n` +
              `Row count: ${detailedTableInfo.rowCount || 'Unknown'}\n` +
              `Number of columns: ${detailedTableInfo.columns?.length || 0}\n` +
              `Primary keys: ${detailedTableInfo.primaryKeys?.length || 0}\n` +
              `Foreign keys: ${detailedTableInfo.foreignKeys?.length || 0}\n` +
              `Indexes: ${detailedTableInfo.indexes?.length || 0}\n\n` +
              (detailedTableInfo.columns && detailedTableInfo.columns.length > 0
                ? `Column information:\n` +
                  detailedTableInfo.columns
                    .map(
                      (col: any, index: number) =>
                        `${index + 1}. ${col.name}: ${col.dataType || col.type}${
                          col.maxLength ? `(${col.maxLength})` : ''
                        }${col.isNullable ? ' (nullable)' : ' (not null)'}${
                          col.isPrimaryKey ? ' [PK]' : ''
                        }${col.defaultValue ? ` default: ${col.defaultValue}` : ''}`
                    )
                    .join('\n')
                : 'No column information available'),
          },
        ],
      };
    } else {
      throw new Error(response.error || 'Failed to describe table');
    }
  }

  async handleGetSchemaStatistics(request: CallToolRequest): Promise<CallToolResult> {
    const { include_system_tables = false } = request.params.arguments as any;

    this.logger.info('Getting schema statistics via DDD use case', {
      include_system_tables,
    });

    try {
      const response = await this.getSchemaStatisticsUseCase.execute({
        includeSystemTables: include_system_tables,
      });

      if (response.success && response.statistics) {
        const stats = response.statistics;

        return {
          content: [
            {
              type: 'text',
              text:
                `Schema Statistics\n\n` +
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
                    `   Type: ${stats.largestTable.type}\n`
                  : 'Table information not available'),
            },
          ],
        };
      } else {
        throw new Error(response.error || 'Failed to get schema statistics');
      }
    } catch (error) {
      throw new Error(
        `Failed to get schema statistics: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
