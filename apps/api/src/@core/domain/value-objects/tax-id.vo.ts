import { SimpleValueObject } from '../value-object.base';
import { Result, ValidationError } from '../result';

/**
 * Tax ID Value Object
 * - Supports multiple countries (Brazil CPF/CNPJ, US EIN, Portugal NIF)
 * - Immutability
 * - Pure validation functions
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
   * Factory for Brazilian CPF/CNPJ
   */
  static createBrazilian(value: string): Result<TaxId, ValidationError> {
    const digits = value.replace(/\D/g, '');

    if (digits.length === 11) {
      if (!TaxId.isValidCpf(digits)) {
        return Result.fail(new ValidationError('Invalid CPF', 'taxId'));
      }
      return Result.ok(new TaxId(digits, 'BR', 'CPF'));
    }

    if (digits.length === 14) {
      if (!TaxId.isValidCnpj(digits)) {
        return Result.fail(new ValidationError('Invalid CNPJ', 'taxId'));
      }
      return Result.ok(new TaxId(digits, 'BR', 'CNPJ'));
    }

    return Result.fail(new ValidationError('Tax ID must be CPF (11 digits) or CNPJ (14 digits)', 'taxId'));
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
   * Pure function: Validates Brazilian CPF
   */
  private static isValidCpf(cpf: string): boolean {
    if (/^(\d)\1+$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cpf.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;

    return digit === parseInt(cpf.charAt(10));
  }

  /**
   * Pure function: Validates Brazilian CNPJ
   */
  private static isValidCnpj(cnpj: string): boolean {
    if (/^(\d)\1+$/.test(cnpj)) return false;

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights1[i];
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cnpj.charAt(12))) return false;

    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights2[i];
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;

    return digit === parseInt(cnpj.charAt(13));
  }

  /**
   * Pure function: Validates Portuguese NIF
   */
  private static isValidNif(nif: string): boolean {
    const validFirstDigits = ['1', '2', '3', '5', '6', '7', '8', '9'];
    if (!validFirstDigits.includes(nif.charAt(0))) return false;

    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(nif.charAt(i)) * (9 - i);
    }
    const checkDigit = 11 - (sum % 11);
    const finalDigit = checkDigit >= 10 ? 0 : checkDigit;

    return finalDigit === parseInt(nif.charAt(8));
  }

  /**
   * Pure function: Formats with mask
   */
  formatted(): string {
    switch (this._type) {
      case 'CPF':
        return this._value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      case 'CNPJ':
        return this._value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      case 'EIN':
        return this._value.replace(/(\d{2})(\d{7})/, '$1-$2');
      case 'NIF':
        return this._value.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
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
