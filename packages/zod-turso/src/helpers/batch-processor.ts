import type {
	TursoClient,
	BatchInsertOptions,
	BatchInsertResult,
	BatchItemResult,
	SqlQuery
} from '../types'

/**
 * Processes batch operations in chunks
 */
export async function processBatch(
	client: TursoClient,
	queries: SqlQuery[],
	options: BatchInsertOptions = {}
): Promise<BatchInsertResult> {
	const { batchSize = 100, continueOnError = true } = options
	
	const results: BatchItemResult[] = []
	let totalInserted = 0
	let totalFailed = 0

	// Process in chunks
	for (let i = 0; i < queries.length; i += batchSize) {
		const chunk = queries.slice(i, i + batchSize)
		const chunkResults = await processBatchChunk(client, chunk, i, continueOnError)
		
		results.push(...chunkResults)
		
		// Count successes and failures
		chunkResults.forEach(result => {
			if (result.success) {
				totalInserted++
			} else {
				totalFailed++
			}
		})

		// If not continuing on error and we have failures, stop
		if (!continueOnError && chunkResults.some(r => !r.success)) {
			break
		}
	}

	return {
		success: totalFailed === 0,
		inserted: totalInserted,
		failed: totalFailed,
		errors: results.filter(r => !r.success).map(r => r.error!),
		ids: results.filter(r => r.success).map(r => r.id!).filter(Boolean)
	}
}

/**
 * Processes a single batch chunk
 */
async function processBatchChunk(
	client: TursoClient,
	queries: SqlQuery[],
	startIndex: number,
	continueOnError: boolean
): Promise<BatchItemResult[]> {
	const results: BatchItemResult[] = []

	for (let i = 0; i < queries.length; i++) {
		const query = queries[i]
		const index = startIndex + i

		try {
			if (!query) {
				throw new Error('Query is undefined')
			}
			
			await client.execute(query)
			
			// Extract ID if possible (assuming it's in the data)
			const id = extractIdFromQuery(query)
			
			results.push({
				index,
				success: true,
				id
			})
		} catch (error: any) {
			results.push({
				index,
				success: false,
				error: error.message
			})

			if (!continueOnError) {
				break
			}
		}
	}

	return results
}

/**
 * Attempts to extract ID from query arguments
 */
function extractIdFromQuery(query: SqlQuery): string | undefined {
	// This is a best-effort attempt to find an ID in the query
	// In practice, you might want to track this more explicitly
	const firstArg = query.args[0]
	if (typeof firstArg === 'string' && firstArg.length > 0) {
		return firstArg
	}
	return undefined
}