import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod'
import { z } from 'zod'
import { mapZodToSql } from './maps/index.ts'
import {
	extractSchemaType,
	extractTableSchema,
	FlattenedSchemaType,
	TableSchema
} from './schema/index.ts'
import type { TableOptions } from './types.ts'
import {
	buildColumnDefinition,
	getAutoIdColumn,
	getTimestampColumns,
	isInteger,
	isNullable,
	processNestedObject,
	quoteIdentifier
} from './utils/index.ts'

// Export schema extraction functions
export type {
	AutoFieldsType,
	ColumnDefinition,
	FlattenedSchemaType,
	TableSchema
} from './schema/index.ts'
export { extractSchemaType, extractTableSchema }

/**
 * Creates a SQL DDL statement from a Zod schema
 */
export function createTableDDL<T extends ZodRawShape>(
	tableName: string,
	schema: ZodObject<T>,
	options: TableOptions = {}
): string {
	const {
		dialect = 'sqlite',
		primaryKey,
		indexes = {},
		flattenDepth = 2,
		extraColumns = [],
		timestamps = false,
		autoId = false
	} = options
	const shape = schema.shape
	const cols: string[] = []
	const constraints: string[] = []

	// Prepare columns arrays for different positions
	const startCols: string[] = []
	const mainCols: string[] = []
	const endCols: string[] = []

	// Add auto ID column if requested (always at the start)
	if (autoId) {
		const autoIdColumnDef = getAutoIdColumn(dialect, autoId)
		if (autoIdColumnDef) {
			startCols.push(autoIdColumnDef)
		}
	}

	// Add timestamp columns if requested (after ID but before other columns)
	if (timestamps) {
		startCols.push(...getTimestampColumns(dialect))
	}

	// Process extra columns for 'start' position
	for (const column of extraColumns) {
		if (column.position === 'start') {
			startCols.push(buildColumnDefinition(column, dialect))
		}
	}

	// Process each field in the schema
	for (const [key, type] of Object.entries(shape) as [string, ZodTypeAny][]) {
		// Unwrap nullable/optional to get the correct SQL type
		let unwrappedType = type
		if (
			unwrappedType instanceof z.ZodNullable ||
			unwrappedType instanceof z.ZodOptional
		) {
			unwrappedType = unwrappedType.unwrap()
		}

		if (unwrappedType instanceof z.ZodObject && flattenDepth > 0) {
			// Flatten nested object
			processNestedObject(key, unwrappedType, mainCols, flattenDepth, dialect)
		} else if (unwrappedType instanceof z.ZodNumber) {
			// Explicitly handle numbers to ensure proper type mapping
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

			const nullable = isNullable(type) ? '' : ' NOT NULL'

			// Add PRIMARY KEY directly to the column if it's a single column primary key
			const isPrimaryKey = primaryKey === key && !Array.isArray(primaryKey)
			const pkStr = isPrimaryKey ? ' PRIMARY KEY' : ''

			mainCols.push(
				`${quoteIdentifier(key, dialect)} ${sqlType}${nullable}${pkStr}`
			)
		} else {
			// Handle other types including arrays
			const sqlType = mapZodToSql(unwrappedType, dialect)
			const nullable = isNullable(type) ? '' : ' NOT NULL'

			// Add PRIMARY KEY directly to the column if it's a single column primary key
			const isPrimaryKey = primaryKey === key && !Array.isArray(primaryKey)
			const pkStr = isPrimaryKey ? ' PRIMARY KEY' : ''

			mainCols.push(
				`${quoteIdentifier(key, dialect)} ${sqlType}${nullable}${pkStr}`
			)
		}
	}

	// Process extra columns for 'end' position or unspecified position (default to end)
	for (const column of extraColumns) {
		if (!column.position || column.position === 'end') {
			endCols.push(buildColumnDefinition(column, dialect))
		}
	}

	// Combine all columns in the correct order: start, main, end
	cols.push(...startCols, ...mainCols, ...endCols)

	// Add compound primary key constraint if specified (and not already set in a column)
	const hasPrimaryKeyColumn =
		extraColumns.some((col) => col.primaryKey) ||
		(primaryKey && !Array.isArray(primaryKey)) ||
		autoId

	if (primaryKey && Array.isArray(primaryKey) && !hasPrimaryKeyColumn) {
		constraints.push(
			`PRIMARY KEY (${primaryKey.map((k) => quoteIdentifier(k, dialect)).join(', ')})`
		)
	}

	// Generate the CREATE TABLE statement
	const allDefinitions = [...cols, ...constraints]
	let sql = `CREATE TABLE IF NOT EXISTS ${quoteIdentifier(tableName, dialect)} (\n  ${allDefinitions.join(',\n  ')}\n);`

	// Add indexes
	for (const [indexName, columns] of Object.entries(indexes)) {
		sql += `\nCREATE INDEX IF NOT EXISTS ${quoteIdentifier(indexName, dialect)} ON ${quoteIdentifier(tableName, dialect)} (${columns
			.map((c) => quoteIdentifier(c, dialect))
			.join(', ')});`
	}

	return sql
}

/**
 * Creates a SQL DDL statement from a Zod schema and returns the CREATE TABLE and INDEX statements separately
 * Also returns schema type information for TypeScript type safety
 */
export function createTableAndIndexes<T extends ZodRawShape>(
	tableName: string,
	schema: ZodObject<T>,
	options: TableOptions = {}
): {
	createTable: string
	indexes: string[]
	schema: z.ZodType<FlattenedSchemaType<T>>
	tableSchema: TableSchema
} {
	const {
		dialect = 'sqlite',
		primaryKey,
		indexes = {},
		flattenDepth = 2,
		extraColumns = [],
		timestamps = false,
		autoId = false
	} = options

	// Create the table statement
	const tableStatement = createTableDDL(tableName, schema, {
		dialect,
		primaryKey,
		flattenDepth,
		extraColumns,
		timestamps,
		autoId,
		// Don't include indexes in the main statement
		indexes: {}
	})

	// Create the index statements separately
	const indexStatements: string[] = []
	for (const [indexName, columns] of Object.entries(indexes)) {
		indexStatements.push(
			`CREATE INDEX IF NOT EXISTS ${quoteIdentifier(indexName, dialect)} ON ${quoteIdentifier(tableName, dialect)} (${columns
				.map((c) => quoteIdentifier(c, dialect))
				.join(', ')});`
		)
	}

	// Extract schema type information
	const schemaType = extractSchemaType(schema, options)
	const tableSchema = extractTableSchema(tableName, schema, options)

	return {
		createTable: tableStatement,
		indexes: indexStatements,
		schema: schemaType,
		tableSchema
	}
}
