import { SchemaStatistics } from '../../../application/use-cases/GetSchemaStatisticsUseCase.js';
import { DatabaseSchema } from '../entities/Schema.js';

export interface SchemaRepository {
  getSchema(databaseName: string): Promise<DatabaseSchema>;
  refreshSchema(databaseName: string): Promise<DatabaseSchema>;
  getTables(pattern?: string): Promise<any[]>;
  getTableInfo(tableName: string): Promise<any>;
  getSchemaStatistics(includeSystemTables: boolean): Promise<SchemaStatistics>;
  clearCache(): void;
}

export class SchemaDomainService {
  constructor(private readonly schemaRepository: SchemaRepository) {}

  async getSchema(databaseName: string): Promise<DatabaseSchema> {
    return await this.schemaRepository.getSchema(databaseName);
  }

  async refreshSchema(databaseName: string): Promise<DatabaseSchema> {
    return await this.schemaRepository.refreshSchema(databaseName);
  }

  async getTables(pattern?: string): Promise<any[]> {
    return await this.schemaRepository.getTables(pattern);
  }

  async getTableInfo(tableName: string): Promise<any> {
    if (!tableName || typeof tableName !== 'string') {
      throw new Error('Table name must be a non-empty string');
    }

    return await this.schemaRepository.getTableInfo(tableName);
  }

  async getSchemaStatistics(includeSystemTables: boolean = false): Promise<SchemaStatistics> {
    return await this.schemaRepository.getSchemaStatistics(includeSystemTables);
  }

  clearCache(): void {
    this.schemaRepository.clearCache();
  }
}
