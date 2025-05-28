import type { ExtendedOptions, ColumnDefinition } from '@datazod/shared'

/**
 * SQL-specific table options
 */
export interface TableOptions extends ExtendedOptions {
	// SQL-specific options can be added here
}

/**
 * Table options with migration support
 */
export interface TableWithMigrationOptions extends TableOptions {
	// Migration options
	migrate?: boolean
	allowDrop?: boolean
	debug?: boolean
}

/**
 * Table structure representation
 */
export interface TableStructure {
	columns: ColumnDefinition[]
	primaryKeys: string[]
	indexes: Record<string, string[]>
}