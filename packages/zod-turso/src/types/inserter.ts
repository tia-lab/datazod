import type { ExtendedOptions } from '@datazod/shared'

/**
 * Turso-specific inserter options
 */
export interface TursoInserterOptions extends ExtendedOptions {
	// Migration options
	migrate?: boolean
	debug?: boolean
}

/**
 * Options for batch insert operations
 */
export interface BatchInsertOptions {
	batchSize?: number
	continueOnError?: boolean
}