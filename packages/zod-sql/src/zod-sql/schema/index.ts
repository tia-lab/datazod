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
export interface TableStructure {
	tableName: string
	columns: ColumnDefinition[]
	primaryKey?: string | string[]
	indexes: Record<string, string[]>
}

/**
 * Type for the flattened schema type
 * This is just a placeholder since we can't statically determine the flattened structure
 * You should use z.infer<typeof schema> in practice
 */
export type FlattenedSchemaType<T extends ZodRawShape> = {
	[key: string]: any
}

/**
 * Type for auto-generated fields like id and timestamps
 */
export type AutoFieldsType = {
	id?: string | number
	created_at?: string | Date
	updated_at?: string | Date
}

/**
 * Process a nested Zod object and return flattened schema properties
 */
function processNestedSchemaObject(
	prefix: string,
	objectType: ZodObject<any>,
	flattenedSchema: Record<string, ZodTypeAny>,
	depth: number
): void {
	// If max depth reached, store as JSON string
	if (depth <= 0) {
		flattenedSchema[prefix] = z.string() // Stored as JSON string
		return
	}

	const shape = objectType.shape

	// Process each property in the nested object
	for (const [key, type] of Object.entries(shape) as [string, ZodTypeAny][]) {
		const colName = `${prefix}_${key}`

		// Handle nullable/optional fields
		const isNullable = type.isOptional() || type.isNullable()
		let unwrappedType = type

		if (
			unwrappedType instanceof z.ZodNullable ||
			unwrappedType instanceof z.ZodOptional
		) {
			unwrappedType = unwrappedType.unwrap()
		}

		// Recursively process nested objects
		if (unwrappedType instanceof z.ZodObject && depth > 0) {
			processNestedSchemaObject(colName, unwrappedType, flattenedSchema, depth - 1)
		} else if (unwrappedType instanceof z.ZodArray) {
			// Arrays are stored as JSON strings
			const zodType = z.string() // JSON array
			flattenedSchema[colName] = isNullable ? zodType.nullable() : zodType
		} else {
			// Add regular field
			let zodType: ZodTypeAny

			if (unwrappedType instanceof z.ZodNumber) {
				const isInt = (unwrappedType._def.checks || []).some(
					(c) => c.kind === 'int'
				)
				zodType = isInt ? z.number().int() : z.number()
			} else if (unwrappedType instanceof z.ZodBoolean) {
				zodType = z.boolean()
			} else if (unwrappedType instanceof z.ZodDate) {
				zodType = z.date().or(z.string().datetime())
			} else if (unwrappedType instanceof z.ZodEnum) {
				zodType = z.string() // Enums stored as strings
			} else {
				zodType = z.string()
			}

			flattenedSchema[colName] = isNullable ? zodType.nullable() : zodType
		}
	}
}

/**
 * Extracts the flattened schema type from a Zod object schema
 * with the given table options
 */
export function extractTableSchema<T extends ZodRawShape>(
	schema: ZodObject<T>,
	options: TableOptions = {}
): z.ZodType<FlattenedSchemaType<T>> {
	const {
		autoId = false,
		timestamps = false,
		extraColumns = [],
		flattenDepth = 2
	} = options

	// Create a flattened schema
	let flattenedSchema: Record<string, ZodTypeAny> = {}

	// Add auto ID if enabled
	if (autoId) {
		const autoIdConfig: AutoIdConfig =
			typeof autoId === 'boolean'
				? { enabled: true, name: 'id', type: 'integer' }
				: { name: 'id', type: 'integer', ...autoId }

		const idName = autoIdConfig.name || 'id'
		const idType =
			autoIdConfig.type === 'uuid' ? z.string().uuid() : z.number().int()

		flattenedSchema[idName] = idType
	}

	// Add timestamp columns if enabled
	if (timestamps) {
		flattenedSchema['created_at'] = z.date().or(z.string().datetime())
		flattenedSchema['updated_at'] = z.date().or(z.string().datetime())
	}

	// Process each field in the schema with flattening
	for (const [key, type] of Object.entries(schema.shape) as [
		string,
		ZodTypeAny
	][]) {
		// Handle nullable/optional fields
		const isNullable = type.isOptional() || type.isNullable()
		let unwrappedType = type

		if (
			unwrappedType instanceof z.ZodNullable ||
			unwrappedType instanceof z.ZodOptional
		) {
			unwrappedType = unwrappedType.unwrap()
		}

		// Process nested objects
		if (unwrappedType instanceof z.ZodObject && flattenDepth > 0) {
			processNestedSchemaObject(
				key,
				unwrappedType,
				flattenedSchema,
				flattenDepth - 1
			)
		} else if (unwrappedType instanceof z.ZodArray) {
			// Arrays are stored as JSON strings
			const zodType = z.string() // JSON array
			flattenedSchema[key] = isNullable ? zodType.nullable() : zodType
		} else {
			// Add regular field
			let zodType: ZodTypeAny

			if (unwrappedType instanceof z.ZodNumber) {
				const isInt = (unwrappedType._def.checks || []).some(
					(c) => c.kind === 'int'
				)
				zodType = isInt ? z.number().int() : z.number()
			} else if (unwrappedType instanceof z.ZodBoolean) {
				zodType = z.boolean()
			} else if (unwrappedType instanceof z.ZodDate) {
				zodType = z.date().or(z.string().datetime())
			} else if (unwrappedType instanceof z.ZodEnum) {
				zodType = z.string() // Enums stored as strings
			} else {
				zodType = z.string()
			}

			flattenedSchema[key] = isNullable ? zodType.nullable() : zodType
		}
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

		flattenedSchema[column.name] = zodType
	}

	return z.object(flattenedSchema) as z.ZodType<FlattenedSchemaType<T>>
}

