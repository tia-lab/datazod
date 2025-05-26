import { z, type ZodTypeAny } from 'zod'

/**
 * Gets the type name from a Zod type
 */
export function getZodTypeName(zodType: ZodTypeAny): string {
	return zodType._def.typeName
}

/**
 * Checks if a Zod type is an object type
 */
export function isZodObject(zodType: ZodTypeAny): boolean {
	return zodType instanceof z.ZodObject
}

/**
 * Checks if a Zod type is an array type
 */
export function isZodArray(zodType: ZodTypeAny): boolean {
	return zodType instanceof z.ZodArray
}

/**
 * Checks if a Zod type is a number type
 */
export function isZodNumber(zodType: ZodTypeAny): boolean {
	return zodType instanceof z.ZodNumber
}

/**
 * Checks if a Zod type is a string type
 */
export function isZodString(zodType: ZodTypeAny): boolean {
	return zodType instanceof z.ZodString
}

/**
 * Checks if a Zod type is a boolean type
 */
export function isZodBoolean(zodType: ZodTypeAny): boolean {
	return zodType instanceof z.ZodBoolean
}

/**
 * Gets detailed information about a Zod type
 */
export interface ZodTypeInfo {
	typeName: string
	isObject: boolean
	isArray: boolean
	isNumber: boolean
	isString: boolean
	isBoolean: boolean
	isOptional: boolean
	isNullable: boolean
}

export function inspectZodType(zodType: ZodTypeAny): ZodTypeInfo {
	return {
		typeName: getZodTypeName(zodType),
		isObject: isZodObject(zodType),
		isArray: isZodArray(zodType),
		isNumber: isZodNumber(zodType),
		isString: isZodString(zodType),
		isBoolean: isZodBoolean(zodType),
		isOptional: zodType instanceof z.ZodOptional,
		isNullable: zodType instanceof z.ZodNullable
	}
}