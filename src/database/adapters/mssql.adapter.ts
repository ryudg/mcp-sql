import sql from 'mssql';
import { BaseDatabaseAdapter } from './base.adapter.js';
import {
  DatabaseConfig,
  QueryResult,
  TableInfo,
  QueryOptions,
  DatabaseType,
  SchemaInfo,
  ColumnInfo,
} from '../../types/database.types.js';
import { Logger } from '../../core/logger.js';

/**
 * Microsoft SQL Server Adapter
 */
export class MSSQLAdapter extends BaseDatabaseAdapter {
  private pool: sql.ConnectionPool | null = null;

  constructor(config: DatabaseConfig, logger?: Logger) {
    super(config, logger);
  }

  /**
   * Connect to database
   */ async connect(): Promise<void> {
    try {
      const dbConfig = {
        server: this.config.host,
        port: this.config.port || 1433,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        options: {
          encrypt: this.config.ssl || false,
          trustServerCertificate: this.config.options?.trustServerCertificate ?? true,
          enableArithAbort: this.config.options?.enableArithAbort ?? true,
        },
        requestTimeout: this.config.options?.requestTimeout || 30000,
        connectionTimeout: this.config.options?.connectionTimeout || 15000,
        pool: {
          max: this.config.options?.pool?.max || 10,
          min: this.config.options?.pool?.min || 0,
          idleTimeoutMillis: this.config.options?.pool?.idleTimeoutMillis || 30000,
        },
      };

      this.pool = new sql.ConnectionPool(dbConfig);
      await this.pool.connect();
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(
        `MSSQL connection failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.close();
        this.pool = null;
      }
      this.connected = false;
    } catch (error) {
      throw new Error(
        `MSSQL disconnection failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Execute query
   */
  async executeQuery(query: string, options?: QueryOptions): Promise<QueryResult> {
    if (!this.pool) {
      throw new Error('Not connected to database.');
    }

    const startTime = Date.now();

    try {
      const request = this.pool.request();

      // Set timeout
      if (options?.timeout) {
        (request as any).timeout = options.timeout;
      }

      // Set parameters
      if (options?.parameters) {
        options.parameters.forEach((param, index) => {
          request.input(`param${index}`, param);
        });
      }

      const result = await request.query(query);
      const executionTime = Date.now() - startTime;

      // Convert rowsAffected to number (first element of array or sum)
      const rowsAffected = Array.isArray(result.rowsAffected)
        ? result.rowsAffected.reduce((sum, val) => sum + val, 0)
        : result.rowsAffected || 0;

      return {
        success: true,
        recordset: result.recordset,
        data: result.recordset,
        rowsAffected,
        returnValue: (result as any).returnValue,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        rowsAffected: 0,
        executionTime,
      };
    }
  }
  /**
   * Get table list (returns TableInfo array)
   */
  async getTables(): Promise<TableInfo[]> {
    const query = `      SELECT 
        t.TABLE_NAME as name,
        t.TABLE_SCHEMA as tableSchema,
        t.TABLE_TYPE as type
      FROM INFORMATION_SCHEMA.TABLES t
      WHERE t.TABLE_TYPE IN ('BASE TABLE', 'VIEW')
      ORDER BY t.TABLE_SCHEMA, t.TABLE_NAME
      `;

    const result = await this.executeQuery(query);

    if (!result.success || !result.recordset) {
      return [];
    }

    const tables = result.recordset.map(row => ({
      name: row.name,
      schema: row.tableSchema,
      type: row.type === 'BASE TABLE' ? ('table' as const) : ('view' as const),
      columns: [],
      primaryKeys: [],
      foreignKeys: [],
      indexes: [],
    }));

    return tables;
  }

  /**
   * Get table name list (returns string array)
   */
  async getTableNames(): Promise<string[]> {
    const query = `
      SELECT 
        t.TABLE_NAME as name
      FROM INFORMATION_SCHEMA.TABLES t
      WHERE t.TABLE_TYPE IN ('BASE TABLE', 'VIEW')
      ORDER BY t.TABLE_SCHEMA, t.TABLE_NAME
    `;

    const result = await this.executeQuery(query);

    if (!result.success || !result.recordset) {
      return [];
    }

    return result.recordset.map(row => row.name);
  }

  /**
   * Get table detailed information list (maintained for implementation compatibility)
   */
  async getTableInfos(): Promise<TableInfo[]> {
    return this.getTables();
  }

  /**
   * Get specific table information
   */
  async getTableInfo(tableName: string): Promise<TableInfo> {
    try {
      // Get column information with IDENTITY and comments
      const columnsQuery = `
        SELECT 
          c.COLUMN_NAME as name,
          c.DATA_TYPE as type,
          c.CHARACTER_MAXIMUM_LENGTH as maxLength,
          c.NUMERIC_PRECISION as precision,
          c.NUMERIC_SCALE as scale,
          c.IS_NULLABLE as isNullable,
          c.COLUMN_DEFAULT as defaultValue,
          c.ORDINAL_POSITION as ordinalPosition,
          COLUMNPROPERTY(OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') as isIdentity,
          ep.value as columnComment
        FROM INFORMATION_SCHEMA.COLUMNS c
        LEFT JOIN sys.extended_properties ep ON 
          ep.major_id = OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME) AND 
          ep.minor_id = c.ORDINAL_POSITION AND 
          ep.name = 'MS_Description'
        WHERE c.TABLE_NAME = '${tableName}'
        ORDER BY c.ORDINAL_POSITION
      `;

      const columnsResult = await this.executeQuery(columnsQuery);

      // Get primary key information
      const primaryKeysQuery = `
        SELECT 
          COLUMN_NAME as name
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_NAME = '${tableName}' 
          AND CONSTRAINT_NAME LIKE 'PK_%'
      `;

      const primaryKeysResult = await this.executeQuery(primaryKeysQuery);

      // Get foreign key information
      const foreignKeysQuery = `
        SELECT 
          COLUMN_NAME as name,
          CONSTRAINT_NAME as constraintName
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_NAME = '${tableName}' 
          AND CONSTRAINT_NAME LIKE 'FK_%'
      `;

      const foreignKeysResult = await this.executeQuery(foreignKeysQuery);

      // Get check constraints
      const checkConstraintsQuery = `
        SELECT 
          cc.CONSTRAINT_NAME as name,
          cc.CHECK_CLAUSE as definition
        FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
        INNER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu ON cc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
        WHERE ccu.TABLE_NAME = '${tableName}'
      `;

      const checkConstraintsResult = await this.executeQuery(checkConstraintsQuery);

      // Get index information
      const indexesQuery = `
        SELECT 
          i.name as indexName,
          i.type_desc as indexType,
          i.is_unique as isUnique
        FROM sys.indexes i
        INNER JOIN sys.tables t ON i.object_id = t.object_id
        WHERE t.name = '${tableName}'
          AND i.type > 0
      `;

      const indexesResult = await this.executeQuery(indexesQuery);

      // Get table statistics
      const tableStatsQuery = `
        SELECT 
          p.rows as rowCount,
          (SUM(a.total_pages) * 8) as sizeKB
        FROM sys.tables t
        INNER JOIN sys.partitions p ON t.object_id = p.object_id
        INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
        WHERE t.name = '${tableName}' AND p.index_id IN (0,1)
        GROUP BY p.rows
      `;

      const tableStatsResult = await this.executeQuery(tableStatsQuery);

      const primaryKeyNames = new Set(primaryKeysResult.recordset?.map(row => row.name) || []);

      const columns: ColumnInfo[] =
        columnsResult.recordset?.map(row => ({
          name: row.name,
          dataType: row.type,
          maxLength: row.maxLength,
          precision: row.precision,
          scale: row.scale,
          isNullable: row.isNullable === 'YES',
          isIdentity: Boolean(row.isIdentity),
          isPrimaryKey: primaryKeyNames.has(row.name),
          defaultValue: row.defaultValue,
          ordinalPosition: row.ordinalPosition,
          comment: row.columnComment,
        })) || [];

      const result: TableInfo = {
        name: tableName,
        schema: 'dbo', // Default value
        type: 'table' as const,
        columns,
        primaryKeys: primaryKeysResult.recordset?.map(row => row.name) || [],
        foreignKeys: foreignKeysResult.recordset || [],
        indexes: indexesResult.recordset || [],
        checkConstraints: checkConstraintsResult.recordset || [],
        rowCount: tableStatsResult.recordset?.[0]?.rowCount || 0,
        sizeKB: tableStatsResult.recordset?.[0]?.sizeKB || 0,
      };

      return result;
    } catch (error) {
      this.logger?.error('Error getting table info', {
        tableName,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return basic table info on error
      return {
        name: tableName,
        schema: 'dbo',
        type: 'table',
        columns: [],
        primaryKeys: [],
        foreignKeys: [],
        indexes: [],
      };
    }
  }
  /**
   * Get schema information
   */
  async getSchema(includeDetailedInfo: boolean = true): Promise<SchemaInfo> {
    try {
      const tables = await this.getTables();

      // If detailed info is requested, populate each table's detailed information
      if (includeDetailedInfo && tables.length > 0) {
        for (let i = 0; i < tables.length; i++) {
          try {
            const tableInfo = await this.getTableInfo(tables[i].name);
            tables[i].columns = tableInfo.columns;
            tables[i].primaryKeys = tableInfo.primaryKeys;
            tables[i].foreignKeys = tableInfo.foreignKeys;
            tables[i].indexes = tableInfo.indexes;
          } catch (error) {
            this.logger?.error(`Error fetching details for table ${tables[i].name}`, {
              error: error instanceof Error ? error.message : String(error),
            });
            // Keep empty arrays for failed tables
          }
        }
      }

      const schema = {
        name: this.config.database,
        tables,
        views: tables.filter(t => t.type === 'view'),
        functions: [], // SQL Server function query (separate implementation needed)
        procedures: [], // SQL Server procedure query (separate implementation needed)
      };

      return schema;
    } catch (error) {
      this.logger?.error('Error getting schema', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        name: this.config.database,
        tables: [],
        views: [],
        functions: [],
        procedures: [],
      };
    }
  }

  /**
   * Test connection status
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.pool) return false;

      const result = await this.executeQuery('SELECT 1 as test');
      return result.success && result.recordset?.[0]?.test === 1;
    } catch {
      return false;
    }
  }

  /**
   * Return database type
   */
  getType(): DatabaseType {
    return 'mssql';
  }
}
