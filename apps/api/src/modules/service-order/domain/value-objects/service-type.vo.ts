import { SimpleValueObject } from '../../../../@core/domain/value-object.base';
import { Result, ValidationError } from '../../../../@core/domain/result';

/**
 * Service Type Value Object
 * Types of maritime/port services
 */
export const SERVICE_TYPES = [
  'CREW_TRANSPORT',        // Condução de tripulação
  'SUPPLY_TRANSPORT',      // Transporte de suprimentos
  'EQUIPMENT_TRANSPORT',   // Transporte de equipamentos
  'PERSONNEL_TRANSPORT',   // Condução de funcionários
  'INSPECTION',            // Inspeção
  'MAINTENANCE_SUPPORT',   // Apoio a manutenção
  'ANCHORING_SUPPORT',     // Apoio à fundeio
  'PILOT_TRANSPORT',       // Transporte de prático
  'CUSTOMS_TRANSPORT',     // Transporte de despachante/alfandega
  'MEDICAL_TRANSPORT',     // Transporte médico
  'OTHER',                 // Outros
] as const;

export type ServiceTypeValue = (typeof SERVICE_TYPES)[number];

export class ServiceType extends SimpleValueObject<ServiceTypeValue> {
  private constructor(value: ServiceTypeValue) {
    super(value);
  }

  static create(value: string): Result<ServiceType, ValidationError> {
    const normalized = value.toUpperCase().trim();
    if (!SERVICE_TYPES.includes(normalized as ServiceTypeValue)) {
      return Result.fail(
        new ValidationError(
          `Invalid service type. Must be one of: ${SERVICE_TYPES.join(', ')}`,
          'serviceType',
        ),
      );
    }
    return Result.ok(new ServiceType(normalized as ServiceTypeValue));
  }

  label(): string {
    const labels: Record<ServiceTypeValue, string> = {
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
    return labels[this._value];
  }
}
