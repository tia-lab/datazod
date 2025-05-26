export type { TursoInserterOptions, BatchInsertOptions } from './inserter'
export type { InsertResult, BatchInsertResult, BatchItemResult } from './results'
export type { TursoClient, TursoValue, SqlQuery } from './client'

// Query-related types
export interface QueryOptions {
	limit?: number
	offset?: number
	orderBy?: Array<{
		column: string
		direction?: 'ASC' | 'DESC'
	}>
}

export interface WhereCondition {
	column: string
	operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN'
	value: any
}

// Re-export shared types for convenience
export type {
	SQLDialect,
	AutoIdConfig,
	ExtraColumn,
	BaseOptions,
	ExtendedOptions
} from '@repo/shared'