import type { ZodNumber, ZodString, ZodTypeAny } from 'zod'
import { z } from 'zod'
/**
 * Maps a Zod type to its corresponding SQL data type for PostgreSQL
 */
export const mapZodToPostgres = (zodType: ZodTypeAny): string => {
	// Unwrap nullable/optional to get the inner type
	if (zodType instanceof z.ZodNullable || zodType instanceof z.ZodOptional) {
		return mapZodToPostgres(zodType.unwrap())
	}

	// String types
	if (zodType instanceof z.ZodString) {
		// Handle special string formats
		const checks = (zodType as ZodString)._def.checks
		const hasDatetime = checks?.some((c) => c.kind === 'datetime')
		if (hasDatetime) {
			return 'TIMESTAMP WITH TIME ZONE' // Native timestamp type
		}
		return 'TEXT'
	}

	// Number types
	if (zodType instanceof z.ZodNumber) {
		const checks = (zodType as ZodNumber)._def.checks
		const isInt = checks?.some((c) => c.kind === 'int')
		return isInt ? 'INTEGER' : 'DOUBLE PRECISION'
	}

	// Boolean
	if (zodType instanceof z.ZodBoolean) {
		return 'BOOLEAN'
	}

	// Arrays
	if (zodType instanceof z.ZodArray) {
		// Store any array as JSON
		return 'JSONB'
	}

	// Objects
	if (zodType instanceof z.ZodObject) {
		// Store object as JSON
		return 'JSONB'
	}

	// Enums
	if (zodType instanceof z.ZodEnum) {
		return 'TEXT'
	}

	// Dates
	if (zodType instanceof z.ZodDate) {
		return 'TIMESTAMP WITH TIME ZONE'
	}

	// Default for unknown types
	return 'TEXT'
}
