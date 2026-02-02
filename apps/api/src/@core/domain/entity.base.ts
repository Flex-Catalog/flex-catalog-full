/**
 * Base Entity class following DDD principles
 * - Immutability: Properties are readonly
 * - SRP: Only handles identity and equality
 * - Law of Demeter: No deep property access
 */
export abstract class Entity<TId> {
  private readonly _id: TId;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  protected constructor(id: TId, createdAt?: Date) {
    this._id = id;
    this._createdAt = createdAt ?? new Date();
    this._updatedAt = this._createdAt;
  }

  get id(): TId {
    return this._id;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  protected touch(): void {
    this._updatedAt = new Date();
  }

  /**
   * Pure function: Equality check based on identity
   */
  equals(other: Entity<TId> | null | undefined): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (this === other) {
      return true;
    }
    if (!(other instanceof Entity)) {
      return false;
    }
    return this._id === other._id;
  }
}
