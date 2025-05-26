import { z, type ZodTypeAny } from 'zod'
import { unwrapOptionalTypes } from '../schema'
import { mapZodTypeToString } from '../utils'

/**
 * Processes a single Zod type and returns its string representation
 */
export function processZodTypeToString(zodType: ZodTypeAny): string {
	const { type } = unwrapOptionalTypes(zodType)
	return mapZodTypeToString(type)
}

/**
 * Processes a Zod type for flat JSON generation
 */
export function processZodTypeForFlat(
	name: string,
	zodType: ZodTypeAny,
	flatData: Record<string, any>
): void {
	const typeString = processZodTypeToString(zodType)
	flatData[name] = typeString
}

/**
 * Checks if a Zod type should be flattened (is an object and not an array)
 */
export function shouldFlattenType(zodType: ZodTypeAny, maxDepth: number): boolean {
	if (maxDepth <= 0) return false

	const { type } = unwrapOptionalTypes(zodType)
	return type instanceof z.ZodObject
}