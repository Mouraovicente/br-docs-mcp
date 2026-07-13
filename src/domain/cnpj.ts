export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export interface GenerateOptions {
  formatted?: boolean;
}

function calculateCheckDigit(digits: number[], multipliers: number[]): number {
  const sum = digits.reduce((acc, digit, i) => acc + digit * multipliers[i], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/[^\d]/g, '');
}

export function validateCnpj(input: string): ValidationResult {
  const cleaned = cleanCnpj(input);

  if (cleaned.length !== 14) {
    return { valid: false, reason: 'invalid length' };
  }

  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, reason: 'invalid characters' };
  }

  // Check if all digits are the same
  if (/^(\d)\1{13}$/.test(cleaned)) {
    return { valid: false, reason: 'all digits are the same' };
  }

  const digits = cleaned.split('').map(Number);
  const firstTwelve = digits.slice(0, 12);

  // First check digit with multipliers 5,4,3,2,9,8,7,6,5,4,3,2
  const firstMultipliers = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const firstCheckDigit = calculateCheckDigit(firstTwelve, firstMultipliers);

  if (firstCheckDigit !== digits[12]) {
    return { valid: false, reason: 'check digit mismatch' };
  }

  // Second check digit with multipliers 6,5,4,3,2,9,8,7,6,5,4,3,2
  const firstThirteen = digits.slice(0, 13);
  const secondMultipliers = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondCheckDigit = calculateCheckDigit(firstThirteen, secondMultipliers);

  if (secondCheckDigit !== digits[13]) {
    return { valid: false, reason: 'check digit mismatch' };
  }

  return { valid: true };
}

export function generateCnpj(options: GenerateOptions = {}): string {
  const { formatted = false } = options;

  // Generate 8 random digits for company + 4 for branch (0001)
  const companyDigits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10));
  const branchDigits = [0, 0, 0, 1];
  const tenDigits = [...companyDigits, ...branchDigits];

  // Calculate first check digit
  const firstMultipliers = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const firstCheckDigit = calculateCheckDigit(tenDigits, firstMultipliers);
  const thirteenDigits = [...tenDigits, firstCheckDigit];

  // Calculate second check digit
  const secondMultipliers = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondCheckDigit = calculateCheckDigit(thirteenDigits, secondMultipliers);
  const allDigits = [...thirteenDigits, secondCheckDigit];

  const unformatted = allDigits.join('');

  if (formatted) {
    return `${unformatted.slice(0, 2)}.${unformatted.slice(2, 5)}.${unformatted.slice(5, 8)}/${unformatted.slice(8, 12)}-${unformatted.slice(12)}`;
  }

  return unformatted;
}
