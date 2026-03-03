import { SimpleValueObject } from '../../../../@core/domain/value-object.base';
import { Result, ValidationError } from '../../../../@core/domain/result';

/**
 * Service Type Value Object
 * Accepts any uppercase slug (A-Z, 0-9, _) to support DB-managed service types.
 * Legacy hardcoded types are kept for backward compatibility with existing orders.
 */

// Legacy built-in types kept for label() fallback on old orders
const LEGACY_LABELS: Record<string, string> = {
  CREW_TRANSPORT: 'Condução de Tripulação',
  SUPPLY_TRANSPORT: 'Transporte de Suprimentos',
  EQUIPMENT_TRANSPORT: 'Transporte de Equipamentos',
  PERSONNEL_TRANSPORT: 'Condução de Funcionários',
  INSPECTION: 'Inspeção',
  MAINTENANCE_SUPPORT: 'Apoio à Manutenção',
  ANCHORING_SUPPORT: 'Apoio à Fundeio',
  PILOT_TRANSPORT: 'Transporte de Prático',
  CUSTOMS_TRANSPORT: 'Transporte Despachante/Alfândega',
  MEDICAL_TRANSPORT: 'Transporte Médico',
  OTHER: 'Outros',
};

export type ServiceTypeValue = string;

export class ServiceType extends SimpleValueObject<ServiceTypeValue> {
  private constructor(value: ServiceTypeValue) {
    super(value);
  }

  static create(value: string): Result<ServiceType, ValidationError> {
    const normalized = value.toUpperCase().trim();
    if (!normalized || !/^[A-Z0-9_]+$/.test(normalized) || normalized.length > 50) {
      return Result.fail(
        new ValidationError(
          'Service type code must contain only letters, numbers and underscores (max 50 chars)',
          'serviceType',
        ),
      );
    }
    return Result.ok(new ServiceType(normalized));
  }

  label(): string {
    return LEGACY_LABELS[this._value] ?? this._value;
  }
}
