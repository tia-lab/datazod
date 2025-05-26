import type { ZodNumber, ZodString, ZodTypeAny } from 'zod'
import { z } from 'zod'
/**
 * Maps a Zod type to its corresponding SQL data type for SQLite
 */
export const mapZodToSQLite = (zodType: ZodTypeAny): string => {
	// Unwrap nullable/optional to get the inner type
	if (zodType instanceof z.ZodNullable || zodType instanceof z.ZodOptional) {
		return mapZodToSQLite(zodType.unwrap())
	}

	// String types
	if (zodType instanceof z.ZodString) {
		// Handle special string formats
		const checks = (zodType as ZodString)._def.checks
		const hasDatetime = checks?.some((c) => c.kind === 'datetime')
		if (hasDatetime) {
			return 'TEXT' // Store datetime as ISO8601 string
		}
		return 'TEXT'
	}

	// Number types
	if (zodType instanceof z.ZodNumber) {
		const checks = (zodType as ZodNumber)._def.checks
		const isInt = checks?.some((c) => c.kind === 'int')
		return isInt ? 'INTEGER' : 'REAL'
	}

	// Boolean
	if (zodType instanceof z.ZodBoolean) {
		return 'BOOLEAN'
	}

	// Arrays
	if (zodType instanceof z.ZodArray) {
		// Store any array as JSON
		return 'TEXT' // SQLite doesn't have native JSONB, using TEXT
	}

	// Objects
	if (zodType instanceof z.ZodObject) {
		// Store object as JSON
		return 'TEXT' // SQLite doesn't have native JSONB, using TEXT
	}

	// Enums
	if (zodType instanceof z.ZodEnum) {
		return 'TEXT'
	}

	// Dates
	if (zodType instanceof z.ZodDate) {
		return 'TEXT' // Store as ISO string
	}

	// Default for unknown types
	return 'TEXT'
}
