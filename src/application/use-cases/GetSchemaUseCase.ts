import { DatabaseSchema, TableInfo } from '../../domain/schema/entities/Schema.js';
import { SchemaRepository } from '../../domain/schema/services/SchemaDomainService.js';

export interface GetSchemaRequest {
  databaseName: string;
  refresh?: boolean;
}

export interface GetSchemaResponse {
  success: boolean;
  schema?: {
    databaseName: string;
    tables: TableInfo[];
    tableCount: number;
    lastUpdated: Date;
  };
  error?: string;
}

export class GetSchemaUseCase {
  constructor(private readonly schemaRepository: SchemaRepository) {}

  async execute(request: GetSchemaRequest): Promise<GetSchemaResponse> {
    try {
      let schema: DatabaseSchema;

      if (request.refresh) {
        schema = await this.schemaRepository.refreshSchema(request.databaseName);
      } else {
        schema = await this.schemaRepository.getSchema(request.databaseName);
      }

      return {
        success: true,
        schema: {
          databaseName: schema.databaseName,
          tables: schema.tables,
          tableCount: schema.getTableCount(),
          lastUpdated: schema.lastUpdated,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
