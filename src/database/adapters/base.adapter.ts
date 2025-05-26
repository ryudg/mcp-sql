import {
  DatabaseConfig,
  QueryResult,
  TableInfo,
  QueryOptions,
  DatabaseType,
} from '../../types/database.types.js';
import { Logger } from '../../core/logger.js';

/**
 * Database Adapter Abstract Base Class
 *
 * Common interface that all database adapters must implement
 */
export abstract class BaseDatabaseAdapter {
  protected config: DatabaseConfig;
  protected connected: boolean = false;
  protected logger?: Logger;

  constructor(config: DatabaseConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Connect to database
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from database
   */
  abstract disconnect(): Promise<void>;

  /**
   * Execute query
   */
  abstract executeQuery(query: string, options?: QueryOptions): Promise<QueryResult>;

  /**
   * Get table list
   */
  abstract getTables(): Promise<TableInfo[]>;

  /**
   * Get specific table information
   */
  abstract getTableInfo(tableName: string): Promise<TableInfo>;

  /**
   * Get schema information
   */
  abstract getSchema(includeDetailedInfo?: boolean): Promise<any>;

  /**
   * Test connection status
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Return database type
   */
  abstract getType(): DatabaseType;

  /**
   * Check current connection status
   */
  isConnected(): boolean {
    return this.connected;
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
