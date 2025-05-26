import type { config } from "mssql";

/**
 * Database configuration interface
 */
export interface DatabaseConfig extends config {
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
  metadata?: any;
}

/**
 * Table information interface
 */
export interface TableInfo {
  name: string;
  schema: string;
  type: "table" | "view" | "system_table";
  columns: ColumnInfo[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
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
  description?: string;
  ordinalPosition: number;
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
  type: string;
  isUnique: boolean;
  isPrimaryKey: boolean;
  columns: string[];
  sizeKB?: number;
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
  deleteRule: string;
  updateRule: string;
}

/**
 * Stored procedure information interface
 */
export interface ProcedureInfo {
  name: string;
  schema: string;
  definition?: string;
  parameters?: ParameterInfo[];
  createdDate: Date;
  modifiedDate: Date;
}

/**
 * Function information interface
 */
export interface FunctionInfo {
  name: string;
  schema: string;
  definition?: string;
  returnType: string;
  parameters?: ParameterInfo[];
  createdDate?: Date;
  modifiedDate?: Date;
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
export type SqlParameter = string | number | boolean | Date | null;

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
 * Table statistics interface
 */
export interface TableStats {
  rowCount: number;
  totalSpaceKB: number;
  usedSpaceKB: number;
  unusedSpaceKB: number;
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
 * Query result format type
 */
export type QueryResultFormat = "table" | "json" | "csv" | "markdown";

/**
 * Formatted query result interface
 */
export interface FormattedQueryResult {
  originalResult: QueryResult;
  formattedData: string;
  format: QueryResultFormat;
  metadata: {
    rowCount: number;
    columnCount: number;
    executionTime?: number;
    formattedAt: string;
  };
}

/**
 * Query execution options (including formatting)
 */
export interface QueryExecutionOptions extends QueryOptions {
  format?: QueryResultFormat;
  includeMetadata?: boolean;
  truncateText?: number; // Text length limit
  dateFormat?: string; // Date format
}
