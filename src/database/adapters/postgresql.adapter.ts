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

// Mock pg module for testing purposes
interface MockClient {
  query: (text: string, values?: any[]) => Promise<MockQueryResult>;
  connect: () => Promise<void>;
  end: () => Promise<void>;
}

interface MockQueryResult {
  rows: any[];
  rowCount: number;
  command: string;
  fields?: any[];
}

interface MockPool {
  connect: () => Promise<MockClient>;
  end: () => Promise<void>;
  query: (text: string, values?: any[]) => Promise<MockQueryResult>;
}

interface MockPg {
  Pool: new (config: any) => MockPool;
  Client: new (config: any) => MockClient;
}

// This will be mocked in tests
export const defaultPg: MockPg = {
  Pool: class {
    constructor(config: any) {
      throw new Error('PostgreSQL adapter requires pg library to be installed');
    }
    async connect() {
      throw new Error('PostgreSQL adapter requires pg library to be installed');
    }
    async end() {
      throw new Error('PostgreSQL adapter requires pg library to be installed');
    }
    async query() {
      throw new Error('PostgreSQL adapter requires pg library to be installed');
    }
  } as any,
  Client: class {
    constructor(config: any) {
      throw new Error('PostgreSQL adapter requires pg library to be installed');
    }
    async connect() {
      throw new Error('PostgreSQL adapter requires pg library to be installed');
    }
    async end() {
      throw new Error('PostgreSQL adapter requires pg library to be installed');
    }
    async query() {
      throw new Error('PostgreSQL adapter requires pg library to be installed');
    }
  } as any,
};

/**
 * PostgreSQL Database Adapter
 */
export class PostgreSQLAdapter extends BaseDatabaseAdapter {
  private pool: MockPool | null = null;
  private pg: MockPg;

  constructor(config: DatabaseConfig, logger?: Logger, pg?: MockPg) {
    super(config, logger);
    this.pg = pg || defaultPg;
  }

  /**
   * Connect to database
   */
  async connect(): Promise<void> {
    try {
      const config = {
        host: this.config.host,
        port: this.config.port || 5432,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        ssl: this.config.ssl || false,
        connectionTimeoutMillis: this.config.options?.connectionTimeout || 60000,
        idleTimeoutMillis: this.config.options?.requestTimeout || 60000,
        max: 20,
      };

      this.pool = new this.pg.Pool(config);
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(
        `PostgreSQL connection failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
      this.connected = false;
    } catch (error) {
      throw new Error(
        `PostgreSQL disconnection failed: ${error instanceof Error ? error.message : String(error)}`
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
      let result: MockQueryResult;

      if (options?.parameters && options.parameters.length > 0) {
        result = await this.pool.query(query, options.parameters);
      } else {
        result = await this.pool.query(query);
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        recordset: result.rows,
        data: result.rows,
        rowsAffected: result.rowCount || 0,
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
        table_name as name,
        table_schema as tableSchema,
        table_type as type
      FROM information_schema.tables
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        AND table_type IN ('BASE TABLE', 'VIEW')
      ORDER BY table_schema, table_name
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
        table_name as name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        AND table_type IN ('BASE TABLE', 'VIEW')
      ORDER BY table_name
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
    // Parse schema.table format
    const [schema, table] = tableName.includes('.') ? tableName.split('.') : ['public', tableName];

    // Get column information
    const columnsQuery = `
      SELECT 
        column_name as name,
        data_type as type,
        character_maximum_length as max_length,
        numeric_precision as precision,
        numeric_scale as scale,
        is_nullable as is_nullable,
        column_default as default_value,
        ordinal_position as ordinal_position
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `;

    const columnsResult = await this.executeQuery(columnsQuery, {
      parameters: [schema, table],
    });

    // Get primary key information
    const primaryKeysQuery = `
      SELECT 
        kcu.column_name as name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = $1 
        AND tc.table_name = $2
    `;

    const primaryKeysResult = await this.executeQuery(primaryKeysQuery, {
      parameters: [schema, table],
    });

    // Get foreign key information
    const foreignKeysQuery = `
      SELECT 
        kcu.column_name as name,
        ccu.table_name as referenced_table,
        ccu.column_name as referenced_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1 
        AND tc.table_name = $2
    `;

    const foreignKeysResult = await this.executeQuery(foreignKeysQuery, {
      parameters: [schema, table],
    });

    // Get index information
    const indexesQuery = `
      SELECT DISTINCT
        indexname as name
      FROM pg_indexes
      WHERE schemaname = $1 
        AND tablename = $2
        AND indexname NOT LIKE '%_pkey'
    `;

    const indexesResult = await this.executeQuery(indexesQuery, {
      parameters: [schema, table],
    });

    const primaryKeyNames = new Set(primaryKeysResult.recordset?.map(row => row.name) || []);

    const columns: ColumnInfo[] =
      columnsResult.recordset?.map(row => ({
        name: row.name,
        dataType: row.type,
        maxLength: row.max_length,
        precision: row.precision,
        scale: row.scale,
        isNullable: row.is_nullable === 'YES',
        isIdentity: row.default_value?.includes('nextval') || false,
        isPrimaryKey: primaryKeyNames.has(row.name),
        defaultValue: row.default_value,
        ordinalPosition: row.ordinal_position,
      })) || [];

    return {
      name: tableName,
      schema: schema,
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
      functions: [], // PostgreSQL function query (separate implementation needed)
      procedures: [], // PostgreSQL procedure query (separate implementation needed)
    };
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
    return 'postgresql';
  }
}
