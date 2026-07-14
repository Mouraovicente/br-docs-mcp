/**
 * Markdown served by the docs://validation-rules MCP resource.
 * Explains each validation algorithm implemented in src/domain.
 */
export const VALIDATION_RULES_MD = `# Regras de validação de documentos brasileiros

## CPF — módulo 11

O CPF tem 11 dígitos: 9 de base e 2 verificadores (DV).

1. **Primeiro DV:** multiplique os 9 primeiros dígitos pelos pesos 10, 9, 8, ..., 2
   e some os produtos. Calcule \`resto = soma % 11\`. Se \`resto < 2\`, o DV é 0;
   caso contrário, \`DV = 11 - resto\`.
2. **Segundo DV:** repita o processo com os 10 primeiros dígitos (incluindo o
   primeiro DV) e pesos 11, 10, 9, ..., 2.
3. CPFs com todos os dígitos iguais (ex.: 111.111.111-11) passam no cálculo de
   mod 11, mas são **rejeitados** por regra da Receita Federal.

## CNPJ — módulo 11 com pesos próprios

O CNPJ tem 14 dígitos: 12 de base e 2 verificadores.

1. **Primeiro DV:** pesos \`5 4 3 2 9 8 7 6 5 4 3 2\` sobre os 12 primeiros
   dígitos. \`resto = soma % 11\`; se \`resto < 2\`, DV = 0; senão \`DV = 11 - resto\`.
2. **Segundo DV:** pesos \`6 5 4 3 2 9 8 7 6 5 4 3 2\` sobre os 13 primeiros
   dígitos (incluindo o primeiro DV).
3. CNPJs com todos os dígitos iguais também são rejeitados.

## Boleto bancário — linha digitável (47 dígitos)

A linha digitável tem 5 campos:

| Campo | Posições (1-based) | Conteúdo |
|---|---|---|
| 1 | 1–10 | banco (3) + moeda (1) + 5 primeiros do campo livre + **DV mod 10** |
| 2 | 11–21 | posições 6–15 do campo livre + **DV mod 10** |
| 3 | 22–32 | posições 16–25 do campo livre + **DV mod 10** |
| 4 | 33 | **DV geral do código de barras (mod 11)** |
| 5 | 34–47 | fator de vencimento (4) + valor em centavos (10) |

### mod 10 (campos 1 a 3)

Da direita para a esquerda, multiplique os dígitos alternadamente por 2 e 1.
Produtos maiores que 9 têm seus algarismos somados (ex.: 14 → 1 + 4 = 5).
O DV é \`(10 - soma % 10) % 10\`.

### mod 11 (DV geral, campo 4)

O DV geral é calculado sobre o **código de barras remontado** (44 dígitos:
banco + moeda + DV + fator + valor + campo livre), excluindo a posição do
próprio DV. Da direita para a esquerda, aplique os pesos 2, 3, 4, ..., 9 em
ciclo e some os produtos. \`DV = 11 - (soma % 11)\`; se o resultado for 0, 10
ou 11, o DV é **1**.

### Fator de vencimento

O fator (4 dígitos, campo 5) conta os dias desde **07/10/1997**.
Ex.: fator 1000 = 03/07/2000. O fator atingiu 9999 em 21/02/2025 e sofreu
**rollover**: a partir de 22/02/2025 ele volta a 1000, ou seja, fator
1000 também pode significar 22/02/2025. O parser resolve a ambiguidade
escolhendo a data mais próxima da data de referência. Fator 0000 indica
boleto sem vencimento.

O **valor** são os 10 últimos dígitos da linha, em centavos (÷ 100).
`;
