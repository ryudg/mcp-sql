import sql from 'mssql';
import { MSSQLConfig } from '../../types/database.types.js';

/**
 * Database Connection Class
 *
 * Manages MSSQL database connections and provides basic query execution functionality
 */
export class DatabaseConnection {
  private pool: sql.ConnectionPool | null = null;
  private config: sql.config;

  constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Connect to database
   */
  async connect(): Promise<void> {
    try {
      this.pool = new sql.ConnectionPool(this.config);
      await this.pool.connect();
      // Connection successful - no console output needed for MCP
    } catch (error) {
      // Use stderr for error output to avoid interfering with JSON-RPC
      process.stderr.write(`Database connection failed: ${error}\n`);
      throw error;
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
        // Disconnection successful - no console output needed for MCP
      }
    } catch (error) {
      process.stderr.write(`Database disconnection failed: ${error}\n`);
      throw error;
    }
  }

  /**
   * Execute SQL query
   */
  async executeQuery(query: string): Promise<sql.IResult<any>> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    try {
      const request = this.pool.request();
      const result = await request.query(query);
      return result;
    } catch (error) {
      process.stderr.write(`Query execution failed: ${error}\n`);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.pool) {
        await this.connect();
      }

      const result = await this.executeQuery('SELECT 1 as test');
      return result.recordset.length > 0;
    } catch (error) {
      process.stderr.write(`Connection test failed: ${error}\n`);
      return false;
    }
  }

  /**
   * Load database configuration from environment variables
   */
  private loadConfiguration(): sql.config {
    return {
      server: process.env.DB_SERVER || 'localhost',
      port: parseInt(process.env.DB_PORT || '1433'),
      database: process.env.DB_DATABASE || '',
      user: process.env.DB_USER || '',
      password: process.env.DB_PASSWORD || '',
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
      },
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
      requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '30000'),
      pool: {
        min: parseInt(process.env.DB_POOL_MIN || '2'),
        max: parseInt(process.env.DB_POOL_MAX || '10'),
        idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
      },
    };
  }

  /**
   * Get current configuration
   */
  getConfiguration(): sql.config {
    return { ...this.config };
  }

  /**
   * Get connection pool status
   */
  getPoolStatus() {
    if (!this.pool) {
      return { connected: false, pool: null };
    }

    return {
      connected: this.pool.connected,
      connecting: this.pool.connecting,
      pool: {
        size: this.pool.size,
        available: this.pool.available,
        pending: this.pool.pending,
        borrowed: this.pool.borrowed,
      },
    };
  }
}
