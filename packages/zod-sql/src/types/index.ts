export type { TableOptions, TableWithMigrationOptions, TableStructure } from './table'
export type {
	TableTypes,
	TimeStampsSchema,
	AutoIdSchema,
	AutoIdSchemaWithTimestamps
} from './schema'

// Re-export shared types for convenience
export type {
	SQLDialect,
	ColumnPosition,
	AutoIdConfig,
	ExtraColumn,
	ColumnDefinition
} from '@datazod/shared'