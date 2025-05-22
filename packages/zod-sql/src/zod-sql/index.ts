import type {
	ZodNumber,
	ZodObject,
	ZodRawShape,
	ZodString,
	ZodTypeAny
} from 'zod'
import { z } from 'zod'
import type {
	AutoIdConfig,
	ExtraColumn,
	SQLDialect,
	TableOptions
} from './types.ts'

/**
 * Maps a Zod type to its corresponding SQL data type for SQLite
 */
function mapZodToSQLite(zodType: ZodTypeAny): string {
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

/**
 * Maps a Zod type to its corresponding SQL data type for PostgreSQL
 */
function mapZodToPostgres(zodType: ZodTypeAny): string {
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

/**
 * Maps a Zod type to its corresponding SQL data type for MySQL
 */
function mapZodToMySQL(zodType: ZodTypeAny): string {
	// Unwrap nullable/optional to get the inner type
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

/**
 * Maps a Zod type to its corresponding SQL data type based on the dialect
 */
function mapZodToSql(
	zodType: ZodTypeAny,
	dialect: SQLDialect = 'sqlite'
): string {
	switch (dialect) {
		case 'postgres':
			return mapZodToPostgres(zodType)
		case 'mysql':
			return mapZodToMySQL(zodType)
		case 'sqlite':
		default:
			return mapZodToSQLite(zodType)
	}
}

/**
 * Determines if a Zod type is nullable or optional
 */
function isNullable(zodType: ZodTypeAny): boolean {
	return zodType.isOptional() || zodType.isNullable()
}

/**
 * Helper function to detect if a Zod number type is an integer
 */
function isInteger(zodType: ZodTypeAny): boolean {
	if (!(zodType instanceof z.ZodNumber)) return false
	const checks = zodType._def.checks || []
	return checks.some((c) => c.kind === 'int')
}

/**
 * Gets the appropriate identifier quote character for the given SQL dialect
 */
function getQuoteChar(dialect: SQLDialect): string {
	return dialect === 'mysql' ? '`' : '"'
}

/**
 * Quotes an identifier (table, column) according to the SQL dialect
 */
function quoteIdentifier(identifier: string, dialect: SQLDialect): string {
	const q = getQuoteChar(dialect)
	return `${q}${identifier}${q}`
}

/**
 * Gets timestamp column definitions based on the SQL dialect
 */
function getTimestampColumns(dialect: SQLDialect): string[] {
	switch (dialect) {
		case 'postgres':
			return [
				quoteIdentifier('created_at', dialect) +
					' TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()',
				quoteIdentifier('updated_at', dialect) +
					' TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()'
			]
		case 'mysql':
			return [
				quoteIdentifier('created_at', dialect) +
					' TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
				quoteIdentifier('updated_at', dialect) +
					' TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
			]
		case 'sqlite':
		default:
			return [
				quoteIdentifier('created_at', dialect) +
					" TEXT NOT NULL DEFAULT (datetime('now'))",
				quoteIdentifier('updated_at', dialect) +
					" TEXT NOT NULL DEFAULT (datetime('now'))"
			]
	}
}

/**
 * Gets auto ID column definition based on the SQL dialect and configuration
 */
function getAutoIdColumn(
	dialect: SQLDialect,
	config: AutoIdConfig | boolean
): string {
	// Default config if only boolean is provided
	const actualConfig: AutoIdConfig =
		typeof config === 'boolean'
			? { enabled: config, name: 'id', type: 'integer' }
			: { name: 'id', type: 'integer', ...config }

	if (!actualConfig.enabled) {
		return ''
	}

	const idName = quoteIdentifier(actualConfig.name || 'id', dialect)

	switch (dialect) {
		case 'postgres':
			return actualConfig.type === 'uuid'
				? `${idName} UUID PRIMARY KEY DEFAULT gen_random_uuid()`
				: `${idName} SERIAL PRIMARY KEY`
		case 'mysql':
			return actualConfig.type === 'uuid'
				? `${idName} CHAR(36) PRIMARY KEY DEFAULT (UUID())`
				: `${idName} INT AUTO_INCREMENT PRIMARY KEY`
		case 'sqlite':
		default:
			// For SQLite/Turso, use uuid() function which is available in Turso
			return actualConfig.type === 'uuid'
				? `${idName} TEXT PRIMARY KEY DEFAULT (uuid())`
				: `${idName} INTEGER PRIMARY KEY AUTOINCREMENT`
	}
}

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

	/**
	 * Helper function to build column definition from ExtraColumn
	 */
	function buildColumnDefinition(
		column: ExtraColumn,
		dialect: SQLDialect
	): string {
		let colDef = `${quoteIdentifier(column.name, dialect)} ${column.type}`

		if (column.notNull) {
			colDef += ' NOT NULL'
		}

		if (column.defaultValue !== undefined) {
			colDef += ` DEFAULT ${column.defaultValue}`
		}

		if (column.unique) {
			colDef += ' UNIQUE'
		}

		if (column.primaryKey) {
			colDef += ' PRIMARY KEY'
		}

		if (column.references) {
			const { table, column: refColumn, onDelete, onUpdate } = column.references
			colDef += ` REFERENCES ${quoteIdentifier(table, dialect)}(${quoteIdentifier(refColumn, dialect)})`

			if (onDelete) {
				colDef += ` ON DELETE ${onDelete}`
			}

			if (onUpdate) {
				colDef += ` ON UPDATE ${onUpdate}`
			}
		}

		return colDef
	}

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
 * Process a nested object and flatten it according to the specified depth
 */
function processNestedObject(
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

/**
 * Creates a SQL DDL statement from a Zod schema and returns the CREATE TABLE and INDEX statements separately
 */
export function createTableAndIndexes<T extends ZodRawShape>(
	tableName: string,
	schema: ZodObject<T>,
	options: TableOptions = {}
): { createTable: string; indexes: string[] } {
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

	return {
		createTable: tableStatement,
		indexes: indexStatements
	}
}
