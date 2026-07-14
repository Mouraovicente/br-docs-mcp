export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export interface BoletoData {
  bankCode: string;
  amount: number;
  /** Null when the due date factor is 0000 (boleto without a due date). */
  dueDate: Date | null;
}

export interface ParseBoletoOptions {
  /**
   * Reference date used to disambiguate the due date factor after the
   * FEBRABAN rollover of 2025-02-22. Defaults to "now".
   */
  referenceDate?: Date;
}

/** Base date of the due date factor: 1997-10-07 (UTC). */
const FACTOR_BASE_UTC = Date.UTC(1997, 9, 7);
const DAY_MS = 86_400_000;
/** The factor cycles every 9000 days (1000..9999). */
const CYCLE_MS = 9000 * DAY_MS;

const LINE_LENGTH = 47;

function cleanLine(input: string): string {
  return input.replace(/[.\s-]/g, '');
}

/**
 * FEBRABAN mod 10: right to left, weights alternate 2, 1, 2, 1...
 * Products above 9 have their digits summed. DV = (10 - sum % 10) % 10.
 */
function mod10CheckDigit(digits: string): number {
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
  return (10 - (sum % 10)) % 10;
}

/**
 * FEBRABAN mod 11 for the barcode general check digit: right to left,
 * weights cycle 2..9. DV = 11 - (sum % 11); results 0, 10 and 11 become 1.
 */
function mod11CheckDigit(digits: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += Number(digits[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const dv = 11 - (sum % 11);
  return dv === 0 || dv === 10 || dv === 11 ? 1 : dv;
}

interface LineParts {
  bank: string;
  currency: string;
  field1Content: string;
  field1Dv: string;
  field2Content: string;
  field2Dv: string;
  field3Content: string;
  field3Dv: string;
  generalDv: string;
  factor: string;
  amount: string;
}

/**
 * Splits the 47-digit linha digitável.
 * Layout (0-based): field 1 = [0..9] (content + DV), field 2 = [10..20],
 * field 3 = [21..31], general DV = [32] (position 33, 1-based),
 * field 5 = [33..36] factor + [37..46] amount.
 */
function splitLine(line: string): LineParts {
  return {
    bank: line.slice(0, 3),
    currency: line.slice(3, 4),
    field1Content: line.slice(0, 9),
    field1Dv: line.slice(9, 10),
    field2Content: line.slice(10, 20),
    field2Dv: line.slice(20, 21),
    field3Content: line.slice(21, 31),
    field3Dv: line.slice(31, 32),
    generalDv: line.slice(32, 33),
    factor: line.slice(33, 37),
    amount: line.slice(37, 47),
  };
}

/** Reassembles the 43 digits of the barcode (without its check digit). */
function reassembleBarcode43(parts: LineParts): string {
  const freeField =
    parts.field1Content.slice(4, 9) + parts.field2Content + parts.field3Content;
  return parts.bank + parts.currency + parts.factor + parts.amount + freeField;
}

/**
 * Validates a linha digitável: 47 numeric digits (punctuation accepted),
 * mod 10 on each of the 3 fields and the general mod 11 check digit at
 * position 33, computed over the reassembled barcode.
 */
export function validateBoleto(input: string): ValidationResult {
  const line = cleanLine(input);

  if (!/^\d+$/.test(line)) {
    return { valid: false, reason: 'line must contain only digits' };
  }

  if (line.length !== LINE_LENGTH) {
    return { valid: false, reason: 'invalid length' };
  }

  const parts = splitLine(line);

  const fields: Array<{ content: string; dv: string; label: string }> = [
    { content: parts.field1Content, dv: parts.field1Dv, label: 'field 1' },
    { content: parts.field2Content, dv: parts.field2Dv, label: 'field 2' },
    { content: parts.field3Content, dv: parts.field3Dv, label: 'field 3' },
  ];

  for (const { content, dv, label } of fields) {
    if (mod10CheckDigit(content) !== Number(dv)) {
      return { valid: false, reason: `${label} check digit mismatch` };
    }
  }

  if (mod11CheckDigit(reassembleBarcode43(parts)) !== Number(parts.generalDv)) {
    return { valid: false, reason: 'general check digit mismatch' };
  }

  return { valid: true };
}

/**
 * Converts a due date factor into a date. The factor counts days since
 * 1997-10-07 and rolled over on 2025-02-22 (when it went back to 1000),
 * so a factor maps to more than one date; the candidate closest to the
 * reference date wins. Factor 0 means "no due date".
 */
function dueDateFromFactor(factor: number, referenceDate: Date): Date | null {
  if (factor === 0) {
    return null;
  }
  let candidate = FACTOR_BASE_UTC + factor * DAY_MS;
  while (
    Math.abs(candidate + CYCLE_MS - referenceDate.getTime()) <
    Math.abs(candidate - referenceDate.getTime())
  ) {
    candidate += CYCLE_MS;
  }
  return new Date(candidate);
}

/**
 * Parses a valid linha digitável, extracting the bank code (first 3 digits),
 * the amount (last 10 digits / 100) and the due date via the due date factor.
 * Throws if the line does not validate.
 */
export function parseBoleto(input: string, options: ParseBoletoOptions = {}): BoletoData {
  const validation = validateBoleto(input);
  if (!validation.valid) {
    throw new Error(`invalid boleto: ${validation.reason}`);
  }

  const parts = splitLine(cleanLine(input));
  const referenceDate = options.referenceDate ?? new Date();

  return {
    bankCode: parts.bank,
    amount: Number(parts.amount) / 100,
    dueDate: dueDateFromFactor(Number(parts.factor), referenceDate),
  };
}
