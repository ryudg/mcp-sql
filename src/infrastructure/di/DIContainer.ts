import { DatabaseConnectionManager } from '../../database/connection/connection.manager.js';
import { Logger } from '../../core/logger.js';

// Domain Services
import { QueryDomainService } from '../../domain/query/services/QueryDomainService.js';
import { DatabaseDomainService } from '../../domain/database/services/DatabaseDomainService.js';
import { SchemaDomainService } from '../../domain/schema/services/SchemaDomainService.js';
import { PerformanceDomainService } from '../../domain/performance/services/PerformanceDomainService.js';

// Infrastructure
import { QueryExecutorImpl } from '../database/QueryExecutorImpl.js';
import { InMemoryQueryRepository } from '../repositories/InMemoryQueryRepository.js';
import { SchemaRepositoryImpl } from '../repositories/SchemaRepositoryImpl.js';
import { InMemoryPerformanceMetricRepository } from '../repositories/InMemoryPerformanceMetricRepository.js';
import { InMemoryPerformanceAlertRepository } from '../repositories/InMemoryPerformanceAlertRepository.js';
import { MetricsCollectorImpl } from '../performance/MetricsCollectorImpl.js';

// Application Use Cases
import { ExecuteQueryUseCase } from '../../application/use-cases/ExecuteQueryUseCase.js';
import { GetSchemaUseCase } from '../../application/use-cases/GetSchemaUseCase.js';
import { GetSchemaStatisticsUseCase } from '../../application/use-cases/GetSchemaStatisticsUseCase.js';
import { StartPerformanceMonitoringUseCase } from '../../application/use-cases/StartPerformanceMonitoringUseCase.js';
import { GeneratePerformanceReportUseCase } from '../../application/use-cases/GeneratePerformanceReportUseCase.js';

// Presentation
import { QueryHandler } from '../../presentation/mcp-handlers/QueryHandler.js';
import { SchemaHandler } from '../../presentation/mcp-handlers/SchemaHandler.js';
import { PerformanceHandler } from '../../presentation/mcp-handlers/PerformanceHandler.js';

export class DIContainer {
  private static instance: DIContainer;
  private services: Map<string, any> = new Map();
  private singletonInstances: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  register<T>(key: string, factory: () => T, singleton: boolean = false): void {
    this.services.set(key, { factory, singleton });
  }

  get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service ${key} not registered`);
    }

    if (service.singleton) {
      // 싱글톤인 경우 캐시된 인스턴스 반환
      if (!this.singletonInstances.has(key)) {
        this.singletonInstances.set(key, service.factory());
      }
      return this.singletonInstances.get(key);
    } else {
      // 싱글톤이 아닌 경우 매번 새 인스턴스 생성
      return service.factory();
    }
  }

  async initialize(dbManager: DatabaseConnectionManager, logger: Logger): Promise<void> {
    // Infrastructure layer
    this.register('QueryExecutor', () => new QueryExecutorImpl(dbManager, logger));
    this.register('QueryRepository', () => new InMemoryQueryRepository());
    this.register('SchemaRepository', () => new SchemaRepositoryImpl(dbManager, logger));
    this.register(
      'PerformanceMetricRepository',
      () => new InMemoryPerformanceMetricRepository(),
      true
    );
    this.register(
      'PerformanceAlertRepository',
      () => new InMemoryPerformanceAlertRepository(),
      true
    );
    this.register('MetricsCollector', () => new MetricsCollectorImpl(dbManager, logger), true);

    // Domain services
    this.register(
      'QueryDomainService',
      () => new QueryDomainService(this.get('QueryRepository'), this.get('QueryExecutor'))
    );
    this.register(
      'SchemaDomainService',
      () => new SchemaDomainService(this.get('SchemaRepository'))
    );
    this.register(
      'PerformanceDomainService',
      () =>
        new PerformanceDomainService(
          this.get('PerformanceMetricRepository'),
          this.get('PerformanceAlertRepository'),
          this.get('MetricsCollector')
        ),
      true // 싱글톤으로 등록
    );

    // Application use cases
    this.register(
      'ExecuteQueryUseCase',
      () => new ExecuteQueryUseCase(this.get('QueryDomainService'))
    );
    this.register('GetSchemaUseCase', () => new GetSchemaUseCase(this.get('SchemaRepository')));
    this.register(
      'GetSchemaStatisticsUseCase',
      () => new GetSchemaStatisticsUseCase(this.get('SchemaRepository'))
    );
    this.register(
      'StartPerformanceMonitoringUseCase',
      () => new StartPerformanceMonitoringUseCase(this.get('PerformanceDomainService')),
      true // 싱글톤으로 등록
    );
    this.register(
      'GeneratePerformanceReportUseCase',
      () => new GeneratePerformanceReportUseCase(this.get('PerformanceDomainService')),
      true // 싱글톤으로 등록
    );

    // Presentation handlers
    this.register('QueryHandler', () => new QueryHandler(this.get('ExecuteQueryUseCase'), logger));
    this.register(
      'SchemaHandler',
      () =>
        new SchemaHandler(
          this.get('GetSchemaUseCase'),
          this.get('GetSchemaStatisticsUseCase'),
          this.get('SchemaDomainService'),
          logger
        )
    );
    this.register(
      'PerformanceHandler',
      () =>
        new PerformanceHandler(
          this.get('StartPerformanceMonitoringUseCase'),
          this.get('GeneratePerformanceReportUseCase'),
          this.get('PerformanceDomainService'),
          logger,
          dbManager
        ),
      true // 싱글톤으로 등록
    );

    logger.info('DI Container initialized with DDD structure');
  }

  // Convenience methods for getting common services
  getQueryHandler(): QueryHandler {
    return this.get('QueryHandler');
  }

  getSchemaHandler(): SchemaHandler {
    return this.get('SchemaHandler');
  }

  getPerformanceHandler(): PerformanceHandler {
    return this.get('PerformanceHandler');
  }

  getExecuteQueryUseCase(): ExecuteQueryUseCase {
    return this.get('ExecuteQueryUseCase');
  }

  getGetSchemaUseCase(): GetSchemaUseCase {
    return this.get('GetSchemaUseCase');
  }

  getGetSchemaStatisticsUseCase(): GetSchemaStatisticsUseCase {
    return this.get('GetSchemaStatisticsUseCase');
  }

  getStartPerformanceMonitoringUseCase(): StartPerformanceMonitoringUseCase {
    return this.get('StartPerformanceMonitoringUseCase');
  }

  getGeneratePerformanceReportUseCase(): GeneratePerformanceReportUseCase {
    return this.get('GeneratePerformanceReportUseCase');
  }

  getQueryDomainService(): QueryDomainService {
    return this.get('QueryDomainService');
  }

  getPerformanceDomainService(): PerformanceDomainService {
    return this.get('PerformanceDomainService');
  }
}
