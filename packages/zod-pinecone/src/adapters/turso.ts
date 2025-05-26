import type { PineconeClient } from '../types'

/**
 * Clean values for Pinecone metadata (only supports string, number, boolean, and simple arrays)
 */
function cleanValueForPinecone(value: any): string | number | boolean {
	if (value === null || value === undefined) {
		return ""
	}
	
	// Pinecone supports: string, number, boolean
	if (typeof value === 'string') {
		return value
	}
	
	if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
		return value
	}
	
	if (typeof value === 'boolean') {
		return value
	}
	
	// Convert everything else to string
	if (Array.isArray(value)) {
		return JSON.stringify(value)
	}
	
	if (value instanceof Date) {
		return value.toISOString()
	}
	
	if (typeof value === 'object') {
		return JSON.stringify(value)
	}
	
	// Fallback: convert to string
	return String(value)
}

export interface TursoPineconeAdapterOptions {
	indexName: string
	embeddingFields?: string[] | '*'  // Direct Turso column names, or '*' for all fields
	metadataFields?: string[]         // Direct Turso column names (optional - if not provided, includes all)
	generateEmbedding: (text: string) => Promise<number[]>
	mappingFields?: { 
		turso_id?: boolean 
		custom_id?: string
	}
	batchSize?: number
	idField?: string                  // Name of the ID field in Turso (defaults to 'id')
	excludeFromEmbedding?: string[]   // Fields to exclude from embedding when using '*'
}

export interface TursoSyncOptions {
	pinecone: PineconeClient
	turso: any // Turso client
	records: any[]
	onProgress?: (completed: number, total: number) => void
	onError?: (error: Error, record: any, index: number) => void
}

export interface TursoSyncResult {
	successCount: number
	errorCount: number
	errors: Error[]
	successfulIds: string[]
}

/**
 * Turso-specific Pinecone adapter - works directly with Turso's flattened column structure
 */
export function createTursoPineconeAdapter(options: TursoPineconeAdapterOptions) {
	const {
		indexName,
		embeddingFields = '*',
		metadataFields,
		generateEmbedding,
		mappingFields,
		batchSize = 100,
		idField = 'id',
		excludeFromEmbedding = ['id', 'created_at', 'updated_at', 'last_vector_sync', '_inserted_at']
	} = options

	return {
		/**
		 * Sync Turso records directly to Pinecone
		 */
		async syncFromTurso({
			pinecone,
			turso,
			records,
			onProgress,
			onError
		}: TursoSyncOptions): Promise<TursoSyncResult> {
			const vectors = []
			const errors: Error[] = []
			const successfulIds: string[] = []
			let errorCount = 0

			for (let i = 0; i < records.length; i++) {
				const record = records[i]

				try {
					// Get the record ID using the specified field name
					const recordId = record[idField] || `generated_${Date.now()}_${i}`
					
					// Build embedding text from Turso columns
					let embeddingText = ''
					
					if (embeddingFields === '*') {
						// Include all fields except excluded ones
						const excludeSet = new Set(excludeFromEmbedding)
						embeddingText = Object.entries(record)
							.filter(([key, value]) => 
								!excludeSet.has(key) && 
								value !== undefined && 
								value !== null && 
								value !== ''
							)
							.map(([key, value]) => `${key}: ${value}`)
							.join(' | ')
					} else if (Array.isArray(embeddingFields)) {
						// Include only specified fields
						embeddingText = embeddingFields
							.map(field => record[field])
							.filter(val => val !== undefined && val !== null && val !== '')
							.join(' | ')
					}

					if (!embeddingText.trim()) {
						throw new Error(`No embedding text generated for record ${recordId}`)
					}

					// Generate embedding
					const embedding = await generateEmbedding(embeddingText)

					// Prepare metadata from Turso columns directly
					const metadata: Record<string, any> = {}
					
					if (metadataFields) {
						// Include only specified fields
						for (const field of metadataFields) {
							if (record[field] !== undefined && record[field] !== null) {
								metadata[field] = cleanValueForPinecone(record[field])
							}
						}
					} else {
						// Include all Turso columns as metadata
						for (const [key, value] of Object.entries(record)) {
							if (value !== undefined && value !== null) {
								metadata[key] = cleanValueForPinecone(value)
							}
						}
					}

					// Add mapping fields
					if (mappingFields?.turso_id && recordId) {
						metadata.turso_id = cleanValueForPinecone(recordId)
					}
					if (mappingFields?.custom_id) {
						metadata[mappingFields.custom_id] = cleanValueForPinecone(record[mappingFields.custom_id])
					}

					// Add sync timestamp
					metadata._inserted_at = new Date().toISOString()

					vectors.push({
						id: String(recordId), // Ensure ID is string
						values: embedding,
						metadata
					})

					successfulIds.push(recordId)

				} catch (error) {
					const err = error instanceof Error ? error : new Error(String(error))
					errors.push(err)
					errorCount++

					if (onError) {
						onError(err, record, i)
					}
				}

				// Report progress
				if (onProgress) {
					onProgress(i + 1, records.length)
				}
			}

			// Upsert to Pinecone in batches
			if (vectors.length > 0) {
				const index = pinecone.index(indexName)

				for (let i = 0; i < vectors.length; i += batchSize) {
					const batch = vectors.slice(i, i + batchSize)
					
					try {
						await index.upsert(batch)
					} catch (error) {
						// Log the problematic data for debugging
						console.error('Pinecone upsert failed. Batch data:', JSON.stringify(batch, null, 2))
						throw error
					}
				}
			}

			return {
				successCount: vectors.length,
				errorCount,
				errors,
				successfulIds
			}
		},

		/**
		 * Update sync timestamp in Turso for successful records
		 */
		async updateSyncTimestamp({
			turso,
			tableName,
			recordIds
		}: {
			turso: any
			tableName: string
			recordIds: string[]
		}): Promise<void> {
			if (recordIds.length === 0) return

			const placeholders = recordIds.map(() => '?').join(',')
			await turso.execute({
				sql: `UPDATE ${tableName} SET last_vector_sync = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
				args: recordIds
			})
		}
	}
}