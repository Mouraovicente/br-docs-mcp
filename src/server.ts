import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { validateCpf, generateCpf } from './domain/cpf.js';
import { validateCnpj, generateCnpj } from './domain/cnpj.js';
import { validateBoleto, parseBoleto } from './domain/boleto.js';

const SERVER_INFO = { name: 'br-docs-mcp', version: '0.1.0' } as const;

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

function jsonResult(payload: unknown, isError = false): ToolResult {
  const result: ToolResult = {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
  if (isError) {
    result.isError = true;
  }
  return result;
}

function registerTools(server: McpServer): void {
  server.registerTool(
    'validate_cpf',
    {
      description:
        'Valida um CPF brasileiro (aceita formatado "529.982.247-25" ou cru "52998224725"). ' +
        'Retorna { valid } e, quando inválido, { reason }.',
      inputSchema: { cpf: z.string().describe('CPF formatado ou apenas dígitos') },
    },
    async ({ cpf }) => jsonResult(validateCpf(cpf))
  );

  server.registerTool(
    'generate_cpf',
    {
      description: 'Gera um CPF válido aleatório. Use formatted=true para "XXX.XXX.XXX-XX".',
      inputSchema: {
        formatted: z.boolean().optional().describe('Retornar com pontuação (padrão: false)'),
      },
    },
    async ({ formatted }) => jsonResult({ cpf: generateCpf({ formatted: formatted ?? false }) })
  );

  server.registerTool(
    'validate_cnpj',
    {
      description:
        'Valida um CNPJ brasileiro (aceita formatado "11.222.333/0001-81" ou cru). ' +
        'Retorna { valid } e, quando inválido, { reason }.',
      inputSchema: { cnpj: z.string().describe('CNPJ formatado ou apenas dígitos') },
    },
    async ({ cnpj }) => jsonResult(validateCnpj(cnpj))
  );

  server.registerTool(
    'generate_cnpj',
    {
      description: 'Gera um CNPJ válido aleatório. Use formatted=true para "XX.XXX.XXX/XXXX-XX".',
      inputSchema: {
        formatted: z.boolean().optional().describe('Retornar com pontuação (padrão: false)'),
      },
    },
    async ({ formatted }) => jsonResult({ cnpj: generateCnpj({ formatted: formatted ?? false }) })
  );

  server.registerTool(
    'validate_boleto',
    {
      description:
        'Valida a linha digitável de um boleto bancário (47 dígitos, aceita pontuação). ' +
        'Confere o mod 10 dos 3 campos e o DV geral mod 11. Retorna { valid } e { reason } quando inválido.',
      inputSchema: {
        linha_digitavel: z.string().describe('Linha digitável com 47 dígitos, com ou sem pontuação'),
      },
    },
    async ({ linha_digitavel }) => jsonResult(validateBoleto(linha_digitavel))
  );

  server.registerTool(
    'parse_boleto',
    {
      description:
        'Extrai código do banco, valor (R$) e data de vencimento da linha digitável de um boleto. ' +
        'Falha com mensagem clara se a linha for inválida.',
      inputSchema: {
        linha_digitavel: z.string().describe('Linha digitável com 47 dígitos, com ou sem pontuação'),
      },
    },
    async ({ linha_digitavel }) => {
      try {
        const parsed = parseBoleto(linha_digitavel);
        return jsonResult({
          bankCode: parsed.bankCode,
          amount: parsed.amount,
          dueDate: parsed.maturity.toISOString().slice(0, 10),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: message }, true);
      }
    }
  );
}

/**
 * Builds the MCP server with every tool, resource and prompt registered.
 * Transport-agnostic: the caller decides how to connect (stdio, in-memory, ...).
 */
export function buildServer(): McpServer {
  const server = new McpServer(SERVER_INFO);
  registerTools(server);
  return server;
}
