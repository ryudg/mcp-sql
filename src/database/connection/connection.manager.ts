import { ConfigManager } from "../../core/config.js";
import { Logger } from "../../core/logger.js";
import { DatabaseConfig, DatabaseType } from "../../types/database.types.js";
import { MSSQLAdapter } from "../adapters/mssql.adapter.js";
import { MySQLAdapter } from "../adapters/mysql.adapter.js";
import { PostgreSQLAdapter } from "../adapters/postgresql.adapter.js";
import { BaseDatabaseAdapter } from "../adapters/base.adapter.js";

/**
 * Database Connection Manager
 *
 * Manages multiple database connections and provides appropriate adapters.
 */
export class DatabaseConnectionManager {
  private connections: Map<string, BaseDatabaseAdapter> = new Map();
  private currentConnection: string | null = null;

  constructor(private config: ConfigManager, private logger: Logger) {}

  /**
   * Create database connection
   */
  async createConnection(
    connectionId: string,
    dbConfig: DatabaseConfig,
    dbType: DatabaseType = "mssql"
  ): Promise<BaseDatabaseAdapter> {
    try {
      let adapter: BaseDatabaseAdapter;

      // Create appropriate adapter based on database type
      switch (dbType) {
        case "mssql":
          adapter = new MSSQLAdapter(dbConfig, this.logger);
          break;
        case "mysql":
          adapter = new MySQLAdapter(dbConfig, this.logger);
          break;
        case "postgresql":
          adapter = new PostgreSQLAdapter(dbConfig, this.logger);
          break;
        default:
          throw new Error(`Unsupported database type: ${dbType}`);
      }

      // Attempt connection
      await adapter.connect();

      // Save connection
      this.connections.set(connectionId, adapter);

      // Set as default connection if it's the first one
      if (!this.currentConnection) {
        this.currentConnection = connectionId;
      }

      this.logger.logConnection(`Connection created (${dbType})`, true, {
        connectionId,
        host: dbConfig.host,
        database: dbConfig.database,
      });

      return adapter;
    } catch (error) {
      this.logger.logConnection(`Connection creation (${dbType})`, false, {
        connectionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create default database connection
   */
  async createDefaultConnection(): Promise<BaseDatabaseAdapter> {
    const dbConfig = this.config.getDatabaseConfig();
    return this.createConnection("default", dbConfig, "mssql");
  }

  /**
   * Get current active connection
   */
  getCurrentConnection(): BaseDatabaseAdapter {
    if (!this.currentConnection) {
      throw new Error("No active database connection.");
    }

    const connection = this.connections.get(this.currentConnection);
    if (!connection) {
      throw new Error("Current connection not found.");
    }

    return connection;
  }

  /**
   * Get specific connection
   */
  getConnection(connectionId: string): BaseDatabaseAdapter {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    return connection;
  }

  /**
   * Switch active connection
   */
  switchConnection(connectionId: string): void {
    if (!this.connections.has(connectionId)) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    const previousConnection = this.currentConnection;
    this.currentConnection = connectionId;

    this.logger.info("Database connection switched", {
      from: previousConnection,
      to: connectionId,
    });
  }

  /**
   * Remove connection
   */
  async removeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    try {
      await connection.disconnect();
      this.connections.delete(connectionId);

      // Switch to another connection if current connection is removed
      if (this.currentConnection === connectionId) {
        const remainingConnections = Array.from(this.connections.keys());
        this.currentConnection =
          remainingConnections.length > 0 ? remainingConnections[0] : null;
      }

      this.logger.logConnection("Connection removed", true, { connectionId });
    } catch (error) {
      this.logger.logConnection("Connection removal", false, {
        connectionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Disconnect all connections
   */
  async disconnectAll(): Promise<void> {
    const connectionIds = Array.from(this.connections.keys());
    const disconnectPromises = connectionIds.map(async (connectionId) => {
      try {
        await this.removeConnection(connectionId);
      } catch (error) {
        this.logger.error(`Connection termination failed: ${connectionId}`, {
          error,
        });
      }
    });

    await Promise.allSettled(disconnectPromises);
    this.currentConnection = null;
    this.logger.info("All database connections have been terminated.");
  }

  /**
   * Test connection status
   */
  async testConnection(connectionId?: string): Promise<boolean> {
    try {
      const connection = connectionId
        ? this.getConnection(connectionId)
        : this.getCurrentConnection();

      return await connection.testConnection();
    } catch (error) {
      this.logger.error("Connection test failed", {
        connectionId: connectionId || this.currentConnection,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get connection list
   */
  getConnectionList(): Array<{ id: string; type: string; status: string }> {
    return Array.from(this.connections.entries()).map(([id, adapter]) => ({
      id,
      type: adapter.getType(),
      status: adapter.isConnected() ? "connected" : "disconnected",
    }));
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    const totalConnections = this.connections.size;
    const activeConnections = Array.from(this.connections.values()).filter(
      (adapter) => adapter.isConnected()
    ).length;

    return {
      total: totalConnections,
      active: activeConnections,
      current: this.currentConnection,
      connections: this.getConnectionList(),
    };
  }

  /**
   * Auto-reconnect
   */
  async autoReconnect(connectionId?: string): Promise<boolean> {
    try {
      const targetConnectionId = connectionId || this.currentConnection;
      if (!targetConnectionId) {
        throw new Error("No connection to reconnect.");
      }

      const connection = this.connections.get(targetConnectionId);
      if (!connection) {
        throw new Error(`Connection not found: ${targetConnectionId}`);
      }

      // Disconnect first
      await connection.disconnect();

      // Reconnect
      await connection.connect();

      this.logger.logConnection("Auto-reconnection", true, {
        connectionId: targetConnectionId,
      });

      return true;
    } catch (error) {
      this.logger.logConnection("Auto-reconnection", false, {
        connectionId: connectionId || this.currentConnection,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
