# @datazod/zod-sql

A library for converting Zod schemas to SQL table definitions, helping you work with databases in a type-safe way.

[![NPM Version](https://img.shields.io/npm/v/@datazod/zod-sql.svg)](https://www.npmjs.com/package/@datazod/zod-sql)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Note:** This package is optimized for [Bun](https://bun.sh) but works with any JavaScript runtime.

## Features

- Convert Zod schemas to SQL table definitions
- Support for multiple SQL dialects (SQLite/Turso, PostgreSQL, MySQL)
- Flatten nested objects to any depth
- Correctly map Zod types to their SQL equivalents
- Auto-generate UUIDs or auto-incrementing IDs
- Add timestamp columns (created_at, updated_at)
- Define relationships with foreign keys
- Control column ordering and table structure with flexible options
- Well-tested with comprehensive test coverage

## Installation

```bash
# With Bun (recommended)
bun add @datazod/zod-sql

# With npm
npm install @datazod/zod-sql

# With yarn
yarn add @datazod/zod-sql

# With pnpm
pnpm add @datazod/zod-sql
```

## Basic Usage

```typescript
import { z } from 'zod'
import { createTableDDL } from '@datazod/zod-sql'

// Define your schema with Zod
const UserSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	email: z.string().email(),
	isActive: z.boolean().default(true),
	createdAt: z.date()
})

// Generate SQLite table definition (default dialect)
const sqliteSQL = createTableDDL('users', UserSchema, {
	primaryKey: 'id'
})

// Generate PostgreSQL table definition
const postgresSQL = createTableDDL('users', UserSchema, {
	dialect: 'postgres',
	primaryKey: 'id'
})

// Generate MySQL table definition
const mysqlSQL = createTableDDL('users', UserSchema, {
	dialect: 'mysql',
	primaryKey: 'id'
})

console.log(sqliteSQL)
// CREATE TABLE IF NOT EXISTS "users" (
//   "id" TEXT NOT NULL PRIMARY KEY,
//   "name" TEXT NOT NULL,
//   "email" TEXT NOT NULL,
//   "isActive" BOOLEAN NOT NULL,
//   "createdAt" TEXT NOT NULL
// );
```

## Advanced Features

### Compound Primary Keys

```typescript
const UserRoleSchema = z.object({
	userId: z.string().uuid(),
	roleId: z.string().uuid(),
	assignedAt: z.date()
})

const sql = createTableDDL('user_roles', UserRoleSchema, {
	primaryKey: ['userId', 'roleId']
})
```

### Indexes

```typescript
const UserSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	name: z.string()
})

const sql = createTableDDL('users', UserSchema, {
	primaryKey: 'id',
	indexes: {
		users_email_idx: ['email'],
		users_name_email_idx: ['name', 'email']
	}
})
```

### Flatten Nested Objects

```typescript
const UserSchema = z.object({
	id: z.string().uuid(),
	profile: z.object({
		firstName: z.string(),
		lastName: z.string(),
		address: z.object({
			street: z.string(),
			city: z.string(),
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
})

// Default flattening depth is 2
const sql = createTableDDL('users', UserSchema, {
	primaryKey: 'id',
	// Override default flattening depth to flatten deeply
	flattenDepth: 5
})

// Will generate flattened columns with proper types:
// - id TEXT PRIMARY KEY
// - profile_firstName TEXT
// - profile_lastName TEXT
// - profile_address_street TEXT
// - profile_address_city TEXT
// - profile_address_country_code TEXT
// - profile_address_country_name TEXT
// - profile_address_country_details_continent TEXT
// - profile_address_country_details_population INTEGER

// With flattenDepth: 0, objects are stored as JSON:
const noFlattenSql = createTableDDL('users', UserSchema, {
	primaryKey: 'id',
	flattenDepth: 0
})
// - id TEXT PRIMARY KEY
// - profile TEXT (stored as JSON)
```

### Extra Columns and Foreign Keys

```typescript
const PostSchema = z.object({
	id: z.string().uuid(),
	title: z.string(),
	content: z.string()
})

const sql = createTableDDL('posts', PostSchema, {
	primaryKey: 'id',
	extraColumns: [
		{
			name: 'author_id',
			type: 'TEXT',
			notNull: true,
			references: {
				table: 'users',
				column: 'id',
				onDelete: 'CASCADE'
			}
		},
		{
			name: 'status',
			type: 'TEXT',
			defaultValue: "'draft'",
			notNull: true
		}
	]
})
```

### Automatic ID and Timestamps

```typescript
const PostSchema = z.object({
	title: z.string(),
	content: z.string()
})

const sql = createTableDDL('posts', PostSchema, {
	autoId: true,        // Adds an auto-incrementing primary key 'id' column
	timestamps: true     // Adds created_at and updated_at columns
})

// Results in:
// CREATE TABLE IF NOT EXISTS "posts" (
//   "id" INTEGER PRIMARY KEY AUTOINCREMENT,
//   "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
//   "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
//   "title" TEXT NOT NULL,
//   "content" TEXT NOT NULL
// );

// With UUID as primary key (uses uuid() function in Turso):
const sqlWithUuid = createTableDDL('posts', PostSchema, {
	autoId: { 
		enabled: true, 
		type: 'uuid',
		name: 'post_id'  // Custom ID column name (default is 'id')
	},
	timestamps: true
})

// Results in:
// CREATE TABLE IF NOT EXISTS "posts" (
//   "post_id" TEXT PRIMARY KEY DEFAULT (uuid()),
//   "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
//   "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
//   "title" TEXT NOT NULL,
//   "content" TEXT NOT NULL
// );
```

### Separate Table and Index Creation

```typescript
const UserSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	name: z.string()
})

const { createTable, indexes } = createTableAndIndexes('users', UserSchema, {
	primaryKey: 'id',
	indexes: {
		users_email_idx: ['email']
	}
})

console.log(createTable) // Execute this first in a transaction
indexes.forEach((idx) => console.log(idx)) // Then execute each index
```

## API Reference

### Main Functions

- `createTableDDL(tableName, schema, options)` - Generate complete SQL for table and indexes
- `createTableAndIndexes(tableName, schema, options)` - Generate separate SQL for table and indexes

### Options

```typescript
interface TableOptions {
	dialect?: 'sqlite' | 'postgres' | 'mysql'
	primaryKey?: string | string[]
	indexes?: Record<string, string[]>
	flattenDepth?: number
	extraColumns?: ExtraColumn[]
	timestamps?: boolean
	autoId?: boolean | AutoIdConfig
}

interface AutoIdConfig {
	enabled: boolean
	name?: string // Default: 'id'
	type?: 'integer' | 'uuid' // Default: 'integer'
}

interface ExtraColumn {
	name: string
	type: string
	notNull?: boolean
	defaultValue?: string
	primaryKey?: boolean
	unique?: boolean
	position?: 'start' | 'end'
	references?: {
		table: string
		column: string
		onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT'
		onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT'
	}
}
```

## Type Mapping

| Zod Type                | SQLite  | PostgreSQL               | MySQL    |
| ----------------------- | ------- | ------------------------ | -------- |
| `z.string()`            | TEXT    | TEXT                     | TEXT     |
| `z.string().datetime()` | TEXT    | TIMESTAMP WITH TIME ZONE | DATETIME |
| `z.number()`            | REAL    | DOUBLE PRECISION         | DOUBLE   |
| `z.number().int()`      | INTEGER | INTEGER                  | INT      |
| `z.boolean()`           | BOOLEAN | BOOLEAN                  | BOOLEAN  |
| `z.date()`              | TEXT    | TIMESTAMP WITH TIME ZONE | DATETIME |
| `z.array()`             | TEXT    | JSONB                    | JSON     |
| `z.object()`            | TEXT    | JSONB                    | JSON     |
| `z.enum()`              | TEXT    | TEXT                     | TEXT     |

## Column Ordering

Columns are arranged in a specific order:

1. **Auto ID Column**: If `autoId` is enabled, it appears first
2. **Timestamp Columns**: If `timestamps` is enabled, created_at/updated_at appear next
3. **Start Position Columns**: Extra columns with `position: 'start'`
4. **Schema Columns**: Fields from your Zod schema
5. **End Position Columns**: Extra columns with `position: 'end'` or no position specified

This ordering helps maintain a consistent table structure with important fields at the beginning.

## Performance

This package is optimized for Bun with native ESM support. Tests and benchmarks run significantly faster in Bun compared to Node.js, providing a better developer experience.

## License

MIT
