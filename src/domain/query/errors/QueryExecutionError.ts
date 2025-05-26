/**
 * QueryExecutionError
 *
 * Domain-specific error for query execution failures.
 * Implements the 4H principles for user-friendly error messages.
 */
export class QueryExecutionError extends Error {
  constructor(
    readonly queryId: string,
    readonly originalError: Error,
    message: string = 'An error occurred during query execution'
  ) {
    super(`${message} (Query ID: ${queryId}): ${originalError.message}`);
    this.name = 'QueryExecutionError';

    // Ensure prototype chain is properly maintained
    Object.setPrototypeOf(this, QueryExecutionError.prototype);
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
    const baseMessage = 'We encountered an issue while running your query.';

    // Identify common SQL errors and provide helpful messages
    const originalMessage = this.originalError.message.toLowerCase();

    if (originalMessage.includes('syntax error')) {
      return `${baseMessage} There appears to be a syntax error in your SQL. Please check your query syntax and try again.`;
    }

    if (originalMessage.includes('permission') || originalMessage.includes('access denied')) {
      return `${baseMessage} You might not have the necessary permissions to perform this operation. Please contact your database administrator.`;
    }

    if (originalMessage.includes('timeout')) {
      return `${baseMessage} The query took too long to execute. Consider optimizing your query or breaking it into smaller parts.`;
    }

    if (originalMessage.includes('not found') || originalMessage.includes("doesn't exist")) {
      return `${baseMessage} One of the tables or columns referenced in your query doesn't exist. Please verify the object names.`;
    }

    // Default message for other errors
    return `${baseMessage} Please review your query and try again. If the problem persists, contact support with reference ID: ${this.queryId}.`;
  }
}
