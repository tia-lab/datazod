import type { ZodObject, ZodRawShape } from 'zod'
import type { TursoClient, TursoInserterOptions, InsertResult } from '../types'
import { flattenForInsert, prepareInsertQuery, migrateTable } from '../helpers'

/**
 * Handles single record insertion
 */
export async function insertSingle<T extends ZodRawShape>(
	client: TursoClient,
	tableName: string,
	schema: ZodObject<T>,
	data: any,
	options: TursoInserterOptions
): Promise<InsertResult> {
	try {
		// Run migration if requested
		if (options.migrate) {
			await migrateTable(tableName, schema, client, options.debug)
		}
		
		// Flatten and prepare data
		const flatData = flattenForInsert(data, schema, options)
		
		// Build query
		const query = prepareInsertQuery(tableName, flatData)
		
		// Execute
		await client.execute(query)
		
		// Extract ID from flattened data
		const autoIdConfig = options.autoId
		let id: string | undefined
		
		if (autoIdConfig) {
			const idName = typeof autoIdConfig === 'object' ? autoIdConfig.name || 'id' : 'id'
			id = flatData[idName]?.toString()
		}
		
		return {
			success: true,
			id
		}
	} catch (error: any) {
		return {
			success: false,
			error: error.message
		}
	}
}