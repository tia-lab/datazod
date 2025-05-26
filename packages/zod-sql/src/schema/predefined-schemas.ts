import { z } from 'zod'

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