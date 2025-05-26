import { ZodTypeAny } from 'zod'
import { SQLDialect } from '../types'
import { mapZodToMySQL } from './mysql'
import { mapZodToPostgres } from './postgres'
import { mapZodToSQLite } from './sqlite'

/**
 * Maps a Zod type to its corresponding SQL data type based on the dialect
 */
export const mapZodToSql = (
	zodType: ZodTypeAny,
	dialect: SQLDialect = 'sqlite'
): string => {
	switch (dialect) {
		case 'postgres':
			return mapZodToPostgres(zodType)
		case 'mysql':
			return mapZodToMySQL(zodType)
		case 'sqlite':
		default:
			return mapZodToSQLite(zodType)
	}
}
