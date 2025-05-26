#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { DatabaseConnectionManager } from '../database/connection/connection.manager.js';
import { ConfigManager } from './config.js';
import { Logger } from './logger.js';
import { DIContainer } from '../infrastructure/di/DIContainer.js';
import { tools } from '../tools/tools.js';
import { EventDispatcher } from '../infrastructure/events/EventDispatcher.js';

/**
 * MSSQL MCP Server Main Class (DDD Architecture)
 *
 * Core Features:
 * - Multi-database support (MSSQL, MySQL, PostgreSQL)
 * - Performance optimization and monitoring
 * - Security analysis and anomaly detection
 * - Real-time metrics collection
 * - Domain-Driven Design architecture
 */
export class MSSQLMCPServer {
  private server: Server;
  private dbManager: DatabaseConnectionManager;
  private config: ConfigManager;
  private logger: Logger;
  private diContainer: DIContainer;
  private eventDispatcher: EventDispatcher;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-sql',
        version: `v${process.env.npm_package_version}`
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.config = new ConfigManager();
    this.logger = new Logger();
    this.dbManager = new DatabaseConnectionManager(this.config, this.logger);
    this.diContainer = DIContainer.getInstance();

    // Initialize event dispatcher
    this.eventDispatcher = EventDispatcher.getInstance(this.logger);

    this.setupHandlers();
  }

  /**
   * Setup request handlers
   */
  private setupHandlers(): void {
    // Tool list request handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools };
    });

    // Tool call request handler
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      return await this.handleToolCall(request);
    });
  }

  /**
   * Handle tool calls using DDD structure
   */
  private async handleToolCall(request: any): Promise<any> {
    const { name } = request.params;

    this.logger.info(`Tool call: ${name}`, { arguments: request.params.arguments });

    try {
      const queryHandler = this.diContainer.getQueryHandler();
      const schemaHandler = this.diContainer.getSchemaHandler();
      const performanceHandler = this.diContainer.getPerformanceHandler();

      switch (name) {
        // Query related tools (DDD)
        case 'execute_query':
          return await queryHandler.handleExecuteQuery(request);

        case 'start_batch_processing':
          return await queryHandler.handleBatchProcessing(request);

        // Schema related tools (DDD)
        case 'get_schema':
          return await schemaHandler.handleGetSchema(request);

        case 'list_tables':
          return await schemaHandler.handleListTables(request);

        case 'describe_table':
          return await schemaHandler.handleDescribeTable(request);

        case 'get_schema_statistics':
          return await schemaHandler.handleGetSchemaStatistics(request);

        // Performance related tools (DDD)
        case 'start_performance_monitoring':
          return await performanceHandler.handleStartPerformanceMonitoring(request);

        case 'generate_performance_report':
          return await performanceHandler.handleGeneratePerformanceReport(request);

        case 'get_connection_pool_status':
          return await performanceHandler.handleGetConnectionPoolStatus(request);

        case 'get_query_stats':
          return await performanceHandler.handleGetQueryStats(request);

        case 'clear_caches':
          return await performanceHandler.handleClearCaches(request);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Tool call failed: ${name}`, {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Start server
   */
  async start(): Promise<void> {
    this.logger.info('Starting MCP MSSQL Server with DDD Architecture...');

    try {
      // Log configuration
      this.logger.info('Configuration:', this.config.getSummary());

      // Create default database connection first
      this.logger.info('Creating database connection...');
      await this.dbManager.createDefaultConnection();

      // Test database connection
      this.logger.info('Testing database connection...');
      const isConnected = await this.dbManager.testConnection();
      if (isConnected) {
        this.logger.info('Database connection test successful');
      } else {
        throw new Error('Database connection test failed');
      }

      // Initialize DI Container with DDD structure
      this.logger.info('Initializing DDD dependencies...');
      await this.diContainer.initialize(this.dbManager, this.logger);

      // Initialize event dispatcher (already done in constructor)
      this.logger.info('Event dispatcher initialized');

      // Start server
      this.logger.info('Starting MCP server transport...');
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      this.logger.info('MCP MSSQL Server started successfully with DDD Architecture.');
    } catch (error) {
      this.logger.error('Server startup failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Stop server
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping MCP MSSQL Server...');
    await this.dbManager.disconnectAll();
    this.logger.info('MCP MSSQL Server stopped.');
  }

  /**
   * Setup graceful shutdown handling
   */
  setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      this.logger.info(`Received ${signal} signal. Shutting down server...`);
      await this.stop();
      process.exit(0);
    };

    // Register signal handlers
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  }
}
