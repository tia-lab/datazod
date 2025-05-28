import type { TursoValue, SqlQuery, TursoClient } from '../types'
import type { ZodObject, ZodRawShape } from 'zod'

/**
 * Prepares an INSERT query from flattened data
 */
export function prepareInsertQuery(
	tableName: string,
	data: Record<string, any>
): SqlQuery {
	const columns = Object.keys(data)
	const values = Object.values(data) as TursoValue[]
	const placeholders = columns.map(() => '?').join(', ')

	if (columns.length === 0) {
		throw new Error('No data provided for insert')
	}

	const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`

	return {
		sql,
		args: values
	}
}

/**
 * Prepares an UPDATE query from flattened data
 */
export function prepareUpdateQuery(
	tableName: string,
	data: Record<string, any>,
	whereClause: string,
	whereValues: TursoValue[] = []
): SqlQuery {
	const columns = Object.keys(data)
	const values = Object.values(data) as TursoValue[]

	if (columns.length === 0) {
		throw new Error('No data provided for update')
	}

	const setClause = columns.map(col => `${col} = ?`).join(', ')
	const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`

	return {
		sql,
		args: [...values, ...whereValues]
	}
}

/**
 * Prepares a batch INSERT query
 */
export function prepareBatchInsertQuery(
	tableName: string,
	dataArray: Record<string, any>[]
): SqlQuery[] {
	return dataArray.map(data => prepareInsertQuery(tableName, data))
}

/**
 * Get current table columns from database
 */
export async function getTableColumns(tableName: string, client: TursoClient): Promise<string[]> {
	try {
		const result = await client.execute(`PRAGMA table_info(${tableName})`)
		return result.rows.map(row => row.name as string)
	} catch (error) {
		// Table doesn't exist
		return []
	}
}

/**
 * Generate SQL column definition from Zod type
 */
function getColumnDefinition(zodType: any): string {
	// Handle optional and nullable wrappers
	let actualType = zodType
	let nullable = false
	
	while (actualType._def) {
		if (actualType._def.typeName === 'ZodOptional' || actualType._def.typeName === 'ZodNullable') {
			nullable = true
			actualType = actualType._def.innerType || actualType._def.type
		} else if (actualType._def.typeName === 'ZodDefault') {
			actualType = actualType._def.innerType || actualType._def.type
		} else {
			break
		}
	}
	
	let sqlType = 'TEXT'
	
	if (actualType._def) {
		switch (actualType._def.typeName) {
			case 'ZodString':
				sqlType = 'TEXT'
				break
			case 'ZodNumber':
				sqlType = 'REAL'
				break
			case 'ZodBoolean':
				sqlType = 'INTEGER'
				break
			case 'ZodDate':
				sqlType = 'TEXT'
				break
			default:
				sqlType = 'TEXT'
		}
	}
	
	// For migration safety: Always make new columns nullable to avoid constraint errors
	// SQLite cannot add NOT NULL columns without default values to existing tables
	return `${sqlType}`
}

/**
 * Migrate table schema automatically (Turso-specific version)
 */
export async function migrateTable<T extends ZodRawShape>(
	tableName: string,
	schema: ZodObject<T>,
	client: TursoClient,
	debug = false
): Promise<void> {
	const currentColumns = await getTableColumns(tableName, client)
	const schemaColumns = Object.keys(schema.shape)
	
	if (currentColumns.length === 0) {
		if (debug) console.log(`[Migration] Table ${tableName} doesn't exist, skipping migration`)
		return
	}
	
	// Find new columns to add
	const columnsToAdd = schemaColumns.filter(col => !currentColumns.includes(col))
	
	if (columnsToAdd.length === 0) {
		if (debug) console.log(`[Migration] No new columns to add for ${tableName}`)
		return
	}
	
	// Add new columns
	for (const column of columnsToAdd) {
		const columnDef = getColumnDefinition(schema.shape[column])
		const sql = `ALTER TABLE ${tableName} ADD COLUMN "${column}" ${columnDef}`
		
		if (debug) console.log(`[Migration] Adding column: ${sql}`)
		
		try {
			await client.execute(sql)
			if (debug) console.log(`[Migration] Successfully added column ${column} to ${tableName}`)
		} catch (error: any) {
			if (debug) console.log(`[Migration] Error adding column ${column}:`, error.message)
			throw error
		}
	}
}