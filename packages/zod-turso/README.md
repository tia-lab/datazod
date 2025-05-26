# @datazod/zod-turso

A modest type-safe Turso/SQLite ORM with Zod schema integration. This package provides basic data flattening, batch operations, and query building capabilities for Turso databases.

> **Experimental Status**: This package is currently experimental and may undergo changes. Please use with caution in production environments.

## Overview

This package offers a simple approach to working with Turso/SQLite databases by combining Zod schema validation with data flattening capabilities. It attempts to make database operations more predictable by flattening nested objects and providing basic batch processing features.

## Related Packages

This package is part of the **@datazod** ecosystem, which includes complementary tools for working with Zod schemas and databases:

- **[@datazod/zod-sql](https://www.npmjs.com/package/@datazod/zod-sql)** - Convert Zod schemas to SQL table definitions with multi-dialect support and intelligent type mapping
- **[@datazod/zod-pinecone](https://www.npmjs.com/package/@datazod/zod-pinecone)** - A bridge between Turso/SQLite databases and Pinecone vector search for AI applications

Together, these packages provide a complete solution for schema-driven database design, data operations, and vector search integration.

## Features

- **Type-safe Operations**: Uses Zod schemas for validation and type safety
- **Data Flattening**: Converts nested objects to flat database-friendly structures
- **Batch Processing**: Handles multiple insert operations with configurable batch sizes
- **Query Builder**: Provides a basic fluent API for building queries
- **Auto Field Generation**: Optional auto-generation of IDs and timestamps
- **Connection Helpers**: Simple utilities for database connections

## Installation

```bash
npm install @datazod/zod-turso @libsql/client zod
# or
bun add @datazod/zod-turso @libsql/client zod
```

## Basic Usage

### Setting up a Schema

```typescript
import { z } from 'zod'
import { createTursoInserter } from '@datazod/zod-turso'

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  profile: z.object({
    bio: z.string().optional(),
    website: z.string().url().optional()
  }).optional()
})

const inserter = createTursoInserter('users', userSchema)
```

### Data Flattening

The package flattens nested objects using underscore notation:

```typescript
const userData = {
  name: 'John Doe',
  email: 'john@example.com',
  profile: {
    bio: 'Developer',
    website: 'https://johndoe.dev'
  }
}

const flattened = inserter.flatten(userData)
// Result: {
//   name: 'John Doe',
//   email: 'john@example.com',
//   profile_bio: 'Developer',
//   profile_website: 'https://johndoe.dev'
// }
```

### Single Insert

```typescript
import { createClient } from '@libsql/client'

const client = createClient({
  url: 'your-turso-url',
  authToken: 'your-auth-token'
})

const result = await inserter.insert(client, userData)
if (result.success) {
  console.log('Insert successful')
} else {
  console.error('Insert failed:', result.error)
}
```

### Batch Insert

```typescript
const users = [
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
  { name: 'User 3', email: 'user3@example.com' }
]

const batchResult = await inserter.insertMany(client, users, {
  batchSize: 100,
  continueOnError: true
})

console.log(`Inserted: ${batchResult.inserted}, Failed: ${batchResult.failed}`)
```

### Query Building

```typescript
import { createTursoQuery } from '@datazod/zod-turso'

const queryBuilder = createTursoQuery('users', userSchema)

// Build a simple query
const { sql, args } = queryBuilder
  .selectAll()
  .where('name', '=', 'John Doe')
  .orderBy('name', 'ASC')
  .limit(10)
  .toSQL()

// Execute the query
const results = await queryBuilder
  .where('profile_bio', '!=', null)
  .all(client)
```

## Configuration Options

### Auto ID Generation

```typescript
const inserterWithAutoId = createTursoInserter('users', userSchema, {
  autoId: {
    type: 'uuid',
    name: 'user_id' // Optional, defaults to 'id'
  }
})
```

### Timestamps

```typescript
const inserterWithTimestamps = createTursoInserter('users', userSchema, {
  timestamps: true // Adds created_at and updated_at fields
})
```

### Extra Columns

```typescript
const inserterWithExtras = createTursoInserter('users', userSchema, {
  extraColumns: [
    { name: 'tenant_id', type: 'TEXT', defaultValue: 'tenant_123' },
    { name: 'source', type: 'TEXT', defaultValue: 'api', position: 'start' }
  ]
})
```

## Query Helpers

The package includes some basic query helper functions:

```typescript
import { findById, findBy, count, exists } from '@datazod/zod-turso'

// Find by ID
const user = await findById(client, 'users', '123')

// Count records
const userCount = await count(client, 'users', 'active = ?', [true])

// Check existence
const userExists = await exists(client, 'users', 'email = ?', ['test@example.com'])
```

## Helper Functions

### Data Processing

```typescript
import { flattenForInsert, addAutoFields } from '@datazod/zod-turso'

// Manual flattening
const flattened = flattenForInsert(data, schema, options)

// Add auto fields to existing data
const withAutoFields = addAutoFields(data, options)
```

### Connection and Validation

```typescript
import { ConnectionHelper, ValidationHelper } from '@datazod/zod-turso'

// Simple connection helper
const isConnected = await ConnectionHelper.testConnection(client)

// Basic validation
const isValid = ValidationHelper.validateData(data, schema)
```

## Limitations

- The flattening approach has a default depth limit and may not suit all use cases
- Batch operations use a simple sequential approach that may not be optimal for very large datasets
- Query building capabilities are basic and may not cover all SQL use cases
- Error handling is minimal and may need enhancement for production use

## Contributing

This package is experimental and contributions are welcome. Please feel free to:

- Report issues
- Suggest improvements
- Submit pull requests
- Share feedback on the API design

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build the package
bun run build

# Type checking
bun run check-types
```

## License

MIT