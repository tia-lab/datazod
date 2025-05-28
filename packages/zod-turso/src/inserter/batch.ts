import type { ZodObject, ZodRawShape } from 'zod'
import type {
	TursoClient,
	TursoInserterOptions,
	BatchInsertOptions,
	BatchInsertResult
} from '../types'
import { flattenForInsert, prepareBatchInsertQuery, processBatch, migrateTable } from '../helpers'

/**
 * Handles batch record insertion
 */
export async function insertBatch<T extends ZodRawShape>(
	client: TursoClient,
	tableName: string,
	schema: ZodObject<T>,
	dataArray: any[],
	options: TursoInserterOptions,
	batchOptions: BatchInsertOptions = {}
): Promise<BatchInsertResult> {
	try {
		if (dataArray.length === 0) {
			return {
				success: true,
				inserted: 0,
				failed: 0,
				errors: [],
				ids: []
			}
		}

		// Run migration if requested
		if (options.migrate) {
			await migrateTable(tableName, schema, client, options.debug)
		}

		// Flatten all data records
		const flatDataArray = dataArray.map(data => 
			flattenForInsert(data, schema, options)
		)
		
		// Build queries
		const queries = prepareBatchInsertQuery(tableName, flatDataArray)
		
		// Execute batch
		const result = await processBatch(client, queries, batchOptions)
		
		return result
	} catch (error: any) {
		return {
			success: false,
			inserted: 0,
			failed: dataArray.length,
			errors: [error.message],
			ids: []
		}
	}
}