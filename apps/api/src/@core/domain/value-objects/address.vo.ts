import { ValueObject } from '../value-object.base';
import { Result, ValidationError } from '../result';

/**
 * Address Value Object
 * - Immutability: All properties readonly
 * - Pure validation
 * - SRP: Only address data
 */
interface AddressProps {
  readonly street: string;
  readonly number: string;
  readonly complement?: string;
  readonly neighborhood: string;
  readonly city: string;
  readonly cityCode?: string;
  readonly state: string;
  readonly zipCode: string;
  readonly country: string;
}

export class Address extends ValueObject<AddressProps> {
  private constructor(props: AddressProps) {
    super(props);
  }

  get street(): string {
    return this.props.street;
  }

  get number(): string {
    return this.props.number;
  }

  get complement(): string | undefined {
    return this.props.complement;
  }

  get neighborhood(): string {
    return this.props.neighborhood;
  }

  get city(): string {
    return this.props.city;
  }

  get cityCode(): string | undefined {
    return this.props.cityCode;
  }

  get state(): string {
    return this.props.state;
  }

  get zipCode(): string {
    return this.props.zipCode;
  }

  get country(): string {
    return this.props.country;
  }

  /**
   * Factory method with validation
   */
  static create(props: AddressProps): Result<Address, ValidationError> {
    const errors: string[] = [];

    if (!props.street?.trim()) {
      errors.push('Street is required');
    }
    if (!props.number?.trim()) {
      errors.push('Number is required');
    }
    if (!props.neighborhood?.trim()) {
      errors.push('Neighborhood is required');
    }
    if (!props.city?.trim()) {
      errors.push('City is required');
    }
    if (!props.state?.trim()) {
      errors.push('State is required');
    }
    if (!props.zipCode?.trim()) {
      errors.push('Zip code is required');
    }
    if (!props.country?.trim()) {
      errors.push('Country is required');
    }

    if (errors.length > 0) {
      return Result.fail(new ValidationError(errors.join(', '), 'address'));
    }

    return Result.ok(
      new Address({
        street: props.street.trim(),
        number: props.number.trim(),
        complement: props.complement?.trim(),
        neighborhood: props.neighborhood.trim(),
        city: props.city.trim(),
        cityCode: props.cityCode?.trim(),
        state: props.state.trim().toUpperCase(),
        zipCode: props.zipCode.replace(/\D/g, ''),
        country: props.country.trim().toUpperCase(),
      }),
    );
  }

  /**
   * Pure function: Formats as single line
   */
  format(): string {
    const parts = [
      this.street,
      this.number,
      this.complement,
      this.neighborhood,
      this.city,
      this.state,
      this.zipCode,
      this.country,
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Pure function: Formats as multiline
   */
  formatMultiline(): string {
    const lines = [
      `${this.street}, ${this.number}${this.complement ? ` - ${this.complement}` : ''}`,
      this.neighborhood,
      `${this.city} - ${this.state}`,
      this.zipCode,
      this.country,
    ];

    return lines.join('\n');
  }

  toPrimitives(): AddressProps {
    return { ...this.props };
  }
}
