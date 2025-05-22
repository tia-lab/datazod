/// <reference types="bun-types" />
import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { TableStructure } from '../schema'
import { createTable } from '../tables/table'

describe('Schema Type Generation', () => {
	test('should extract schema type from table definition with auto ID and timestamps', () => {
		// Define test schema
		const UserSchema = z.object({
			name: z.string(),
			email: z.string().email(),
			age: z.number().int()
		})

		// Create table with schema type extraction
		const result = createTable('users', UserSchema, {
			dialect: 'sqlite',
			autoId: true,
			timestamps: true
		})

		// Verify SQL generated correctly
		expect(result.table).toContain('CREATE TABLE IF NOT EXISTS "users"')
		expect(result.table).toContain('"id" INTEGER PRIMARY KEY AUTOINCREMENT')
		expect(result.table).toContain('"created_at"')
		expect(result.table).toContain('"updated_at"')

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
		const result = createTable('products', ProductSchema, {
			dialect: 'postgres',
			autoId: { enabled: true, type: 'uuid' },
			timestamps: true,
			indexes: {
				products_name_idx: ['name']
			}
		})

		// Verify table schema structure
		const tableStructure: TableStructure = result.structure
		expect(tableStructure.tableName).toBe('products')

		// Check columns
		const columns = tableStructure.columns
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
		expect(tableStructure.indexes).toEqual({ products_name_idx: ['name'] })
	})

	test('should handle nested objects with flattening', () => {
		// Define a schema with nested objects
		const AnalysisSchema = z.object({
			symbol: z.string(),
			current_price: z.number(),
			technical_analysis: z.object({
				rsi: z.number(),
				macd: z.number(),
				moving_averages: z.object({
					sma_50: z.number(),
					ema_200: z.number()
				})
			}),
			fundamental_analysis: z.object({
				pe_ratio: z.number(),
				eps: z.number()
			}),
			reanalysis_timing: z.object({
				next_update: z.date(),
				frequency: z.string()
			})
		})

		// Create table with flattening
		const result = createTable('stock_analysis', AnalysisSchema, {
			dialect: 'postgres',
			flattenDepth: 2,
			timestamps: true
		})

		// The schema should have flattened properties
		const schemaType = result.schema

		// Check the table schema to verify columns are properly flattened
		const tableStructure = result.structure
		const columns = tableStructure.columns

		console.log(
			'Flattened columns:',
			columns.map((c) => c.name)
		)

		// Check that the flattened columns exist
		expect(columns.find((c) => c.name === 'technical_analysis_rsi')).toBeDefined()
		expect(
			columns.find((c) => c.name === 'technical_analysis_macd')
		).toBeDefined()
		expect(
			columns.find((c) => c.name === 'technical_analysis_moving_averages')
		).toBeDefined()
		expect(
			columns.find((c) => c.name === 'fundamental_analysis_pe_ratio')
		).toBeDefined()

		// Verify SQL has the flattened columns
		expect(result.table).toContain('"technical_analysis_rsi"')
		expect(result.table).toContain('"technical_analysis_macd"')
		expect(result.table).toContain('"fundamental_analysis_pe_ratio"')

		// Get all the expected field names from the schema
		//@ts-ignore
		const schemaShape = schemaType._def.shape?.()
		const schemaKeys = Object.keys(schemaShape)
		console.log('Schema keys:', schemaKeys)

		// Create a test object with all required fields
		const testData: Record<string, any> = {}

		// Add required fields with appropriate types
		for (const key of schemaKeys) {
			if (key === 'symbol') testData[key] = 'AAPL'
			else if (key === 'current_price') testData[key] = 150.5
			else if (key.includes('rsi') || key.includes('macd')) testData[key] = 65
			else if (key.includes('_ratio') || key.includes('eps')) testData[key] = 25.3
			else if (key.includes('sma') || key.includes('ema')) testData[key] = 148.2
			else if (key.includes('next_update')) testData[key] = new Date()
			else if (key.includes('frequency')) testData[key] = 'daily'
			else if (key === 'created_at' || key === 'updated_at')
				testData[key] = new Date()
			else if (key.includes('moving_averages'))
				testData[key] = JSON.stringify({ sma_50: 148.2, ema_200: 145.7 })
			else testData[key] = 'test value'
		}

		const parsed = schemaType.safeParse(testData)

		if (!parsed.success) {
			console.error('Validation errors:', parsed.error.format())
		}

		expect(parsed.success).toBe(true)
	})
})
