export interface DatabaseId {
  readonly value: string;
}

export interface DatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly username: string;
  readonly password: string;
  readonly type: 'mssql' | 'mysql' | 'postgresql';
}

export class Database {
  constructor(
    private readonly _id: DatabaseId,
    private readonly _config: DatabaseConfig,
    private _isConnected: boolean = false
  ) {}

  get id(): DatabaseId {
    return this._id;
  }

  get config(): DatabaseConfig {
    return this._config;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  connect(): void {
    if (this._isConnected) {
      throw new Error('Database is already connected');
    }
    this._isConnected = true;
  }

  disconnect(): void {
    if (!this._isConnected) {
      throw new Error('Database is not connected');
    }
    this._isConnected = false;
  }

  validateConnection(): boolean {
    return this._isConnected;
  }
}
