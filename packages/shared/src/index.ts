// Types
export type {
	SQLDialect,
	ColumnPosition,
	AutoIdConfig,
	BaseOptions,
	ExtraColumn,
	ColumnDefinition,
	ExtendedOptions
} from './types'

// Schema utilities
export {
	unwrapOptionalTypes,
	traverseZodShape,
	traverseZodObjectRecursive,
	getZodTypeName,
	isZodObject,
	isZodArray,
	isZodNumber,
	isZodString,
	isZodBoolean,
	inspectZodType,
	type UnwrapResult,
	type TraverseCallback,
	type ZodTypeInfo
} from './schema'

// Utilities
export {
	mapZodTypeToString,
	mapSqlTypeToString,
	mapTypeToSql,
	isInteger,
	isNullable
} from './utils'

// Field processing
export {
	generateAutoIdConfig,
	addAutoIdToFlat,
	generateAutoIdValue,
	addTimestampsToFlat,
	generateTimestampValues,
	updateTimestamp,
	addExtraColumnsToFlat,
	filterExtraColumnsByPosition,
	processExtraColumnsForInsert
} from './fields'

// Flattening
export {
	processZodTypeToString,
	processZodTypeForFlat,
	shouldFlattenType,
	processNestedObjectForFlat,
	processNestedObjectForData,
	flattenZodToObject,
	flattenDataToObject
} from './flattening'