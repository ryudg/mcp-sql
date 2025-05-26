import { DatabaseSchema, TableInfo, ColumnInfo } from '../../domain/schema/entities/Schema.js';
import { DatabaseConnectionManager } from '../../database/connection/connection.manager.js';
import { Logger } from '../../core/logger.js';
import { SchemaRepository } from '../../domain/schema/services/SchemaDomainService.js';
import { SchemaStatistics } from '../../application/use-cases/GetSchemaStatisticsUseCase.js';

export class SchemaRepositoryImpl implements SchemaRepository {
  private schemaCache: Map<string, DatabaseSchema> = new Map();

  constructor(
    private readonly dbManager: DatabaseConnectionManager,
    private readonly logger: Logger
  ) {}

  async getSchema(databaseName: string): Promise<DatabaseSchema> {
    try {
      // Get current database name if not provided
      if (!databaseName || databaseName === 'default') {
        const connection = this.dbManager.getCurrentConnection();
        const dbResult = await connection.executeQuery('SELECT DB_NAME() as dbName');
        databaseName = dbResult.recordset?.[0]?.dbName || 'WMS';
      }

      // Check cache first
      const cacheKey = databaseName;
      const cachedSchema = this.schemaCache.get(cacheKey);
      if (cachedSchema) {
        this.logger.info('Returning cached schema', { databaseName });
        return cachedSchema;
      }

      // If not in cache, refresh and return
      return await this.refreshSchema(databaseName);
    } catch (error) {
      this.logger.error('Failed to get schema', { error });
      throw error;
    }
  }

  async getTables(pattern?: string): Promise<any[]> {
    try {
      const connection = this.dbManager.getCurrentConnection();

      let query = `
        SELECT 
          TABLE_NAME as name,
          TABLE_SCHEMA as tableSchema,
          TABLE_TYPE as type
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
      `;

      if (pattern) {
        query += ` AND TABLE_NAME LIKE '%${pattern}%'`;
      }

      const result = await connection.executeQuery(query);
      return result.recordset || [];
    } catch (error) {
      this.logger.error('Failed to get tables', { error });
      throw error;
    }
  }

  async getTableInfo(tableName: string): Promise<any> {
    try {
      this.logger.info('Getting table info', { tableName });
      const adapter = this.dbManager.getCurrentConnection();
      const tableInfo = await adapter.getTableInfo(tableName);

      this.logger.info('Retrieved table info', {
        tableName,
        columnCount: tableInfo.columns?.length || 0,
        primaryKeyCount: tableInfo.primaryKeys?.length || 0,
      });

      return tableInfo;
    } catch (error) {
      this.logger.error('Failed to get table info', { tableName, error });
      throw error;
    }
  }

  async getSchemaStatistics(includeSystemTables: boolean = false): Promise<SchemaStatistics> {
    try {
      const connection = this.dbManager.getCurrentConnection();

      // Get table count
      let tableQuery = `
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
      `;
      if (!includeSystemTables) {
        tableQuery += ` AND TABLE_SCHEMA != 'sys'`;
      }
      const tableResult = await connection.executeQuery(tableQuery);
      const totalTables = tableResult.recordset?.[0]?.count || 0;

      // Get view count
      const viewResult = await connection.executeQuery(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.VIEWS
      `);
      const totalViews = viewResult.recordset?.[0]?.count || 0;

      // Get procedure count
      const procResult = await connection.executeQuery(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.ROUTINES 
        WHERE ROUTINE_TYPE = 'PROCEDURE'
      `);
      const totalProcedures = procResult.recordset?.[0]?.count || 0;

      // Get function count
      const funcResult = await connection.executeQuery(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.ROUTINES 
        WHERE ROUTINE_TYPE = 'FUNCTION'
      `);
      const totalFunctions = funcResult.recordset?.[0]?.count || 0;

      // Get column count
      const columnResult = await connection.executeQuery(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.COLUMNS
      `);
      const totalColumns = columnResult.recordset?.[0]?.count || 0;

      // Get index count (approximate)
      const indexResult = await connection.executeQuery(`
        SELECT COUNT(*) as count 
        FROM sys.indexes 
        WHERE type > 0
      `);
      const totalIndexes = indexResult.recordset?.[0]?.count || 0;

      // Calculate average columns per table
      const averageColumnsPerTable = totalTables > 0 ? totalColumns / totalTables : 0;

      // Get largest table by column count
      const largestTableResult = await connection.executeQuery(`
        SELECT TOP 1 
          t.TABLE_NAME as name,
          t.TABLE_TYPE as type,
          COUNT(c.COLUMN_NAME) as columnCount
        FROM INFORMATION_SCHEMA.TABLES t
        LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
        WHERE t.TABLE_TYPE = 'BASE TABLE'
        GROUP BY t.TABLE_NAME, t.TABLE_TYPE
        ORDER BY COUNT(c.COLUMN_NAME) DESC
      `);

      const largestTable = largestTableResult.recordset?.[0]
        ? {
            name: largestTableResult.recordset[0].name,
            type: largestTableResult.recordset[0].type,
            columns: [], // 실제 컬럼 정보는 별도 조회 필요
          }
        : undefined;

      return {
        totalTables,
        totalViews,
        totalProcedures,
        totalFunctions,
        totalColumns,
        totalIndexes,
        averageColumnsPerTable: Math.round(averageColumnsPerTable * 100) / 100,
        largestTable,
      };
    } catch (error) {
      this.logger.error('Failed to get schema statistics', { error });
      throw error;
    }
  }

  async refreshSchema(databaseName: string): Promise<DatabaseSchema> {
    this.logger.info('Refreshing schema from database', { databaseName });

    try {
      const adapter = this.dbManager.getCurrentConnection();
      const tables = await adapter.getTables();
      const schema = new DatabaseSchema(databaseName);

      // Add tables to schema
      if (tables && tables.length > 0) {
        this.logger.info('Processing tables', { tableCount: tables.length });
        for (const table of tables) {
          try {
            const tableInfo: TableInfo = {
              name: table.name,
              schema: table.schema,
              type: table.type === 'system_table' ? 'table' : table.type,
            };
            schema.addTable(tableInfo);

            // Get columns using adapter's getTableInfo method
            try {
              const detailedTableInfo = await adapter.getTableInfo(table.name);
              if (detailedTableInfo.columns) {
                const columns: ColumnInfo[] = detailedTableInfo.columns.map((col: any) => ({
                  name: col.name,
                  type: col.dataType || col.type,
                  nullable: col.isNullable,
                  defaultValue: col.defaultValue,
                  isPrimaryKey: col.isPrimaryKey || false,
                  isForeignKey: col.isForeignKey || false,
                }));
                schema.addColumns(table.name, columns);
              }
            } catch (columnError) {
              this.logger.warn('Failed to get columns for table', {
                tableName: table.name,
                error: columnError,
              });
            }
          } catch (tableError) {
            this.logger.error('Failed to process table', { table, error: tableError });
          }
        }
      } else {
        this.logger.warn('No tables found from adapter', {
          tableCount: tables.length,
        });
      }

      // Cache the schema
      this.schemaCache.set(databaseName, schema);

      this.logger.info('Schema refreshed successfully', {
        databaseName,
        tableCount: schema.getTableCount(),
      });

      return schema;
    } catch (error) {
      this.logger.error('Failed to refresh schema', {
        databaseName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  clearCache(): void {
    this.schemaCache.clear();
    this.logger.info('Schema cache cleared');
  }
}
