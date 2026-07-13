import { describe, it, expect } from 'vitest';
import { validateCnpj, generateCnpj } from '../../src/domain/cnpj';

describe('CNPJ Validation', () => {
  it('should validate a valid formatted CNPJ', () => {
    const result = validateCnpj('11.222.333/0001-81');
    expect(result.valid).toBe(true);
  });

  it('should validate a valid unformatted CNPJ', () => {
    const result = validateCnpj('11222333000181');
    expect(result.valid).toBe(true);
  });

  it('should reject CNPJ with wrong check digit', () => {
    const result = validateCnpj('11.222.333/0001-82');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('check digit mismatch');
  });

  it('should reject CNPJ with all same digits', () => {
    const result = validateCnpj('11.111.111/1111-11');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('all digits are the same');
  });

  it('should reject CNPJ with wrong length', () => {
    const result = validateCnpj('11.222.333');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid length');
  });

  it('should reject CNPJ with non-numeric characters (except format)', () => {
    const result = validateCnpj('ab.cde.fgh/ijkl-mn');
    expect(result.valid).toBe(false);
  });
});

describe('CNPJ Generation', () => {
  it('should generate a valid formatted CNPJ', () => {
    const cnpj = generateCnpj({ formatted: true });
    expect(cnpj).toMatch(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/);
    const validation = validateCnpj(cnpj);
    expect(validation.valid).toBe(true);
  });

  it('should generate a valid unformatted CNPJ', () => {
    const cnpj = generateCnpj({ formatted: false });
    expect(cnpj).toMatch(/^\d{14}$/);
    const validation = validateCnpj(cnpj);
    expect(validation.valid).toBe(true);
  });

  it('should generate different CNPJs on repeated calls', () => {
    const cnpj1 = generateCnpj({ formatted: false });
    const cnpj2 = generateCnpj({ formatted: false });
    expect(cnpj1).not.toBe(cnpj2);
  });

  it('should roundtrip generate and validate successfully 20 times', () => {
    for (let i = 0; i < 20; i++) {
      const cnpj = generateCnpj({ formatted: false });
      const validation = validateCnpj(cnpj);
      expect(validation.valid).toBe(true);
    }
  });
});
