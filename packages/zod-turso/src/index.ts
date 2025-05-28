// Main inserter functionality
export { createTursoInserter, type TursoInserter } from './inserter'

// Query functionality
export { createTursoQuery, TursoQueryBuilder } from './query'
export { findById, findBy, findLatest, findByDateRange, count, exists } from './query/helpers'

// Helper functions
export {
	flattenForInsert,
	addAutoFields,
	prepareInsertQuery,
	prepareUpdateQuery,
	prepareBatchInsertQuery,
	processBatch,
	migrateTable,
	getTableColumns
} from './helpers'

// Utilities
export { ConnectionHelper, ValidationHelper } from './utils'

// Types
export type {
	TursoInserterOptions,
	BatchInsertOptions,
	InsertResult,
	BatchInsertResult,
	BatchItemResult,
	TursoClient,
	TursoValue,
	SqlQuery,
	SQLDialect,
	AutoIdConfig,
	ExtraColumn,
	BaseOptions,
	ExtendedOptions,
	QueryOptions,
	WhereCondition
} from './types'