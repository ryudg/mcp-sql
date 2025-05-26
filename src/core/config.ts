import dotenv from 'dotenv';
import { DatabaseConfig } from '../types/database.types.js';

/**
 * Configuration Manager Class
 *
 * Manages environment variable loading and application configuration
 */
export class ConfigManager {
  constructor() {
    // Load environment variables
    dotenv.config();
  }

  /**
   * Get environment variable value
   */
  get(key: string, defaultValue?: string): string {
    return process.env[key] || defaultValue || '';
  }

  /**
   * Get environment variable as number
   */
  getNumber(key: string, defaultValue: number = 0): number {
    const value = process.env[key];
    if (!value) return defaultValue;

    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get environment variable as boolean
   */
  getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = process.env[key]?.toLowerCase();
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return defaultValue;
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig(): DatabaseConfig {
    return {
      host: this.get('DB_SERVER', this.get('DB_HOST', 'localhost')),
      database: this.get('DB_DATABASE', this.get('DB_NAME', 'master')),
      user: this.get('DB_USER', 'sa'),
      password: this.get('DB_PASSWORD', ''),
      port: this.getNumber('DB_PORT', 1433),
      ssl: this.getBoolean('DB_ENCRYPT', this.getBoolean('DB_SSL', false)),
      options: {
        trustServerCertificate: this.getBoolean(
          'DB_TRUST_SERVER_CERTIFICATE',
          this.getBoolean('DB_TRUST_CERT', true)
        ),
        requestTimeout: this.getNumber('DB_REQUEST_TIMEOUT', 30000),
        connectionTimeout: this.getNumber('DB_CONNECTION_TIMEOUT', 15000),
        pool: {
          max: this.getNumber('DB_POOL_MAX', 10),
          min: this.getNumber('DB_POOL_MIN', 0),
          idleTimeoutMillis: this.getNumber('DB_POOL_IDLE_TIMEOUT', 30000),
        },
      },
    };
  }

  /**
   * Get server configuration
   */
  getServerConfig() {
    return {
      name: this.get('MCP_SERVER_NAME', 'mcp-sql'),
      version: `v${process.env.npm_package_version}`,
      logLevel: 'info',
      enableMetrics: this.getBoolean('ENABLE_METRICS', true),
      enableSecurity: this.getBoolean('ENABLE_SECURITY', true),
    };
  }

  /**
   * Get performance monitoring configuration
   */
  getPerformanceConfig() {
    return {
      enableMonitoring: this.getBoolean('ENABLE_PERFORMANCE_MONITORING', true),
      metricsInterval: this.getNumber('METRICS_INTERVAL', 5000),
      slowQueryThreshold: this.getNumber('SLOW_QUERY_THRESHOLD', 1000),
      maxCacheSize: this.getNumber('MAX_CACHE_SIZE', 100),
      cacheExpirationTime: this.getNumber('CACHE_EXPIRATION_TIME', 300000),
    };
  }

  /**
   * Get security configuration
   */
  getSecurityConfig() {
    return {
      enableSqlInjectionDetection: this.getBoolean('ENABLE_SQL_INJECTION_DETECTION', true),
      enableQueryValidation: this.getBoolean('ENABLE_QUERY_VALIDATION', true),
      maxQueryLength: this.getNumber('MAX_QUERY_LENGTH', 10000),
      allowedOperations: this.get('ALLOWED_OPERATIONS', 'SELECT,INSERT,UPDATE,DELETE').split(','),
      blockedKeywords: this.get('BLOCKED_KEYWORDS', 'DROP,TRUNCATE,ALTER').split(','),
    };
  }

  /**
   * Validate required environment variables
   */
  validateRequiredConfig(): void {
    const required = ['DB_USER'];
    const missing = required.filter(key => !this.get(key));

    // Check if we have either DB_SERVER or DB_HOST
    if (!this.get('DB_SERVER') && !this.get('DB_HOST')) {
      missing.push('DB_SERVER or DB_HOST');
    }

    // Check if we have either DB_DATABASE or DB_NAME
    if (!this.get('DB_DATABASE') && !this.get('DB_NAME')) {
      missing.push('DB_DATABASE or DB_NAME');
    }

    if (missing.length > 0) {
      throw new Error(`Required environment variables are not set: ${missing.join(', ')}`);
    }
  }

  /**
   * Get current configuration summary
   */
  getSummary() {
    return {
      server: {
        name: this.get('MCP_SERVER_NAME', 'mcp-sql'),
        version : `v${process.env.npm_package_version}`,
        logLevel: 'info',
      },
      database: {
        host: this.get('DB_SERVER', this.get('DB_HOST', 'localhost')),
        database: this.get('DB_DATABASE', this.get('DB_NAME', 'master')),
        port: this.getNumber('DB_PORT', 1433),
        ssl: this.getBoolean('DB_ENCRYPT', this.getBoolean('DB_SSL', false)),
      },
      features: {
        metrics: this.getBoolean('ENABLE_METRICS', true),
        security: this.getBoolean('ENABLE_SECURITY', true),
        performance: this.getBoolean('ENABLE_PERFORMANCE_MONITORING', true),
      },
    };
  }
}
