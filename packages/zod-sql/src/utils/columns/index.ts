import { AutoIdConfig, ExtraColumn, SQLDialect } from '../../types'
import { quoteIdentifier } from '../identifier'

/**
 * Gets timestamp column definitions based on the SQL dialect
 */
export function getTimestampColumns(dialect: SQLDialect): string[] {
	switch (dialect) {
		case 'postgres':
			return [
				quoteIdentifier('created_at', dialect) +
					' TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()',
				quoteIdentifier('updated_at', dialect) +
					' TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()'
			]
		case 'mysql':
			return [
				quoteIdentifier('created_at', dialect) +
					' TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
				quoteIdentifier('updated_at', dialect) +
					' TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
			]
		case 'sqlite':
		default:
			return [
				quoteIdentifier('created_at', dialect) +
					" TEXT NOT NULL DEFAULT (datetime('now'))",
				quoteIdentifier('updated_at', dialect) +
					" TEXT NOT NULL DEFAULT (datetime('now'))"
			]
	}
}

/**
 * Gets auto ID column definition based on the SQL dialect and configuration
 */
export function getAutoIdColumn(
	dialect: SQLDialect,
	config: AutoIdConfig | boolean
): string {
	// Default config if only boolean is provided
	const actualConfig: AutoIdConfig =
		typeof config === 'boolean'
			? { enabled: config, name: 'id', type: 'integer' }
			: { name: 'id', type: 'integer', ...config }

	if (!actualConfig.enabled) {
		return ''
	}

	const idName = quoteIdentifier(actualConfig.name || 'id', dialect)

	switch (dialect) {
		case 'postgres':
			return actualConfig.type === 'uuid'
				? `${idName} UUID PRIMARY KEY DEFAULT gen_random_uuid()`
				: `${idName} SERIAL PRIMARY KEY`
		case 'mysql':
			return actualConfig.type === 'uuid'
				? `${idName} CHAR(36) PRIMARY KEY DEFAULT (UUID())`
				: `${idName} INT AUTO_INCREMENT PRIMARY KEY`
		case 'sqlite':
		default:
			// For SQLite/Turso, use uuid() function which is available in Turso
			return actualConfig.type === 'uuid'
				? `${idName} TEXT PRIMARY KEY DEFAULT (uuid())`
				: `${idName} INTEGER PRIMARY KEY AUTOINCREMENT`
	}
}

/**
 * Helper function to build column definition from ExtraColumn
 */
export function buildColumnDefinition(
	column: ExtraColumn,
	dialect: SQLDialect
): string {
	let colDef = `${quoteIdentifier(column.name, dialect)} ${column.type}`

	if (column.notNull) {
		colDef += ' NOT NULL'
	}

	if (column.defaultValue !== undefined) {
		colDef += ` DEFAULT ${column.defaultValue}`
	}

	if (column.unique) {
		colDef += ' UNIQUE'
	}

	if (column.primaryKey) {
		colDef += ' PRIMARY KEY'
	}

	if (column.references) {
		const { table, column: refColumn, onDelete, onUpdate } = column.references
		colDef += ` REFERENCES ${quoteIdentifier(table, dialect)}(${quoteIdentifier(refColumn, dialect)})`

		if (onDelete) {
			colDef += ` ON DELETE ${onDelete}`
		}

		if (onUpdate) {
			colDef += ` ON UPDATE ${onUpdate}`
		}
	}

	return colDef
}
