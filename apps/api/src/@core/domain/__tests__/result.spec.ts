import { Result, ValidationError, NotFoundError, DomainError } from '../result';

describe('Result', () => {
  describe('ok', () => {
    it('should create a successful result', () => {
      const result = Result.ok(42);

      expect(result.isSuccess).toBe(true);
      expect(result.isFailure).toBe(false);
      expect(result.value).toBe(42);
    });

    it('should allow null values', () => {
      const result = Result.ok<string | null, Error>(null);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });
  });

  describe('fail', () => {
    it('should create a failed result', () => {
      const error = new Error('Test error');
      const result = Result.fail<number, Error>(error);

      expect(result.isSuccess).toBe(false);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
    });

    it('should throw when accessing value of failed result', () => {
      const result = Result.fail<number, Error>(new Error('Test'));

      expect(() => result.value).toThrow('Cannot get value of a failed result');
    });
  });

  describe('void', () => {
    it('should create a void success result', () => {
      const result = Result.void();

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeUndefined();
    });
  });

  describe('map', () => {
    it('should map success value', () => {
      const result = Result.ok(5).map((x) => x * 2);

      expect(result.value).toBe(10);
    });

    it('should not map failed result', () => {
      const error = new Error('Test');
      const result = Result.fail<number, Error>(error).map((x) => x * 2);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
    });
  });

  describe('flatMap', () => {
    it('should flatMap success value', () => {
      const result = Result.ok(5).flatMap((x) => Result.ok(x * 2));

      expect(result.value).toBe(10);
    });

    it('should propagate failure', () => {
      const error = new Error('Test');
      const result = Result.ok(5).flatMap(() => Result.fail<number, Error>(error));

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
    });
  });

  describe('getOrElse', () => {
    it('should return value for success', () => {
      const result = Result.ok(5);

      expect(result.getOrElse(0)).toBe(5);
    });

    it('should return default for failure', () => {
      const result = Result.fail<number, Error>(new Error('Test'));

      expect(result.getOrElse(0)).toBe(0);
    });
  });

  describe('match', () => {
    it('should call success handler for success', () => {
      const result = Result.ok(5);

      const matched = result.match({
        success: (x) => `Value: ${x}`,
        failure: (e) => `Error: ${e.message}`,
      });

      expect(matched).toBe('Value: 5');
    });

    it('should call failure handler for failure', () => {
      const result = Result.fail<number, Error>(new Error('Test'));

      const matched = result.match({
        success: (x) => `Value: ${x}`,
        failure: (e) => `Error: ${e.message}`,
      });

      expect(matched).toBe('Error: Test');
    });
  });

  describe('combine', () => {
    it('should combine multiple successful results', () => {
      const results = [Result.ok(1), Result.ok(2), Result.ok(3)];

      const combined = Result.combine(results);

      expect(combined.isSuccess).toBe(true);
      expect(combined.value).toEqual([1, 2, 3]);
    });

    it('should return first failure', () => {
      const error = new Error('First error');
      const results = [
        Result.ok(1),
        Result.fail<number, Error>(error),
        Result.ok(3),
      ];

      const combined = Result.combine(results);

      expect(combined.isFailure).toBe(true);
      expect(combined.error).toBe(error);
    });
  });

  describe('fromTry', () => {
    it('should wrap successful execution', () => {
      const result = Result.fromTry(() => 42);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should wrap thrown error', () => {
      const result = Result.fromTry(() => {
        throw new Error('Test error');
      });

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('Test error');
    });
  });
});

describe('DomainError', () => {
  it('should create domain error with code', () => {
    const error = new DomainError('TEST_ERROR', 'Test message');

    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test message');
    expect(error.name).toBe('DomainError');
  });
});

describe('ValidationError', () => {
  it('should create validation error with field', () => {
    const error = new ValidationError('Invalid value', 'fieldName');

    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid value');
    expect(error.field).toBe('fieldName');
    expect(error.name).toBe('ValidationError');
  });
});

describe('NotFoundError', () => {
  it('should create not found error with entity and id', () => {
    const error = new NotFoundError('Product', '123');

    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Product with id 123 not found');
    expect(error.name).toBe('NotFoundError');
  });

  it('should create not found error without id', () => {
    const error = new NotFoundError('Product');

    expect(error.message).toBe('Product not found');
  });
});
