import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Tool, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { validateCpf, generateCpf } from './domain/cpf.js';
import { validateCnpj, generateCnpj } from './domain/cnpj.js';
import { validateBoleto, parseBoleto } from './domain/boleto.js';

const server = new McpServer({
  name: 'br-docs-mcp',
  version: '0.1.0',
});

// Define Zod schemas for tool inputs
const ValidateCpfInputSchema = z.object({
  cpf: z.string().describe('CPF to validate (formatted or unformatted)'),
});

const GenerateCpfInputSchema = z.object({
  formatted: z.boolean().optional().describe('Whether to return formatted CPF (XXX.XXX.XXX-XX)'),
});

const ValidateCnpjInputSchema = z.object({
  cnpj: z.string().describe('CNPJ to validate (formatted or unformatted)'),
});

const GenerateCnpjInputSchema = z.object({
  formatted: z.boolean().optional().describe('Whether to return formatted CNPJ (XX.XXX.XXX/XXXX-XX)'),
});

const ValidateBoletoInputSchema = z.object({
  linha_digitavel: z.string().describe('Boleto linha digitável (47 digits, formatted or unformatted)'),
});

const ParseBoletoInputSchema = z.object({
  linha_digitavel: z.string().describe('Boleto linha digitável to parse (47 digits)'),
});

// Register tools
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'validate_cpf',
        description: 'Validate a Brazilian CPF (Cadastro de Pessoa Física)',
        inputSchema: {
          type: 'object',
          properties: {
            cpf: {
              type: 'string',
              description: 'CPF to validate (formatted: XXX.XXX.XXX-XX or unformatted: 11 digits)',
            },
          },
          required: ['cpf'],
        },
      } as Tool,
      {
        name: 'generate_cpf',
        description: 'Generate a valid Brazilian CPF',
        inputSchema: {
          type: 'object',
          properties: {
            formatted: {
              type: 'boolean',
              description: 'Whether to return formatted CPF (XXX.XXX.XXX-XX). Default: false',
            },
          },
        },
      } as Tool,
      {
        name: 'validate_cnpj',
        description: 'Validate a Brazilian CNPJ (Cadastro Nacional da Pessoa Jurídica)',
        inputSchema: {
          type: 'object',
          properties: {
            cnpj: {
              type: 'string',
              description: 'CNPJ to validate (formatted: XX.XXX.XXX/XXXX-XX or unformatted: 14 digits)',
            },
          },
          required: ['cnpj'],
        },
      } as Tool,
      {
        name: 'generate_cnpj',
        description: 'Generate a valid Brazilian CNPJ',
        inputSchema: {
          type: 'object',
          properties: {
            formatted: {
              type: 'boolean',
              description: 'Whether to return formatted CNPJ (XX.XXX.XXX/XXXX-XX). Default: false',
            },
          },
        },
      } as Tool,
      {
        name: 'validate_boleto',
        description: 'Validate a Brazilian boleto linha digitável',
        inputSchema: {
          type: 'object',
          properties: {
            linha_digitavel: {
              type: 'string',
              description: 'Boleto linha digitável (47 digits, can include formatting)',
            },
          },
          required: ['linha_digitavel'],
        },
      } as Tool,
      {
        name: 'parse_boleto',
        description: 'Parse Brazilian boleto linha digitável and extract bank code, amount, and maturity date',
        inputSchema: {
          type: 'object',
          properties: {
            linha_digitavel: {
              type: 'string',
              description: 'Boleto linha digitável (47 digits)',
            },
          },
          required: ['linha_digitavel'],
        },
      } as Tool,
    ],
  };
});

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'validate_cpf': {
        const { cpf } = ValidateCpfInputSchema.parse(args);
        const result = validateCpf(cpf);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            } as TextContent,
          ],
        };
      }

      case 'generate_cpf': {
        const { formatted } = GenerateCpfInputSchema.parse(args);
        const cpf = generateCpf({ formatted });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ cpf }, null, 2),
            } as TextContent,
          ],
        };
      }

      case 'validate_cnpj': {
        const { cnpj } = ValidateCnpjInputSchema.parse(args);
        const result = validateCnpj(cnpj);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            } as TextContent,
          ],
        };
      }

      case 'generate_cnpj': {
        const { formatted } = GenerateCnpjInputSchema.parse(args);
        const cnpj = generateCnpj({ formatted });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ cnpj }, null, 2),
            } as TextContent,
          ],
        };
      }

      case 'validate_boleto': {
        const { linha_digitavel } = ValidateBoletoInputSchema.parse(args);
        const result = validateBoleto(linha_digitavel);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            } as TextContent,
          ],
        };
      }

      case 'parse_boleto': {
        const { linha_digitavel } = ParseBoletoInputSchema.parse(args);
        try {
          const result = parseBoleto(linha_digitavel);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    bankCode: result.bankCode,
                    amount: result.amount,
                    maturity: result.maturity.toISOString().split('T')[0],
                  },
                  null,
                  2
                ),
              } as TextContent,
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: (error as Error).message }, null, 2),
              } as TextContent,
            ],
          };
        }
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2),
            } as TextContent,
          ],
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: (error as Error).message }, null, 2),
        } as TextContent,
      ],
    };
  }
});

