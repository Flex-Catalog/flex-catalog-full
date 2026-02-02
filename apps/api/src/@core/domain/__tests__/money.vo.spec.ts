import { Money } from '../value-objects/money.vo';

describe('Money Value Object', () => {
  describe('create', () => {
    it('should create money with valid input', () => {
      const result = Money.create(1000, 'BRL');

      expect(result.isSuccess).toBe(true);
      expect(result.value.amountInCents).toBe(1000);
      expect(result.value.currency).toBe('BRL');
    });

    it('should fail with negative amount', () => {
      const result = Money.create(-100, 'BRL');

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('negative');
    });

    it('should fail with non-integer amount', () => {
      const result = Money.create(10.5, 'BRL');

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('integer');
    });

    it('should fail with unsupported currency', () => {
      const result = Money.create(100, 'XYZ');

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('Currency');
    });
  });

  describe('fromDecimal', () => {
    it('should convert decimal to cents', () => {
      const result = Money.fromDecimal(10.5, 'USD');

      expect(result.isSuccess).toBe(true);
      expect(result.value.amountInCents).toBe(1050);
    });

    it('should round correctly', () => {
      const result = Money.fromDecimal(10.999, 'USD');

      expect(result.value.amountInCents).toBe(1100);
    });
  });

  describe('amount', () => {
    it('should return decimal amount', () => {
      const money = Money.create(1050, 'BRL').value;

      expect(money.amount).toBe(10.5);
    });
  });

  describe('add', () => {
    it('should add two money values', () => {
      const a = Money.create(1000, 'BRL').value;
      const b = Money.create(500, 'BRL').value;

      const result = a.add(b);

      expect(result.isSuccess).toBe(true);
      expect(result.value.amountInCents).toBe(1500);
    });

    it('should fail when currencies differ', () => {
      const a = Money.create(1000, 'BRL').value;
      const b = Money.create(500, 'USD').value;

      const result = a.add(b);

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('different currencies');
    });
  });

  describe('subtract', () => {
    it('should subtract money values', () => {
      const a = Money.create(1000, 'BRL').value;
      const b = Money.create(300, 'BRL').value;

      const result = a.subtract(b);

      expect(result.isSuccess).toBe(true);
      expect(result.value.amountInCents).toBe(700);
    });

    it('should fail when result is negative', () => {
      const a = Money.create(100, 'BRL').value;
      const b = Money.create(300, 'BRL').value;

      const result = a.subtract(b);

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('negative');
    });
  });

  describe('multiply', () => {
    it('should multiply by quantity', () => {
      const money = Money.create(100, 'BRL').value;

      const result = money.multiply(3);

      expect(result.isSuccess).toBe(true);
      expect(result.value.amountInCents).toBe(300);
    });

    it('should fail with negative quantity', () => {
      const money = Money.create(100, 'BRL').value;

      const result = money.multiply(-1);

      expect(result.isFailure).toBe(true);
    });
  });

  describe('comparison', () => {
    it('should compare greater than', () => {
      const a = Money.create(1000, 'BRL').value;
      const b = Money.create(500, 'BRL').value;

      expect(a.isGreaterThan(b)).toBe(true);
      expect(b.isGreaterThan(a)).toBe(false);
    });

    it('should compare less than', () => {
      const a = Money.create(500, 'BRL').value;
      const b = Money.create(1000, 'BRL').value;

      expect(a.isLessThan(b)).toBe(true);
      expect(b.isLessThan(a)).toBe(false);
    });

    it('should check zero', () => {
      const zero = Money.create(0, 'BRL').value;
      const nonZero = Money.create(100, 'BRL').value;

      expect(zero.isZero()).toBe(true);
      expect(nonZero.isZero()).toBe(false);
    });
  });

  describe('format', () => {
    it('should format as currency string', () => {
      const money = Money.create(1050, 'USD').value;

      const formatted = money.format('en-US');

      expect(formatted).toContain('10.50');
      expect(formatted).toContain('$');
    });
  });

  describe('equals', () => {
    it('should be equal with same values', () => {
      const a = Money.create(1000, 'BRL').value;
      const b = Money.create(1000, 'BRL').value;

      expect(a.equals(b)).toBe(true);
    });

    it('should not be equal with different amounts', () => {
      const a = Money.create(1000, 'BRL').value;
      const b = Money.create(500, 'BRL').value;

      expect(a.equals(b)).toBe(false);
    });

    it('should not be equal with different currencies', () => {
      const a = Money.create(1000, 'BRL').value;
      const b = Money.create(1000, 'USD').value;

      expect(a.equals(b)).toBe(false);
    });
  });
});
