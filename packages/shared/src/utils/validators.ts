import { z } from 'zod'

/**
 * Checks if a ZodNumber has integer constraints
 */
export function isInteger(zodNumber: z.ZodNumber): boolean {
	const checks = zodNumber._def.checks || []
	return checks.some((check: any) => check.kind === 'int')
}

/**
 * Checks if a Zod type is nullable or optional
 */
export function isNullable(zodType: any): boolean {
	return (
		zodType instanceof z.ZodNullable ||
		zodType instanceof z.ZodOptional ||
		zodType._def.typeName === 'ZodNullable' ||
		zodType._def.typeName === 'ZodOptional'
	)
}