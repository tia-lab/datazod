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
 * Definition for an extra column in the SQL schema
 */
export interface ExtraColumn {
	name: string
	type: string
	notNull?: boolean
	defaultValue?: string
	primaryKey?: boolean
	unique?: boolean
	position?: ColumnPosition // Where to place the column (start or end)
	references?: {
		table: string
		column: string
		onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT'
		onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT'
	}
}
