/**
 * Result of a single insert operation
 */
export interface InsertResult {
	success: boolean
	id?: string
	error?: string
}

/**
 * Result of a batch insert operation
 */
export interface BatchInsertResult {
	success: boolean
	inserted: number
	failed: number
	errors?: string[]
	ids?: string[]
}

/**
 * Individual batch item result
 */
export interface BatchItemResult {
	index: number
	success: boolean
	id?: string
	error?: string
}