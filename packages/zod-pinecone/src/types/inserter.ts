import type { MappingFields } from './index'

export interface PineconeInserterOptions {
	// Embedding configuration
	embeddingFields: string[]
	embeddingModel?: 'text-embedding-ada-002' | 'text-embedding-3-small' | 'text-embedding-3-large'
	
	// Metadata configuration  
	metadataFields?: string[]
	excludeFromMetadata?: string[]
	
	// Mapping fields - link to other databases
	mappingFields?: MappingFields
	
	// Pinecone configuration
	namespace?: string
	topK?: number
	
	// Embedding generation
	generateEmbedding?: (text: string, model?: string) => Promise<number[]>
}

export interface BatchUpsertOptions {
	batchSize?: number
	parallel?: boolean
	onProgress?: (completed: number, total: number) => void
	onError?: (error: Error, item: any, index: number) => void
}