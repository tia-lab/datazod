import { z, ZodObject, ZodRawShape, ZodTypeAny } from 'zod'
import { AutoIdConfig, TableOptions } from '../types'

/**
 * Represents a column in the database schema
 */
export interface ColumnDefinition {
	name: string
	type: string
	nullable: boolean
	primaryKey: boolean
	defaultValue?: string
	unique?: boolean
	references?: {
		table: string
		column: string
		onDelete?: string
		onUpdate?: string
	}
}

/**
 * Represents a complete table schema
 */
export interface TableSchema {
	tableName: string
	columns: ColumnDefinition[]
	primaryKey?: string | string[]
	indexes: Record<string, string[]>
}

/**
 * Type to represent the flattened schema type
 * Includes all fields from the original schema, plus any auto-generated fields
 */
export type FlattenedSchemaType<T extends ZodRawShape> = {
	[K in keyof T]: z.infer<T[K]>
} & AutoFieldsType

/**
 * Type for auto-generated fields like id and timestamps
 */
export type AutoFieldsType = {
	id?: string | number
	created_at?: string | Date
	updated_at?: string | Date
	[key: string]: any
}

/**
 * Extracts the flattened schema type from a Zod object schema
 * with the given table options
 */
export function extractSchemaType<T extends ZodRawShape>(
	schema: ZodObject<T>,
	options: TableOptions = {}
): z.ZodType<FlattenedSchemaType<T>> {
	const { autoId = false, timestamps = false, extraColumns = [] } = options

	// Start with the original schema
	let schemaShape: Record<string, ZodTypeAny> = { ...schema.shape }

	// Add auto ID if enabled
	if (autoId) {
		const autoIdConfig: AutoIdConfig =
			typeof autoId === 'boolean'
				? { enabled: true, name: 'id', type: 'integer' }
				: { name: 'id', type: 'integer', ...autoId }

		const idName = autoIdConfig.name || 'id'
		const idType =
			autoIdConfig.type === 'uuid' ? z.string().uuid() : z.number().int()

		schemaShape[idName] = idType
	}

	// Add timestamp columns if enabled
	if (timestamps) {
		schemaShape['created_at'] = z.date().or(z.string().datetime())
		schemaShape['updated_at'] = z.date().or(z.string().datetime())
	}

	// Add extra columns
	for (const column of extraColumns) {
		// Convert SQL type to Zod type (simplistic mapping)
		let zodType: ZodTypeAny

		if (
			column.type.toUpperCase().includes('INT') ||
			column.type.toUpperCase().includes('SERIAL')
		) {
			zodType = z.number().int()
		} else if (
			column.type.toUpperCase().includes('REAL') ||
			column.type.toUpperCase().includes('DOUBLE') ||
			column.type.toUpperCase().includes('FLOAT')
		) {
			zodType = z.number()
		} else if (column.type.toUpperCase().includes('BOOL')) {
			zodType = z.boolean()
		} else if (
			column.type.toUpperCase().includes('DATE') ||
			column.type.toUpperCase().includes('TIME')
		) {
			zodType = z.date().or(z.string().datetime())
		} else if (column.type.toUpperCase().includes('UUID')) {
			zodType = z.string().uuid()
		} else {
			zodType = z.string()
		}

		// Make it nullable if needed
		if (!column.notNull) {
			zodType = zodType.nullable()
		}

		schemaShape[column.name] = zodType
	}

	return z.object(schemaShape) as z.ZodType<FlattenedSchemaType<T>>
}

/**
 * Extracts the table schema definition from a Zod object schema
 * This provides detailed information about each column in the table
 */
export function extractTableSchema<T extends ZodRawShape>(
	tableName: string,
	schema: ZodObject<T>,
	options: TableOptions = {}
): TableSchema {
	const {
		autoId = false,
		timestamps = false,
		extraColumns = [],
		primaryKey,
		indexes = {}
	} = options

	const columns: ColumnDefinition[] = []

	// Add auto ID if enabled
	if (autoId) {
		const autoIdConfig: AutoIdConfig =
			typeof autoId === 'boolean'
				? { enabled: true, name: 'id', type: 'integer' }
				: { name: 'id', type: 'integer', ...autoId }

		const idName = autoIdConfig.name || 'id'
		const idType = autoIdConfig.type === 'uuid' ? 'TEXT' : 'INTEGER'

		columns.push({
			name: idName,
			type: idType,
			nullable: false,
			primaryKey: true,
			defaultValue: autoIdConfig.type === 'uuid' ? 'uuid()' : undefined
		})
	}

	// Add timestamp columns if enabled
	if (timestamps) {
		columns.push({
			name: 'created_at',
			type: 'TEXT',
			nullable: false,
			primaryKey: false,
			defaultValue: "datetime('now')"
		})
		columns.push({
			name: 'updated_at',
			type: 'TEXT',
			nullable: false,
			primaryKey: false,
			defaultValue: "datetime('now')"
		})
	}

	// Add columns from the schema
	for (const [key, type] of Object.entries(schema.shape) as [
		string,
		ZodTypeAny
	][]) {
		// Determine if the field is nullable
		const nullable = type.isOptional() || type.isNullable()

		// Determine if it's a primary key
		const isPk = primaryKey === key && !Array.isArray(primaryKey)

		// Unwrap the type to get the core type
		let unwrappedType = type
		if (
			unwrappedType instanceof z.ZodNullable ||
			unwrappedType instanceof z.ZodOptional
		) {
			unwrappedType = unwrappedType.unwrap()
		}

		// Determine the SQL type based on Zod type
		let sqlType = 'TEXT'
		if (unwrappedType instanceof z.ZodNumber) {
			const isInt = (unwrappedType._def.checks || []).some((c) => c.kind === 'int')
			sqlType = isInt ? 'INTEGER' : 'REAL'
		} else if (unwrappedType instanceof z.ZodBoolean) {
			sqlType = 'BOOLEAN'
		} else if (unwrappedType instanceof z.ZodDate) {
			sqlType = 'TEXT' // Stored as ISO string
		} else if (
			unwrappedType instanceof z.ZodObject ||
			unwrappedType instanceof z.ZodArray
		) {
			sqlType = 'TEXT' // JSON-like data
		}

		columns.push({
			name: key,
			type: sqlType,
			nullable,
			primaryKey: isPk
		})
	}

	// Add extra columns
	for (const column of extraColumns) {
		columns.push({
			name: column.name,
			type: column.type,
			nullable: !column.notNull,
			primaryKey: !!column.primaryKey,
			defaultValue: column.defaultValue,
			unique: column.unique,
			references: column.references
		})
	}

	return {
		tableName,
		columns,
		primaryKey,
		indexes
	}
}
