import { z, type ZodTypeAny } from 'zod'
import { isInteger } from './validators'

/**
 * Maps Zod types to string representations
 */
export function mapZodTypeToString(zodType: ZodTypeAny): string {
	if (zodType instanceof z.ZodNumber) {
		const isInt = isInteger(zodType)
		return isInt ? 'integer' : 'number'
	}

	switch (zodType._def.typeName) {
		case 'ZodString':
			return 'string'
		case 'ZodBoolean':
			return 'boolean'
		case 'ZodDate':
			return 'string'
		case 'ZodArray':
			return 'array'
		case 'ZodObject':
			return 'object'
		default:
			return 'string'
	}
}