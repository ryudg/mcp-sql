import { Database, DatabaseConfig, DatabaseId } from '../entities/Database.js';

export interface DatabaseRepository {
  save(database: Database): Promise<void>;
  findById(id: DatabaseId): Promise<Database | null>;
  findAll(): Promise<Database[]>;
  delete(id: DatabaseId): Promise<void>;
}

export class DatabaseDomainService {
  constructor(private readonly databaseRepository: DatabaseRepository) {}

  async createDatabase(config: DatabaseConfig): Promise<Database> {
    const id: DatabaseId = { value: this.generateId() };
    const database = new Database(id, config);

    await this.validateDatabaseConfig(config);
    await this.databaseRepository.save(database);

    return database;
  }

  async connectDatabase(databaseId: DatabaseId): Promise<void> {
    const database = await this.databaseRepository.findById(databaseId);
    if (!database) {
      throw new Error(`Database with id ${databaseId.value} not found`);
    }

    database.connect();
    await this.databaseRepository.save(database);
  }

  async disconnectDatabase(databaseId: DatabaseId): Promise<void> {
    const database = await this.databaseRepository.findById(databaseId);
    if (!database) {
      throw new Error(`Database with id ${databaseId.value} not found`);
    }

    database.disconnect();
    await this.databaseRepository.save(database);
  }

  async validateDatabaseConfig(config: DatabaseConfig): Promise<void> {
    if (!config.host || !config.database || !config.username) {
      throw new Error('Invalid database configuration: missing required fields');
    }

    if (config.port <= 0 || config.port > 65535) {
      throw new Error('Invalid database configuration: port must be between 1 and 65535');
    }

    if (!['mssql', 'mysql', 'postgresql'].includes(config.type)) {
      throw new Error('Invalid database configuration: unsupported database type');
    }
  }

  private generateId(): string {
    return `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
