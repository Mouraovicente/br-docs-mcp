export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export interface BoletoData {
  bankCode: string;
  amount: number;
  maturity: Date;
}

const BASE_DATE = new Date(1997, 9, 7); // October 7, 1997

function cleanBoleto(boleto: string): string {
  return boleto.replace(/[^\d]/g, '');
}

function calculateMod10(digits: string): string {
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
}

function calculateMod11(digits: string): string {
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
}

export function validateBoleto(input: string): ValidationResult {
  const cleaned = cleanBoleto(input);

  if (cleaned.length !== 47) {
    return { valid: false, reason: 'invalid length' };
  }

  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, reason: 'invalid characters' };
  }

  // Linha digitável structure (47 digits):
  // 0-3:   Banco (4 digits: bank code 3 + DV 1)
  // 4-10:  Sequência 1 (7 digits: sequence + DV1)
  // 11-20: Sequência 2 (10 digits)
  // 21-30: Sequência 3 (10 digits)
  // 31:    DV geral (1 digit)
  // 32-36: Vencimento (5 digits)
  // 37-46: Valor (10 digits)

  const banco = cleaned.substring(0, 4);
  const seq1 = cleaned.substring(4, 10);
  const seq1Dv = cleaned.substring(10, 11);
  const seq2 = cleaned.substring(11, 21);
  const seq3 = cleaned.substring(21, 31);
  const dvGeral = cleaned.substring(31, 32);
  const vencimento = cleaned.substring(32, 37);
  const valor = cleaned.substring(37, 47);

  // Validate seq1 DV (mod10)
  const expectedSeq1Dv = calculateMod10(banco + seq1);
  if (expectedSeq1Dv !== seq1Dv) {
    return { valid: false, reason: 'sequence 1 check digit mismatch' };
  }

  // Reconstruct code of barcode for general DV
  // Barcode: BBB (bank without DV) + VV (vencimento) + VVVVVVVVVV (valor) + CCCCCCCC (company/sequence)
  const bankWithoutDv = banco.substring(0, 3);
  const codigoBarras = bankWithoutDv + vencimento + valor + seq1 + seq2 + seq3;

  const expectedDvGeral = calculateMod11(codigoBarras);
  if (expectedDvGeral !== dvGeral) {
    return { valid: false, reason: 'general check digit mismatch' };
  }

  return { valid: true };
}

export function parseBoleto(input: string): BoletoData {
  const validation = validateBoleto(input);
  if (!validation.valid) {
    throw new Error(`Invalid boleto: ${validation.reason}`);
  }

  const cleaned = cleanBoleto(input);

  const bankCode = cleaned.substring(0, 3);
  const vencimento = cleaned.substring(32, 37);
  const valor = cleaned.substring(37, 47);

  // Decode vencimento (maturity factor)
  // Factor is days since October 7, 1997
  const diasAposBase = parseInt(vencimento, 10);
  const maturity = new Date(BASE_DATE);
  maturity.setDate(maturity.getDate() + diasAposBase);

  // Decode valor (amount in cents, divide by 100)
  const amount = parseInt(valor, 10) / 100;

  return {
    bankCode,
    amount,
    maturity,
  };
}
