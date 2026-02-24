import { SimpleValueObject } from '../value-object.base';
import { Result, ValidationError } from '../result';

/**
 * Tax ID Value Object
 * - Supports multiple countries (Brazil CPF/CNPJ, US EIN, Portugal NIF)
 * - Immutability
 * - Pure validation functions
 *
 * CNPJ Alfanumérico: A partir de julho/2026 (IN RFB nº 2229/2024), novos CNPJs
 * podem conter letras (A-Z) nas posições 1 a 8 (antes da barra).
 * O algoritmo de validação usa charToValue: 0-9 = face value, A-Z = 10..35.
 * Os últimos 6 caracteres (filial 0001 + 2 dígitos verificadores) continuam numéricos.
 */
export type TaxIdCountry = 'BR' | 'US' | 'PT';
export type TaxIdType = 'CPF' | 'CNPJ' | 'EIN' | 'NIF';

interface TaxIdData {
  readonly value: string;
  readonly country: TaxIdCountry;
  readonly type: TaxIdType;
}

export class TaxId extends SimpleValueObject<string> {
  private readonly _country: TaxIdCountry;
  private readonly _type: TaxIdType;

  private constructor(value: string, country: TaxIdCountry, type: TaxIdType) {
    super(value);
    this._country = country;
    this._type = type;
  }

  get country(): TaxIdCountry {
    return this._country;
  }

  get type(): TaxIdType {
    return this._type;
  }

  /**
   * Strip CNPJ/CPF formatting characters only (., -, /, spaces).
   * Letters are PRESERVED because CNPJ can be alphanumeric from July 2026.
   * Result is uppercased for consistency.
   */
  private static stripBrazilianId(value: string): string {
    return value.replace(/[.\-\/\s]/g, '').toUpperCase();
  }

  /**
   * Factory for Brazilian CPF/CNPJ
   * - CPF: 11 chars, always digits (000.000.000-00)
   * - CNPJ: 14 chars, may contain A-Z in first 8 positions (XX.XXX.XXX/0001-00)
   */
  static createBrazilian(value: string): Result<TaxId, ValidationError> {
    const normalized = TaxId.stripBrazilianId(value);

    if (normalized.length === 11) {
      // CPF — always numeric
      if (!/^\d{11}$/.test(normalized)) {
        return Result.fail(new ValidationError('CPF deve conter apenas dígitos', 'taxId'));
      }
      if (!TaxId.isValidCpf(normalized)) {
        return Result.fail(new ValidationError('CPF inválido', 'taxId'));
      }
      return Result.ok(new TaxId(normalized, 'BR', 'CPF'));
    }

    if (normalized.length === 14) {
      // CNPJ — pode ser alfanumérico (A-Z nos primeiros 8 caracteres)
      if (!TaxId.isValidCnpj(normalized)) {
        return Result.fail(new ValidationError('CNPJ inválido', 'taxId'));
      }
      return Result.ok(new TaxId(normalized, 'BR', 'CNPJ'));
    }

    return Result.fail(
      new ValidationError(
        'CPF deve ter 11 caracteres ou CNPJ deve ter 14 caracteres (sem formatação)',
        'taxId',
      ),
    );
  }

  /**
   * Factory for US EIN
   */
  static createUS(value: string): Result<TaxId, ValidationError> {
    const digits = value.replace(/\D/g, '');

    if (digits.length !== 9) {
      return Result.fail(new ValidationError('EIN must have 9 digits', 'taxId'));
    }

    return Result.ok(new TaxId(digits, 'US', 'EIN'));
  }

  /**
   * Factory for Portuguese NIF
   */
  static createPortuguese(value: string): Result<TaxId, ValidationError> {
    const digits = value.replace(/\D/g, '');

    if (digits.length !== 9) {
      return Result.fail(new ValidationError('NIF must have 9 digits', 'taxId'));
    }

    if (!TaxId.isValidNif(digits)) {
      return Result.fail(new ValidationError('Invalid NIF', 'taxId'));
    }

    return Result.ok(new TaxId(digits, 'PT', 'NIF'));
  }

