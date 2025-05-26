import type { ExtraColumn } from '../types'
import { mapSqlTypeToString } from '../utils'

/**
 * Adds extra columns to flat data object
 */
export function addExtraColumnsToFlat(
	flatData: Record<string, any>,
	extraColumns: ExtraColumn[] = []
): void {
	extraColumns.forEach(column => {
		const type = mapSqlTypeToString(column.type)
		flatData[column.name] = type
	})
}

/**
 * Filters extra columns by position
 */
export function filterExtraColumnsByPosition(
	extraColumns: ExtraColumn[] = [],
	position: 'start' | 'end'
): ExtraColumn[] {
	return extraColumns.filter(col => {
		if (position === 'start') {
			return col.position === 'start'
		}
		return !col.position || col.position === 'end'
	})
}

/**
 * Processes extra columns for data insertion
 */
export function processExtraColumnsForInsert(
	data: Record<string, any>,
	extraColumns: ExtraColumn[] = []
): Record<string, any> {
	const result = { ...data }

	extraColumns.forEach(column => {
		if (column.defaultValue && !(column.name in result)) {
			// Add default value if not present
			result[column.name] = column.defaultValue
		}
	})

	return result
}