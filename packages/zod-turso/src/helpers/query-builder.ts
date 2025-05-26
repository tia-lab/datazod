import type { TursoValue, SqlQuery } from '../types'

/**
 * Prepares an INSERT query from flattened data
 */
export function prepareInsertQuery(
	tableName: string,
	data: Record<string, any>
): SqlQuery {
	const columns = Object.keys(data)
	const values = Object.values(data) as TursoValue[]
	const placeholders = columns.map(() => '?').join(', ')

	if (columns.length === 0) {
		throw new Error('No data provided for insert')
	}

	const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`

	return {
		sql,
		args: values
	}
}

/**
 * Prepares an UPDATE query from flattened data
 */
export function prepareUpdateQuery(
	tableName: string,
	data: Record<string, any>,
	whereClause: string,
	whereValues: TursoValue[] = []
): SqlQuery {
	const columns = Object.keys(data)
	const values = Object.values(data) as TursoValue[]

	if (columns.length === 0) {
		throw new Error('No data provided for update')
	}

	const setClause = columns.map(col => `${col} = ?`).join(', ')
	const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`

	return {
		sql,
		args: [...values, ...whereValues]
	}
}

/**
 * Prepares a batch INSERT query
 */
export function prepareBatchInsertQuery(
	tableName: string,
	dataArray: Record<string, any>[]
): SqlQuery[] {
	return dataArray.map(data => prepareInsertQuery(tableName, data))
}