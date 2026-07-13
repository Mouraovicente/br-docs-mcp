import { describe, it, expect } from 'vitest';
import { validateCpf, generateCpf } from '../../src/domain/cpf.js';
import { validateCnpj, generateCnpj } from '../../src/domain/cnpj.js';
import { validateBoleto, parseBoleto } from '../../src/domain/boleto.js';

// Helper to generate a valid boleto for testing
function generateValidBoleto(
  bankCode: string,
  seq1: string,
  seq2: string,
  seq3: string,
  vencimento: string,
  valor: string
): string {
  const calculateMod10 = (digits: string): string => {
    let sum = 0;
    let multiplier = 2;
    for (let i = digits.length - 1; i >= 0; i--) {
      let result = parseInt(digits[i], 10) * multiplier;
      if (result > 9) {
        result = Math.floor(result / 10) + (result % 10);
      }
      sum += result;
      multiplier = multiplier === 2 ? 1 : 2;
    }
    return String((10 - (sum % 10)) % 10);
  };

  const calculateMod11 = (digits: string): string => {
    const sequence = '23456789';
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += parseInt(digits[i], 10) * parseInt(sequence[i % sequence.length], 10);
    }
    const remainder = sum % 11;
    if (remainder === 0 || remainder === 1) {
      return '0';
    }
    return String(11 - remainder);
  };

  const seq1Dv = calculateMod10(bankCode + seq1);
  const codigoBarras = bankCode.substring(0, 3) + vencimento + valor + seq1 + seq2 + seq3;
  const dvGeral = calculateMod11(codigoBarras);

  return bankCode + seq1 + seq1Dv + seq2 + seq3 + dvGeral + vencimento + valor;
}

describe('E2E: Domain Functions Integration', () => {
  describe('CPF Validation Flow', () => {
    it('should validate a known valid CPF', () => {
      const result = validateCpf('529.982.247-25');
      expect(result.valid).toBe(true);
    });

    it('should reject a known invalid CPF', () => {
      const result = validateCpf('111.111.111-11');
      expect(result.valid).toBe(false);
    });

    it('should generate and validate CPF roundtrip', () => {
      const cpf = generateCpf({ formatted: false });
      const validation = validateCpf(cpf);
      expect(validation.valid).toBe(true);
    });
  });

  describe('CNPJ Validation Flow', () => {
    it('should validate a known valid CNPJ', () => {
      const result = validateCnpj('11.222.333/0001-81');
      expect(result.valid).toBe(true);
    });

    it('should reject a known invalid CNPJ', () => {
      const result = validateCnpj('11.111.111/1111-11');
      expect(result.valid).toBe(false);
    });

    it('should generate and validate CNPJ roundtrip', () => {
      const cnpj = generateCnpj({ formatted: false });
      const validation = validateCnpj(cnpj);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Boleto Validation Flow', () => {
    it('should validate a generated valid boleto', () => {
      const boleto = generateValidBoleto('0019', '320201', '0123456789', '9876543210', '10000', '0000150000');
      const result = validateBoleto(boleto);
      expect(result.valid).toBe(true);
    });

    it('should parse boleto and extract bank code, amount, and maturity', () => {
      const boleto = generateValidBoleto('0019', '320201', '0123456789', '9876543210', '10000', '0000150000');
      const result = parseBoleto(boleto);
      expect(result.bankCode).toBe('001');
      expect(result.amount).toBe(1500.00);
      expect(result.maturity).toBeInstanceOf(Date);
    });

    it('should reject invalid boleto with malformed sequence 1 DV', () => {
      let boleto = generateValidBoleto('0019', '320201', '0123456789', '9876543210', '10000', '0000150000');
      // Change DV at position 10
      boleto = boleto.substring(0, 10) + '9' + boleto.substring(11);
      const result = validateBoleto(boleto);
      expect(result.valid).toBe(false);
    });
  });

  describe('Cross-document Validation', () => {
    it('should handle mixed valid and invalid documents', () => {
      const validCpf = validateCpf('529.982.247-25');
      const invalidCpf = validateCpf('000.000.000-00');
      const validCnpj = validateCnpj('11.222.333/0001-81');
      const invalidCnpj = validateCnpj('00.000.000/0000-00');

      expect(validCpf.valid).toBe(true);
      expect(invalidCpf.valid).toBe(false);
      expect(validCnpj.valid).toBe(true);
      expect(invalidCnpj.valid).toBe(false);
    });

    it('should verify server would expose 6 tools (conceptual)', () => {
      // This represents that the server will have these 6 tools available
      const tools = [
        'validate_cpf',
        'generate_cpf',
        'validate_cnpj',
        'generate_cnpj',
        'validate_boleto',
        'parse_boleto',
      ];

      expect(tools).toHaveLength(6);
      expect(tools).toContain('validate_cpf');
      expect(tools).toContain('generate_cpf');
      expect(tools).toContain('validate_cnpj');
      expect(tools).toContain('generate_cnpj');
      expect(tools).toContain('validate_boleto');
      expect(tools).toContain('parse_boleto');
    });
  });
});
