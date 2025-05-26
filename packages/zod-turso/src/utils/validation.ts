import type { ZodObject, ZodRawShape } from 'zod'

/**
 * Validation utilities for Turso operations
 */
export class ValidationHelper {
	/**
	 * Validates input data against schema
	 */
	static validateData<T extends ZodRawShape>(
		schema: ZodObject<T>,
		data: any
	): { success: boolean; error?: string; data?: any } {
		try {
			const result = schema.safeParse(data)
			if (result.success) {
				return { success: true, data: result.data }
			} else {
				return {
					success: false,
					error: result.error.issues.map(i => i.message).join(', ')
				}
			}
		} catch (error: any) {
			return {
				success: false,
				error: error.message
			}
		}
	}

	/**
	 * Validates table name format
	 */
	static validateTableName(tableName: string): void {
		if (!tableName || typeof tableName !== 'string') {
			throw new Error('Table name must be a non-empty string')
		}

		if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
			throw new Error('Table name contains invalid characters')
		}
	}

	/**
	 * Validates array input for batch operations
	 */
	static validateBatchData(dataArray: any[]): void {
		if (!Array.isArray(dataArray)) {
			throw new Error('Batch data must be an array')
		}

		if (dataArray.length === 0) {
			throw new Error('Batch data array cannot be empty')
		}
	}
}