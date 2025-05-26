import type { ZodObject, ZodRawShape } from 'zod'
import type { TableOptions } from '../types'
import { flattenZodToObject } from '@datazod/shared'

/**
 * Creates a flattened schema JSON representation for type inference
 */
export function createFlattenedSchemaJson<T extends ZodRawShape>(
	schema: ZodObject<T>,
	options: TableOptions = {}
): Record<string, any> {
	return flattenZodToObject(schema, options)
}