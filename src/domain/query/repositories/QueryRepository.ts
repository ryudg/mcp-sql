import { Query } from '../entities/Query.js';
import { QueryId } from '../value-objects/QueryId.js';

/**
 * QueryRepository Interface
 *
 * Repository interface for Query entity persistence.
 * Follows the Repository pattern from DDD.
 */
export interface QueryRepository {
  /**
   * Saves a query to the repository.
   * @param query The query to save
   */
  save(query: Query): Promise<void>;

  /**
   * Finds a query by its ID.
   * @param id The query ID
   * @returns The query if found, null otherwise
   */
  findById(id: QueryId): Promise<Query | null>;

  /**
   * Finds queries matching a pattern.
   * @param pattern The search pattern
   * @returns Array of matching queries
   */
  findByPattern(pattern: string): Promise<Query[]>;

  /**
   * Gets aggregated statistics about queries.
   * @returns Query statistics
   */
  getStatistics(): Promise<any>;

  /**
   * Deletes a query by its ID.
   * @param id The query ID
   * @returns True if deleted, false if not found
   */
  delete(id: QueryId): Promise<boolean>;

  /**
   * Clears all queries from the repository.
   */
  clear(): Promise<void>;
}
