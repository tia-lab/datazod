import type { PineconeClient } from '../types'

export interface EnsurePineconeIndexOptions {
	pinecone: PineconeClient
	indexName: string
	dimension?: number
	metric?: 'cosine' | 'euclidean' | 'dotproduct'
	spec?: {
		serverless?: {
			cloud: 'aws' | 'gcp' | 'azure'
			region: string
		}
		pod?: {
			environment: string
			podType: string
			pods?: number
			replicas?: number
			shards?: number
		}
	}
	waitTime?: number
}

/**
 * Ensure a Pinecone index exists, create if it doesn't
 */
export async function ensurePineconeIndex({
	pinecone,
	indexName,
	dimension = 1024,
	metric = 'cosine',
	spec = { serverless: { cloud: 'aws', region: 'us-east-1' } },
	waitTime = 5000
}: EnsurePineconeIndexOptions): Promise<void> {
	try {
		await pinecone.describeIndex(indexName)
	} catch {
		await pinecone.createIndex({
			name: indexName,
			dimension,
			metric,
			spec
		})
		
		if (waitTime > 0) {
			await new Promise(resolve => setTimeout(resolve, waitTime))
		}
	}
}

export interface CheckIndexOptions {
	pinecone: PineconeClient
	indexName: string
}

/**
 * Check if an index exists
 */
export async function indexExists({
	pinecone,
	indexName
}: CheckIndexOptions): Promise<boolean> {
	try {
		await pinecone.describeIndex(indexName)
		return true
	} catch {
		return false
	}
}

export interface DeleteIndexOptions {
	pinecone: PineconeClient
	indexName: string
}

/**
 * Delete an index if it exists
 */
export async function deleteIndex({
	pinecone,
	indexName
}: DeleteIndexOptions): Promise<void> {
	try {
		await pinecone.deleteIndex(indexName)
	} catch {
		// Index doesn't exist, ignore
	}
}