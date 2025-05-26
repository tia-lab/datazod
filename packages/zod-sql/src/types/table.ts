import type { ExtendedOptions, ColumnDefinition } from '@datazod/shared'

/**
 * SQL-specific table options
 */
export interface TableOptions extends ExtendedOptions {
	// SQL-specific options can be added here
}

/**
 * Table structure representation
 */
export interface TableStructure {
	columns: ColumnDefinition[]
	primaryKeys: string[]
	indexes: Record<string, string[]>
}