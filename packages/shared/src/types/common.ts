/**
 * Supported SQL dialects
 */
export type SQLDialect = 'sqlite' | 'postgres' | 'mysql'

/**
 * Column position in table definition
 */
export type ColumnPosition = 'start' | 'end'

/**
 * Auto ID column configuration
 */
export interface AutoIdConfig {
	enabled: boolean
	name?: string // Default: 'id'
	type?: 'integer' | 'uuid' // Default: 'integer'
}

/**
 * Base configuration options for database operations
 */
export interface BaseOptions {
	dialect?: SQLDialect
	flattenDepth?: number
	timestamps?: boolean
	autoId?: boolean | AutoIdConfig
}