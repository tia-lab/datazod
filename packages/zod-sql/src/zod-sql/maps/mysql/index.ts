import type { ZodNumber, ZodString, ZodTypeAny } from 'zod'
import { z } from 'zod'
/**
 * Maps a Zod type to its corresponding SQL data type for PostgreSQL
 */
export const mapZodToMySQL = (zodType: ZodTypeAny): string => {
	// Unwrap nullable/optional to get the inner type
	if (zodType instanceof z.ZodNullable || zodType instanceof z.ZodOptional) {
		return mapZodToMySQL(zodType.unwrap())
	}

	if (zodType instanceof z.ZodNullable || zodType instanceof z.ZodOptional) {
		return mapZodToMySQL(zodType.unwrap())
	}

	// String types
	if (zodType instanceof z.ZodString) {
		// Handle special string formats
		const checks = (zodType as ZodString)._def.checks
		const hasDatetime = checks?.some((c) => c.kind === 'datetime')
		if (hasDatetime) {
			return 'DATETIME'
		}
		return 'TEXT'
	}

	// Number types
	if (zodType instanceof z.ZodNumber) {
		const checks = (zodType as ZodNumber)._def.checks
		const isInt = checks?.some((c) => c.kind === 'int')
		return isInt ? 'INT' : 'DOUBLE'
	}

	// Boolean
	if (zodType instanceof z.ZodBoolean) {
		return 'BOOLEAN'
	}

	// Arrays
	if (zodType instanceof z.ZodArray) {
		// Store any array as JSON
		return 'JSON' // MySQL 5.7.8+ supports JSON
	}

	// Objects
	if (zodType instanceof z.ZodObject) {
		// Store object as JSON
		return 'JSON' // MySQL 5.7.8+ supports JSON
	}

	// Enums
	if (zodType instanceof z.ZodEnum) {
		return 'TEXT'
	}

	// Dates
	if (zodType instanceof z.ZodDate) {
		return 'DATETIME'
	}

	// Default for unknown types
	return 'TEXT'
}
