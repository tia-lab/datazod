import { ZodObject, ZodRawShape } from 'zod'
import { TursoClient } from '../types'
import { TursoQueryBuilder } from './index'

/**
 * Helper functions for common query patterns with object parameters
 */

export interface FindByIdOptions<T extends ZodRawShape> {
	tableName: string
	schema: ZodObject<T>
	turso: TursoClient
	id: string | number
	idColumn?: string
}

/**
 * Find a record by ID
 */
export async function findById<T extends ZodRawShape>({
	tableName,
	schema,
	turso,
	id,
	idColumn = 'id'
}: FindByIdOptions<T>): Promise<Record<string, any> | null> {
	const query = new TursoQueryBuilder(tableName, schema)
	return await query
		.selectAll()
		.where(idColumn as any, '=', id)
		.first(turso)
}

export interface FindByOptions<T extends ZodRawShape> {
	tableName: string
	schema: ZodObject<T>
	turso: TursoClient
	field: string
	value: any
	limit?: number
	orderBy?: string
	direction?: 'ASC' | 'DESC'
	clean?: boolean
}

/**
 * Find records by a specific field value
 */
export async function findBy<T extends ZodRawShape>({
	tableName,
	schema,
	turso,
	field,
	value,
	limit,
	orderBy,
	direction = 'ASC',
	clean = false
}: FindByOptions<T>): Promise<Record<string, any>[]> {
	const query = new TursoQueryBuilder(tableName, schema)
		.selectAll()
		.where(field as any, '=', value)

	if (limit) {
		query.limit(limit)
	}

	if (orderBy) {
		query.orderBy(orderBy as any, direction)
	}

	const results = await query.all(turso)
	
	if (clean) {
		return results.map(row => {
			const cleanRow: Record<string, any> = {}
			Object.keys(schema.shape).forEach(key => {
				if (row[key] !== undefined) {
					cleanRow[key] = row[key]
				}
			})
			return cleanRow
		})
	}

	return results
}

export interface FindLatestOptions<T extends ZodRawShape> {
	tableName: string
	schema: ZodObject<T>
	turso: TursoClient
	timestampColumn?: string
	where?: Array<{ field: string; value: any }>
	select?: string[]
}

/**
 * Find the latest record by timestamp
 */
export async function findLatest<T extends ZodRawShape>({
	tableName,
	schema,
	turso,
	timestampColumn = 'created_at',
	where,
	select
}: FindLatestOptions<T>): Promise<Record<string, any> | null> {
	const query = new TursoQueryBuilder(tableName, schema)

	// Select specific columns or all
	if (select && select.length > 0) {
		query.select(select as any)
	} else {
		query.selectAll()
	}

	query.orderBy(timestampColumn as any, 'DESC').limit(1)

	// Add where conditions if provided
	if (where) {
		for (const condition of where) {
			query.where(condition.field as any, '=', condition.value)
		}
	}

	return await query.first(turso)
}

export interface FindByDateRangeOptions<T extends ZodRawShape> {
	tableName: string
	schema: ZodObject<T>
	turso: TursoClient
	timestampColumn: string
	startDate: string | Date
	endDate: string | Date
	limit?: number
	orderBy?: 'ASC' | 'DESC'
}

/**
 * Find records within a date range
 */
export async function findByDateRange<T extends ZodRawShape>({
	tableName,
	schema,
	turso,
	timestampColumn,
	startDate,
	endDate,
	limit,
	orderBy = 'DESC'
}: FindByDateRangeOptions<T>): Promise<Record<string, any>[]> {
	const startTimestamp = startDate instanceof Date ? startDate.toISOString() : startDate
	const endTimestamp = endDate instanceof Date ? endDate.toISOString() : endDate

	const query = new TursoQueryBuilder(tableName, schema)
		.selectAll()
		.where(timestampColumn as any, '>=', startTimestamp)
		.where(timestampColumn as any, '<=', endTimestamp)
		.orderBy(timestampColumn as any, orderBy)

	if (limit) {
		query.limit(limit)
	}

	return await query.all(turso)
}

export interface CountOptions<T extends ZodRawShape> {
	tableName: string
	schema: ZodObject<T>
	turso: TursoClient
	where?: Array<{ 
		field: string
		operator?: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN'
		value: any 
	}>
}

/**
 * Count records matching conditions
 */
export async function count<T extends ZodRawShape>({
	tableName,
	schema,
	turso,
	where
}: CountOptions<T>): Promise<number> {
	let sql = `SELECT COUNT(*) as count FROM ${tableName}`
	const args: any[] = []

	if (where && where.length > 0) {
		const whereClause = where.map(condition => {
			const operator = condition.operator || '='
			if (operator === 'IN') {
				const placeholders = Array(condition.value.length).fill('?').join(', ')
				args.push(...condition.value)
				return `${condition.field} IN (${placeholders})`
			} else {
				args.push(condition.value)
				return `${condition.field} ${operator} ?`
			}
		}).join(' AND ')
		
		sql += ` WHERE ${whereClause}`
	}

	const result = await turso.execute({ sql, args })
	return Number(result.rows[0]?.count || 0)
}

export interface ExistsOptions<T extends ZodRawShape> {
	tableName: string
	schema: ZodObject<T>
	turso: TursoClient
	where: Array<{ field: string; value: any }>
}

/**
 * Check if a record exists
 */
export async function exists<T extends ZodRawShape>({
	tableName,
	schema,
	turso,
	where
}: ExistsOptions<T>): Promise<boolean> {
	const countResult = await count({ tableName, schema, turso, where })
	return countResult > 0
}