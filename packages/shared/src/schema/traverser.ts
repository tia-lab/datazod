import { ZodObject, type ZodRawShape, type ZodTypeAny } from 'zod'

/**
 * Callback function for schema traversal
 */
export type TraverseCallback = (key: string, zodType: ZodTypeAny, path: string[]) => void

/**
 * Traverses a Zod object shape and calls callback for each field
 */
export function traverseZodShape<T extends ZodRawShape>(
	shape: T,
	callback: TraverseCallback,
	currentPath: string[] = []
): void {
	Object.entries(shape).forEach(([key, zodType]) => {
		const newPath = [...currentPath, key]
		callback(key, zodType as ZodTypeAny, newPath)
	})
}

/**
 * Recursively traverses nested Zod objects
 */
export function traverseZodObjectRecursive<T extends ZodRawShape>(
	schema: ZodObject<T>,
	callback: TraverseCallback,
	maxDepth: number = 5,
	currentPath: string[] = []
): void {
	if (currentPath.length >= maxDepth) {
		return
	}

	const shape = schema.shape
	Object.entries(shape).forEach(([key, zodType]) => {
		const newPath = [...currentPath, key]
		callback(key, zodType as ZodTypeAny, newPath)

		// If it's a nested object, traverse it too
		if ((zodType as any) instanceof ZodObject) {
			traverseZodObjectRecursive(zodType as any, callback, maxDepth, newPath)
		}
	})
}