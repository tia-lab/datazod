import type { ZodObject, ZodRawShape } from 'zod'
import type { TursoInserterOptions } from '../types'
import {
	flattenDataToObject,
	generateAutoIdConfig,
	generateAutoIdValue,
	generateTimestampValues,
	processExtraColumnsForInsert
} from '@repo/shared'
import { v4 as uuidv4 } from 'uuid'

/**
 * Flattens input data for Turso insertion
 */
export function flattenForInsert<T extends ZodRawShape>(
	data: any,
	schema: ZodObject<T>,
	options: TursoInserterOptions = {}
): Record<string, any> {
	// Start with flattened data
	const flatData = flattenDataToObject(data, schema, options)

	// Add auto ID if enabled
	const autoIdConfig = options.autoId ? generateAutoIdConfig(options.autoId) : null
	if (autoIdConfig) {
		const idName = autoIdConfig.name || 'id'
		if (autoIdConfig.type === 'uuid') {
			flatData[idName] = uuidv4()
		}
		// For integer IDs, database handles auto-increment
	}

	// Add timestamps if enabled
	if (options.timestamps) {
		const timestamps = generateTimestampValues()
		Object.assign(flatData, timestamps)
	}

	// Process extra columns
	let processedData = processExtraColumnsForInsert(flatData, options.extraColumns)
	
	// Add explicit extra column values (using defaultValue for the value)
	if (options.extraColumns) {
		options.extraColumns.forEach(column => {
			if (column.defaultValue !== undefined) {
				processedData[column.name] = column.defaultValue
			}
		})
	}

	return processedData
}