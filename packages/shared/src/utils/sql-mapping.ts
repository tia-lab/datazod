import type { SQLDialect } from '../types'

/**
 * Maps SQL types to simplified type strings
 */
export function mapSqlTypeToString(sqlType: string): string {
	switch (sqlType.toUpperCase()) {
		case 'INTEGER':
			return 'integer'
		case 'REAL':
		case 'DOUBLE':
		case 'DOUBLE PRECISION':
			return 'number'
		case 'TEXT':
		case 'DATETIME':
		default:
			return 'string'
	}
}

/**
 * Maps simplified types to SQL types based on dialect
 */
export function mapTypeToSql(type: string, dialect: SQLDialect): string {
	switch (type) {
		case 'integer':
			return 'INTEGER'
		case 'number':
			switch (dialect) {
				case 'postgres':
					return 'DOUBLE PRECISION'
				case 'mysql':
					return 'DOUBLE'
				case 'sqlite':
				default:
					return 'REAL'
			}
		case 'boolean':
			return 'INTEGER'
		case 'string':
		case 'array':
		case 'object':
		default:
			return 'TEXT'
	}
}