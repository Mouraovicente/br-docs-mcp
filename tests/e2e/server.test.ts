import { describe, it, expect, beforeAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../../src/server.js';

interface TextContent {
  type: string;
  text: string;
}

function firstText(result: { content?: unknown }): string {
  const content = result.content as TextContent[] | undefined;
  if (!content || content.length === 0 || content[0].type !== 'text') {
    throw new Error('expected text content in tool result');
  }
  return content[0].text;
}

describe('E2E: MCP server over InMemoryTransport', () => {
  let client: Client;

  beforeAll(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await buildServer().connect(serverTransport);
    client = new Client({ name: 'e2e-test-client', version: '1.0.0' });
    await client.connect(clientTransport);
  });

  it('lists exactly the 6 expected tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'generate_cnpj',
      'generate_cpf',
      'parse_boleto',
      'validate_boleto',
      'validate_cnpj',
      'validate_cpf',
    ]);
  });

  it('calls validate_cpf with a valid CPF and gets valid: true', async () => {
    const result = await client.callTool({
      name: 'validate_cpf',
      arguments: { cpf: '529.982.247-25' },
    });
    const payload = JSON.parse(firstText(result));
    expect(payload.valid).toBe(true);
  });

  it('calls validate_cpf with an invalid CPF and gets valid: false plus a reason', async () => {
    const result = await client.callTool({
      name: 'validate_cpf',
      arguments: { cpf: '529.982.247-26' },
    });
    const payload = JSON.parse(firstText(result));
    expect(payload.valid).toBe(false);
    expect(payload.reason).toBe('check digit mismatch');
  });

  it('generate_cpf returns a CPF that validate_cpf accepts', async () => {
    const generated = await client.callTool({
      name: 'generate_cpf',
      arguments: { formatted: true },
    });
    const { cpf } = JSON.parse(firstText(generated));
    expect(cpf).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);

    const validated = await client.callTool({
      name: 'validate_cpf',
      arguments: { cpf },
    });
    expect(JSON.parse(firstText(validated)).valid).toBe(true);
  });

  it('exposes the docs://validation-rules resource with markdown content', async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);
    expect(uris).toContain('docs://validation-rules');

    const read = await client.readResource({ uri: 'docs://validation-rules' });
    const contents = read.contents as Array<{ uri: string; mimeType?: string; text?: string }>;
    expect(contents).toHaveLength(1);
    expect(contents[0].uri).toBe('docs://validation-rules');
    expect(contents[0].mimeType).toBe('text/markdown');
    expect(contents[0].text).toContain('# Regras de validação');
    expect(contents[0].text).toContain('mod 11');
    expect(contents[0].text).toContain('mod 10');
    expect(contents[0].text).toContain('fator de vencimento');
  });

  it('exposes the audit_customer_record prompt embedding the given record', async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toContain('audit_customer_record');

    const record = JSON.stringify({
      nome: 'Empresa Exemplo',
      cpf: '529.982.247-25',
      cnpj: '11.222.333/0001-81',
    });
    const prompt = await client.getPrompt({
      name: 'audit_customer_record',
      arguments: { record },
    });
    expect(prompt.messages.length).toBeGreaterThan(0);
    const [message] = prompt.messages;
    expect(message.role).toBe('user');
    const content = message.content as { type: string; text: string };
    expect(content.type).toBe('text');
    expect(content.text).toContain(record);
    expect(content.text).toContain('validate_cpf');
    expect(content.text).toContain('validate_cnpj');
  });
});
