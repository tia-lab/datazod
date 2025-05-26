import type { ExtendedOptions } from '@repo/shared'

/**
 * Turso-specific inserter options
 */
export interface TursoInserterOptions extends ExtendedOptions {
	// Turso-specific options can be added here
}

/**
 * Options for batch insert operations
 */
export interface BatchInsertOptions {
	batchSize?: number
	continueOnError?: boolean
}