import { z, type ZodObject, type ZodRawShape, type ZodTypeAny } from 'zod'
import type { TableOptions, TableStructure, ColumnDefinition, SQLDialect } from '../types'
import {
	generateAutoIdConfig,
	filterExtraColumnsByPosition,
	unwrapOptionalTypes,
	shouldFlattenType,
	isInteger,
	mapTypeToSql
} from '@repo/shared'

/**
 * Extracts table structure metadata from Zod schema
 */
export function extractTableStructure<T extends ZodRawShape>(
	schema: ZodObject<T>,
	options: TableOptions = {}
): TableStructure {
	const {
		primaryKey,
		indexes = {},
		extraColumns = [],
		timestamps = false,
		autoId = false,
		flattenDepth = 2,
		dialect = 'sqlite'
	} = options

	const columns: ColumnDefinition[] = []
	const primaryKeys: string[] = []

	// Add auto ID column if enabled
	const autoIdConfig = generateAutoIdConfig(autoId)
	if (autoIdConfig) {
		const idName = autoIdConfig.name || 'id'
		const idType = autoIdConfig.type === 'uuid' ? 'TEXT' : 'INTEGER'

		columns.push({
			name: idName,
			type: idType,
			notNull: true,
			primaryKey: true,
			unique: true
		})
		primaryKeys.push(idName)
	}

	// Add timestamp columns if requested
	if (timestamps) {
		columns.push(
			{
				name: 'created_at',
				type: 'DATETIME',
				notNull: true,
				defaultValue: 'CURRENT_TIMESTAMP',
				primaryKey: false,
				unique: false
			},
			{
				name: 'updated_at',
				type: 'DATETIME',
				notNull: true,
				defaultValue: 'CURRENT_TIMESTAMP',
				primaryKey: false,
				unique: false
			}
		)
	}

	// Add extra columns at start position
	const startColumns = filterExtraColumnsByPosition(extraColumns, 'start')
	startColumns.forEach(col => {
		columns.push({
			name: col.name,
			type: col.type,
			notNull: col.notNull !== false,
			defaultValue: col.defaultValue,
			primaryKey: col.primaryKey || false,
			unique: col.unique || false
		})
		if (col.primaryKey) {
			primaryKeys.push(col.name)
		}
	})

	// Process schema fields with flattening
	Object.entries(schema.shape).forEach(([key, zodType]) => {
		processZodTypeWithFlattening(key, zodType as ZodTypeAny, columns, flattenDepth, dialect)
	})

	// Add extra columns at end position
	const endColumns = filterExtraColumnsByPosition(extraColumns, 'end')
	endColumns.forEach(col => {
		columns.push({
			name: col.name,
			type: col.type,
			notNull: col.notNull !== false,
			defaultValue: col.defaultValue,
			primaryKey: col.primaryKey || false,
			unique: col.unique || false
		})
		if (col.primaryKey) {
			primaryKeys.push(col.name)
		}
	})

	// Handle primary key configuration
	if (primaryKey) {
		const pkColumns = Array.isArray(primaryKey) ? primaryKey : [primaryKey]
		pkColumns.forEach(pk => {
			if (!primaryKeys.includes(pk)) {
				primaryKeys.push(pk)
			}
			const column = columns.find(col => col.name === pk)
			if (column) {
				column.primaryKey = true
			}
		})
	}

	return {
		columns,
		primaryKeys,
		indexes
	}
}

function processZodTypeWithFlattening(
	name: string,
	zodType: ZodTypeAny,
	columns: ColumnDefinition[],
	flattenDepth: number,
	dialect: SQLDialect
): void {
	if (shouldFlattenType(zodType, flattenDepth)) {
		const { type } = unwrapOptionalTypes(zodType)
		processNestedObjectForStructure(name, type as any, columns, flattenDepth, dialect, zodType)
	} else {
		const column = processZodTypeToColumn(name, zodType, dialect)
		columns.push(column)
	}
}

function processNestedObjectForStructure(
	prefix: string,
	objectType: ZodObject<any>,
	columns: ColumnDefinition[],
	depth: number,
	dialect: SQLDialect,
	originalType: ZodTypeAny
): void {
	if (depth <= 0) {
		const column = processZodTypeToColumn(prefix, originalType, dialect)
		columns.push(column)
		return
	}

	const shape = objectType.shape
	for (const [nestedKey, nestedType] of Object.entries(shape) as [string, ZodTypeAny][]) {
		const colName = `${prefix}_${nestedKey}`

		if (shouldFlattenType(nestedType, depth)) {
			const { type } = unwrapOptionalTypes(nestedType)
			processNestedObjectForStructure(colName, type as any, columns, depth - 1, dialect, nestedType)
		} else {
			const column = processZodTypeToColumn(colName, nestedType, dialect)
			columns.push(column)
		}
	}
}

function processZodTypeToColumn(
	name: string,
	zodType: ZodTypeAny,
	dialect: SQLDialect
): ColumnDefinition {
	const { type, isOptional } = unwrapOptionalTypes(zodType)
	
	let sqlType = 'TEXT'
	let defaultValue: string | undefined

	// Handle default values
	if (type instanceof z.ZodDefault) {
		defaultValue = String(type._def.defaultValue())
	}

	// Handle numbers specifically
	if (type instanceof z.ZodNumber) {
		const isInt = isInteger(type)
		sqlType = mapTypeToSql(isInt ? 'integer' : 'number', dialect)
	} else {
		// Map other Zod types to SQL types
		switch (type._def.typeName) {
			case 'ZodString':
				sqlType = 'TEXT'
				break
			case 'ZodBoolean':
				sqlType = 'INTEGER'
				break
			case 'ZodDate':
				sqlType = 'DATETIME'
				break
			case 'ZodArray':
			case 'ZodObject':
				sqlType = 'TEXT' // JSON serialized
				break
			default:
				sqlType = 'TEXT'
		}
	}

	return {
		name,
		type: sqlType,
		notNull: !isOptional,
		defaultValue,
		primaryKey: false,
		unique: false
	}
}