// Register resources
server.setRequestHandler('resources/list', async () => {
  return {
    resources: [
      {
        uri: 'docs://validation-rules',
        name: 'Validation Rules for Brazilian Documents',
        description: 'Documentation of validation algorithms for CPF, CNPJ, and boleto',
        mimeType: 'text/markdown',
      },
    ],
  };
});

// Handle resource reads
server.setRequestHandler('resources/read', async (request) => {
  if (request.params.uri === 'docs://validation-rules') {
    const content = `# Validation Rules for Brazilian Documents

## CPF (Cadastro de Pessoa Física)

The CPF consists of 11 digits: 9 base digits + 2 check digits.

### Check Digit Calculation (MOD 11)
1. For the first check digit: Multiply each of the first 9 digits by 10, 9, 8, ..., 2 (descending)
2. Sum all results and calculate remainder when divided by 11
3. If remainder < 2, check digit = 0; otherwise, check digit = 11 - remainder
4. For the second check digit: Repeat with first 10 digits and multipliers 11, 10, 9, ..., 2

### Validation Rules
- Must have exactly 11 digits
- Cannot have all digits the same (e.g., 111.111.111-11)
- Both check digits must be correctly calculated
- Accepts both formatted (XXX.XXX.XXX-XX) and unformatted (11 digits) input

## CNPJ (Cadastro Nacional da Pessoa Jurídica)

The CNPJ consists of 14 digits: 12 base digits + 2 check digits.

### Check Digit Calculation (MOD 11)
1. For the first check digit: Multiply the 12 base digits by [5,4,3,2,9,8,7,6,5,4,3,2]
2. Sum all results and calculate remainder when divided by 11
3. If remainder < 2, check digit = 0; otherwise, check digit = 11 - remainder
4. For the second check digit: Repeat with 13 digits and multipliers [6,5,4,3,2,9,8,7,6,5,4,3,2]

### Validation Rules
- Must have exactly 14 digits
- Cannot have all digits the same (e.g., 11.111.111/1111-11)
- Both check digits must be correctly calculated
- Accepts both formatted (XX.XXX.XXX/XXXX-XX) and unformatted (14 digits) input

## Boleto (Linha Digitável)

The boleto linha digitável consists of 47 digits with the following structure:

\`\`\`
Positions  0-3:   Bank code (3 digits) + bank check digit (1 digit)
Positions  4-10:  Sequence 1 (6 digits) + sequence 1 check digit (1 digit)
Positions 11-20:  Sequence 2 (10 digits)
Positions 21-30:  Sequence 3 (10 digits)
Position  31:     General check digit (1 digit)
Positions 32-36:  Maturity factor (5 digits)
Positions 37-46:  Amount in cents (10 digits)
\`\`\`

### Check Digit Calculation
1. **Sequence 1 Check Digit (MOD 10)**: Calculated over bank code + sequence 1
2. **General Check Digit (MOD 11)**: Calculated over reconstructed barcode
   - Barcode = bank code (without check digit) + maturity + amount + sequences

### Validation Rules
- Must have exactly 47 digits
- Sequence 1 check digit must be valid (MOD 10)
- General check digit must be valid (MOD 11)
- Maturity is encoded as days since October 7, 1997
- Amount is in cents (divide by 100 to get real value in R$)

### Maturity Factor
The maturity factor is the number of days since October 7, 1997.
- Factor 0 = October 7, 1997
- Factor 10000 = Approximately October 1, 2024
- Factor rollover: After 9999 days, continues from 0 (cycles every ~27 years)

## References
- CPF: https://en.wikipedia.org/wiki/Cadastro_de_Pessoa_F%C3%ADsica
- CNPJ: https://en.wikipedia.org/wiki/National_Registry_of_Legal_Entities
- Boleto: Brazilian standard banking document (RESOLUÇÃO Nº 3.959/2010)
`;
    return {
      contents: [
        {
          uri: 'docs://validation-rules',
          mimeType: 'text/markdown',
          text: content,
        },
      ],
    };
  }

  return {
    contents: [],
  };
});

// Register prompts
server.setRequestHandler('prompts/list', async () => {
  return {
    prompts: [
      {
        name: 'audit_customer_record',
        description: 'Audit a customer record by validating all Brazilian documents using available tools',
        arguments: [
          {
            name: 'customer_json',
            description: 'Customer record as JSON string containing CPF, CNPJ, and/or boleto documents',
            required: true,
          },
        ],
      },
    ],
  };
});

// Handle prompt calls
server.setRequestHandler('prompts/get', async (request) => {
  if (request.params.name === 'audit_customer_record') {
    const args = request.params.arguments as Record<string, string>;
    const customerJson = args.customer_json || '{}';

    const prompt = `You are a document validation specialist. I have provided a customer record in JSON format below.

Customer Record:
\`\`\`json
${customerJson}
\`\`\`

Please validate all Brazilian documents found in this record using the following tools:
- validate_cpf: For CPF validation
- validate_cnpj: For CNPJ validation
- validate_boleto: For boleto validation

For each document found:
1. Identify the document type and value
2. Call the appropriate validation tool
3. Report whether it's valid or invalid
4. If invalid, provide the reason
5. Summarize the validation results

Format your response as a structured audit report with clear sections for each document type.`;

    return {
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };
  }

  return {
    messages: [],
  };
});

export async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[br-docs-mcp] Server running on stdio');
}
