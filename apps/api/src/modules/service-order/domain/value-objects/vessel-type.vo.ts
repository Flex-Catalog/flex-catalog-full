import { SimpleValueObject } from '../../../../@core/domain/value-object.base';
import { Result, ValidationError } from '../../../../@core/domain/result';

/**
 * Vessel Type Value Object
 * - NATIONAL: Brazilian flag vessel
 * - FOREIGN: Foreign flag vessel
 * Different rates may apply for each type
 */
export const VESSEL_TYPES = ['NATIONAL', 'FOREIGN'] as const;
export type VesselTypeValue = (typeof VESSEL_TYPES)[number];

export class VesselType extends SimpleValueObject<VesselTypeValue> {
  private constructor(value: VesselTypeValue) {
    super(value);
  }

  static create(value: string): Result<VesselType, ValidationError> {
    const normalized = value.toUpperCase().trim();
    if (!VESSEL_TYPES.includes(normalized as VesselTypeValue)) {
      return Result.fail(
        new ValidationError(
          `Invalid vessel type. Must be: ${VESSEL_TYPES.join(', ')}`,
          'vesselType',
        ),
      );
    }
    return Result.ok(new VesselType(normalized as VesselTypeValue));
  }

  static national(): VesselType {
    return new VesselType('NATIONAL');
  }

  static foreign(): VesselType {
    return new VesselType('FOREIGN');
  }

  isNational(): boolean {
    return this._value === 'NATIONAL';
  }

  isForeign(): boolean {
    return this._value === 'FOREIGN';
  }

  label(): string {
    return this._value === 'NATIONAL' ? 'Nacional' : 'Estrangeiro';
  }
}
