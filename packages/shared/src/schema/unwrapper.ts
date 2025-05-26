import { z, type ZodTypeAny } from 'zod'

/**
 * Result of unwrapping optional/nullable types
 */
export interface UnwrapResult {
	type: ZodTypeAny
	isOptional: boolean
	isNullable: boolean
}

/**
 * Unwraps optional and nullable Zod types to get the inner type
 */
export function unwrapOptionalTypes(zodType: ZodTypeAny): UnwrapResult {
	let currentType = zodType
	let isOptional = false
	let isNullable = false

	// Handle ZodOptional
	if (currentType instanceof z.ZodOptional) {
		isOptional = true
		currentType = currentType._def.innerType
	}

	// Handle ZodNullable
	if (currentType instanceof z.ZodNullable) {
		isNullable = true
		currentType = currentType._def.innerType
	}

	// Handle ZodDefault (has an inner type)
	if (currentType instanceof z.ZodDefault) {
		currentType = currentType._def.innerType
	}

	return {
		type: currentType,
		isOptional,
		isNullable
	}
}