import type { ColumnPosition } from './common'

/**
 * Definition for an extra column in the schema
 */
export interface ExtraColumn {
	name: string
	type: string
	notNull?: boolean
	defaultValue?: string
	primaryKey?: boolean
	unique?: boolean
	position?: ColumnPosition
	references?: {
		table: string
		column: string
		onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT'
		onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT'
	}
}

/**
 * Column definition for table structure
 */
export interface ColumnDefinition {
	name: string
	type: string
	notNull: boolean
	defaultValue?: string
	primaryKey: boolean
	unique: boolean
}