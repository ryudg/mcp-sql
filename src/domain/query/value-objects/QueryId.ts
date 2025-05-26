import { randomUUID } from 'crypto';

/**
 * QueryId Value Object
 *
 * Encapsulates query identifier with UUID generation capabilities.
 */
export class QueryId {
  private readonly _value: string;

  constructor(value?: string) {
    this._value = value || randomUUID();
  }

  get value(): string {
    return this._value;
  }

  equals(other: QueryId): boolean {
    if (!(other instanceof QueryId)) {
      return false;
    }
    return this._value === other.value;
  }

  toString(): string {
    return this._value;
  }

  /**
   * Creates a new QueryId instance.
   */
  static create(): QueryId {
    return new QueryId(randomUUID());
  }
}
