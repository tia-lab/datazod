export interface UpsertResult {
	success: boolean
	id: string
	vectorId?: string
	error?: string
}

export interface BatchUpsertResult {
	success: boolean
	results: Array<{
		success: boolean
		id?: string
		vectorId?: string
		error?: string
		originalIndex: number
	}>
	totalProcessed: number
	successCount: number
	errorCount: number
	errors: Error[]
}

export interface QueryResult {
	id: string
	score: number
	metadata?: Record<string, any>
	values?: number[]
}

export interface QueryResponse {
	results: QueryResult[]
	namespace?: string
	totalMatches?: number
}