  /**
   * Factory from country code
   */
  static create(value: string, country: TaxIdCountry): Result<TaxId, ValidationError> {
    switch (country) {
      case 'BR':
        return TaxId.createBrazilian(value);
      case 'US':
        return TaxId.createUS(value);
      case 'PT':
        return TaxId.createPortuguese(value);
      default:
        return Result.fail(new ValidationError(`Unsupported country: ${country}`, 'country'));
    }
  }

  /**
   * Pure function: Validates Brazilian CPF (always numeric)
   */
  private static isValidCpf(cpf: string): boolean {
    // Rejects sequences of the same digit (000.000.000-00, etc.)
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i), 10) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cpf.charAt(9), 10)) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i), 10) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;

    return digit === parseInt(cpf.charAt(10), 10);
  }

  /**
   * Converts a CNPJ character to its numeric value for checksum calculation.
   * IN RFB nº 2229/2024:
   *   - '0'..'9' → 0..9
   *   - 'A'..'Z' → 10..35
   * The check digits (positions 12 and 13) must always be '0'..'9'.
   */
  private static cnpjCharToValue(ch: string): number {
    const code = ch.charCodeAt(0);
    if (code >= 48 && code <= 57) return code - 48;      // '0'-'9'
    if (code >= 65 && code <= 90) return code - 55;      // 'A'-'Z' → 10..35
    return NaN;
  }

  /**
   * Pure function: Validates Brazilian CNPJ (numeric or alphanumeric).
   * Supports both the legacy all-digit format and the new alphanumeric format
   * introduced by IN RFB nº 2229/2024 (effective July 2026).
   */
  private static isValidCnpj(cnpj: string): boolean {
    // All same characters? (e.g. "00000000000000") → invalid
    if (/^(.)\1{13}$/.test(cnpj)) return false;

    // Positions 0-11 can be alphanumeric (A-Z or 0-9)
    // Positions 12-13 MUST be digits (check digits)
    const validPattern = /^[A-Z0-9]{12}\d{2}$/;
    if (!validPattern.test(cnpj)) return false;

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    // First check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const val = TaxId.cnpjCharToValue(cnpj.charAt(i));
      if (isNaN(val)) return false;
      sum += val * weights1[i];
    }
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    if (digit1 !== parseInt(cnpj.charAt(12), 10)) return false;

    // Second check digit
    sum = 0;
    for (let i = 0; i < 13; i++) {
      const val = TaxId.cnpjCharToValue(cnpj.charAt(i));
      if (isNaN(val)) return false;
      sum += val * weights2[i];
    }
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;

    return digit2 === parseInt(cnpj.charAt(13), 10);
  }

  /**
   * Pure function: Validates Portuguese NIF
   */
  private static isValidNif(nif: string): boolean {
    const validFirstDigits = ['1', '2', '3', '5', '6', '7', '8', '9'];
    if (!validFirstDigits.includes(nif.charAt(0))) return false;

    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(nif.charAt(i), 10) * (9 - i);
    }
    const checkDigit = 11 - (sum % 11);
    const finalDigit = checkDigit >= 10 ? 0 : checkDigit;

    return finalDigit === parseInt(nif.charAt(8), 10);
  }

  /**
   * Formats the value with the standard mask.
   * For alphanumeric CNPJ: XX.XXX.XXX/0001-00
   */
  formatted(): string {
    switch (this._type) {
      case 'CPF':
        return this._value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
      case 'CNPJ':
        // Handles both numeric and alphanumeric CNPJs
        return this._value.replace(
          /^([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]{3})(\d{4})(\d{2})$/,
          '$1.$2.$3/$4-$5',
        );
      case 'EIN':
        return this._value.replace(/^(\d{2})(\d{7})$/, '$1-$2');
      case 'NIF':
        return this._value.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3');
      default:
        return this._value;
    }
  }

  toData(): TaxIdData {
    return {
      value: this._value,
      country: this._country,
      type: this._type,
    };
  }
}
