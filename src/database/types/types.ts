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
  executionTime?: number;
  metadata?: any;
}

/**
 * Table information interface
 */
export interface TableInfo {
  table_name: string;
  schema_name: string;
  table_type: string;
  created_date?: Date;
  modified_date?: Date;
}

/**
 * Column information interface
 */
export interface ColumnInfo {
  column_name: string;
  data_type: string;
  max_length?: number;
  precision?: number;
  scale?: number;
  is_nullable: boolean;
  is_identity: boolean;
  is_primary_key: boolean;
  default_value?: string;
  column_description?: string;
}

/**
 * Schema information interface
 */
export interface SchemaInfo {
  schema_name: string;
  schema_owner: string;
  created_date?: Date;
}

/**
 * Index information interface
 */
export interface IndexInfo {
  index_name: string;
  table_name: string;
  schema_name: string;
  index_type: string;
  is_unique: boolean;
  is_primary_key: boolean;
  columns: string[];
}

/**
 * Foreign key information interface
 */
export interface ForeignKeyInfo {
  constraint_name: string;
  table_name: string;
  schema_name: string;
  column_name: string;
  referenced_table_name: string;
  referenced_schema_name: string;
  referenced_column_name: string;
  delete_rule: string;
  update_rule: string;
}

/**
 * Stored procedure information interface
 */
export interface ProcedureInfo {
  procedure_name: string;
  schema_name: string;
  created_date: Date;
  modified_date: Date;
  definition?: string;
}

/**
 * Tool execution result interface
 */
export interface ToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
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
}
