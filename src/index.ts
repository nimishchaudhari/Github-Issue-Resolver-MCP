import { MCPServer } from '@modelcontextprotocol/typescript-sdk';
import config from './config';
import logger from './utils/logger';
import { resolveGitHubIssueTool } from './tools/resolve-github-issue.tool';

// Initialize the MCP server
const server = new MCPServer({
  name: 'GitHub Issue Resolver',
  version: '1.0.0',
  description: 'An MCP server that resolves GitHub issues automatically',
});

// Register tools
server.registerTool(resolveGitHubIssueTool);

// Start the server
async function startServer() {
  try {
    server.configure({
      port: config.port,
      logLevel: config.logLevel as any
    });
    
    await server.start();
    logger.info(`GitHub Issue Resolver MCP server running at ${server.address}`);
  } catch (error) {
    logger.error('Failed to start MCP server', { error });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing MCP server');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing MCP server');
  await server.stop();
  process.exit(0);
});

// Start the server
startServer();
