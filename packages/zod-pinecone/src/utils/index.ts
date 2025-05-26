/**
 * Utility functions for Pinecone operations
 */

// Index management utilities
export { ensurePineconeIndex, indexExists, deleteIndex } from './index-manager'
export type { EnsurePineconeIndexOptions, CheckIndexOptions, DeleteIndexOptions } from './index-manager'

export class EmbeddingHelper {
	/**
	 * Validate embedding dimensions
	 */
	static validateEmbedding(embedding: number[], expectedDimensions?: number): boolean {
		if (!Array.isArray(embedding) || embedding.length === 0) {
			return false
		}
		
		if (expectedDimensions && embedding.length !== expectedDimensions) {
			return false
		}
		
		return embedding.every(val => typeof val === 'number' && !isNaN(val))
	}
	
	/**
	 * Normalize embedding vector
	 */
	static normalizeEmbedding(embedding: number[]): number[] {
		const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
		return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding
	}
	
	/**
	 * Calculate cosine similarity between two embeddings
	 */
	static cosineSimilarity(a: number[], b: number[]): number {
		if (a.length !== b.length) {
			throw new Error('Embeddings must have the same length')
		}
		
		let dotProduct = 0
		let normA = 0
		let normB = 0
		
		for (let i = 0; i < a.length; i++) {
			const aVal = a[i] ?? 0
			const bVal = b[i] ?? 0
			dotProduct += aVal * bVal
			normA += aVal * aVal
			normB += bVal * bVal
		}
		
		return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
	}
}

export class MetadataHelper {
	/**
	 * Clean metadata for Pinecone (ensure proper types)
	 */
	static cleanMetadata(metadata: Record<string, any>): Record<string, any> {
		const cleaned: Record<string, any> = {}
		
		for (const [key, value] of Object.entries(metadata)) {
			if (value === null || value === undefined) {
				continue
			}
			
			// Pinecone supports string, number, boolean, and arrays
			if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
				cleaned[key] = value
			} else if (Array.isArray(value)) {
				// Convert array elements to strings if needed
				cleaned[key] = value.map(v => 
					typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' 
						? v 
						: JSON.stringify(v)
				)
			} else {
				// Convert objects to JSON strings
				cleaned[key] = JSON.stringify(value)
			}
		}
		
		return cleaned
	}
	
	/**
	 * Extract specific fields from metadata
	 */
	static extractFields(metadata: Record<string, any>, fields: string[]): Record<string, any> {
		const extracted: Record<string, any> = {}
		
		for (const field of fields) {
			if (field in metadata) {
				extracted[field] = metadata[field]
			}
		}
		
		return extracted
	}
}

export class FilterHelper {
	/**
	 * Build date range filter
	 */
	static dateRange(field: string, start: string | Date, end: string | Date): Record<string, any> {
		const startISO = start instanceof Date ? start.toISOString() : start
		const endISO = end instanceof Date ? end.toISOString() : end
		
		return {
			[field]: {
				$gte: startISO,
				$lte: endISO
			}
		}
	}
	
	/**
	 * Build IN filter
	 */
	static inFilter(field: string, values: any[]): Record<string, any> {
		return {
			[field]: { $in: values }
		}
	}
	
	/**
	 * Build exact match filter
	 */
	static exactMatch(field: string, value: any): Record<string, any> {
		return { [field]: value }
	}
	
	/**
	 * Combine multiple filters with AND
	 */
	static combineFilters(...filters: Record<string, any>[]): Record<string, any> {
		return Object.assign({}, ...filters)
	}
}