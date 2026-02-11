import { SimpleValueObject } from '../../../../@core/domain/value-object.base';
import { Result, ValidationError } from '../../../../@core/domain/result';

/**
 * Service Period Types
 * - DAY: 06:00 - 17:59 (weekday)
 * - NIGHT: 18:00 - 05:59 (weekday)
 * - DAY_NIGHT: Full day+night service
 * - WEEKEND_DAY: Saturday/Sunday day
 * - WEEKEND_NIGHT: Saturday/Sunday night
 * - HOLIDAY: Holiday service
 */
export const SERVICE_PERIODS = [
  'DAY',
  'NIGHT',
  'DAY_NIGHT',
  'WEEKEND_DAY',
  'WEEKEND_NIGHT',
  'WEEKEND_DAY_NIGHT',
  'HOLIDAY',
] as const;

export type ServicePeriodValue = (typeof SERVICE_PERIODS)[number];

export class ServicePeriod extends SimpleValueObject<ServicePeriodValue> {
  private constructor(value: ServicePeriodValue) {
    super(value);
  }

  static create(value: string): Result<ServicePeriod, ValidationError> {
    if (!SERVICE_PERIODS.includes(value as ServicePeriodValue)) {
      return Result.fail(
        new ValidationError(
          `Invalid period. Must be one of: ${SERVICE_PERIODS.join(', ')}`,
          'period',
        ),
      );
    }
    return Result.ok(new ServicePeriod(value as ServicePeriodValue));
  }

  /**
   * Auto-detect period from start/end times
   * Pure function
   */
  static fromTimes(startTime: Date, endTime: Date): ServicePeriod {
    const startHour = startTime.getHours();
    const endHour = endTime.getHours();
    const dayOfWeek = startTime.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const isDayStart = startHour >= 6 && startHour < 18;
    const isDayEnd = endHour >= 6 && endHour < 18;

    if (isWeekend) {
      if (isDayStart && isDayEnd) return new ServicePeriod('WEEKEND_DAY');
      if (!isDayStart && !isDayEnd) return new ServicePeriod('WEEKEND_NIGHT');
      return new ServicePeriod('WEEKEND_DAY_NIGHT');
    }

    if (isDayStart && isDayEnd) return new ServicePeriod('DAY');
    if (!isDayStart && !isDayEnd) return new ServicePeriod('NIGHT');
    return new ServicePeriod('DAY_NIGHT');
  }

  isNight(): boolean {
    return this._value === 'NIGHT' || this._value === 'WEEKEND_NIGHT';
  }

  isWeekend(): boolean {
    return (
      this._value === 'WEEKEND_DAY' ||
      this._value === 'WEEKEND_NIGHT' ||
      this._value === 'WEEKEND_DAY_NIGHT'
    );
  }

  isHoliday(): boolean {
    return this._value === 'HOLIDAY';
  }

  /**
   * Label for display
   */
  label(): string {
    const labels: Record<ServicePeriodValue, string> = {
      DAY: 'Diurno',
      NIGHT: 'Noturno',
      DAY_NIGHT: 'Diurno + Noturno',
      WEEKEND_DAY: 'Fim de Semana - Diurno',
      WEEKEND_NIGHT: 'Fim de Semana - Noturno',
      WEEKEND_DAY_NIGHT: 'Fim de Semana - Diurno + Noturno',
      HOLIDAY: 'Feriado',
    };
    return labels[this._value];
  }
}
