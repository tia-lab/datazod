import { z, ZodObject, ZodTypeAny } from 'zod'
import { mapZodToSql } from '../../maps'
import { SQLDialect } from '../../types'
import { isInteger, isNullable, quoteIdentifier } from '../identifier'

/**
 * Process a nested object and flatten it according to the specified depth
 */
export function processNestedObject(
	prefix: string,
	objectType: ZodObject<any>,
	cols: string[],
	depth: number,
	dialect: SQLDialect = 'sqlite'
): void {
	if (depth <= 0) {
		// If max depth reached, store as JSON
		const sqlType = mapZodToSql(objectType, dialect)
		const nullable = isNullable(objectType) ? '' : ' NOT NULL'
		cols.push(`${quoteIdentifier(prefix, dialect)} ${sqlType}${nullable}`)
		return
	}

	const shape = objectType.shape

	for (const [nestedKey, nestedType] of Object.entries(shape) as [
		string,
		ZodTypeAny
	][]) {
		const colName = `${prefix}_${nestedKey}`

		// Unwrap nullable/optional to get the inner type for type identification
		let unwrappedType = nestedType
		if (
			unwrappedType instanceof z.ZodNullable ||
			unwrappedType instanceof z.ZodOptional
		) {
			unwrappedType = unwrappedType.unwrap()
		}

		if (unwrappedType instanceof z.ZodObject && depth > 0) {
			// Changed from depth > 1 to depth > 0
			// Recursively process nested objects
			processNestedObject(colName, unwrappedType, cols, depth - 1, dialect)
		} else if (unwrappedType instanceof z.ZodNumber) {
			// Explicitly handle numbers
			const isInt = isInteger(unwrappedType)
			let sqlType: string

			switch (dialect) {
				case 'postgres':
					sqlType = isInt ? 'INTEGER' : 'DOUBLE PRECISION'
					break
				case 'mysql':
					sqlType = isInt ? 'INT' : 'DOUBLE'
					break
				case 'sqlite':
				default:
					sqlType = isInt ? 'INTEGER' : 'REAL'
			}

			const nullable = isNullable(nestedType) ? '' : ' NOT NULL'
			cols.push(`${quoteIdentifier(colName, dialect)} ${sqlType}${nullable}`)
		} else {
			// Add flattened column
			const sqlType = mapZodToSql(unwrappedType, dialect)
			const nullable = isNullable(nestedType) ? '' : ' NOT NULL'
			cols.push(`${quoteIdentifier(colName, dialect)} ${sqlType}${nullable}`)
		}
	}
}
