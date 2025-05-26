import type { AutoIdConfig } from '../types'

/**
 * Generates auto ID field configuration
 */
export function generateAutoIdConfig(autoId: boolean | AutoIdConfig): AutoIdConfig | null {
	if (!autoId) return null

	if (typeof autoId === 'boolean') {
		return {
			enabled: true,
			name: 'id',
			type: 'integer'
		}
	}

	return {
		enabled: autoId.enabled,
		name: autoId.name || 'id',
		type: autoId.type || 'integer'
	}
}

/**
 * Adds auto ID field to flat data object
 */
export function addAutoIdToFlat(
	flatData: Record<string, any>,
	autoIdConfig: AutoIdConfig
): void {
	if (!autoIdConfig.enabled) return

	const idName = autoIdConfig.name || 'id'
	flatData[idName] = autoIdConfig.type === 'uuid' ? 'string' : 'integer'
}

/**
 * Generates auto ID value for insertion
 */
export function generateAutoIdValue(autoIdConfig: AutoIdConfig): string | number | null {
	if (!autoIdConfig.enabled) return null

	if (autoIdConfig.type === 'uuid') {
		// Return placeholder - actual UUID generation should be done by caller
		return 'UUID_PLACEHOLDER'
	}

	// For integer IDs, database handles auto-increment
	return null
}