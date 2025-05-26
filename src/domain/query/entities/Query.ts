import { QueryId } from '../value-objects/QueryId.js';
import { QueryString } from '../value-objects/QueryString.js';

export interface QueryResult {
  readonly rows: any[];
  readonly rowCount: number;
  readonly executionTime: number;
  readonly columns?: string[];
  readonly error?: string;
}

export interface QueryStatistics {
  readonly executionCount: number;
  readonly totalExecutionTime: number;
  readonly averageExecutionTime: number;
  readonly lastExecuted: Date;
}

/**
 * Query Entity
 *
 * Core domain entity representing a database query.
 * Contains query details, execution statistics, and validation logic.
 */
export class Query {
  private _statistics: QueryStatistics;

  constructor(
    private readonly _id: QueryId,
    private readonly _queryString: QueryString,
    private readonly _parameters: any[] = [],
    private readonly _createdAt: Date = new Date()
  ) {
    this._statistics = {
      executionCount: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      lastExecuted: this._createdAt,
    };
  }

  get id(): QueryId {
    return this._id;
  }

  get sql(): string {
    return this._queryString.value;
  }

  get parameters(): any[] {
    return [...this._parameters];
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get statistics(): QueryStatistics {
    return { ...this._statistics };
  }

  updateStatistics(executionTime: number): void {
    this._statistics = {
      executionCount: this._statistics.executionCount + 1,
      totalExecutionTime: this._statistics.totalExecutionTime + executionTime,
      averageExecutionTime:
        (this._statistics.totalExecutionTime + executionTime) /
        (this._statistics.executionCount + 1),
      lastExecuted: new Date(),
    };
  }

  validate(): boolean {
    return true; // QueryString value object already validates the SQL
  }

  isSelectQuery(): boolean {
    return this._queryString.isSelect();
  }

  isModifyingQuery(): boolean {
    return this._queryString.isModifying();
  }

  isStoredProcedure(): boolean {
    return this._queryString.isStoredProcedure();
  }
}
