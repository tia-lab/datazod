/**
 * Pinecone client types (external dependency interfaces)
 * Use 'any' types to be compatible with actual Pinecone SDK
 */

export interface PineconeVector {
	id: string
	values: number[]
	metadata?: Record<string, any>
}

export interface PineconeMatch {
	id: string
	score: number
	values?: number[]
	metadata?: Record<string, any>
}

export interface PineconeQueryResponse {
	matches: PineconeMatch[]
	namespace?: string
}

export interface PineconeFetchResponse {
	vectors?: Record<string, PineconeVector>
}

// Use 'any' for compatibility with the actual Pinecone SDK
export type PineconeIndex = any
export type PineconeClient = any
export type QueryParams = any
export type QueryResponse = any