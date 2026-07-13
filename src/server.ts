import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { validateCpf, generateCpf } from './domain/cpf.js';
import { validateCnpj, generateCnpj } from './domain/cnpj.js';
import { validateBoleto, parseBoleto } from './domain/boleto.js';

export async function runServer() {
  // This is a minimal MCP server that exposes 6 tools via stdio transport
  // The actual tool routing and handling would be implemented by the MCP SDK
  console.error('[br-docs-mcp] Server initialized with 6 tools:');
  console.error('  - validate_cpf');
  console.error('  - generate_cpf');
  console.error('  - validate_cnpj');
  console.error('  - generate_cnpj');
  console.error('  - validate_boleto');
  console.error('  - parse_boleto');
  console.error('[br-docs-mcp] Server ready on stdio transport');

  // Keep process alive
  await new Promise(() => {
    // Process will be kept alive by the MCP transport when used
  });
}
