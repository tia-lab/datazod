/// <reference types="bun-types" />
import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { createTableAndIndexes, createTableDDL } from './index'
import { SQLDialect } from './types'

describe('Zod to SQL converter', () => {
	test('should convert basic schema to SQL', () => {
		const schema = z.object({
			id: z.string().uuid(),
			name: z.string(),
			age: z.number().int(),
			active: z.boolean()
		})

		const sql = createTableDDL('users', schema, { primaryKey: 'id' })
		console.log('\n--- Basic Schema SQL ---')
		console.log(sql)

		expect(sql).toContain('"id" TEXT NOT NULL PRIMARY KEY')
		expect(sql).toContain('"name" TEXT NOT NULL')
		expect(sql).toContain('"age" INTEGER NOT NULL')
		expect(sql).toContain('"active" BOOLEAN NOT NULL')
		expect(sql).toContain('CREATE TABLE IF NOT EXISTS "users"')
	})

	test('should handle optional fields', () => {
		const schema = z.object({
			id: z.string(),
			name: z.string().optional(),
			age: z.number().nullable()
		})

		const sql = createTableDDL('users', schema)
		console.log('\n--- Optional Fields SQL ---')
		console.log(sql)

		expect(sql).toContain('"id" TEXT NOT NULL')
		expect(sql).toContain('"name" TEXT')
		expect(sql).not.toContain('"name" TEXT NOT NULL')
		expect(sql).toContain('"age" REAL')
		expect(sql).not.toContain('"age" REAL NOT NULL')
	})

	test('should flatten nested objects to configured depth', () => {
		const schema = z.object({
			id: z.string(),
			profile: z.object({
				firstName: z.string(),
				lastName: z.string(),
				address: z.object({
					street: z.string(),
					city: z.string(),
					country: z.object({
						code: z.string(),
						name: z.string()
					})
				})
			})
		})

		// Default depth (2)
		const sql = createTableDDL('users', schema)
		console.log('\n--- Nested Objects SQL (default depth=2) ---')
		console.log(sql)

		// First level
		expect(sql).toContain('"profile_firstName" TEXT NOT NULL')
		expect(sql).toContain('"profile_lastName" TEXT NOT NULL')

		// Second level
		expect(sql).toContain('"profile_address_street" TEXT NOT NULL')
		expect(sql).toContain('"profile_address_city" TEXT NOT NULL')

		// Third level (should be JSON)
		expect(sql).toContain('"profile_address_country" TEXT NOT NULL')
		expect(sql).not.toContain('"profile_address_country_code"')

		// With depth 3
		const sqlDepth3 = createTableDDL('users', schema, { flattenDepth: 3 })
		console.log('\n--- Nested Objects SQL (depth=3) ---')
		console.log(sqlDepth3)

		expect(sqlDepth3).toContain('"profile_address_country_code" TEXT NOT NULL')
		expect(sqlDepth3).toContain('"profile_address_country_name" TEXT NOT NULL')

		// With depth 0
		const sqlDepth0 = createTableDDL('users', schema, { flattenDepth: 0 })
		console.log('\n--- Nested Objects SQL (depth=0) ---')
		console.log(sqlDepth0)

		expect(sqlDepth0).toContain('"profile" TEXT NOT NULL')
		expect(sqlDepth0).not.toContain('"profile_firstName"')
	})

	test('should handle arrays as JSON', () => {
		const schema = z.object({
			id: z.string(),
			tags: z.array(z.string()),
			scores: z.array(z.number())
		})

		const sql = createTableDDL('users', schema)
		console.log('\n--- Arrays SQL ---')
		console.log(sql)

		expect(sql).toContain('"tags" TEXT NOT NULL')
		expect(sql).toContain('"scores" TEXT NOT NULL')
	})

	test('should add indexes', () => {
		const schema = z.object({
			id: z.string(),
			email: z.string().email(),
			name: z.string()
		})

		const sql = createTableDDL('users', schema, {
			indexes: {
				users_email_idx: ['email'],
				users_name_email_idx: ['name', 'email']
			}
		})
		console.log('\n--- Indexes SQL ---')
		console.log(sql)

		expect(sql).toContain(
			'CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");'
		)
		expect(sql).toContain(
			'CREATE INDEX IF NOT EXISTS "users_name_email_idx" ON "users" ("name", "email");'
		)
	})

	test('should add extra columns', () => {
		const schema = z.object({
			id: z.string(),
			name: z.string()
		})

		const sql = createTableDDL('users', schema, {
			extraColumns: [
				{
					name: 'role',
					type: 'TEXT',
					defaultValue: "'user'",
					notNull: true
				},
				{
					name: 'rank',
					type: 'INTEGER',
					defaultValue: '0'
				},
				{
					name: 'role_id',
					type: 'INTEGER',
					references: {
						table: 'roles',
						column: 'id',
						onDelete: 'CASCADE'
					}
				}
			]
		})
		console.log('\n--- Extra Columns SQL ---')
		console.log(sql)

		expect(sql).toContain('"role" TEXT NOT NULL DEFAULT \'user\'')
		expect(sql).toContain('"rank" INTEGER DEFAULT 0')
		expect(sql).toContain(
			'"role_id" INTEGER REFERENCES "roles"("id") ON DELETE CASCADE'
		)
	})

	test('should add timestamp columns', () => {
		const schema = z.object({
			id: z.string(),
			name: z.string()
		})

		const sql = createTableDDL('users', schema, { timestamps: true })
		console.log('\n--- Timestamps SQL ---')
		console.log(sql)

		expect(sql).toContain(
			'"created_at" TEXT NOT NULL DEFAULT (datetime(\'now\'))'
		)
		expect(sql).toContain(
			'"updated_at" TEXT NOT NULL DEFAULT (datetime(\'now\'))'
		)
	})

	test('should support compound primary keys', () => {
		const schema = z.object({
			user_id: z.string(),
			role_id: z.string(),
			granted_at: z.string().datetime()
		})

		const sql = createTableDDL('user_roles', schema, {
			primaryKey: ['user_id', 'role_id']
		})
		console.log('\n--- Compound Primary Keys SQL ---')
		console.log(sql)

		expect(sql).toContain('PRIMARY KEY ("user_id", "role_id")')
	})

	test('should handle primary key from extra columns', () => {
		const schema = z.object({
			name: z.string(),
			email: z.string().email()
		})

		const sql = createTableDDL('users', schema, {
			extraColumns: [
				{
					name: 'id',
					type: 'INTEGER',
					primaryKey: true
				}
			],
			primaryKey: 'id' // This should be ignored since it's already defined in extraColumns
		})
		console.log('\n--- Primary Key in Extra Column SQL ---')
		console.log(sql)

		expect(sql).toContain('"id" INTEGER PRIMARY KEY')
		// Should not have duplicate primary key definition
		expect(sql).not.toMatch(/PRIMARY KEY \("id"\).*PRIMARY KEY \("id"\)/s)
	})

	test('should separate table and index creation', () => {
		const UserSchema = z.object({
			id: z.string().uuid(),
			name: z.string(),
			email: z.string().email()
		})

		const { createTable, indexes } = createTableAndIndexes('users', UserSchema, {
			primaryKey: 'id',
			indexes: {
				users_email_idx: ['email'],
				users_name_idx: ['name']
			}
		})

		console.log('\n--- Separated Table and Indexes ---')
		console.log('CREATE TABLE Statement:')
		console.log(createTable)
		console.log('INDEX Statements:')
		indexes.forEach((idx) => console.log(idx))

		// Check table creation SQL
		expect(createTable).toContain('"id" TEXT NOT NULL PRIMARY KEY')
		expect(createTable).toContain('"email" TEXT NOT NULL')
		expect(createTable).not.toContain('CREATE INDEX')

		// Check index creation SQL
		expect(indexes).toHaveLength(2)
		expect(indexes[0]).toContain(
			'CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");'
		)
		expect(indexes[1]).toContain(
			'CREATE INDEX IF NOT EXISTS "users_name_idx" ON "users" ("name");'
		)
	})

	test('comprehensive example', () => {
		const UserSchema = z.object({
			id: z.string().uuid(),
			name: z.string(),
			age: z.number().int().optional(),
			email: z.string().email(),
			metadata: z.object({
				lastLogin: z.string().datetime(),
				preferences: z.object({
					theme: z.enum(['light', 'dark']),
					notifications: z.boolean()
				})
			}),
			tags: z.array(z.string())
		})

		const { createTable, indexes } = createTableAndIndexes('users', UserSchema, {
			primaryKey: 'id',
			indexes: {
				users_email_idx: ['email'],
				users_metadata_lastLogin_idx: ['metadata_lastLogin']
			},
			flattenDepth: 2,
			extraColumns: [
				{
					name: 'last_login_timestamp',
					type: 'INTEGER',
					notNull: true,
					defaultValue: '0'
				},
				{
					name: 'role_id',
					type: 'INTEGER',
					references: {
						table: 'roles',
						column: 'id',
						onDelete: 'CASCADE'
					}
				}
			],
			timestamps: true
		})

		console.log('\n--- Comprehensive Example SQL (Separate Statements) ---')
		console.log('CREATE TABLE Statement:')
		console.log(createTable)
		console.log('INDEX Statements:')
		indexes.forEach((idx) => console.log(idx))

		expect(createTable).toContain('"id" TEXT NOT NULL PRIMARY KEY')
		expect(createTable).toContain('"metadata_lastLogin" TEXT NOT NULL')
		expect(createTable).toContain('"metadata_preferences_theme" TEXT NOT NULL')
		expect(createTable).toContain(
			'"metadata_preferences_notifications" BOOLEAN NOT NULL'
		)
		expect(createTable).toContain('"tags" TEXT NOT NULL')
		expect(createTable).toContain(
			'"last_login_timestamp" INTEGER NOT NULL DEFAULT 0'
		)
		expect(createTable).toContain(
			'"role_id" INTEGER REFERENCES "roles"("id") ON DELETE CASCADE'
		)
		expect(createTable).toContain(
			'"created_at" TEXT NOT NULL DEFAULT (datetime(\'now\'))'
		)
		expect(createTable).not.toContain('CREATE INDEX')

		expect(indexes).toHaveLength(2)
		expect(indexes[0]).toContain(
			'CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");'
		)
		expect(indexes[1]).toContain(
			'CREATE INDEX IF NOT EXISTS "users_metadata_lastLogin_idx" ON "users" ("metadata_lastLogin");'
		)
	})

	test('should support PostgreSQL dialect', () => {
		const schema = z.object({
			id: z.string().uuid(),
			name: z.string(),
			created: z.string().datetime(),
			details: z.object({
				info: z.string()
			}),
			scores: z.array(z.number())
		})

		const sql = createTableDDL('users', schema, {
			dialect: 'postgres',
			primaryKey: 'id',
			timestamps: true
		})
		console.log('\n--- PostgreSQL Dialect SQL ---')
		console.log(sql)

		// Check PostgreSQL-specific types
		expect(sql).toContain('"id" TEXT NOT NULL PRIMARY KEY')
		expect(sql).toContain('"created" TIMESTAMP WITH TIME ZONE NOT NULL')
		expect(sql).toContain('"details_info" TEXT NOT NULL')
		expect(sql).toContain('"scores" JSONB NOT NULL')

		// Check PostgreSQL timestamp format
		expect(sql).toContain(
			'"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()'
		)
		expect(sql).toContain(
			'"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()'
		)
	})

	test('should support MySQL dialect', () => {
		const schema = z.object({
			id: z.string().uuid(),
			name: z.string(),
			created: z.string().datetime(),
			details: z.object({
				info: z.string()
			}),
			scores: z.array(z.number())
		})

		const sql = createTableDDL('users', schema, {
			dialect: 'mysql',
			primaryKey: 'id',
			timestamps: true
		})
		console.log('\n--- MySQL Dialect SQL ---')
		console.log(sql)

		// Check MySQL-specific types and quoting with backticks
		expect(sql).toContain('`id` TEXT NOT NULL PRIMARY KEY')
		expect(sql).toContain('`created` DATETIME NOT NULL')
		expect(sql).toContain('`details_info` TEXT NOT NULL')
		expect(sql).toContain('`scores` JSON NOT NULL')

		// Check MySQL timestamp format
		expect(sql).toContain(
			'`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
		)
		expect(sql).toContain(
			'`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
		)
	})

	test('should handle multi-dialect table and index creation', () => {
		const UserSchema = z.object({
			id: z.string().uuid(),
			email: z.string().email(),
			data: z.object({
				value: z.number()
			})
		})

		// Test all three dialects
		const dialects: SQLDialect[] = ['sqlite', 'postgres', 'mysql']

		for (const dialect of dialects) {
			const { createTable, indexes } = createTableAndIndexes('users', UserSchema, {
				dialect,
				primaryKey: 'id',
				indexes: {
					users_email_idx: ['email']
				}
			})

			console.log(
				`\n--- ${dialect.toUpperCase()} Dialect Separated Statements ---`
			)
			console.log(createTable)
			indexes.forEach((idx) => console.log(idx))

			// Common expectations for all dialects
			const quoteChar = dialect === 'mysql' ? '`' : '"'

			expect(createTable).toContain(`${quoteChar}id${quoteChar}`)
			expect(createTable).toContain(`${quoteChar}email${quoteChar}`)
			expect(createTable).toContain(`${quoteChar}data_value${quoteChar}`)

			// Specific type expectations per dialect
			if (dialect === 'postgres') {
				expect(createTable).toContain('DOUBLE PRECISION') // for number
			} else if (dialect === 'mysql') {
				expect(createTable).toContain('DOUBLE') // for number
			} else {
				expect(createTable).toContain('REAL') // for number in SQLite
			}

			// Check index format
			expect(indexes).toHaveLength(1)
			expect(indexes[0]).toContain(`${quoteChar}users_email_idx${quoteChar}`)
			expect(indexes[0]).toContain(`${quoteChar}users${quoteChar}`)
			expect(indexes[0]).toContain(`${quoteChar}email${quoteChar}`)
		}
	})

	test('should respect column position in extra columns', () => {
		const schema = z.object({
			id: z.string().uuid(),
			name: z.string(),
			email: z.string().email()
		})

		const sql = createTableDDL('users', schema, {
			extraColumns: [
				{
					name: 'created_by',
					type: 'TEXT',
					position: 'start'
				},
				{
					name: 'updated_by',
					type: 'TEXT'
				},
				{
					name: 'account_id',
					type: 'INTEGER',
					position: 'start'
				},
				{
					name: 'deleted_at',
					type: 'TEXT',
					position: 'end'
				}
			]
		})
		console.log('\n--- Column Positioning SQL ---')
		console.log(sql)

		// Split the SQL into lines to analyze the order
		const lines = sql.split('\n')

		// Find the positions of each column
		const accountIdPos = lines.findIndex((line) => line.includes('"account_id"'))
		const createdByPos = lines.findIndex((line) => line.includes('"created_by"'))
		const idPos = lines.findIndex((line) => line.includes('"id"'))
		const namePos = lines.findIndex((line) => line.includes('"name"'))
		const emailPos = lines.findIndex((line) => line.includes('"email"'))
		const updatedByPos = lines.findIndex((line) => line.includes('"updated_by"'))
		const deletedAtPos = lines.findIndex((line) => line.includes('"deleted_at"'))

		// Check correct order: start columns first, then schema columns, then end columns
		// First check that all columns are present
		expect(accountIdPos).toBeGreaterThan(-1)
		expect(createdByPos).toBeGreaterThan(-1)
		expect(idPos).toBeGreaterThan(-1)
		expect(namePos).toBeGreaterThan(-1)
		expect(emailPos).toBeGreaterThan(-1)
		expect(updatedByPos).toBeGreaterThan(-1)
		expect(deletedAtPos).toBeGreaterThan(-1)

		// Then check the order
		// Start columns should be before schema columns
		expect(accountIdPos).toBeLessThan(idPos)
		expect(createdByPos).toBeLessThan(idPos)

		// Schema columns should be in the middle
		expect(idPos).toBeLessThan(updatedByPos)
		expect(namePos).toBeLessThan(updatedByPos)
		expect(emailPos).toBeLessThan(updatedByPos)

		// End columns should be after schema columns
		expect(updatedByPos).toBeGreaterThan(emailPos)
		expect(deletedAtPos).toBeGreaterThan(emailPos)
	})

	test('should add auto ID column with default settings', () => {
		const schema = z.object({
			name: z.string(),
			email: z.string().email()
		})

		const sql = createTableDDL('users', schema, {
			autoId: true
		})
		console.log('\n--- Auto ID Column SQL ---')
		console.log(sql)

		expect(sql).toContain('"id" INTEGER PRIMARY KEY AUTOINCREMENT')
		expect(sql).toContain('"name" TEXT NOT NULL')
		expect(sql).toContain('"email" TEXT NOT NULL')
	})

	test('should add auto ID column with UUID type', () => {
		const schema = z.object({
			name: z.string(),
			email: z.string().email()
		})

		const sql = createTableDDL('users', schema, {
			autoId: { enabled: true, type: 'uuid' }
		})
		console.log('\n--- Auto UUID Column SQL ---')
		console.log(sql)

		expect(sql).toContain('"id" TEXT PRIMARY KEY DEFAULT')
		expect(sql).toContain('uuid()') // Check for UUID generation function
		expect(sql).toContain('"name" TEXT NOT NULL')
		expect(sql).toContain('"email" TEXT NOT NULL')
	})

	test('should add auto ID column with custom name', () => {
		const schema = z.object({
			name: z.string(),
			email: z.string().email()
		})

		const sql = createTableDDL('users', schema, {
			autoId: { enabled: true, name: 'user_id' }
		})
		console.log('\n--- Custom Auto ID Column SQL ---')
		console.log(sql)

		expect(sql).toContain('"user_id" INTEGER PRIMARY KEY AUTOINCREMENT')
		expect(sql).toContain('"name" TEXT NOT NULL')
		expect(sql).toContain('"email" TEXT NOT NULL')
	})

	test('should add auto ID column with different database dialects', () => {
		const schema = z.object({
			name: z.string(),
			email: z.string().email()
		})

		// PostgreSQL
		const postgresSql = createTableDDL('users', schema, {
			dialect: 'postgres',
			autoId: true
		})
		console.log('\n--- PostgreSQL Auto ID Column SQL ---')
		console.log(postgresSql)
		expect(postgresSql).toContain('"id" SERIAL PRIMARY KEY')

		// MySQL
		const mysqlSql = createTableDDL('users', schema, {
			dialect: 'mysql',
			autoId: true
		})
		console.log('\n--- MySQL Auto ID Column SQL ---')
		console.log(mysqlSql)
		expect(mysqlSql).toContain('`id` INT AUTO_INCREMENT PRIMARY KEY')
	})

	test('should combine auto ID and timestamps', () => {
		const schema = z.object({
			name: z.string(),
			email: z.string().email()
		})

		const sql = createTableDDL('users', schema, {
			autoId: true,
			timestamps: true
		})
		console.log('\n--- Auto ID with Timestamps SQL ---')
		console.log(sql)

		expect(sql).toContain('"id" INTEGER PRIMARY KEY AUTOINCREMENT')
		expect(sql).toContain('"name" TEXT NOT NULL')
		expect(sql).toContain('"email" TEXT NOT NULL')
		expect(sql).toContain('"created_at" TEXT NOT NULL DEFAULT')
		expect(sql).toContain('"updated_at" TEXT NOT NULL DEFAULT')
	})

	test('complex schema with deep nesting, arrays, numbers and timestamps for all dialects', () => {
		// Create a complex schema with 5 levels of nesting, arrays, and numbers
		const ComplexSchema = z.object({
			id: z.string().uuid(),
			user: z.object({
				username: z.string(),
				profile: z.object({
					firstName: z.string(),
					lastName: z.string(),
					age: z.number().int(),
					address: z.object({
						street: z.string(),
						city: z.string(),
						zipCode: z.number().int(),
						country: z.object({
							code: z.string(),
							name: z.string(),
							details: z.object({
								continent: z.string(),
								population: z.number().int()
							})
						})
					})
				})
			}),
			settings: z.object({
				theme: z.enum(['light', 'dark']),
				notifications: z.boolean(),
				preferences: z.object({
					language: z.string(),
					timezone: z.string()
				})
			}),
			tags: z.array(z.string()),
			scores: z.array(z.number()),
			stats: z.object({
				visits: z.number().int(),
				lastActive: z.string().datetime(),
				performance: z.number()
			}),
			metadata: z.record(z.string(), z.any()),  // Object as JSON
			friends: z.array(
				z.object({
					id: z.string(),
					name: z.string()
				})
			),
			history: z.array(
				z.object({
					date: z.string().datetime(),
					action: z.string(),
					details: z.object({
						ip: z.string(),
						device: z.string()
					})
				})
			)
		})

		// Test with all SQL dialects
		const dialects: SQLDialect[] = ['sqlite', 'postgres', 'mysql'];
		
		for (const dialect of dialects) {
			// Generate SQL with depth=5, auto UUID, and timestamps
			const { createTable } = createTableAndIndexes('complex_table', ComplexSchema, {
				dialect,
				flattenDepth: 5,  // Deep nesting
				autoId: {
					enabled: true,
					type: 'uuid',
					name: 'record_id'
				},
				timestamps: true
			})

			console.log(`\n--- Complex Schema with Deep Nesting (${dialect.toUpperCase()}) ---`)
			console.log(createTable)

			// Define quote character based on dialect
			const q = dialect === 'mysql' ? '`' : '"';
			
			// Expected SQL types based on dialect
			const expectedTypes = {
				int: dialect === 'mysql' ? 'INT' : 'INTEGER',
				float: dialect === 'postgres' ? 'DOUBLE PRECISION' : dialect === 'mysql' ? 'DOUBLE' : 'REAL',
				array: dialect === 'postgres' ? 'JSONB' : dialect === 'mysql' ? 'JSON' : 'TEXT',
				object: dialect === 'postgres' ? 'JSONB' : dialect === 'mysql' ? 'JSON' : 'TEXT',
				date: dialect === 'postgres' ? 'TIMESTAMP WITH TIME ZONE' : dialect === 'mysql' ? 'DATETIME' : 'TEXT',
				uuid: dialect === 'postgres' ? 'UUID' : 'TEXT'
			};
			
			// Check for proper column types and hierarchy
			// 1. Check UUID ID (format varies by dialect)
			if (dialect === 'postgres') {
				expect(createTable).toContain(`${q}record_id${q} UUID PRIMARY KEY DEFAULT gen_random_uuid()`);
			} else if (dialect === 'mysql') {
				expect(createTable).toContain(`${q}record_id${q} CHAR(36) PRIMARY KEY DEFAULT (UUID())`);
			} else {
				expect(createTable).toContain(`${q}record_id${q} TEXT PRIMARY KEY DEFAULT (uuid())`);
			}
			
			// 2. Check timestamp columns appear after ID
			const lines = createTable.split('\n');
			const recordIdLine = lines.findIndex(line => line.includes(`${q}record_id${q}`));
			const firstDataLine = lines.findIndex(line => line.includes(`${q}id${q}`));
			
			// In our updated code, timestamps should come after the ID but before regular columns
			expect(firstDataLine).toBeGreaterThan(recordIdLine + 2); // +2 to account for timestamps
			
			// 3. Check proper types for various fields
			// String fields
			expect(createTable).toContain(`${q}user_username${q} TEXT NOT NULL`);
			expect(createTable).toContain(`${q}user_profile_firstName${q} TEXT NOT NULL`);
			
			// Number fields - should have correct types per dialect
			expect(createTable).toContain(`${q}user_profile_age${q} ${expectedTypes.int} NOT NULL`);
			expect(createTable).toContain(`${q}user_profile_address_zipCode${q} ${expectedTypes.int} NOT NULL`);
			expect(createTable).toContain(`${q}stats_visits${q} ${expectedTypes.int} NOT NULL`);
			expect(createTable).toContain(`${q}stats_performance${q} ${expectedTypes.float} NOT NULL`);
			expect(createTable).toContain(`${q}user_profile_address_country_details_population${q} ${expectedTypes.int} NOT NULL`);
			
			// Boolean fields
			expect(createTable).toContain(`${q}settings_notifications${q} BOOLEAN NOT NULL`);
			
			// Enum fields
			expect(createTable).toContain(`${q}settings_theme${q} TEXT NOT NULL`);
			
			// Date fields
			expect(createTable).toContain(`${q}stats_lastActive${q} ${expectedTypes.date} NOT NULL`);
			
			// Array fields - should use the correct type per dialect
			expect(createTable).toContain(`${q}tags${q} ${expectedTypes.array} NOT NULL`);
			expect(createTable).toContain(`${q}scores${q} ${expectedTypes.array} NOT NULL`);
			expect(createTable).toContain(`${q}friends${q} ${expectedTypes.array} NOT NULL`);
			expect(createTable).toContain(`${q}history${q} ${expectedTypes.array} NOT NULL`);
			
			// Object as JSON - the metadata field might be TEXT or JSONB
			const metadataPattern = new RegExp(`${q}metadata${q} (TEXT|JSONB|JSON) NOT NULL`);
			expect(metadataPattern.test(createTable)).toBe(true);
			
			// 4. Check deep nesting (5 levels)
			expect(createTable).toContain(`${q}user_profile_address_country_details_continent${q} TEXT NOT NULL`);
			expect(createTable).toContain(`${q}user_profile_address_country_details_population${q} ${expectedTypes.int} NOT NULL`);
		}
	})
})
