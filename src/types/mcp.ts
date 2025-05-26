/**
 * MCP tool execution result interface
 */
export interface MCPToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

/**
 * MCP tool definition interface
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * MCP tool execution arguments interface
 */
export interface MCPToolArgs {
  [key: string]: any;
}

/**
 * MCP server configuration interface
 */
export interface ServerConfig {
  name: string;
  version: string;
}

/**
 * MCP server capabilities interface
 */
export interface ServerCapabilities {
  tools?: {};
}
