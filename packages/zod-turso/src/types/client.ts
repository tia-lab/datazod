import type { Client as LibsqlClient, Value } from '@libsql/client'

/**
 * Turso client type (re-export for convenience)
 */
export type TursoClient = LibsqlClient

/**
 * Turso value type (re-export for convenience)
 */
export type TursoValue = Value

/**
 * SQL query with arguments
 */
export interface SqlQuery {
	sql: string
	args: Value[]
}