import { DatabaseConnectionManager } from '../database/connection/connection.manager.js';
import { Logger } from '../core/logger.js';
import {
  TableInfo,
  SchemaInfo,
  ColumnInfo,
  IndexInfo,
  ForeignKeyInfo,
  ViewInfo,
  QueryResult,
} from '../types/database.types.js';

/**
 * Schema Management Service
 *
 * Provides database schema query and analysis functionality.
 */
export class SchemaService {
  private schemaCache: Map<string, any> = new Map();
  private cacheExpiration: number = 5 * 60 * 1000; // 5 minutes

  constructor(
    private dbManager: DatabaseConnectionManager,
    private logger: Logger
  ) {} /**
   * Get complete schema information
   */
  async getSchema(
    includeSystemTables: boolean = false,
    includeDetailedInfo: boolean = true
  ): Promise<SchemaInfo> {
    const cacheKey = `schema_${includeSystemTables}_${includeDetailedInfo}`;

    // Check cache
    if (this.isCacheValid(cacheKey)) {
      return this.schemaCache.get(cacheKey).data;
    }

    try {
      this.logger.info('Starting schema information query', {
        includeSystemTables,
        includeDetailedInfo,
      });
      const schema = await this.dbManager.getCurrentConnection().getSchema(includeDetailedInfo);

      // Save to cache
      this.updateCache(cacheKey, schema);

      this.logger.info('Schema information query completed', {
        includeSystemTables,
        includeDetailedInfo,
        tableCount: schema.tables?.length || 0,
        viewCount: schema.views?.length || 0,
        totalColumns:
          schema.tables?.reduce(
            (sum: number, table: any) => sum + (table.columns?.length || 0),
            0
          ) || 0,
      });

      return schema;
    } catch (error) {
      this.logger.error('Schema information query failed', {
        includeSystemTables,
        includeDetailedInfo,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
  /**
   * Get table list
   */
  async getTables(pattern?: string): Promise<TableInfo[]> {
    const cacheKey = `tables_${pattern || 'all'}`;

    if (this.isCacheValid(cacheKey)) {
      return this.schemaCache.get(cacheKey).data;
    }
    try {
      this.logger.info('Starting table list query', { pattern });

      const tables = await this.dbManager.getCurrentConnection().getTables();

      // Apply pattern filter if provided
      let resultTables = tables;
      if (pattern) {
        const regex = new RegExp(pattern, 'i');
        resultTables = tables.filter((table: any) => regex.test(table.name));
      }

      this.updateCache(cacheKey, resultTables);

      this.logger.info('Table list query completed', {
        pattern,
        tableCount: resultTables.length,
      });

      return resultTables;
    } catch (error) {
      this.logger.error('Table list query failed', {
        pattern,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
  /**
   * Get specific table information
   */
  async getTableInfo(tableName: string): Promise<TableInfo> {
    const cacheKey = `table_${tableName}`;

    if (this.isCacheValid(cacheKey)) {
      return this.schemaCache.get(cacheKey).data;
    }

    try {
      this.logger.info('Starting table information query', { tableName });

      const tableInfo = await this.dbManager.getCurrentConnection().getTableInfo(tableName);

      this.updateCache(cacheKey, tableInfo);

      this.logger.info('Table information query completed', {
        tableName,
        columnCount: tableInfo.columns?.length || 0,
        primaryKeyCount: tableInfo.primaryKeys?.length || 0,
      });

      return tableInfo;
    } catch (error) {
      this.logger.error('Table information query failed', {
        tableName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  } /**
   * Get schema statistics
   */
  async getSchemaStatistics(): Promise<any> {
    try {
      this.logger.info('Starting schema statistics calculation');
      const schema = await this.getSchema();

      // If we need full column information for statistics
      let tableWithColumns = null;

      // Get detailed information for a sample table for statistics
      if (schema.tables && schema.tables.length > 0) {
        try {
          // Just get details for one table to speed things up
          tableWithColumns = await this.getTableInfo(schema.tables[0].name);
        } catch (error) {
          this.logger.error('Error getting table details', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      const stats = {
        totalTables: schema.tables?.length || 0,
        totalViews: schema.views?.length || 0,
        totalProcedures: schema.procedures?.length || 0,
        totalFunctions: schema.functions?.length || 0,
        totalColumns: 0,
        totalIndexes: 0,
        averageColumnsPerTable: 0,
        largestTable: tableWithColumns || schema.tables[0] || null,
      };

      if (tableWithColumns) {
        // If we have detailed info for one table, use it for statistics
        stats.totalColumns = tableWithColumns.columns?.length || 0;
        stats.totalIndexes = tableWithColumns.indexes?.length || 0;
        stats.averageColumnsPerTable = tableWithColumns.columns?.length || 0;
      }

      this.logger.info('Schema statistics calculation completed', stats);
      return stats;
    } catch (error) {
      this.logger.error('Schema statistics calculation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
  /**
   * Clear schema cache
   */
  clearCache(): void {
    const cacheSize = this.schemaCache.size;
    const cacheKeys = Array.from(this.schemaCache.keys());

    this.schemaCache.clear();

    this.logger.info('Schema cache cleared', {
      previousCacheSize: cacheSize,
      clearedKeys: cacheKeys,
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    return {
      cacheSize: this.schemaCache.size,
      cacheKeys: Array.from(this.schemaCache.keys()),
      cacheExpiration: this.cacheExpiration,
    };
  }

  // Private methods

  private isCacheValid(key: string): boolean {
    const cached = this.schemaCache.get(key);
    if (!cached) return false;

    const isExpired = Date.now() - cached.timestamp > this.cacheExpiration;
    if (isExpired) {
      this.schemaCache.delete(key);
      return false;
    }

    return true;
  }

  private updateCache(key: string, data: any): void {
    this.schemaCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private compareTableColumns(
    sourceTable: TableInfo,
    targetTable: TableInfo
  ): Array<{
    type: 'column_added' | 'column_removed' | 'column_modified';
    details: any;
  }> {
    const differences: Array<{
      type: 'column_added' | 'column_removed' | 'column_modified';
      details: any;
    }> = [];

    const sourceColumnNames = new Set(sourceTable.columns.map(c => c.name));
    const targetColumnNames = new Set(targetTable.columns.map(c => c.name));

    // Added columns
    for (const column of targetTable.columns) {
      if (!sourceColumnNames.has(column.name)) {
        differences.push({
          type: 'column_added',
          details: {
            tableName: targetTable.name,
            columnName: column.name,
            dataType: column.dataType,
          },
        });
      }
    }

    // Removed columns
    for (const column of sourceTable.columns) {
      if (!targetColumnNames.has(column.name)) {
        differences.push({
          type: 'column_removed',
          details: {
            tableName: sourceTable.name,
            columnName: column.name,
            dataType: column.dataType,
          },
        });
      }
    }

    // Modified columns
    for (const sourceColumn of sourceTable.columns) {
      const targetColumn = targetTable.columns.find(c => c.name === sourceColumn.name);
      if (targetColumn) {
        if (
          sourceColumn.dataType !== targetColumn.dataType ||
          sourceColumn.isNullable !== targetColumn.isNullable
        ) {
          differences.push({
            type: 'column_modified',
            details: {
              tableName: sourceTable.name,
              columnName: sourceColumn.name,
              changes: {
                dataType: {
                  from: sourceColumn.dataType,
                  to: targetColumn.dataType,
                },
                isNullable: {
                  from: sourceColumn.isNullable,
                  to: targetColumn.isNullable,
                },
              },
            },
          });
        }
      }
    }

    return differences;
  }
}
