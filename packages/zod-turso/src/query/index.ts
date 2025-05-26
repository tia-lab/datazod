import { ZodObject, ZodRawShape, z } from 'zod'
import { TursoClient } from '../types'
import { flattenZodToObject } from '@repo/shared'
import { ResultSet } from '@libsql/client'

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
	operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL'
	value: any
}

export class TursoQueryBuilder<T extends ZodRawShape> {
	private tableName: string
	private schema: ZodObject<T>
	private flattenedSchema: Record<string, any>
	private selectColumns: string[] = []
	private whereConditions: WhereCondition[] = []
	private queryOptions: QueryOptions = {}

	constructor(tableName: string, schema: ZodObject<T>) {
		this.tableName = tableName
		this.schema = schema
		this.flattenedSchema = flattenZodToObject(schema, {})
	}

	/**
	 * Select specific columns (uses flattened column names)
	 */
	select(columns: (keyof typeof this.flattenedSchema)[]): this {
		this.selectColumns = columns as string[]
		return this
	}

	/**
	 * Select all columns
	 */
	selectAll(): this {
		this.selectColumns = Object.keys(this.flattenedSchema)
		return this
	}

	/**
	 * Add WHERE condition
	 */
	where(column: keyof typeof this.flattenedSchema, operator: WhereCondition['operator'], value: any): this {
		this.whereConditions.push({
			column: column as string,
			operator,
			value
		})
		return this
	}

	/**
	 * Add WHERE IS NULL condition
	 */
	whereNull(column: keyof typeof this.flattenedSchema): this {
		this.whereConditions.push({
			column: column as string,
			operator: 'IS NULL',
			value: null
		})
		return this
	}

	/**
	 * Add WHERE IS NOT NULL condition
	 */
	whereNotNull(column: keyof typeof this.flattenedSchema): this {
		this.whereConditions.push({
			column: column as string,
			operator: 'IS NOT NULL',
			value: null
		})
		return this
	}

	/**
	 * Add ORDER BY clause
	 */
	orderBy(column: keyof typeof this.flattenedSchema, direction: 'ASC' | 'DESC' = 'ASC'): this {
		if (!this.queryOptions.orderBy) {
			this.queryOptions.orderBy = []
		}
		this.queryOptions.orderBy.push({
			column: column as string,
			direction
		})
		return this
	}

	/**
	 * Add LIMIT clause
	 */
	limit(count: number): this {
		this.queryOptions.limit = count
		return this
	}

	/**
	 * Add OFFSET clause
	 */
	offset(count: number): this {
		this.queryOptions.offset = count
		return this
	}

	/**
	 * Build the SQL query
	 */
	private buildQuery(): { sql: string; args: any[] } {
		// SELECT clause
		const columns = this.selectColumns.length > 0 
			? this.selectColumns.join(', ')
			: Object.keys(this.flattenedSchema).join(', ')
		
		let sql = `SELECT ${columns} FROM ${this.tableName}`
		const args: any[] = []

		// WHERE clause
		if (this.whereConditions.length > 0) {
			const whereClause = this.whereConditions.map(condition => {
				if (condition.operator === 'IN') {
					const placeholders = Array(condition.value.length).fill('?').join(', ')
					args.push(...condition.value)
					return `${condition.column} IN (${placeholders})`
				} else if (condition.operator === 'IS NULL') {
					return `${condition.column} IS NULL`
				} else if (condition.operator === 'IS NOT NULL') {
					return `${condition.column} IS NOT NULL`
				} else if (condition.value === null) {
					// Auto-convert null comparisons to IS NULL/IS NOT NULL
					if (condition.operator === '=') {
						return `${condition.column} IS NULL`
					} else if (condition.operator === '!=') {
						return `${condition.column} IS NOT NULL`
					} else {
						args.push(condition.value)
						return `${condition.column} ${condition.operator} ?`
					}
				} else {
					args.push(condition.value)
					return `${condition.column} ${condition.operator} ?`
				}
			}).join(' AND ')
			
			sql += ` WHERE ${whereClause}`
		}

		// ORDER BY clause
		if (this.queryOptions.orderBy && this.queryOptions.orderBy.length > 0) {
			const orderClause = this.queryOptions.orderBy
				.map(order => `${order.column} ${order.direction}`)
				.join(', ')
			sql += ` ORDER BY ${orderClause}`
		}

		// LIMIT clause
		if (this.queryOptions.limit) {
			sql += ` LIMIT ${this.queryOptions.limit}`
		}

		// OFFSET clause
		if (this.queryOptions.offset) {
			sql += ` OFFSET ${this.queryOptions.offset}`
		}

		return { sql, args }
	}

	/**
	 * Execute the query and return results
	 */
	async execute(turso: TursoClient): Promise<ResultSet> {
		const { sql, args } = this.buildQuery()
		return await turso.execute({ sql, args })
	}

	/**
	 * Execute the query and return the first result
	 */
	async first(turso: TursoClient): Promise<Record<string, any> | null> {
		this.limit(1)
		const result = await this.execute(turso)
		return result.rows.length > 0 ? result.rows[0] as Record<string, any> : null
	}

	/**
	 * Execute the query and return all results
	 */
	async all(turso: TursoClient): Promise<Record<string, any>[]> {
		const result = await this.execute(turso)
		return result.rows as Record<string, any>[]
	}

	/**
	 * Get the SQL query without executing it (for debugging)
	 */
	toSQL(): { sql: string; args: any[] } {
		return this.buildQuery()
	}

	/**
	 * Get available column names for this table
	 */
	getColumns(): string[] {
		return Object.keys(this.flattenedSchema)
	}
}

/**
 * Create a query builder for a table
 */
export function createTursoQuery<T extends ZodRawShape>(
	tableName: string,
	schema: ZodObject<T>
): TursoQueryBuilder<T> {
	return new TursoQueryBuilder(tableName, schema)
}