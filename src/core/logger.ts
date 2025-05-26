/**
 * Log level type
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log metadata interface
 */
export interface LogMetadata {
  [key: string]: any;
}

/**
 * Log entry interface
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: LogMetadata;
}

/**
 * Enhanced Logging System
 *
 * Features:
 * - Structured logging
 * - Multiple log levels
 * - Metadata support
 * - Performance optimization
 */
export class Logger {
  private logLevel: LogLevel;
  private enableConsoleOutput: boolean;
  private logHistory: LogEntry[] = [];
  private maxHistorySize: number = 1000;

  constructor(logLevel: LogLevel = 'info', enableConsoleOutput: boolean = true) {
    this.logLevel = logLevel;
    this.enableConsoleOutput = enableConsoleOutput;
  }

  /**
   * Map log level priority
   */
  private getLevelPriority(level: LogLevel): number {
    const priorities = { debug: 0, info: 1, warn: 2, error: 3 };
    return priorities[level];
  }

  /**
   * Check if current log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return this.getLevelPriority(level) >= this.getLevelPriority(this.logLevel);
  }

  /**
   * Format log message
   */
  private formatMessage(level: LogLevel, message: string, metadata?: LogMetadata): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);

    let formattedMessage = `[${timestamp}] [${levelStr}] ${message}`;

    if (metadata) {
      try {
        const metadataStr = JSON.stringify(metadata, null, 2);
        formattedMessage += ` ${metadataStr}`;
      } catch (error) {
        // Handle circular references and other JSON stringify errors
        formattedMessage += ` [metadata formatting error: ${
          error instanceof Error ? error.message : String(error)
        }]`;
      }
    }

    return formattedMessage;
  }

  /**
   * Save log entry
   */
  private saveLogEntry(level: LogLevel, message: string, metadata?: LogMetadata): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.logHistory.push(entry);

    // Limit history size
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory = this.logHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Base logging method
   */
  private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog(level)) return;

    // Save log entry
    this.saveLogEntry(level, message, metadata);

    if (this.enableConsoleOutput) {
      const formattedMessage = this.formatMessage(level, message, metadata);

      // Console output (use stderr to avoid affecting MCP communication)
      switch (level) {
        case 'debug':
          process.stderr.write(`[DEBUG] ${formattedMessage}\n`);
          break;
        case 'info':
          process.stderr.write(`[INFO] ${formattedMessage}\n`);
          break;
        case 'warn':
          process.stderr.write(`[WARN] ${formattedMessage}\n`);
          break;
        case 'error':
          process.stderr.write(`[ERROR] ${formattedMessage}\n`);
          break;
      }
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, metadata?: LogMetadata): void {
    this.log('debug', message, metadata);
  }

  /**
   * Info level logging
   */
  info(message: string, metadata?: LogMetadata): void {
    this.log('info', message, metadata);
  }

  /**
   * Warning level logging
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.log('warn', message, metadata);
  }

  /**
   * Error level logging
   */
  error(message: string, metadata?: LogMetadata): void {
    this.log('error', message, metadata);
  }

  /**
   * Start performance measurement
   */
  startTimer(label: string): () => void {
    const startTime = process.hrtime.bigint();

    return () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

      this.debug(`Performance measurement: ${label}`, {
        executionTime: `${duration.toFixed(2)}ms`,
        label,
      });
    };
  }

  /**
   * Log query execution
   */
  logQuery(query: string, executionTime: number, success: boolean, metadata?: LogMetadata): void {
    const queryPreview = query.length > 100 ? `${query.substring(0, 100)}...` : query;

    if (success) {
      this.info('Query execution successful', {
        query: queryPreview,
        executionTime: `${executionTime}ms`,
        ...metadata,
      });
    } else {
      this.error('Query execution failed', {
        query: queryPreview,
        executionTime: `${executionTime}ms`,
        ...metadata,
      });
    }
  }

  /**
   * Log connection status
   */
  logConnection(action: string, success: boolean, metadata?: LogMetadata): void {
    if (success) {
      this.info(`Database ${action} successful`, metadata);
    } else {
      this.error(`Database ${action} failed`, metadata);
    }
  }

  /**
   * Log security events
   */
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high',
    metadata?: LogMetadata
  ): void {
    const level = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
    this.log(level, `Security event: ${event}`, { severity, ...metadata });
  }

  /**
   * Change log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`Log level changed to ${level}.`);
  }

  /**
   * Get log history
   */
  getLogHistory(level?: LogLevel, limit?: number): LogEntry[] {
    let filtered = this.logHistory;

    if (level) {
      filtered = filtered.filter(entry => entry.level === level);
    }

    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
    // Note: Do not log this action to avoid immediately adding to cleared history
  }

  /**
   * Get log statistics
   */
  getStatistics(): { [level in LogLevel]: number } {
    const stats = { debug: 0, info: 0, warn: 0, error: 0 };

    this.logHistory.forEach(entry => {
      stats[entry.level]++;
    });

    return stats;
  }
}
