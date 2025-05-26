import { ZodObject, ZodRawShape } from 'zod'
import type {
	PineconeClient,
	PineconeFetchResponse,
	PineconeQueryResponse,
	QueryResult
} from '../types'

/**
 * Helper functions for common Pinecone query patterns with object parameters
 */

export interface QueryByTextOptions<T extends ZodRawShape> {
	pinecone: PineconeClient
	indexName: string
	schema: ZodObject<T>
	queryText: string
	embeddingFields: string[]
	generateEmbedding: (text: string, model?: string) => Promise<number[]>
	topK?: number
	filter?: Record<string, any>
	namespace?: string
	includeMetadata?: boolean
	embeddingModel?: string
}

/**
 * Query vectors by text similarity
 */
export async function queryByText<T extends ZodRawShape>({
	pinecone,
	indexName,
	schema,
	queryText,
	embeddingFields,
	generateEmbedding,
	topK = 10,
	filter,
	namespace,
	includeMetadata = true,
	embeddingModel
}: QueryByTextOptions<T>): Promise<QueryResult[]> {
	// Generate embedding for query text
	const queryEmbedding = await generateEmbedding(queryText, embeddingModel)

	// Query Pinecone
	const index = pinecone.index(indexName)
	const response: PineconeQueryResponse = await index.query({
		vector: queryEmbedding,
		topK,
		filter,
		includeMetadata,
		namespace
	})

	return response.matches.map((match) => ({
		id: match.id,
		score: match.score,
		metadata: match.metadata,
		values: match.values
	}))
}

export interface QueryByIdOptions<T extends ZodRawShape> {
	pinecone: PineconeClient
	indexName: string
	schema: ZodObject<T>
	ids: string[]
	namespace?: string
}

/**
 * Query vectors by IDs
 */
export async function queryByIds<T extends ZodRawShape>({
	pinecone,
	indexName,
	schema,
	ids,
	namespace
}: QueryByIdOptions<T>): Promise<QueryResult[]> {
	const index = pinecone.index(indexName)
	const response: PineconeFetchResponse = await index.fetch({ ids })

	return Object.entries(response.vectors || {}).map(([id, vector]) => ({
		id,
		score: 1.0, // Exact match
		metadata: vector.metadata,
		values: vector.values
	}))
}

export interface QueryByMappingIdOptions<T extends ZodRawShape> {
	pinecone: PineconeClient
	indexName: string
	schema: ZodObject<T>
	mappingId: string
	mappingField: 'turso_id' | 'mongo_id' | 'custom_id'
	queryText?: string
	embeddingFields?: string[]
	generateEmbedding?: (text: string, model?: string) => Promise<number[]>
	topK?: number
	namespace?: string
	embeddingModel?: string
}

/**
 * Query vectors by mapping ID (turso_id, mongo_id, etc.)
 */
export async function queryByMappingId<T extends ZodRawShape>({
	pinecone,
	indexName,
	schema,
	mappingId,
	mappingField,
	queryText,
	embeddingFields,
	generateEmbedding,
	topK = 10,
	namespace,
	embeddingModel
}: QueryByMappingIdOptions<T>): Promise<QueryResult[]> {
	const index = pinecone.index(indexName)

	const filter = { [mappingField]: mappingId }

	if (queryText && embeddingFields && generateEmbedding) {
		// Hybrid search: similarity + mapping filter
		const queryEmbedding = await generateEmbedding(queryText, embeddingModel)

		const response: PineconeQueryResponse = await index.query({
			vector: queryEmbedding,
			topK,
			filter,
			includeMetadata: true,
			namespace
		})

		return response.matches.map((match) => ({
			id: match.id,
			score: match.score,
			metadata: match.metadata,
			values: match.values
		}))
	} else {
		// Metadata-only filter
		const response: PineconeQueryResponse = await index.query({
			topK,
			filter,
			includeMetadata: true,
			namespace
		})

		return response.matches.map((match) => ({
			id: match.id,
			score: match.score,
			metadata: match.metadata,
			values: match.values
		}))
	}
}

export interface HybridSearchOptions<T extends ZodRawShape> {
	pinecone: PineconeClient
	indexName: string
	schema: ZodObject<T>
	queryText: string
	embeddingFields: string[]
	generateEmbedding: (text: string, model?: string) => Promise<number[]>
	filter?: Record<string, any>
	topK?: number
	namespace?: string
	embeddingModel?: string
	dateRange?: {
		field: string
		start: string
		end: string
	}
}

