/**
 * SchemaChangedEvent Domain Event
 *
 * Represents an event that occurs when database schema has been changed.
 * Contains information about the type of change and affected objects.
 */
export class SchemaChangedEvent {
  constructor(
    readonly databaseName: string,
    readonly changeType: 'CREATE' | 'ALTER' | 'DROP',
    readonly objectType: 'TABLE' | 'VIEW' | 'PROCEDURE' | 'FUNCTION' | 'INDEX' | 'CONSTRAINT',
    readonly objectName: string,
    readonly sql?: string,
    readonly timestamp: Date = new Date()
  ) {}

  /**
   * Checks if the change is a structural change (table/view creation or deletion)
   * @returns boolean indicating if it's a structural change
   */
  isStructuralChange(): boolean {
    return (
      (this.objectType === 'TABLE' || this.objectType === 'VIEW') &&
      (this.changeType === 'CREATE' || this.changeType === 'DROP')
    );
  }

  /**
   * Creates a summary of the schema change event.
   * @returns Summary string
   */
  getSummary(): string {
    return `${this.changeType} ${this.objectType} ${this.objectName} in ${this.databaseName}`;
  }
}
