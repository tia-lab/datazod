import type { BaseOptions } from './common'
import type { ExtraColumn } from './fields'

/**
 * Extended options that include extra columns and indexing
 */
export interface ExtendedOptions extends BaseOptions {
	primaryKey?: string | string[]
	indexes?: Record<string, string[]>
	extraColumns?: ExtraColumn[]
}