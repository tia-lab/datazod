import type { ZodObject, ZodRawShape } from 'zod'
import type {
	TursoClient,
	TursoInserterOptions,
	BatchInsertOptions,
	InsertResult,
	BatchInsertResult
} from '../types'
import { flattenZodToObject } from '@datazod/shared'
import { flattenForInsert } from '../helpers'
import { insertSingle } from './single'
import { insertBatch } from './batch'

/**
 * Turso inserter instance
 */
export interface TursoInserter<T extends ZodRawShape> {
	/**
	 * Insert a single record
	 */
	insert(client: TursoClient, data: any): Promise<InsertResult>
	
	/**
	 * Insert multiple records
	 */
	insertMany(
		client: TursoClient, 
		dataArray: any[], 
		batchOptions?: BatchInsertOptions
	): Promise<BatchInsertResult>
	
	/**
	 * Flatten data without inserting (for testing/debugging)
	 */
	flatten(data: any): Record<string, any>
	
	/**
	 * Get the flattened schema structure
	 */
	getSchemaStructure(): Record<string, any>
}

/**
 * Creates a Turso inserter for a specific table and schema
 */
export function createTursoInserter<T extends ZodRawShape>(
	tableName: string,
	schema: ZodObject<T>,
	options: TursoInserterOptions = {}
): TursoInserter<T> {
	return {
		async insert(client: TursoClient, data: any): Promise<InsertResult> {
			return insertSingle(client, tableName, schema, data, options)
		},

		async insertMany(
			client: TursoClient,
			dataArray: any[],
			batchOptions: BatchInsertOptions = {}
		): Promise<BatchInsertResult> {
			return insertBatch(client, tableName, schema, dataArray, options, batchOptions)
		},

		flatten(data: any): Record<string, any> {
			return flattenForInsert(data, schema, options)
		},

		getSchemaStructure(): Record<string, any> {
			return flattenZodToObject(schema, options)
		}
	}
}