export interface TableInfo {
  readonly name: string;
  readonly schema: string;
  readonly type: 'table' | 'view';
  readonly rowCount?: number;
}

export interface ColumnInfo {
  readonly name: string;
  readonly type: string;
  readonly nullable: boolean;
  readonly defaultValue?: any;
  readonly isPrimaryKey: boolean;
  readonly isForeignKey: boolean;
}

export interface IndexInfo {
  readonly name: string;
  readonly tableName: string;
  readonly columns: string[];
  readonly isUnique: boolean;
  readonly isPrimaryKey: boolean;
}

export class DatabaseSchema {
  constructor(
    private readonly _databaseName: string,
    private readonly _tables: Map<string, TableInfo> = new Map(),
    private readonly _columns: Map<string, ColumnInfo[]> = new Map(),
    private readonly _indexes: Map<string, IndexInfo[]> = new Map(),
    private readonly _lastUpdated: Date = new Date()
  ) {}

  get databaseName(): string {
    return this._databaseName;
  }

  get tables(): TableInfo[] {
    return Array.from(this._tables.values());
  }

  get lastUpdated(): Date {
    return this._lastUpdated;
  }

  addTable(table: TableInfo): void {
    this._tables.set(table.name, table);
  }

  getTable(tableName: string): TableInfo | undefined {
    return this._tables.get(tableName);
  }

  addColumns(tableName: string, columns: ColumnInfo[]): void {
    this._columns.set(tableName, columns);
  }

  getColumns(tableName: string): ColumnInfo[] {
    return this._columns.get(tableName) || [];
  }

  addIndexes(tableName: string, indexes: IndexInfo[]): void {
    this._indexes.set(tableName, indexes);
  }

  getIndexes(tableName: string): IndexInfo[] {
    return this._indexes.get(tableName) || [];
  }

  hasTable(tableName: string): boolean {
    return this._tables.has(tableName);
  }

  getTableCount(): number {
    return this._tables.size;
  }

  searchTables(pattern: string): TableInfo[] {
    const regex = new RegExp(pattern, 'i');
    return Array.from(this._tables.values()).filter(
      table => regex.test(table.name) || regex.test(table.schema)
    );
  }
}
