import { SchemaRepository } from '../../domain/schema/services/SchemaDomainService.js';

export interface GetSchemaStatisticsRequest {
  includeSystemTables?: boolean;
}

export interface SchemaStatistics {
  totalTables: number;
  totalViews: number;
  totalProcedures: number;
  totalFunctions: number;
  totalColumns: number;
  totalIndexes: number;
  averageColumnsPerTable: number;
  largestTable?: {
    name: string;
    columns?: any[];
    type: string;
  };
}

export interface GetSchemaStatisticsResponse {
  success: boolean;
  statistics?: SchemaStatistics;
  error?: string;
}

export class GetSchemaStatisticsUseCase {
  constructor(private readonly schemaRepository: SchemaRepository) {}

  async execute(request: GetSchemaStatisticsRequest): Promise<GetSchemaStatisticsResponse> {
    try {
      const statistics = await this.schemaRepository.getSchemaStatistics(
        request.includeSystemTables || false
      );

      return {
        success: true,
        statistics,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
