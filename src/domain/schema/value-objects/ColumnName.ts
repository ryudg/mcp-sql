/**
 * ColumnName Value Object
 *
 * Encapsulates a database column name with validation and formatting capabilities.
 */
export class ColumnName {
  private readonly _value: string;

  /**
   * Creates a new ColumnName value object.
   * @param name Column name
   */
  constructor(name: string) {
    if (!name || name.trim().length === 0) {
      throw new Error('Column name cannot be empty');
    }

    this._value = name.trim();
  }

  /**
   * Gets the column name value.
   */
  get value(): string {
    return this._value;
  }

  /**
   * Checks if this column name is likely a primary key.
   * Common naming patterns for primary keys include:
   * - id
   * - [table]_id
   * - [table]Id
   */
  isPossiblyPrimaryKey(): boolean {
    const lowerName = this._value.toLowerCase();
    return lowerName === 'id' || lowerName.endsWith('_id') || lowerName.endsWith('id');
  }

  /**
   * Checks if this column name is likely a foreign key.
   * Common naming patterns for foreign keys include:
   * - [table]_id
   * - [table]Id
   * - fk_[table]
   */
  isPossiblyForeignKey(): boolean {
    const lowerName = this._value.toLowerCase();
    return (
      (lowerName.endsWith('_id') && lowerName !== 'id') ||
      (lowerName.endsWith('id') && lowerName !== 'id') ||
      lowerName.startsWith('fk_')
    );
  }

  /**
   * Returns the column name.
   */
  toString(): string {
    return this._value;
  }

  /**
   * Compares two ColumnName objects for equality.
   * @param other The other ColumnName to compare with
   */
  equals(other: ColumnName): boolean {
    if (!(other instanceof ColumnName)) {
      return false;
    }

    return this._value.toLowerCase() === other.value.toLowerCase();
  }
}
