import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod'
import type { BaseOptions } from '../types'
import { processZodTypeForFlat, shouldFlattenType } from './type-processor'
import { processNestedObjectForFlat, processNestedObjectForData } from './object-processor'
import { unwrapOptionalTypes } from '../schema'
import { 
	generateAutoIdConfig, 
	addAutoIdToFlat, 
	addTimestampsToFlat, 
	addExtraColumnsToFlat,
	filterExtraColumnsByPosition 
} from '../fields'

/**
 * Flattens a Zod schema to a flat object representation
 */
export function flattenZodToObject<T extends ZodRawShape>(
	schema: ZodObject<T>,
	options: BaseOptions = {}
): Record<string, any> {
	const {
		flattenDepth = 2,
		timestamps = false,
		autoId = false
	} = options

	const flatData: Record<string, any> = {}

	// Add auto ID field if enabled
	const autoIdConfig = generateAutoIdConfig(autoId)
	if (autoIdConfig) {
		addAutoIdToFlat(flatData, autoIdConfig)
	}

	// Add timestamp fields if enabled
	addTimestampsToFlat(flatData, timestamps)

	// Add extra columns at start position
	const extraColumns = (options as any).extraColumns || []
	const startColumns = filterExtraColumnsByPosition(extraColumns, 'start')
	addExtraColumnsToFlat(flatData, startColumns)

	// Process schema fields with flattening
	const shape = schema.shape
	for (const [key, zodType] of Object.entries(shape)) {
		const typedZodType = zodType as ZodTypeAny
		if (shouldFlattenType(typedZodType, flattenDepth)) {
			const { type } = unwrapOptionalTypes(typedZodType)
			// Ensure type is a ZodObject before passing to processNestedObjectForFlat
			if (type && typeof type === 'object' && 'shape' in type) {
				processNestedObjectForFlat(key, type as ZodObject<any>, flatData, flattenDepth)
			} else {
				processZodTypeForFlat(key, typedZodType, flatData)
			}
		} else {
			processZodTypeForFlat(key, typedZodType, flatData)
		}
	}

	// Add extra columns at end position
	const endColumns = filterExtraColumnsByPosition(extraColumns, 'end')
	addExtraColumnsToFlat(flatData, endColumns)

	return flatData
}

/**
 * Flattens actual data based on schema structure
 */
export function flattenDataToObject(
	data: any,
	schema: ZodObject<any>,
	options: BaseOptions = {}
): Record<string, any> {
	const {
		flattenDepth = 2
	} = options

	const flatData: Record<string, any> = {}

	// Process each field in the data
	const shape = schema.shape
	for (const [key, zodType] of Object.entries(shape)) {
		const value = data[key]
		const typedZodType = zodType as ZodTypeAny

		if (shouldFlattenType(typedZodType, flattenDepth) && value && typeof value === 'object') {
			processNestedObjectForData(key, value, flatData, flattenDepth)
		} else {
			// Store primitive values or serialize complex ones
			flatData[key] = Array.isArray(value) || (typeof value === 'object' && value !== null)
				? JSON.stringify(value)
				: value
		}
	}

	return flatData
}