import { z } from 'zod'

/**
 * Flatten an interface by converting nested objects to underscore notation
 */
export type TableTypes<T, Prefix extends string = ''> = T extends Record<string, any>
	? {
			[K in keyof T as K extends string
				? T[K] extends Record<string, any>
					? T[K] extends any[]
						? `${Prefix}${K}`
						: never
					: `${Prefix}${K}`
				: never]: T[K] extends any[]
				? T[K]
				: T[K] extends Record<string, any>
					? never
					: T[K]
		} & {
			[K in keyof T as K extends string
				? T[K] extends Record<string, any>
					? T[K] extends any[]
						? never
						: `${Prefix}${K}_${keyof T[K] & string}`
					: never
				: never]: K extends string
				? T[K] extends Record<string, any>
					? T[K] extends any[]
						? never
						: T[K][keyof T[K]]
					: never
				: never
		}
	: never

/**
 * Pre-built schemas for common table fields
 */
export const timeStampsSchema = z.object({
	created_at: z.string(),
	updated_at: z.string()
})

export const autoIdSchema = z.object({
	id: z.string()
})

export const autoIdSchemaWithTimestamps = z.object({
	id: z.string(),
	created_at: z.string(),
	updated_at: z.string()
})

export type TimeStampsSchema = z.infer<typeof timeStampsSchema>
export type AutoIdSchema = z.infer<typeof autoIdSchema>
export type AutoIdSchemaWithTimestamps = z.infer<typeof autoIdSchemaWithTimestamps>