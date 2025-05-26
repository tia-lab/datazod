// Adapter types
export type { TursoPineconeAdapterOptions, TursoSyncOptions, TursoSyncResult } from '../adapters'

// Query types
export type { QueryResult, QueryResponse } from './results'
export type { 
	PineconeClient, 
	PineconeIndex, 
	PineconeVector, 
	PineconeMatch,
	PineconeQueryResponse,
	PineconeFetchResponse,
	QueryParams 
} from './client'

// Query helper types
export type {
	QueryByTextOptions,
	QueryByIdOptions,
	QueryByMappingIdOptions,
	HybridSearchOptions,
	FindSimilarOptions,
	DeleteByFilterOptions,
	QueryPineconeWithStringOptions
} from '../query'

// Utility types
export type {
	EnsurePineconeIndexOptions,
	CheckIndexOptions,
	DeleteIndexOptions
} from '../utils'

// Query-related types (prefixed to avoid conflicts with zod-turso)
export interface PineconeQueryOptions {
	topK?: number
	includeMetadata?: boolean
	includeValues?: boolean
	filter?: Record<string, any>
}

export interface PineconeHybridSearchParams {
	queryText: string
	filter?: Record<string, any>
	topK?: number
	namespace?: string
}

// Mapping fields for database integration
export interface MappingFields {
	turso_id?: boolean
	custom_id?: string
}