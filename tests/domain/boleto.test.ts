import { describe, it, expect } from 'vitest';
import { validateBoleto, parseBoleto } from '../../src/domain/boleto';

// Helper to generate a valid boleto line for testing
function generateValidBoleto(bankCode: string, seq1: string, seq2: string, seq3: string, vencimento: string, valor: string): string {
  // This is a simplified version - in real implementation, we calculate DVs
  // For testing, we use a pre-calculated valid boleto

  // Helper: calculateMod10
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

  // Helper: calculateMod11
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

describe('Boleto Validation', () => {
  it('should validate a valid boleto linha digitável', () => {
    const boleto = generateValidBoleto('0019', '320201', '0123456789', '9876543210', '10000', '0000150000');
    const result = validateBoleto(boleto);
    expect(result.valid).toBe(true);
  });

  it('should validate boleto with punctuation', () => {
    const boleto = generateValidBoleto('0019', '320201', '0123456789', '9876543210', '10000', '0000150000');
    const formatted = `${boleto.substring(0, 4)}.${boleto.substring(4, 10)} ${boleto.substring(10, 20)}.${boleto.substring(20, 30)} ${boleto.substring(30, 40)}.${boleto.substring(40, 47)}`;
    const result = validateBoleto(formatted);
    expect(result.valid).toBe(true);
  });

  it('should reject boleto with wrong sequence 1 DV', () => {
    let boleto = generateValidBoleto('0019', '320201', '0123456789', '9876543210', '10000', '0000150000');
    // Change the DV at position 10
    boleto = boleto.substring(0, 10) + '9' + boleto.substring(11);
    const result = validateBoleto(boleto);
    expect(result.valid).toBe(false);
  });

  it('should reject boleto with wrong general DV', () => {
    let boleto = generateValidBoleto('0019', '320201', '0123456789', '9876543210', '10000', '0000150000');
    // Change the general DV at position 31
    boleto = boleto.substring(0, 31) + '7' + boleto.substring(32);
    const result = validateBoleto(boleto);
    expect(result.valid).toBe(false);
  });

  it('should reject boleto with invalid length', () => {
    const result = validateBoleto('001932020104951004');
    expect(result.valid).toBe(false);
  });

  it('should reject boleto with non-numeric characters', () => {
    const result = validateBoleto('001a3202010495100479101815000889400000150000');
    expect(result.valid).toBe(false);
  });
});

describe('Boleto Parsing', () => {
  it('should parse bank code from boleto', () => {
    const boleto = generateValidBoleto('0019', '320201', '0123456789', '9876543210', '10000', '0000150000');
    const result = parseBoleto(boleto);
    expect(result.bankCode).toBe('001');
  });

  it('should parse amount from boleto', () => {
    const boleto = generateValidBoleto('0019', '320201', '0123456789', '9876543210', '10000', '0000150000');
    const result = parseBoleto(boleto);
    // Valor: 0000150000 (10 dígitos) = 150000 em centavos = R$ 1500,00
    expect(result.amount).toBe(1500.00);
  });

  it('should parse maturity from boleto', () => {
    const boleto = generateValidBoleto('0019', '320201', '0123456789', '9876543210', '10000', '0000150000');
    const result = parseBoleto(boleto);
    expect(result.maturity).toBeDefined();
    expect(result.maturity).toBeInstanceOf(Date);
  });

  it('should handle maturity dates after October 7, 1997', () => {
    const boleto = generateValidBoleto('0019', '320201', '0123456789', '9876543210', '10000', '0000150000');
    const result = parseBoleto(boleto);
    expect(result.maturity.getTime()).toBeGreaterThan(new Date('1997-10-07').getTime());
  });

  it('should throw error when parsing invalid boleto', () => {
    expect(() => {
      parseBoleto('001932020104951004');
    }).toThrow();
  });
});