/**
 * Process a nested object for table schema extraction
 */
function processNestedTableSchema(
	prefix: string,
	objectType: ZodObject<any>,
	columns: ColumnDefinition[],
	depth: number,
	isPrimaryKey: boolean = false
): void {
	// If max depth reached, store as JSON
	if (depth <= 0) {
		columns.push({
			name: prefix,
			type: 'TEXT', // JSON string
			nullable: false,
			primaryKey: isPrimaryKey
		})
		return
	}

	const shape = objectType.shape

	// Process each field in the nested object
	for (const [key, type] of Object.entries(shape) as [string, ZodTypeAny][]) {
		const colName = `${prefix}_${key}`

		// Handle nullable/optional fields
		const isNullable = type.isOptional() || type.isNullable()
		let unwrappedType = type

		if (
			unwrappedType instanceof z.ZodNullable ||
			unwrappedType instanceof z.ZodOptional
		) {
			unwrappedType = unwrappedType.unwrap()
		}

		// Recursively process nested objects
		if (unwrappedType instanceof z.ZodObject && depth > 0) {
			processNestedTableSchema(colName, unwrappedType, columns, depth - 1)
		} else if (unwrappedType instanceof z.ZodArray) {
			// Arrays are stored as JSON
			columns.push({
				name: colName,
				type: 'TEXT', // JSON array
				nullable: isNullable,
				primaryKey: false
			})
		} else {
			// Add regular field
			let sqlType = 'TEXT'

			if (unwrappedType instanceof z.ZodNumber) {
				const isInt = (unwrappedType._def.checks || []).some(
					(c) => c.kind === 'int'
				)
				sqlType = isInt ? 'INTEGER' : 'REAL'
			} else if (unwrappedType instanceof z.ZodBoolean) {
				sqlType = 'BOOLEAN'
			} else if (unwrappedType instanceof z.ZodDate) {
				sqlType = 'TEXT' // Stored as ISO string
			}

			columns.push({
				name: colName,
				type: sqlType,
				nullable: isNullable,
				primaryKey: false
			})
		}
	}
}

/**
 * Extracts the table schema definition from a Zod object schema
 * This provides detailed information about each column in the table
 */
export function extractTableStructure<T extends ZodRawShape>(
	tableName: string,
	schema: ZodObject<T>,
	options: TableOptions = {}
): TableStructure {
	const {
		autoId = false,
		timestamps = false,
		extraColumns = [],
		primaryKey,
		indexes = {},
		flattenDepth = 2
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

	// Add columns from the schema with flattening support
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

		// Process nested objects with flattening
		if (unwrappedType instanceof z.ZodObject && flattenDepth > 0) {
			processNestedTableSchema(key, unwrappedType, columns, flattenDepth - 1, isPk)
		} else if (unwrappedType instanceof z.ZodArray) {
			// Arrays are stored as JSON
			columns.push({
				name: key,
				type: 'TEXT', // JSON array
				nullable,
				primaryKey: isPk
			})
		} else {
			// Determine the SQL type based on Zod type
			let sqlType = 'TEXT'
			if (unwrappedType instanceof z.ZodNumber) {
				const isInt = (unwrappedType._def.checks || []).some(
					(c) => c.kind === 'int'
				)
				sqlType = isInt ? 'INTEGER' : 'REAL'
			} else if (unwrappedType instanceof z.ZodBoolean) {
				sqlType = 'BOOLEAN'
			} else if (unwrappedType instanceof z.ZodDate) {
				sqlType = 'TEXT' // Stored as ISO string
			}

			columns.push({
				name: key,
				type: sqlType,
				nullable,
				primaryKey: isPk
			})
		}
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
