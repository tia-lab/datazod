/// <reference types="bun-types" />
import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { createTableAndIndexes } from '../index'
import { TableSchema } from '../schema'

describe('Schema Type Generation', () => {
	test('should extract schema type from table definition with auto ID and timestamps', () => {
		// Define test schema
		const UserSchema = z.object({
			name: z.string(),
			email: z.string().email(),
			age: z.number().int()
		})

		// Create table with schema type extraction
		const result = createTableAndIndexes('users', UserSchema, {
			dialect: 'sqlite',
			autoId: true,
			timestamps: true
		})

		// Verify SQL generated correctly
		expect(result.createTable).toContain('CREATE TABLE IF NOT EXISTS "users"')
		expect(result.createTable).toContain('"id" INTEGER PRIMARY KEY AUTOINCREMENT')
		expect(result.createTable).toContain('"created_at"')
		expect(result.createTable).toContain('"updated_at"')

		// Verify schema type includes auto-generated fields
		const schemaType = result.schema
		expect(schemaType).toBeDefined()

		// Test schema validation with a valid object
		const validUser = {
			id: 1,
			name: 'Test User',
			email: 'test@example.com',
			age: 30,
			created_at: new Date(),
			updated_at: new Date()
		}

		const parsed = schemaType.safeParse(validUser)
		expect(parsed.success).toBe(true)

		// Test schema validation with an invalid object
		const invalidUser = {
			name: 'Test User',
			email: 'not-an-email',
			age: 'thirty' // wrong type
		}

		const invalidParsed = schemaType.safeParse(invalidUser)
		expect(invalidParsed.success).toBe(false)
	})

	test('should extract table schema with correct column information', () => {
		// Define test schema
		const ProductSchema = z.object({
			name: z.string(),
			price: z.number(),
			description: z.string().optional(),
			inStock: z.boolean()
		})

		// Create table with schema type extraction
		const result = createTableAndIndexes('products', ProductSchema, {
			dialect: 'postgres',
			autoId: { enabled: true, type: 'uuid' },
			timestamps: true,
			indexes: {
				products_name_idx: ['name']
			}
		})

		// Verify table schema structure
		const tableSchema: TableSchema = result.tableSchema
		expect(tableSchema.tableName).toBe('products')

		// Check columns
		const columns = tableSchema.columns
		expect(columns.length).toBe(7) // id, created_at, updated_at, name, price, description, inStock

		// Verify auto ID column
		const idColumn = columns.find((col) => col.name === 'id')
		expect(idColumn).toBeDefined()
		expect(idColumn?.type).toBe('TEXT')
		expect(idColumn?.primaryKey).toBe(true)

		// Verify timestamp columns
		const createdAtColumn = columns.find((col) => col.name === 'created_at')
		expect(createdAtColumn).toBeDefined()
		expect(createdAtColumn?.nullable).toBe(false)

		// Verify schema columns
		const nameColumn = columns.find((col) => col.name === 'name')
		expect(nameColumn).toBeDefined()
		expect(nameColumn?.type).toBe('TEXT')
		expect(nameColumn?.nullable).toBe(false)

		const descriptionColumn = columns.find((col) => col.name === 'description')
		expect(descriptionColumn).toBeDefined()
		expect(descriptionColumn?.nullable).toBe(true)

		// Verify indexes
		expect(tableSchema.indexes).toEqual({ products_name_idx: ['name'] })
	})
})
