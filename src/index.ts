#!/usr/bin/env node

import { MSSQLMCPServer } from './core/server.js';

/**
 * Application main function
 */
async function main(): Promise<void> {
  try {
    // Create server instance
    const server = new MSSQLMCPServer();

    // Setup graceful shutdown handling
    server.setupGracefulShutdown();

    // Start server
    await server.start();
  } catch (error) {
    // Use stderr for error output to avoid interfering with JSON-RPC
    process.stderr.write(`Server startup failed: ${error}\n`);
    process.exit(1);
  }
}

// Execute program
// Always run main function when this file is executed directly
main().catch(error => {
  // Use stderr for error output to avoid interfering with JSON-RPC
  process.stderr.write(`Fatal error: ${error}\n`);
  process.exit(1);
});
