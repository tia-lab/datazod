import type { TursoClient } from '../types'

/**
 * Connection helper utilities
 */
export class ConnectionHelper {
	/**
	 * Validates that a client is ready for use
	 */
	static validateClient(client: TursoClient): void {
		if (!client) {
			throw new Error('Turso client is required')
		}
	}

	/**
	 * Executes a function with connection validation
	 */
	static async withValidatedClient<T>(
		client: TursoClient,
		operation: (client: TursoClient) => Promise<T>
	): Promise<T> {
		this.validateClient(client)
		return operation(client)
	}

	/**
	 * Tests if a client connection is working
	 */
	static async testConnection(client: TursoClient): Promise<boolean> {
		try {
			await client.execute('SELECT 1')
			return true
		} catch {
			return false
		}
	}
}