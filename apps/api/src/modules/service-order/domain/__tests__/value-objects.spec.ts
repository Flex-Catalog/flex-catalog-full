import { ServicePeriod } from '../value-objects/service-period.vo';
import { VesselType } from '../value-objects/vessel-type.vo';
import { ServiceType } from '../value-objects/service-type.vo';

describe('ServicePeriod', () => {
  describe('create', () => {
    it('should create valid period', () => {
      const result = ServicePeriod.create('DAY');
      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe('DAY');
    });

    it('should fail with invalid period', () => {
      const result = ServicePeriod.create('INVALID');
      expect(result.isFailure).toBe(true);
    });

    it.each([
      ['DAY', 'Diurno'],
      ['NIGHT', 'Noturno'],
      ['DAY_NIGHT', 'Diurno + Noturno'],
      ['WEEKEND_DAY', 'Fim de Semana - Diurno'],
      ['WEEKEND_NIGHT', 'Fim de Semana - Noturno'],
      ['WEEKEND_DAY_NIGHT', 'Fim de Semana - Diurno + Noturno'],
      ['HOLIDAY', 'Feriado'],
    ])('should return correct label for %s', (period, expected) => {
      const result = ServicePeriod.create(period);
      expect(result.value.label()).toBe(expected);
    });
  });

  describe('fromTimes', () => {
    // Use local-time constructor to avoid UTC offset issues
    // June 16, 2025 = Monday, June 14 = Saturday, June 15 = Sunday
    const makeLocal = (y: number, m: number, d: number, h: number) =>
      new Date(y, m - 1, d, h, 0, 0);

    it('should detect DAY for weekday daytime', () => {
      const start = makeLocal(2025, 6, 16, 9);  // Monday 09h
      const end = makeLocal(2025, 6, 16, 15);   // Monday 15h
      const period = ServicePeriod.fromTimes(start, end);
      expect(period.value).toBe('DAY');
    });

    it('should detect NIGHT for weekday nighttime', () => {
      const start = makeLocal(2025, 6, 16, 20); // Monday 20h
      const end = makeLocal(2025, 6, 17, 3);    // Tuesday 03h
      const period = ServicePeriod.fromTimes(start, end);
      expect(period.value).toBe('NIGHT');
    });

    it('should detect DAY_NIGHT when spans day and night', () => {
      const start = makeLocal(2025, 6, 16, 10); // Monday 10h (day)
      const end = makeLocal(2025, 6, 16, 22);   // Monday 22h (night)
      const period = ServicePeriod.fromTimes(start, end);
      expect(period.value).toBe('DAY_NIGHT');
    });

    it('should detect WEEKEND_DAY for Saturday daytime', () => {
      const start = makeLocal(2025, 6, 14, 9);  // Saturday 09h
      const end = makeLocal(2025, 6, 14, 15);   // Saturday 15h
      const period = ServicePeriod.fromTimes(start, end);
      expect(period.value).toBe('WEEKEND_DAY');
    });

    it('should detect WEEKEND_NIGHT for Sunday nighttime', () => {
      const start = makeLocal(2025, 6, 15, 20); // Sunday 20h
      const end = makeLocal(2025, 6, 15, 23);   // Sunday 23h
      const period = ServicePeriod.fromTimes(start, end);
      expect(period.value).toBe('WEEKEND_NIGHT');
    });
  });

  describe('helpers', () => {
    it('isNight returns true for NIGHT', () => {
      expect(ServicePeriod.create('NIGHT').value.isNight()).toBe(true);
    });

    it('isNight returns true for WEEKEND_NIGHT', () => {
      expect(ServicePeriod.create('WEEKEND_NIGHT').value.isNight()).toBe(true);
    });

    it('isNight returns false for DAY', () => {
      expect(ServicePeriod.create('DAY').value.isNight()).toBe(false);
    });

    it('isWeekend returns true for weekend periods', () => {
      expect(ServicePeriod.create('WEEKEND_DAY').value.isWeekend()).toBe(true);
      expect(ServicePeriod.create('WEEKEND_NIGHT').value.isWeekend()).toBe(true);
      expect(ServicePeriod.create('WEEKEND_DAY_NIGHT').value.isWeekend()).toBe(true);
    });

    it('isWeekend returns false for weekday periods', () => {
      expect(ServicePeriod.create('DAY').value.isWeekend()).toBe(false);
      expect(ServicePeriod.create('NIGHT').value.isWeekend()).toBe(false);
    });

    it('isHoliday returns true for HOLIDAY', () => {
      expect(ServicePeriod.create('HOLIDAY').value.isHoliday()).toBe(true);
    });
  });

  describe('equality', () => {
    it('should be equal for same value', () => {
      const a = ServicePeriod.create('DAY').value;
      const b = ServicePeriod.create('DAY').value;
      expect(a.equals(b)).toBe(true);
    });

    it('should not be equal for different values', () => {
      const a = ServicePeriod.create('DAY').value;
      const b = ServicePeriod.create('NIGHT').value;
      expect(a.equals(b)).toBe(false);
    });
  });
});

describe('VesselType', () => {
  describe('create', () => {
    it('should create NATIONAL', () => {
      const result = VesselType.create('NATIONAL');
      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe('NATIONAL');
    });

    it('should create FOREIGN', () => {
      const result = VesselType.create('FOREIGN');
      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe('FOREIGN');
    });

    it('should normalize case', () => {
      const result = VesselType.create('national');
      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe('NATIONAL');
    });

    it('should fail with invalid type', () => {
      const result = VesselType.create('SUBMARINE');
      expect(result.isFailure).toBe(true);
    });
  });

  describe('factory methods', () => {
    it('national() creates NATIONAL', () => {
      expect(VesselType.national().value).toBe('NATIONAL');
    });

    it('foreign() creates FOREIGN', () => {
      expect(VesselType.foreign().value).toBe('FOREIGN');
    });
  });

  describe('helpers', () => {
    it('isNational returns true for NATIONAL', () => {
      expect(VesselType.national().isNational()).toBe(true);
    });

    it('isForeign returns true for FOREIGN', () => {
      expect(VesselType.foreign().isForeign()).toBe(true);
    });
  });

  describe('labels', () => {
    it('NATIONAL label is Nacional', () => {
      expect(VesselType.national().label()).toBe('Nacional');
    });

    it('FOREIGN label is Estrangeiro', () => {
      expect(VesselType.foreign().label()).toBe('Estrangeiro');
    });
  });
});

describe('ServiceType', () => {
  describe('create', () => {
    it('should create valid service type', () => {
      const result = ServiceType.create('CREW_TRANSPORT');
      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe('CREW_TRANSPORT');
    });

    it('should normalize case', () => {
      const result = ServiceType.create('crew_transport');
      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe('CREW_TRANSPORT');
    });

    it('should fail with invalid type', () => {
      const result = ServiceType.create('INVALID');
      expect(result.isFailure).toBe(true);
    });
  });

  describe('labels', () => {
    it.each([
      ['CREW_TRANSPORT', 'Condução de Tripulação'],
      ['SUPPLY_TRANSPORT', 'Transporte de Suprimentos'],
      ['EQUIPMENT_TRANSPORT', 'Transporte de Equipamentos'],
      ['INSPECTION', 'Inspeção'],
      ['PILOT_TRANSPORT', 'Transporte de Prático'],
      ['OTHER', 'Outros'],
    ])('should return correct label for %s', (type, expected) => {
      const result = ServiceType.create(type);
      expect(result.value.label()).toBe(expected);
    });
  });
});
