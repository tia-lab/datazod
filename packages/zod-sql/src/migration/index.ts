import { ZodObject, ZodRawShape } from 'zod'
import { TableWithMigrationOptions } from '../types'
import { extractTableStructure } from '../schema'
import { createTableDDL } from '../tables/table-ddl'

/**
 * Database client interface for migration operations
 */
export interface MigrationClient {
	execute(sql: string): Promise<any>
}

/**
 * Get current table columns from database
 */
export async function getTableColumns(
	tableName: string, 
	client: MigrationClient,
	dialect: 'sqlite' | 'mysql' | 'postgres' = 'sqlite'
): Promise<string[]> {
	try {
		let sql: string
		
		switch (dialect) {
			case 'sqlite':
				sql = `PRAGMA table_info(${tableName})`
				break
			case 'mysql':
				sql = `SHOW COLUMNS FROM ${tableName}`
				break
			case 'postgres':
				sql = `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}'`
				break
			default:
				sql = `PRAGMA table_info(${tableName})`
		}
		
		const result = await client.execute(sql)
		
		if (dialect === 'sqlite') {
			return result.rows?.map((row: any) => row.name as string) || []
		} else if (dialect === 'mysql') {
			return result.rows?.map((row: any) => row.Field as string) || []
		} else {
			return result.rows?.map((row: any) => row.column_name as string) || []
		}
	} catch (error) {
		// Table doesn't exist
		return []
	}
}

/**
 * Generate SQL column definition from table structure
 */
function getColumnDefinition(column: any, dialect: 'sqlite' | 'mysql' | 'postgres' = 'sqlite'): string {
	let sqlType = column.type || 'TEXT'
	
	// Map generic types to dialect-specific types
	if (dialect === 'sqlite') {
		switch (sqlType.toUpperCase()) {
			case 'STRING':
			case 'VARCHAR':
				sqlType = 'TEXT'
				break
			case 'INTEGER':
			case 'INT':
				sqlType = 'INTEGER'
				break
			case 'FLOAT':
			case 'DOUBLE':
				sqlType = 'REAL'
				break
			case 'BOOLEAN':
				sqlType = 'INTEGER'
				break
			case 'DATETIME':
			case 'TIMESTAMP':
				sqlType = 'TEXT'
				break
		}
	}
	
	// For migration safety: Always make new columns nullable to avoid constraint errors
	// SQLite cannot add NOT NULL columns without default values to existing tables
	const defaultValue = column.defaultValue ? ` DEFAULT ${column.defaultValue}` : ''
	
	return `${sqlType}${defaultValue}`
}

/**
 * Backup table data for safe migration
 */
async function backupTableData(
	tableName: string,
	client: MigrationClient,
	columns: string[]
): Promise<any[]> {
	const columnList = columns.map(col => `"${col}"`).join(', ')
	const sql = `SELECT ${columnList} FROM ${tableName}`
	const result = await client.execute(sql)
	return result.rows || []
}

/**
 * Restore data to recreated table
 */
async function restoreTableData(
	tableName: string,
	client: MigrationClient,
	data: any[],
	newColumns: string[]
): Promise<void> {
	if (data.length === 0) return
	
	for (const row of data) {
		// Filter row data to only include columns that exist in new schema AND have actual values
		const filteredRow: any = {}
		newColumns.forEach(col => {
			if (row[col] !== undefined && row[col] !== null) {
				filteredRow[col] = row[col]
			}
		})
		
		// Only insert columns that actually have data, let DEFAULT values handle the rest
		const columns = Object.keys(filteredRow)
		const values = Object.values(filteredRow)
		
		if (columns.length === 0) {
			// If no columns have data, insert an empty row to trigger all defaults
			const sql = `INSERT INTO ${tableName} DEFAULT VALUES`
			await client.execute(sql)
		} else {
			const columnList = columns.map(col => `"${col}"`).join(', ')
			
			// Escape values for SQL safety
			const escapedValues = values.map(val => {
				if (val === null || val === undefined) return 'NULL'
				if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
				return String(val)
			}).join(', ')
			
			const sql = `INSERT INTO ${tableName} (${columnList}) VALUES (${escapedValues})`
			await client.execute(sql)
		}
	}
}

