/**
 * SchemaValidationError
 *
 * Domain-specific error for schema validation failures.
 * Implements the 4H principles for user-friendly error messages.
 */
export class SchemaValidationError extends Error {
  constructor(
    readonly objectType: string,
    readonly objectName: string,
    readonly validationIssue: string,
    message: string = 'Schema validation failed'
  ) {
    super(`${message}: ${validationIssue} for ${objectType} '${objectName}'`);
    this.name = 'SchemaValidationError';

    // Ensure prototype chain is properly maintained
    Object.setPrototypeOf(this, SchemaValidationError.prototype);
  }

  /**
   * Gets a human-readable error message following the 4H principles:
   * - Human: Written in human language
   * - Helpful: Provides context and possible solutions
   * - Humorous: Keeps a light tone (where appropriate)
   * - Humble: Doesn't blame the user
   *
   * @returns User-friendly error message
   */
  getHumanReadableMessage(): string {
    const baseMessage = `We found an issue with the ${this.objectType.toLowerCase()} "${this.objectName}".`;

    // Provide specific guidance based on the validation issue
    if (
      this.validationIssue.includes('not found') ||
      this.validationIssue.includes('does not exist')
    ) {
      return `${baseMessage} It doesn't seem to exist in the database. Please check the name and try again.`;
    }

    if (this.validationIssue.includes('permission')) {
      return `${baseMessage} You might not have permission to access it. Please contact your database administrator.`;
    }

    if (this.validationIssue.includes('column')) {
      return `${baseMessage} There appears to be an issue with one of its columns. Please verify the column definitions.`;
    }

    // Default message for other validation issues
    return `${baseMessage} ${this.validationIssue}. Please review the schema and try again.`;
  }

  /**
   * Gets specific recommendations to fix the validation issue.
   * @returns Array of recommendation strings
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    // Add general recommendations
    recommendations.push('Verify that the object name is spelled correctly');
    recommendations.push('Check that you have the necessary permissions');

    // Add specific recommendations based on object type
    if (this.objectType.toLowerCase() === 'table') {
      recommendations.push('Ensure the table exists in the current database');
      recommendations.push('Check if the table is in a different schema');
    } else if (this.objectType.toLowerCase() === 'column') {
      recommendations.push('Verify the column exists in the specified table');
      recommendations.push('Check for typos in the column name');
    }

    return recommendations;
  }
}
