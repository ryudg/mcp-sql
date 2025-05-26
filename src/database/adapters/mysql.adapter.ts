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

// Mock mysql2 module for testing purposes
interface MockConnection {
  query: (sql: string, values?: any[]) => Promise<[any, any]>;
  execute: (sql: string, values?: any[]) => Promise<[any, any]>;
  end: () => Promise<void>;
}

interface MockMysql {
  createConnection: (config: any) => Promise<MockConnection>;
}

// This will be mocked in tests
const defaultMysql: MockMysql = {
  createConnection: async () => {
    throw new Error('MySQL adapter requires mysql2 library to be installed');
  },
};

/**
 * MySQL Database Adapter
 */
export class MySQLAdapter extends BaseDatabaseAdapter {
  private connection: MockConnection | null = null;
  private mysql: MockMysql;

  constructor(config: DatabaseConfig, logger?: Logger, mysql?: MockMysql) {
    super(config, logger);
    this.mysql = mysql || defaultMysql;
  }

  /**
   * Connect to database
   */
  async connect(): Promise<void> {
    try {
      const config = {
        host: this.config.host,
        port: this.config.port || 3306,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        ssl: this.config.ssl || false,
        connectTimeout: this.config.options?.connectionTimeout || 60000,
        acquireTimeout: this.config.options?.requestTimeout || 60000,
        timeout: this.config.options?.requestTimeout || 60000,
      };

      this.connection = await this.mysql.createConnection(config);
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(
        `MySQL connection failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    try {
      if (this.connection) {
        await this.connection.end();
        this.connection = null;
      }
      this.connected = false;
    } catch (error) {
      throw new Error(
        `MySQL disconnection failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Execute query
   */
  async executeQuery(query: string, options?: QueryOptions): Promise<QueryResult> {
    if (!this.connection) {
      throw new Error('Not connected to database.');
    }

    const startTime = Date.now();

    try {
      let result: any;

      if (options?.parameters && options.parameters.length > 0) {
        [result] = await this.connection.execute(query, options.parameters);
      } else {
        [result] = await this.connection.query(query);
      }

      const executionTime = Date.now() - startTime;

      // Handle different result types
      let rowsAffected = 0;
      let recordset: any[] | undefined = undefined;

      if (Array.isArray(result)) {
        recordset = result;
        rowsAffected = result.length;
      } else if (result && typeof result === 'object') {
        if ('affectedRows' in result) {
          rowsAffected = result.affectedRows || 0;
        }
        if ('insertId' in result) {
          recordset = [{ insertId: result.insertId }];
        }
      }

      return {
        success: true,
        recordset,
        data: recordset,
        rowsAffected,
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
    const query = `
      SELECT 
        TABLE_NAME as name,
        TABLE_SCHEMA as tableSchema,
        TABLE_TYPE as type
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_TYPE IN ('BASE TABLE', 'VIEW')
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;

    const result = await this.executeQuery(query);

    if (!result.success || !result.recordset) {
      return [];
    }

    return result.recordset.map(row => ({
      name: row.name,
      schema: row.tableSchema,
      type: row.type === 'BASE TABLE' ? ('table' as const) : ('view' as const),
      columns: [],
      primaryKeys: [],
      foreignKeys: [],
      indexes: [],
    }));
  }

  /**
   * Get table name list (returns string array)
   */
  async getTableNames(): Promise<string[]> {
    const query = `
      SELECT 
        TABLE_NAME as name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_TYPE IN ('BASE TABLE', 'VIEW')
      ORDER BY TABLE_NAME
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
    // Get column information
    const columnsQuery = `
      SELECT 
        COLUMN_NAME as name,
        DATA_TYPE as type,
        CHARACTER_MAXIMUM_LENGTH as maxLength,
        NUMERIC_PRECISION as precision,
        NUMERIC_SCALE as scale,
        IS_NULLABLE as isNullable,
        COLUMN_DEFAULT as defaultValue,
        ORDINAL_POSITION as ordinalPosition,
        EXTRA as extra
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;

    const columnsResult = await this.executeQuery(columnsQuery, {
      parameters: [tableName],
    });

    // Get primary key information
    const primaryKeysQuery = `
      SELECT 
        COLUMN_NAME as name
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = 'PRIMARY'
    `;

    const primaryKeysResult = await this.executeQuery(primaryKeysQuery, {
      parameters: [tableName],
    });

    // Get foreign key information
    const foreignKeysQuery = `
      SELECT 
        COLUMN_NAME as name,
        REFERENCED_TABLE_NAME as referencedTable,
        REFERENCED_COLUMN_NAME as referencedColumn
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `;

    const foreignKeysResult = await this.executeQuery(foreignKeysQuery, {
      parameters: [tableName],
    });

    // Get index information
    const indexesQuery = `
      SELECT DISTINCT
        INDEX_NAME as name
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME != 'PRIMARY'
    `;

    const indexesResult = await this.executeQuery(indexesQuery, {
      parameters: [tableName],
    });

    const primaryKeyNames = new Set(primaryKeysResult.recordset?.map(row => row.name) || []);

    const columns: ColumnInfo[] =
      columnsResult.recordset?.map(row => ({
        name: row.name,
        dataType: row.type,
        maxLength: row.maxLength,
        precision: row.precision,
        scale: row.scale,
        isNullable: row.isNullable === 'YES',
        isIdentity: row.extra?.includes('auto_increment') || false,
        isPrimaryKey: primaryKeyNames.has(row.name),
        defaultValue: row.defaultValue,
        ordinalPosition: row.ordinalPosition,
      })) || [];

    return {
      name: tableName,
      schema: this.config.database,
      type: 'table',
      columns,
      primaryKeys: primaryKeysResult.recordset?.map(row => row.name) || [],
      foreignKeys: foreignKeysResult.recordset || [],
      indexes: indexesResult.recordset || [],
    };
  }

  /**
   * Get schema information
   */
  async getSchema(includeDetailedInfo: boolean = true): Promise<SchemaInfo> {
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
          // Keep empty arrays for failed tables
        }
      }
    }

    return {
      name: this.config.database,
      tables,
      views: tables.filter(t => t.type === 'view'),
      functions: [], // MySQL function query (separate implementation needed)
      procedures: [], // MySQL procedure query (separate implementation needed)
    };
  }

  /**
   * Test connection status
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.connection) return false;

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
    return 'mysql';
  }
}
