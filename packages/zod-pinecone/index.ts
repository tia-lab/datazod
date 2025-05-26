// Database-specific adapters (recommended approach)
export { createTursoPineconeAdapter } from './src/adapters/index.js'

// Query functionality
export {
	deleteByFilter,
	findSimilar,
	hybridSearch,
	queryByIds,
	queryByMappingId,
	queryByText,
	queryPineconeWithString
} from './src/query/index.js'

// Utilities
export {
	deleteIndex,
	EmbeddingHelper,
	ensurePineconeIndex,
	FilterHelper,
	indexExists,
	MetadataHelper
} from './src/utils/index.js'

// Types
export type {
	DeleteByFilterOptions,
	EnsurePineconeIndexOptions,
	FindSimilarOptions,
	HybridSearchOptions,
	PineconeClient,
	PineconeFetchResponse,
	PineconeHybridSearchParams,
	PineconeIndex,
	PineconeMatch,
	PineconeQueryOptions,
	PineconeQueryResponse,
	PineconeVector,
	QueryByIdOptions,
	QueryByMappingIdOptions,
	QueryByTextOptions,
	QueryPineconeWithStringOptions,
	QueryResult,
	TursoPineconeAdapterOptions,
	TursoSyncOptions,
	TursoSyncResult
} from './src/types/index.js'
