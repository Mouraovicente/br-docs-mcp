export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export interface GenerateOptions {
  formatted?: boolean;
}

function calculateCheckDigit(digits: number[]): number {
  const multipliers = Array.from({ length: digits.length }, (_, i) => digits.length + 1 - i);
  const sum = digits.reduce((acc, digit, i) => acc + digit * multipliers[i], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function cleanCpf(cpf: string): string {
  return cpf.replace(/[^\d]/g, '');
}

export function validateCpf(input: string): ValidationResult {
  const cleaned = cleanCpf(input);

  if (cleaned.length !== 11) {
    return { valid: false, reason: 'invalid length' };
  }

  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, reason: 'invalid characters' };
  }

  // Check if all digits are the same
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return { valid: false, reason: 'all digits are the same' };
  }

  const digits = cleaned.split('').map(Number);
  const firstNine = digits.slice(0, 9);
  const firstCheckDigit = calculateCheckDigit(firstNine);

  if (firstCheckDigit !== digits[9]) {
    return { valid: false, reason: 'check digit mismatch' };
  }

  const firstTen = digits.slice(0, 10);
  const secondCheckDigit = calculateCheckDigit(firstTen);

  if (secondCheckDigit !== digits[10]) {
    return { valid: false, reason: 'check digit mismatch' };
  }

  return { valid: true };
}

export function generateCpf(options: GenerateOptions = {}): string {
  const { formatted = false } = options;

  // Generate 9 random digits
  const randomDigits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));

  // Calculate first check digit
  const firstCheckDigit = calculateCheckDigit(randomDigits);
  const tenDigits = [...randomDigits, firstCheckDigit];

  // Calculate second check digit
  const secondCheckDigit = calculateCheckDigit(tenDigits);
  const allDigits = [...tenDigits, secondCheckDigit];

  const unformatted = allDigits.join('');

  if (formatted) {
    return `${unformatted.slice(0, 3)}.${unformatted.slice(3, 6)}.${unformatted.slice(6, 9)}-${unformatted.slice(9)}`;
  }

  return unformatted;
}
