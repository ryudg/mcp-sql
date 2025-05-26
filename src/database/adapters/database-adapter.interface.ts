import { QueryResult, SqlParameter } from '../../types/common.js';

/**
 * Database connection configuration interface
 */
export interface DatabaseConfig {
  host: string;
  port?: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  connectionTimeout?: number;
  requestTimeout?: number;
  options?: Record<string, any>;
}

/**
 * Database type enumeration
 */
export enum DatabaseType {
  MSSQL = 'mssql',
  POSTGRESQL = 'postgresql',
  MYSQL = 'mysql',
}

/**
 * Schema information interface
 */
export interface SchemaInfo {
  tables: TableInfo[];
  views: ViewInfo[];
  functions?: FunctionInfo[];
  procedures?: ProcedureInfo[];
}

export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
  rowCount?: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  isNullable: boolean;
  defaultValue?: any;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

export interface ViewInfo {
  name: string;
  schema: string;
  definition: string;
  columns: ColumnInfo[];
}

export interface FunctionInfo {
  name: string;
  schema: string;
  returnType: string;
  parameters: ParameterInfo[];
}

export interface ProcedureInfo {
  name: string;
  schema: string;
  parameters: ParameterInfo[];
}

export interface ParameterInfo {
  name: string;
  type: string;
  direction: 'IN' | 'OUT' | 'INOUT';
}

export interface ForeignKeyInfo {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

/**
 * 🔌 Database Adapter Interface
 * Common interface that all database adapters must implement
 */
export interface IDatabaseAdapter {
  /**
   * Return database type
   */
  getType(): DatabaseType;

  /**
   * Check connection status
   */
  isConnected(): boolean;

  /**
   * Connect to database
   */
  connect(): Promise<void>;

  /**
   * Disconnect from database
   */
  disconnect(): Promise<void>;

  /**
   * Execute query
   */
  executeQuery(query: string, parameters?: SqlParameter[]): Promise<QueryResult>;

  /**
   * Begin transaction
   */
  beginTransaction(): Promise<void>;

  /**
   * Commit transaction
   */
  commitTransaction(): Promise<void>;

  /**
   * Rollback transaction
   */
  rollbackTransaction(): Promise<void>;

  /**
   * Get schema information
   */
  getSchema(): Promise<SchemaInfo>;

  /**
   * Get table list
   */
  getTables(): Promise<string[]>;

  /**
   * Get table detailed information
   */
  getTableInfo(tableName: string, schemaName?: string): Promise<TableInfo>;

  /**
   * Handle database-specific SQL dialect
   */
  translateQuery(query: string): string;

  /**
   * Test connection status
   */
  testConnection(): Promise<boolean>;

  /**
   * Get database metadata
   */
  getMetadata(): Promise<Record<string, any>>;
}

/**
 * Abstract Database Adapter Class
 * Implements common features and allows subclasses to implement specialized features
 */
export abstract class BaseDatabaseAdapter implements IDatabaseAdapter {
  protected config: DatabaseConfig;
  protected connected: boolean = false;
  protected inTransaction: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  abstract getType(): DatabaseType;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract executeQuery(query: string, parameters?: SqlParameter[]): Promise<QueryResult>;
  abstract beginTransaction(): Promise<void>;
  abstract commitTransaction(): Promise<void>;
  abstract rollbackTransaction(): Promise<void>;
  abstract getSchema(): Promise<SchemaInfo>;
  abstract getTables(): Promise<string[]>;
  abstract getTableInfo(tableName: string, schemaName?: string): Promise<TableInfo>;
  abstract testConnection(): Promise<boolean>;
  abstract getMetadata(): Promise<Record<string, any>>;

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Basic query translation (override in subclasses)
   */
  translateQuery(query: string): string {
    return query;
  }

  /**
   * Common utility: SQL injection check
   */
  protected validateQuery(query: string): void {
    const dangerousPatterns = [
      /;\s*(drop|delete|truncate|alter|create|insert|update)\s+/i,
      /union\s+select/i,
      /;.*--/,
      /\/\*.*\*\//,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        throw new Error(`Dangerous query pattern detected: ${query.substring(0, 100)}...`);
      }
    }
  }

  /**
   * Common utility: Parameter binding validation
   */
  protected validateParameters(parameters?: SqlParameter[]): void {
    if (!parameters) return;

    for (const param of parameters) {
      if (typeof param === 'string' && param.includes("'")) {
        throw new Error('Parameter contains quotes. Risk of SQL injection.');
      }
    }
  }

  /**
   * Get configuration information
   */
  getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  /**
   * Generate connection string (mask password for security)
   */
  getConnectionString(): string {
    const config = this.getConfig();
    const portPart = config.port !== undefined ? config.port : 'default';
    return `${config.host}:${portPart}/${config.database} (${config.user})`;
  }
}
