import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { z } from 'zod'
import { createTursoInserter, createTursoQuery, flattenForInsert, addAutoFields } from '../src/index.js'

// Mock client for testing (since we don't have a real Turso instance)
const mockClient = {
	execute: async (query: any) => {
		// Mock successful execution
		return {
			lastInsertRowid: BigInt(1),
			changes: 1,
			rows: [],
			columns: []
		}
	}
}

describe('Zod Turso Integration', () => {
	// Test schemas
	const userSchema = z.object({
		name: z.string(),
		email: z.string().email(),
		age: z.number().optional(),
		profile: z.object({
			bio: z.string().optional(),
			website: z.string().url().optional()
		}).optional()
	})

	const productSchema = z.object({
		title: z.string(),
		price: z.number(),
		category: z.object({
			name: z.string(),
			slug: z.string()
		}),
		tags: z.array(z.string()).optional(),
		metadata: z.record(z.any()).optional()
	})

	describe('createTursoInserter', () => {
		test('should create inserter instance', () => {
			const inserter = createTursoInserter('users', userSchema)
			
			expect(inserter).toBeDefined()
			expect(typeof inserter.insert).toBe('function')
			expect(typeof inserter.insertMany).toBe('function')
			expect(typeof inserter.flatten).toBe('function')
			expect(typeof inserter.getSchemaStructure).toBe('function')
		})

		test('should flatten data correctly', () => {
			const inserter = createTursoInserter('users', userSchema)
			
			const userData = {
				name: 'John Doe',
				email: 'john@example.com',
				age: 30,
				profile: {
					bio: 'Software developer',
					website: 'https://johndoe.dev'
				}
			}

			const flattened = inserter.flatten(userData)
			
			expect(flattened.name).toBe('John Doe')
			expect(flattened.email).toBe('john@example.com')
			expect(flattened.age).toBe(30)
			expect(flattened['profile_bio']).toBe('Software developer')
			expect(flattened['profile_website']).toBe('https://johndoe.dev')
		})

		test('should handle nested objects and arrays', () => {
			const inserter = createTursoInserter('products', productSchema)
			
			const productData = {
				title: 'Gaming Laptop',
				price: 1299.99,
				category: {
					name: 'Electronics',
					slug: 'electronics'
				},
				tags: ['gaming', 'laptop', 'tech'],
				metadata: {
					brand: 'TechCorp',
					model: 'GL-2023'
				}
			}

			const flattened = inserter.flatten(productData)
			
			expect(flattened.title).toBe('Gaming Laptop')
			expect(flattened.price).toBe(1299.99)
			expect(flattened['category_name']).toBe('Electronics')
			expect(flattened['category_slug']).toBe('electronics')
			expect(flattened.tags).toBe('["gaming","laptop","tech"]')
			expect(flattened.metadata).toBe('{"brand":"TechCorp","model":"GL-2023"}')
		})

		test('should insert single record successfully', async () => {
			const inserter = createTursoInserter('users', userSchema)
			
			const userData = {
				name: 'Jane Smith',
				email: 'jane@example.com',
				age: 25
			}

			const result = await inserter.insert(mockClient as any, userData)
			
			expect(result.success).toBe(true)
			expect(result.error).toBeUndefined()
		})

		test('should insert multiple records successfully', async () => {
			const inserter = createTursoInserter('users', userSchema)
			
			const usersData = [
				{ name: 'User 1', email: 'user1@example.com' },
				{ name: 'User 2', email: 'user2@example.com' },
				{ name: 'User 3', email: 'user3@example.com' }
			]

			const result = await inserter.insertMany(mockClient as any, usersData)
			
			expect(result.success).toBe(true)
			expect(result.inserted).toBe(3)
			expect(result.failed).toBe(0)
			expect(result.errors).toHaveLength(0)
		})

		test('should handle empty array for batch insert', async () => {
			const inserter = createTursoInserter('users', userSchema)
			
			const result = await inserter.insertMany(mockClient as any, [])
			
			expect(result.success).toBe(true)
			expect(result.inserted).toBe(0)
			expect(result.failed).toBe(0)
		})
	})

	describe('flattenForInsert', () => {
		test('should flatten simple object', () => {
			const data = { name: 'Test', email: 'test@example.com' }
			const flattened = flattenForInsert(data, userSchema)
			
			expect(flattened.name).toBe('Test')
			expect(flattened.email).toBe('test@example.com')
		})

		test('should add auto ID when enabled', () => {
			const data = { name: 'Test', email: 'test@example.com' }
			const options = { autoId: { type: 'uuid' as const } }
			const flattened = flattenForInsert(data, userSchema, options)
			
			expect(flattened.id).toBeDefined()
			expect(typeof flattened.id).toBe('string')
			expect(flattened.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
		})

		test('should add timestamps when enabled', () => {
			const data = { name: 'Test', email: 'test@example.com' }
			const options = { timestamps: true }
			const flattened = flattenForInsert(data, userSchema, options)
			
			expect(flattened.created_at).toBeDefined()
			expect(flattened.updated_at).toBeDefined()
		})

		test('should process extra columns', () => {
			const data = { name: 'Test', email: 'test@example.com' }
			const options = {
				extraColumns: [
					{ name: 'tenant_id', type: 'TEXT', defaultValue: 'tenant_123' },
					{ name: 'source', type: 'TEXT', defaultValue: 'api' }
				]
			}
			const flattened = flattenForInsert(data, userSchema, options)
			
			expect(flattened.tenant_id).toBe('tenant_123')
			expect(flattened.source).toBe('api')
		})
	})

	describe('addAutoFields', () => {
		test('should add UUID when configured', () => {
			const data = { name: 'Test' }
			const options = { autoId: { type: 'uuid' as const } }
			const result = addAutoFields(data, options)
			
			expect(result.id).toBeDefined()
			expect(typeof result.id).toBe('string')
		})

		test('should add custom ID field name', () => {
			const data = { name: 'Test' }
			const options = { autoId: { type: 'uuid' as const, name: 'user_id' } }
			const result = addAutoFields(data, options)
			
			expect(result.user_id).toBeDefined()
			expect(result.id).toBeUndefined()
		})

		test('should not override existing ID', () => {
			const data = { id: 'existing-id', name: 'Test' }
			const options = { autoId: { type: 'uuid' as const } }
			const result = addAutoFields(data, options)
			
			expect(result.id).toBe('existing-id')
		})

		test('should add timestamps for insert', () => {
			const data = { name: 'Test' }
			const options = { timestamps: true }
			const result = addAutoFields(data, options, false)
			
			expect(result.created_at).toBeDefined()
			expect(result.updated_at).toBeDefined()
		})

		test('should only add updated_at for update', () => {
			const data = { name: 'Test' }
			const options = { timestamps: true }
			const result = addAutoFields(data, options, true)
			
			expect(result.created_at).toBeUndefined()
			expect(result.updated_at).toBeDefined()
		})
	})

	describe('createTursoQuery', () => {
		test('should create query builder instance', () => {
			const queryBuilder = createTursoQuery('users', userSchema)
			
			expect(queryBuilder).toBeDefined()
			expect(typeof queryBuilder.select).toBe('function')
			expect(typeof queryBuilder.where).toBe('function')
			expect(typeof queryBuilder.orderBy).toBe('function')
			expect(typeof queryBuilder.limit).toBe('function')
		})

		test('should build SELECT query with WHERE clause', () => {
			const queryBuilder = createTursoQuery('users', userSchema)
			
			const { sql, args } = queryBuilder
				.selectAll()
				.where('name', '=', 'John Doe')
				.toSQL()
			
			expect(sql).toContain('SELECT')
			expect(sql).toContain('FROM users')
			expect(sql).toContain('WHERE name = ?')
			expect(args).toContain('John Doe')
		})

		test('should build query with multiple WHERE conditions', () => {
			const queryBuilder = createTursoQuery('users', userSchema)
			
			const { sql, args } = queryBuilder
				.selectAll()
				.where('age', '>', 18)
				.where('email', 'LIKE', '%@example.com')
				.toSQL()
			
			expect(sql).toContain('WHERE age > ? AND email LIKE ?')
			expect(args).toEqual([18, '%@example.com'])
		})

		test('should build query with ORDER BY and LIMIT', () => {
			const queryBuilder = createTursoQuery('users', userSchema)
			
			const { sql } = queryBuilder
				.selectAll()
				.orderBy('name', 'ASC')
				.limit(10)
				.toSQL()
			
			expect(sql).toContain('ORDER BY name ASC')
			expect(sql).toContain('LIMIT 10')
		})

		test('should handle IS NULL conditions', () => {
			const queryBuilder = createTursoQuery('users', userSchema)
			
			const { sql } = queryBuilder
				.selectAll()
				.whereNull('age')
				.toSQL()
			
			expect(sql).toContain('WHERE age IS NULL')
		})

		test('should handle IS NOT NULL conditions', () => {
			const queryBuilder = createTursoQuery('users', userSchema)
			
			const { sql } = queryBuilder
				.selectAll()
				.whereNotNull('age')
				.toSQL()
			
			expect(sql).toContain('WHERE age IS NOT NULL')
		})

		test('should handle IN conditions', () => {
			const queryBuilder = createTursoQuery('users', userSchema)
			
			const { sql, args } = queryBuilder
				.selectAll()
				.where('age', 'IN', [25, 30, 35])
				.toSQL()
			
			expect(sql).toContain('WHERE age IN (?, ?, ?)')
			expect(args).toEqual([25, 30, 35])
		})

		test('should get available columns', () => {
			const queryBuilder = createTursoQuery('users', userSchema)
			const columns = queryBuilder.getColumns()
			
			expect(columns).toContain('name')
			expect(columns).toContain('email')
			expect(columns).toContain('age')
		})
	})

	describe('Error Handling', () => {
		test('should handle invalid schema data', () => {
			const inserter = createTursoInserter('users', userSchema)
			
			const invalidData = {
				name: 123, // Should be string
				email: 'invalid-email' // Should be valid email
			}

			// This should not throw, as validation happens at the data layer
			const flattened = inserter.flatten(invalidData)
			expect(flattened).toBeDefined()
		})

		test('should handle empty data', () => {
			const inserter = createTursoInserter('users', userSchema)
			
			expect(() => inserter.flatten({})).not.toThrow()
		})
	})

	describe('Type Safety', () => {
		test('should maintain type information', () => {
			const inserter = createTursoInserter('users', userSchema)
			const schemaStructure = inserter.getSchemaStructure()
			
			expect(schemaStructure).toBeDefined()
			expect(typeof schemaStructure).toBe('object')
		})
	})
})