/**
 * Perform hybrid search (vector similarity + metadata filters)
 */
export async function hybridSearch<T extends ZodRawShape>({
	pinecone,
	indexName,
	schema,
	queryText,
	embeddingFields,
	generateEmbedding,
	filter = {},
	topK = 10,
	namespace,
	embeddingModel,
	dateRange
}: HybridSearchOptions<T>): Promise<QueryResult[]> {
	// Generate embedding for query
	const queryEmbedding = await generateEmbedding(queryText, embeddingModel)

	// Add date range filter if provided
	if (dateRange) {
		filter[dateRange.field] = {
			$gte: dateRange.start,
			$lte: dateRange.end
		}
	}

	const index = pinecone.index(indexName)
	const response: PineconeQueryResponse = await index.query({
		vector: queryEmbedding,
		topK,
		filter,
		includeMetadata: true,
		namespace
	})

	return response.matches.map((match) => ({
		id: match.id,
		score: match.score,
		metadata: match.metadata,
		values: match.values
	}))
}

export interface FindSimilarOptions<T extends ZodRawShape> {
	pinecone: PineconeClient
	indexName: string
	schema: ZodObject<T>
	sourceId: string
	topK?: number
	filter?: Record<string, any>
	namespace?: string
	excludeSource?: boolean
}

/**
 * Find similar vectors to a source vector
 */
export async function findSimilar<T extends ZodRawShape>({
	pinecone,
	indexName,
	schema,
	sourceId,
	topK = 10,
	filter = {},
	namespace,
	excludeSource = true
}: FindSimilarOptions<T>): Promise<QueryResult[]> {
	const index = pinecone.index(indexName)

	// First fetch the source vector
	const sourceResponse: PineconeFetchResponse = await index.fetch({
		ids: [sourceId]
	})
	const sourceVector = sourceResponse.vectors?.[sourceId]

	if (!sourceVector || !sourceVector.values) {
		throw new Error(`Source vector ${sourceId} not found`)
	}

	// Exclude source from results if requested
	if (excludeSource) {
		filter.id = { $ne: sourceId }
	}

	// Query for similar vectors
	const response: PineconeQueryResponse = await index.query({
		vector: sourceVector.values,
		topK: excludeSource ? topK + 1 : topK,
		filter,
		includeMetadata: true,
		namespace
	})

	let results = response.matches.map((match) => ({
		id: match.id,
		score: match.score,
		metadata: match.metadata,
		values: match.values
	}))

	// Remove source from results if needed
	if (excludeSource) {
		results = results.filter((r) => r.id !== sourceId).slice(0, topK)
	}

	return results
}

export interface DeleteByFilterOptions<T extends ZodRawShape> {
	pinecone: PineconeClient
	indexName: string
	schema: ZodObject<T>
	filter: Record<string, any>
}

/**
 * Delete vectors by filter
 */
export async function deleteByFilter<T extends ZodRawShape>({
	pinecone,
	indexName,
	schema,
	filter
}: DeleteByFilterOptions<T>): Promise<void> {
	const index = pinecone.index(indexName)
	await index.deleteMany({ filter })
}

export interface QueryPineconeWithStringOptions {
	pinecone: PineconeClient
	indexName: string
	queryText: string
	generateEmbedding: (text: string, model?: string) => Promise<number[]>
	topK?: number
	filter?: Record<string, any>
	includeMetadata?: boolean
	embeddingModel?: string
}

/**
 * Simple string-based query function for Pinecone
 * Simplified interface that doesn't require schema or embeddingFields
 */
export async function queryPineconeWithString({
	pinecone,
	indexName,
	queryText,
	generateEmbedding,
	topK = 10,
	filter,
	includeMetadata = true,
	embeddingModel
}: QueryPineconeWithStringOptions): Promise<QueryResult[]> {
	// Generate embedding for query text
	const queryEmbedding = await generateEmbedding(queryText, embeddingModel)

	// Query Pinecone
	const index = pinecone.index(indexName)
	const response: PineconeQueryResponse = await index.query({
		vector: queryEmbedding,
		topK,
		filter,
		includeMetadata
	})

	return response.matches.map((match) => ({
		id: match.id,
		score: match.score,
		metadata: match.metadata,
		values: match.values
	}))
}
