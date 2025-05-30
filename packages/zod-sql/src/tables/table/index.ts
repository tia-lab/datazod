import { z, ZodObject, ZodRawShape } from 'zod'
import { createFlattenedSchemaJson, extractTableStructure } from '../../schema'
import { TableOptions, TableWithMigrationOptions } from '../../types'
import { quoteIdentifier } from '../../utils'
import { createTableDDL } from '../table-ddl'
import { migrateTableSchema } from '../../migration'


/**
 * Creates a SQL DDL statement from a Zod schema and returns the CREATE TABLE and INDEX statements separately
 */
export function createTable<T extends ZodRawShape>(
	tableName: string,
	schema: ZodObject<T>,
	options: TableOptions = {}
) {
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

	// Extract table structure
	const structure = extractTableStructure(schema, options)


	// Create flattened schema JSON for full type inference
	const schemaJson = createFlattenedSchemaJson(schema, options)

	return {
		table: tableStatement,
		indexes: indexStatements,
		schema: schema, // Return original schema for proper typing
		structure: structure,
		schemaJson: schemaJson
	}
}

/**
 * Creates a SQL DDL statement with automatic migration support
 * Optionally runs migrations if client is provided
 */
export async function createTableWithMigration<T extends ZodRawShape>(
	tableName: string,
	schema: ZodObject<T>,
	options: TableWithMigrationOptions = {},
	client?: { execute(sql: string): Promise<any> }
) {
	const {
		dialect = 'sqlite',
		primaryKey,
		indexes = {},
		flattenDepth = 2,
		extraColumns = [],
		timestamps = false,
		autoId = false,
		migrate = false,
		allowDrop = false,
		debug = false
	} = options

	// Run migration if client is provided and migration is enabled
	if (client && migrate) {
		await migrateTableSchema(tableName, schema, client, options)
	}

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

	// Extract table structure
	const structure = extractTableStructure(schema, options)

	// Create flattened schema JSON for full type inference
	const schemaJson = createFlattenedSchemaJson(schema, options)

	return {
		table: tableStatement,
		indexes: indexStatements,
		schema: schema, // Return original schema for proper typing
		structure: structure,
		schemaJson: schemaJson
	}
}
