/**
 * TableName Value Object
 *
 * Encapsulates a database table name with validation and formatting capabilities.
 */
export class TableName {
  private readonly _schema: string | null;
  private readonly _name: string;

  /**
   * Creates a new TableName value object.
   * @param name Table name (can include schema as "schema.table")
   */
  constructor(name: string) {
    if (!name || name.trim().length === 0) {
      throw new Error('Table name cannot be empty');
    }

    // Parse schema.table format
    const parts = name.trim().split('.');
    if (parts.length > 2) {
      throw new Error('Invalid table name format. Expected "schema.table" or "table"');
    }

    if (parts.length === 2) {
      this._schema = parts[0];
      this._name = parts[1];
    } else {
      this._schema = null;
      this._name = parts[0];
    }

    // Validate individual parts
    if (this._schema && this._schema.length === 0) {
      throw new Error('Schema name cannot be empty');
    }

    if (this._name.length === 0) {
      throw new Error('Table name cannot be empty');
    }
  }

  /**
   * Gets the table name without schema.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Gets the schema name (null if not specified).
   */
  get schema(): string | null {
    return this._schema;
  }

  /**
   * Gets the fully qualified name (schema.table or just table).
   */
  get fullName(): string {
    return this._schema ? `${this._schema}.${this._name}` : this._name;
  }

  /**
   * Checks if this table name has a specified schema.
   */
  hasSchema(): boolean {
    return this._schema !== null;
  }

  /**
   * Returns the fully qualified name.
   */
  toString(): string {
    return this.fullName;
  }

  /**
   * Compares two TableName objects for equality.
   * @param other The other TableName to compare with
   */
  equals(other: TableName): boolean {
    if (!(other instanceof TableName)) {
      return false;
    }

    return this.fullName.toLowerCase() === other.fullName.toLowerCase();
  }
}
