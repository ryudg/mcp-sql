import type { config } from 'mssql';

/**
 * Supported database types
 */
export type DatabaseType = 'mssql' | 'mysql' | 'postgresql';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  host: string;
  port?: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  options?: {
    encrypt?: boolean;
    trustServerCertificate?: boolean;
    enableArithAbort?: boolean;
    requestTimeout?: number;
    connectionTimeout?: number;
    pool?: {
      min: number;
      max: number;
      idleTimeoutMillis: number;
    };
  };
}

/**
 * MSSQL-specific configuration interface
 */
export interface MSSQLConfig extends config {
  server: string;
  port?: number;
  database: string;
  user: string;
  password: string;
  options?: {
    encrypt?: boolean;
    trustServerCertificate?: boolean;
    enableArithAbort?: boolean;
  };
  connectionTimeout?: number;
  requestTimeout?: number;
  pool?: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
  };
}

/**
 * Query result interface
 */
export interface QueryResult {
  success: boolean;
  data?: any[];
  recordset?: any[];
  rowsAffected: number;
  returnValue?: any;
  output?: Record<string, any>;
  error?: string;
  executionTime: number;
  metadata?: QueryMetadata;
}

/**
 * Query metadata interface
 */
export interface QueryMetadata {
  query: string;
  parameters?: SqlParameter[];
  startTime: Date;
  endTime: Date;
  connectionId?: string;
  userId?: string;
}

/**
 * Table information interface
 */
export interface TableInfo {
  name: string;
  schema: string;
  type: 'table' | 'view' | 'system_table';
  columns: ColumnInfo[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
  checkConstraints?: CheckConstraintInfo[];
  rowCount?: number;
  sizeKB?: number;
  createdDate?: Date;
  modifiedDate?: Date;
}

/**
 * Column information interface
 */
export interface ColumnInfo {
  name: string;
  dataType: string;
  maxLength?: number;
  precision?: number;
  scale?: number;
  isNullable: boolean;
  isIdentity: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
  ordinalPosition: number;
  comment?: string;
}

/**
 * Schema information interface
 */
export interface SchemaInfo {
  name: string;
  owner?: string;
  id?: number;
  tables: TableInfo[];
  views: ViewInfo[];
  functions?: FunctionInfo[];
  procedures: ProcedureInfo[];
  createdDate?: Date;
}

/**
 * View information interface
 */
export interface ViewInfo {
  name: string;
  schema: string;
  definition?: string;
  columns: ColumnInfo[];
  createdDate?: Date;
  modifiedDate?: Date;
}

/**
 * Index information interface
 */
export interface IndexInfo {
  name: string;
  tableName: string;
  schemaName: string;
  type: 'clustered' | 'nonclustered' | 'unique' | 'primary';
  isUnique: boolean;
  isPrimaryKey: boolean;
  columns: IndexColumnInfo[];
  sizeKB?: number;
}

/**
 * Index column information interface
 */
export interface IndexColumnInfo {
  name: string;
  isDescending: boolean;
  isIncluded: boolean;
  ordinalPosition: number;
}

/**
 * Foreign key information interface
 */
export interface ForeignKeyInfo {
  name: string;
  tableName: string;
  schemaName: string;
  columnName: string;
  referencedTableName: string;
  referencedSchemaName: string;
  referencedColumnName: string;
  deleteRule: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'NO ACTION';
  updateRule: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'NO ACTION';
}

/**
 * Stored procedure information interface
 */
export interface ProcedureInfo {
  name: string;
  schema: string;
  definition?: string;
  parameters: ParameterInfo[];
  createdDate: Date;
  modifiedDate: Date;
}

/**
 * Parameter information interface
 */
export interface ParameterInfo {
  name: string;
  dataType: string;
  maxLength?: number;
  precision?: number;
  scale?: number;
  isOutput: boolean;
  defaultValue?: string;
  ordinalPosition: number;
}

/**
 * SQL parameter type
 */
export type SqlParameter = string | number | boolean | Date | null | undefined;

/**
 * Query options interface
 */
export interface QueryOptions {
  timeout?: number;
  maxRows?: number;
  stream?: boolean;
  parameters?: SqlParameter[];
}

/**
 * Connection status enumeration
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

/**
 * Connection information interface
 */
export interface ConnectionInfo {
  id: string;
  type: DatabaseType;
  status: ConnectionStatus;
  config: DatabaseConfig;
  createdAt: Date;
  lastUsedAt?: Date;
  errorMessage?: string;
}

/**
 * Connection pool statistics interface
 */
export interface PoolStats {
  size: number;
  available: number;
  pending: number;
  borrowed: number;
  min: number;
  max: number;
}

/**
 * Database statistics interface
 */
export interface DatabaseStats {
  name: string;
  sizeGB: number;
  tables: number;
  views: number;
  procedures: number;
  users: number;
  connections: number;
  lastBackup?: Date;
}

/**
 * Query statistics interface
 */
export interface QueryStats {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageExecutionTime: number;
  slowestQuery: {
    query: string;
    executionTime: number;
    timestamp: Date;
  };
  fastestQuery: {
    query: string;
    executionTime: number;
    timestamp: Date;
  };
}

/**
 * Function information interface
 */
export interface FunctionInfo {
  name: string;
  schema: string;
  definition?: string;
  returnType: string;
  parameters: ParameterInfo[];
  createdDate?: Date;
  modifiedDate?: Date;
}

/**
 * Check constraint information interface
 */
export interface CheckConstraintInfo {
  name: string;
  definition: string;
}
