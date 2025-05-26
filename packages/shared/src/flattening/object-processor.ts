import type { ZodObject, ZodTypeAny } from 'zod'
import { processZodTypeForFlat, shouldFlattenType } from './type-processor'

/**
 * Recursively processes nested objects for flattening
 */
export function processNestedObjectForFlat(
	prefix: string,
	objectType: ZodObject<any>,
	flatData: Record<string, any>,
	depth: number
): void {
	if (depth <= 0) {
		// Max depth reached, store as string (JSON)
		flatData[prefix] = 'string'
		return
	}

	const shape = objectType.shape

	for (const [nestedKey, nestedType] of Object.entries(shape) as [string, ZodTypeAny][]) {
		const colName = `${prefix}_${nestedKey}`

		if (shouldFlattenType(nestedType, depth)) {
			// Recursively process nested objects
			const { type } = require('../schema').unwrapOptionalTypes(nestedType)
			processNestedObjectForFlat(colName, type, flatData, depth - 1)
		} else {
			// Add flattened field
			processZodTypeForFlat(colName, nestedType, flatData)
		}
	}
}

/**
 * Processes nested object for data flattening (actual values)
 */
export function processNestedObjectForData(
	prefix: string,
	data: any,
	flatData: Record<string, any>,
	depth: number
): void {
	if (depth <= 0 || !data || typeof data !== 'object' || Array.isArray(data)) {
		// Max depth reached or not an object, store as JSON string
		flatData[prefix] = typeof data === 'object' ? JSON.stringify(data) : data
		return
	}

	for (const [key, value] of Object.entries(data)) {
		const colName = `${prefix}_${key}`

		if (value && typeof value === 'object' && !Array.isArray(value)) {
			// Recursively process nested objects
			processNestedObjectForData(colName, value, flatData, depth - 1)
		} else {
			// Store primitive values or arrays as JSON
			flatData[colName] = Array.isArray(value) || typeof value === 'object' 
				? JSON.stringify(value) 
				: value
		}
	}
}