import { z, ZodTypeAny } from 'zod'
import { SQLDialect } from '../../types'

/**
 * Determines if a Zod type is nullable or optional
 */
export function isNullable(zodType: ZodTypeAny): boolean {
	return zodType.isOptional() || zodType.isNullable()
}

/**
 * Helper function to detect if a Zod number type is an integer
 */
export function isInteger(zodType: ZodTypeAny): boolean {
	if (!(zodType instanceof z.ZodNumber)) return false
	const checks = zodType._def.checks || []
	return checks.some((c) => c.kind === 'int')
}

/**
 * Gets the appropriate identifier quote character for the given SQL dialect
 */
export function getQuoteChar(dialect: SQLDialect): string {
	return dialect === 'mysql' ? '`' : '"'
}

/**
 * Quotes an identifier (table, column) according to the SQL dialect
 */
export function quoteIdentifier(
	identifier: string,
	dialect: SQLDialect
): string {
	const q = getQuoteChar(dialect)
	return `${q}${identifier}${q}`
}
