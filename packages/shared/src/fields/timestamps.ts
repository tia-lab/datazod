/**
 * Adds timestamp fields to flat data object
 */
export function addTimestampsToFlat(
	flatData: Record<string, any>,
	enabled: boolean = false
): void {
	if (!enabled) return

	flatData['created_at'] = 'string'
	flatData['updated_at'] = 'string'
}

/**
 * Generates timestamp values for insertion
 */
export function generateTimestampValues(): { created_at: string; updated_at: string } {
	const now = new Date().toISOString()
	return {
		created_at: now,
		updated_at: now
	}
}

/**
 * Updates the updated_at timestamp for updates
 */
export function updateTimestamp(): { updated_at: string } {
	return {
		updated_at: new Date().toISOString()
	}
}