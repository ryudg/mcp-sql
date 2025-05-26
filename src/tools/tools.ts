import { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * MCP MSSQL Server Tool Definitions
 * Includes only core database management features
 */
export const tools: Tool[] = [
  {
    name: "execute_query",
    description: "Execute SQL queries",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "SQL query to execute",
        },
        parameters: {
          type: "array",
          items: { type: "string" },
          description: "Query parameters (optional)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_schema",
    description: "Get database schema information",
    inputSchema: {
      type: "object",
      properties: {
        include_system_tables: {
          type: "boolean",
          description: "Whether to include system tables (default: false)",
        },
      },
    },
  },
  {
    name: "list_tables",
    description: "Get list of database tables",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Table name pattern (optional)",
        },
      },
    },
  },
  {
    name: "describe_table",
    description: "Get structure of a specific table",
    inputSchema: {
      type: "object",
      properties: {
        table_name: {
          type: "string",
          description: "Name of the table to describe",
        },
      },
      required: ["table_name"],
    },
  },
  {
    name: "get_connection_pool_status",
    description: "Get database connection pool status",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "start_performance_monitoring",
    description: "Start performance monitoring",
    inputSchema: {
      type: "object",
      properties: {
        interval: {
          type: "number",
          description: "Monitoring interval (milliseconds, default: 5000)",
          default: 5000,
        },
      },
    },
  },
  {
    name: "start_batch_processing",
    description: "Process multiple queries in batch",
    inputSchema: {
      type: "object",
      properties: {
        queries: {
          type: "array",
          items: { type: "string" },
          description: "List of queries to execute",
        },
      },
      required: ["queries"],
    },
  },
  {
    name: "generate_performance_report",
    description: "Generate performance analysis report",
    inputSchema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["1h", "24h", "7d"],
          description: "Analysis period (default: 1h)",
          default: "1h",
        },
      },
    },
  },
  {
    name: "get_query_stats",
    description: "Get query execution statistics",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_schema_statistics",
    description: "Get schema statistics information",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "clear_caches",
    description: "Initialize cache data",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];
