#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer } from './server.js';

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await buildServer().connect(transport);
  console.error('[br-docs-mcp] MCP server running on stdio');
}

main().catch((error) => {
  console.error('[br-docs-mcp] Fatal error:', error);
  process.exit(1);
});
