import { describe, it, expect } from 'vitest';
import { validateBoleto, parseBoleto } from '../../src/domain/boleto';

/**
 * Independent (test-side) implementations of the FEBRABAN check digits,
 * used to build known-valid linha digitável lines without relying on the
 * production code under test.
 */
function mod10(digits: string): string {
  let sum = 0;
  let weight = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    let product = Number(digits[i]) * weight;
    if (product > 9) {
      product = Math.floor(product / 10) + (product % 10);
    }
    sum += product;
    weight = weight === 2 ? 1 : 2;
  }
  return String((10 - (sum % 10)) % 10);
}

function mod11General(barcode43: string): string {
  let sum = 0;
  let weight = 2;
  for (let i = barcode43.length - 1; i >= 0; i--) {
    sum += Number(barcode43[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const dv = 11 - (sum % 11);
  return dv === 0 || dv === 10 || dv === 11 ? '1' : String(dv);
}

/**
 * Builds a valid 47-digit linha digitável from barcode components.
 * Layout (0-based indexes of the line):
 *   field 1: [0..8] = bank(3) + currency(1) + freeField[0..4], [9] = DV mod10
 *   field 2: [10..19] = freeField[5..14], [20] = DV mod10
 *   field 3: [21..30] = freeField[15..24], [31] = DV mod10
 *   field 4: [32] = general DV (mod11 over reassembled barcode)
 *   field 5: [33..36] = due date factor, [37..46] = amount in cents
 */
function buildLinhaDigitavel(
  bank: string,
  currency: string,
  factor: string,
  amount: string,
  freeField: string
): string {
  const field1 = bank + currency + freeField.slice(0, 5);
  const field2 = freeField.slice(5, 15);
  const field3 = freeField.slice(15, 25);
  const barcode43 = bank + currency + factor + amount + freeField;
  const generalDv = mod11General(barcode43);
  return (
    field1 + mod10(field1) +
    field2 + mod10(field2) +
    field3 + mod10(field3) +
    generalDv +
    factor + amount
  );
}

const FREE_FIELD = '1234567890123456789012345';
const VALID_LINE = buildLinhaDigitavel('001', '9', '1000', '0000150000', FREE_FIELD);
const REFERENCE = new Date(Date.UTC(2026, 0, 1));

function corruptAt(line: string, index: number): string {
  const original = line[index];
  const replacement = original === '5' ? '6' : '5';
  return line.slice(0, index) + replacement + line.slice(index + 1);
}

describe('validateBoleto', () => {
  it('accepts a valid linha digitável (raw digits)', () => {
    expect(validateBoleto(VALID_LINE).valid).toBe(true);
  });

  it('accepts a valid linha digitável with punctuation', () => {
    const formatted =
      `${VALID_LINE.slice(0, 5)}.${VALID_LINE.slice(5, 10)} ` +
      `${VALID_LINE.slice(10, 15)}.${VALID_LINE.slice(15, 21)} ` +
      `${VALID_LINE.slice(21, 26)}.${VALID_LINE.slice(26, 32)} ` +
      `${VALID_LINE.slice(32, 33)} ${VALID_LINE.slice(33)}`;
    expect(validateBoleto(formatted).valid).toBe(true);
  });

  it('rejects a line with corrupted field 1', () => {
    const result = validateBoleto(corruptAt(VALID_LINE, 4));
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('field 1 check digit mismatch');
  });

  it('rejects a line with corrupted field 2', () => {
    const result = validateBoleto(corruptAt(VALID_LINE, 12));
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('field 2 check digit mismatch');
  });

  it('rejects a line with corrupted field 3', () => {
    const result = validateBoleto(corruptAt(VALID_LINE, 25));
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('field 3 check digit mismatch');
  });

  it('rejects a line with wrong general check digit (position 33)', () => {
    const result = validateBoleto(corruptAt(VALID_LINE, 32));
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('general check digit mismatch');
  });

  it('rejects a line with wrong length', () => {
    const result = validateBoleto(VALID_LINE.slice(0, 30));
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid length');
  });

  it('rejects a line with letters mixed in', () => {
    const result = validateBoleto('a' + VALID_LINE.slice(1));
    expect(result.valid).toBe(false);
  });
});

describe('parseBoleto', () => {
  it('extracts the bank code from the first 3 digits', () => {
    expect(parseBoleto(VALID_LINE, { referenceDate: REFERENCE }).bankCode).toBe('001');
  });

  it('extracts the amount from the last 10 digits divided by 100', () => {
    expect(parseBoleto(VALID_LINE, { referenceDate: REFERENCE }).amount).toBe(1500.0);
  });

  it('resolves factor 1000 to 2025-02-22 after the rollover', () => {
    const { dueDate } = parseBoleto(VALID_LINE, { referenceDate: REFERENCE });
    expect(dueDate).not.toBeNull();
    expect(dueDate!.toISOString().slice(0, 10)).toBe('2025-02-22');
  });

  it('resolves factor 9999 to 2025-02-21 (last day of the first cycle)', () => {
    const line = buildLinhaDigitavel('341', '9', '9999', '0000009900', FREE_FIELD);
    const { dueDate } = parseBoleto(line, { referenceDate: REFERENCE });
    expect(dueDate!.toISOString().slice(0, 10)).toBe('2025-02-21');
  });

  it('returns a null due date for factor 0000 (no due date)', () => {
    const line = buildLinhaDigitavel('237', '9', '0000', '0000000100', FREE_FIELD);
    expect(parseBoleto(line, { referenceDate: REFERENCE }).dueDate).toBeNull();
  });

  it('throws a descriptive error for an invalid line', () => {
    expect(() => parseBoleto(corruptAt(VALID_LINE, 32))).toThrow(/general check digit mismatch/);
  });
});
