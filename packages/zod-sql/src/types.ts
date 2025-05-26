import { z } from 'zod'
import {
	autoIdSchema,
	autoIdSchemaWithTimestamps,
	timeStampsSchema
} from './schema'

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

/**
 * Table structure representation
 */
export interface TableStructure {
	columns: ColumnDefinition[]
	primaryKeys: string[]
	indexes: Record<string, string[]>
}

/**
 * Configuration options for table generation
 */
export interface TableOptions {
	dialect?: SQLDialect // SQL dialect to use (default: 'sqlite')
	primaryKey?: string | string[]
	indexes?: Record<string, string[]>
	flattenDepth?: number
	extraColumns?: ExtraColumn[]
	timestamps?: boolean // Adds created_at and updated_at columns
	autoId?: boolean | AutoIdConfig // Adds an auto-incrementing ID column
}

export type TableTypes<T, Prefix extends string = ''> =
	T extends Record<string, any>
		? {
				[K in keyof T as K extends string
					? T[K] extends Record<string, any>
						? T[K] extends any[]
							? `${Prefix}${K}`
							: never
						: `${Prefix}${K}`
					: never]: T[K] extends any[]
					? T[K]
					: T[K] extends Record<string, any>
						? never
						: T[K]
			} & {
				[K in keyof T as K extends string
					? T[K] extends Record<string, any>
						? T[K] extends any[]
							? never
							: `${Prefix}${K}_${keyof T[K] & string}`
						: never
					: never]: K extends string
					? T[K] extends Record<string, any>
						? T[K] extends any[]
							? never
							: T[K][keyof T[K]]
						: never
					: never
			}
		: never

export type TimeStampsSchema = z.infer<typeof timeStampsSchema>
export type AutoIdSchema = z.infer<typeof autoIdSchema>
export type AutoIdSchemaWithTimestamps = z.infer<
	typeof autoIdSchemaWithTimestamps
>