/**
 * Migrate table schema automatically
 */
export async function migrateTableSchema<T extends ZodRawShape>(
	tableName: string,
	schema: ZodObject<T>,
	client: MigrationClient,
	options: TableWithMigrationOptions = {}
): Promise<void> {
	const { dialect = 'sqlite', allowDrop = false, debug = false } = options
	
	const currentColumns = await getTableColumns(tableName, client, dialect)
	
	if (currentColumns.length === 0) {
		if (debug) console.log(`[Migration] Table ${tableName} doesn't exist, skipping migration`)
		return
	}
	
	// Extract new schema structure
	const structure = extractTableStructure(schema, options)
	const newColumns = structure.columns.map(col => col.name)
	
	// Find columns to add and remove
	const columnsToAdd = newColumns.filter(col => !currentColumns.includes(col))
	const columnsToRemove = currentColumns.filter(col => !newColumns.includes(col))
	
	if (debug) {
		console.log(`[Migration] Table ${tableName}:`)
		console.log(`[Migration] Current columns:`, currentColumns)
		console.log(`[Migration] New columns:`, newColumns)
		console.log(`[Migration] To add:`, columnsToAdd)
		console.log(`[Migration] To remove:`, columnsToRemove)
	}
	
	// Handle column additions
	if (columnsToAdd.length > 0) {
		for (const columnName of columnsToAdd) {
			const columnDef = structure.columns.find(col => col.name === columnName)
			if (!columnDef) continue
			
			const sqlType = getColumnDefinition(columnDef, dialect)
			const sql = `ALTER TABLE ${tableName} ADD COLUMN "${columnName}" ${sqlType}`
			
			if (debug) console.log(`[Migration] Adding column: ${sql}`)
			
			try {
				await client.execute(sql)
				if (debug) console.log(`[Migration] Successfully added column ${columnName}`)
			} catch (error: any) {
				if (debug) console.log(`[Migration] Error adding column ${columnName}:`, error.message)
				throw error
			}
		}
	}
	
	// Handle column removals (requires table recreation)
	if (columnsToRemove.length > 0) {
		if (!allowDrop) {
			throw new Error(
				`Cannot remove columns [${columnsToRemove.join(', ')}] from table ${tableName}. ` +
				`Set allowDrop: true to enable table recreation with data preservation.`
			)
		}
		
		if (debug) console.log(`[Migration] Recreating table ${tableName} to remove columns:`, columnsToRemove)
		
		// Step 1: Backup existing data
		const backupData = await backupTableData(tableName, client, currentColumns)
		if (debug) console.log(`[Migration] Backed up ${backupData.length} rows`)
		
		// Step 2: Drop old table
		const dropSql = `DROP TABLE ${tableName}`
		if (debug) console.log(`[Migration] Dropping table: ${dropSql}`)
		await client.execute(dropSql)
		
		// Step 3: Create new table with updated schema
		const newTableDDL = createTableDDL(tableName, schema, options)
		if (debug) console.log(`[Migration] Creating new table: ${newTableDDL}`)
		await client.execute(newTableDDL)
		
		// Step 4: Restore data (only columns that exist in new schema)
		if (debug) console.log(`[Migration] Restoring data...`)
		await restoreTableData(tableName, client, backupData, newColumns)
		if (debug) console.log(`[Migration] Successfully recreated table ${tableName}`)
	}
	
	if (columnsToAdd.length === 0 && columnsToRemove.length === 0) {
		if (debug) console.log(`[Migration] No schema changes needed for ${tableName}`)
	}
}