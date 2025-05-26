/**
 * QueryString Value Object
 *
 * Encapsulates SQL query string with validation and query type identification capabilities.
 */
export class QueryString {
  private readonly _value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Query string cannot be empty');
    }
    this._value = value.trim();
  }

  get value(): string {
    return this._value;
  }

  isSelect(): boolean {
    return this._value.toLowerCase().startsWith('select');
  }

  isModifying(): boolean {
    const lowerValue = this._value.toLowerCase();
    return (
      lowerValue.startsWith('insert') ||
      lowerValue.startsWith('update') ||
      lowerValue.startsWith('delete')
    );
  }

  isStoredProcedure(): boolean {
    return (
      this._value.toLowerCase().startsWith('exec') ||
      this._value.toLowerCase().startsWith('execute')
    );
  }

  toString(): string {
    return this._value;
  }
}
