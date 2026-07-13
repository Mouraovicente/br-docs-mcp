import { describe, it, expect } from 'vitest';
import { validateCpf, generateCpf } from '../../src/domain/cpf';

describe('CPF Validation', () => {
  it('should validate a valid formatted CPF', () => {
    const result = validateCpf('529.982.247-25');
    expect(result.valid).toBe(true);
  });

  it('should validate a valid unformatted CPF', () => {
    const result = validateCpf('52998224725');
    expect(result.valid).toBe(true);
  });

  it('should reject CPF with wrong check digit', () => {
    const result = validateCpf('529.982.247-26');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('check digit mismatch');
  });

  it('should reject CPF with all same digits', () => {
    const result = validateCpf('111.111.111-11');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('all digits are the same');
  });

  it('should reject CPF with wrong length', () => {
    const result = validateCpf('123.456.789');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid length');
  });

  it('should reject CPF with non-numeric characters (except format)', () => {
    const result = validateCpf('abc.def.ghi-jk');
    expect(result.valid).toBe(false);
  });
});

describe('CPF Generation', () => {
  it('should generate a valid formatted CPF', () => {
    const cpf = generateCpf({ formatted: true });
    expect(cpf).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
    const validation = validateCpf(cpf);
    expect(validation.valid).toBe(true);
  });

  it('should generate a valid unformatted CPF', () => {
    const cpf = generateCpf({ formatted: false });
    expect(cpf).toMatch(/^\d{11}$/);
    const validation = validateCpf(cpf);
    expect(validation.valid).toBe(true);
  });

  it('should generate different CPFs on repeated calls', () => {
    const cpf1 = generateCpf({ formatted: false });
    const cpf2 = generateCpf({ formatted: false });
    expect(cpf1).not.toBe(cpf2);
  });

  it('should roundtrip generate and validate successfully 20 times', () => {
    for (let i = 0; i < 20; i++) {
      const cpf = generateCpf({ formatted: false });
      const validation = validateCpf(cpf);
      expect(validation.valid).toBe(true);
    }
  });
});
