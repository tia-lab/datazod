import type { TursoInserterOptions } from '../types'
import {
	generateAutoIdConfig,
	generateTimestampValues,
	updateTimestamp
} from '@repo/shared'
import { v4 as uuidv4 } from 'uuid'

/**
 * Adds auto fields (ID, timestamps) to existing data
 */
export function addAutoFields(
	data: Record<string, any>,
	options: TursoInserterOptions,
	isUpdate: boolean = false
): Record<string, any> {
	const result = { ...data }

	// Add auto ID if enabled and not present
	const autoIdConfig = options.autoId ? generateAutoIdConfig(options.autoId) : null
	if (autoIdConfig && !isUpdate) {
		const idName = autoIdConfig.name || 'id'
		if (!(idName in result)) {
			if (autoIdConfig.type === 'uuid') {
				result[idName] = uuidv4()
			}
		}
	}

	// Add timestamps
	if (options.timestamps) {
		if (isUpdate) {
			const timestamp = updateTimestamp()
			Object.assign(result, timestamp)
		} else {
			const timestamps = generateTimestampValues()
			Object.assign(result, timestamps)
		}
	}

	return result
}