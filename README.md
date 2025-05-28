# DataZod

A comprehensive ecosystem of packages for working with Zod schemas, databases, and vector search. These packages work together to provide a complete solution for schema-driven development, from table creation to data operations and AI-enabled search.

## Packages Overview

### [@datazod/zod-sql](./packages/zod-sql)
[![NPM Version](https://img.shields.io/npm/v/@datazod/zod-sql.svg)](https://www.npmjs.com/package/@datazod/zod-sql)

Convert Zod schemas to SQL table definitions with multi-dialect support and intelligent type mapping.

```bash
npm install @datazod/zod-sql
```

**Key Features:**
- Automatic schema migrations with safe column addition and removal
- Multi-dialect support (SQLite/Turso, PostgreSQL, MySQL)
- Intelligent nested object flattening
- Auto-generated fields (IDs, timestamps)
- Foreign key relationships and indexes
- Type-safe schema inference

### [@datazod/zod-turso](./packages/zod-turso)
[![NPM Version](https://img.shields.io/npm/v/@datazod/zod-turso.svg)](https://www.npmjs.com/package/@datazod/zod-turso)

A type-safe Turso/SQLite ORM with automatic migrations, clean query results, data flattening, and batch operations.

```bash
npm install @datazod/zod-turso @libsql/client zod
```

**Key Features:**
- Automatic migrations during insert operations
- Clean query results (removes array indices)
- Type-safe database operations
- Data flattening for nested objects
- Batch processing with progress tracking
- Fluent query builder API

### [@datazod/zod-pinecone](./packages/zod-pinecone)
[![NPM Version](https://img.shields.io/npm/v/@datazod/zod-pinecone.svg)](https://www.npmjs.com/package/@datazod/zod-pinecone)

Bridge between Turso/SQLite databases and Pinecone vector search for AI-enabled applications.

```bash
npm install @datazod/zod-pinecone @pinecone-database/pinecone @libsql/client zod
```

**Key Features:**
- Seamless Turso ↔ Pinecone synchronization
- Configurable embedding generation
- Metadata field mapping
- Batch operations for large datasets
- Type-safe vector operations

## Complete Workflow Example

Here's how these packages work together to create a complete data solution:

### 1. Define Your Schema

```typescript
import { z } from 'zod'

const ProductSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.number(),
  category: z.object({
    name: z.string(),
    slug: z.string()
  }),
  features: z.array(z.string()),
  metadata: z.record(z.any())
})
```

### 2. Create Database Tables

```typescript
import { createTableDDL } from '@datazod/zod-sql'

// Generate SQL table definition
const tableSQL = createTableDDL('products', ProductSchema, {
  dialect: 'sqlite',
  autoId: true,
  timestamps: true,
  flattenDepth: 2
})

console.log(tableSQL)
// Creates table with flattened columns:
// id, created_at, updated_at, name, description, price, 
// category_name, category_slug, features, metadata
```

### 3. Insert and Query Data

```typescript
import { createTursoInserter, createTursoQuery } from '@datazod/zod-turso'
import { createClient } from '@libsql/client'

const client = createClient({ url: 'your-turso-url', authToken: 'token' })
const inserter = createTursoInserter('products', ProductSchema, {
  autoId: { type: 'uuid' },
  timestamps: true
})

// Insert product data
const result = await inserter.insert(client, {
  name: 'Gaming Laptop',
  description: 'High-performance laptop for gaming',
  price: 1299.99,
  category: { name: 'Electronics', slug: 'electronics' },
  features: ['16GB RAM', 'RTX 4060', 'SSD'],
  metadata: { brand: 'TechCorp', warranty: '2 years' }
})

// Query products
const queryBuilder = createTursoQuery('products', ProductSchema)
const products = await queryBuilder
  .selectAll()
  .where('category_name', '=', 'Electronics')
  .where('price', '<', 1500)
  .orderBy('price', 'ASC')
  .all(client)
```

### 4. Enable Vector Search

```typescript
import { createTursoPineconeAdapter } from '@datazod/zod-pinecone'
import { Pinecone } from '@pinecone-database/pinecone'

const pinecone = new Pinecone({ apiKey: 'your-api-key' })

const adapter = createTursoPineconeAdapter({
  indexName: 'products',
  generateEmbedding: async (text) => {
    // Your embedding generation logic
    return await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    })
  },
  embeddingFields: ['name', 'description'],
  metadataFields: ['category_name', 'price']
})

// Sync data to Pinecone for vector search
await adapter.upsertFromTurso(
  client,
  pinecone.index('products'),
  'SELECT * FROM products WHERE category_name = ?',
  ['Electronics']
)

// Perform semantic search
const searchResults = await adapter.search(
  pinecone.index('products'),
  'powerful gaming computer',
  { topK: 5 }
)
```

## Schema Evolution & Migration Workflows

DataZod provides seamless schema evolution capabilities. Here are comprehensive examples showing how to safely evolve your database schema.

### Basic Migration Workflow

```typescript
import { z } from 'zod'
import { createTableWithMigration } from '@datazod/zod-sql'
import { createClient } from '@libsql/client'

const client = createClient({ url: 'your-turso-url', authToken: 'token' })

// 1. Start with a simple schema
const UserSchemaV1 = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string()
})

// Create table with migration support
const { table } = await createTableWithMigration('users', UserSchemaV1, {
  migrate: true,
  debug: true
}, client)

await client.execute(table)

// 2. Evolve schema - add new columns
const UserSchemaV2 = z.object({
  id: z.string(),
  name: z.string(), 
  email: z.string(),
  age: z.number(),           // New column
  preferences: z.string()     // New column
})

// Migration will automatically add new columns
await createTableWithMigration('users', UserSchemaV2, {
  migrate: true,
  debug: true
}, client)
```

### Advanced Migration with Column Removal

```typescript
// When you need to remove columns, use allowDrop for safe data preservation
const UserSchemaV3 = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  age: z.number()
  // preferences column removed
})

// This will:
// 1. Backup existing data
// 2. Drop old table  
// 3. Create new table
// 4. Restore data (only for columns that exist in new schema)
await createTableWithMigration('users', UserSchemaV3, {
  migrate: true,
  allowDrop: true,  // Required for column removal
  debug: true
}, client)
```

### Automatic Migration During Inserts

```typescript
import { createTursoInserter } from '@datazod/zod-turso'

// Create inserter with auto-migration
const inserter = createTursoInserter('products', ProductSchema, {
  migrate: true,     // Enable auto-migration
  debug: true        // See migration logs
})

// When you insert data with a new schema, 
// missing columns are automatically added
await inserter.single(client, {
  name: 'New Product',
  newField: 'This column will be auto-created'  // New field
})
```

### Clean Query Results

```typescript
import { findBy } from '@datazod/zod-turso'

// Regular query (includes array indices)
const rawResults = await findBy({
  tableName: 'users',
  schema: UserSchema,
  turso: client,
  field: 'name',
  value: 'John'
})
// Returns: { "0": "john@email.com", "1": "John", email: "john@email.com", name: "John" }

// Clean query (schema-only fields)
const cleanResults = await findBy({
  tableName: 'users', 
  schema: UserSchema,
  turso: client,
  field: 'name',
  value: 'John',
  clean: true  // Remove array indices
})
// Returns: { email: "john@email.com", name: "John" }
```

### Production Migration Strategy

```typescript
// Recommended production approach
const migrationOptions = {
  migrate: true,
  allowDrop: false,     // Safer for production
  debug: false          // Reduce log noise
}

try {
  await createTableWithMigration('users', NewSchema, migrationOptions, client)
} catch (error) {
  if (error.message.includes('Cannot remove columns')) {
    console.log('Manual intervention required for column removal')
    // Handle column removal with your preferred strategy
  }
}
```

## Experimental Status

All packages in this ecosystem are currently **experimental**. While they have comprehensive tests and strive for stability, APIs may change as we continue to improve based on community feedback.

## Contributing

Contributions are **really welcome**! As a solo developer, I'm actively looking for help to make these packages better. Whether you want to:

- Report bugs or issues
- Suggest new features
- Improve documentation
- Add support for more databases/vector stores
- Optimize performance
- Write more tests

Please feel free to:
- Open issues on [GitHub](https://github.com/tia-lab/datazod/issues)
- Submit pull requests
- Share your use cases and feedback

Every contribution, no matter how small, helps make this ecosystem better for everyone.

## Development

This is a monorepo using Turborepo and Bun.

### Setup

```bash
# Install dependencies
bun install

# Run development server
bun dev

# Build all packages
bun build

# Run tests for all packages
bun test

# Run tests for specific package
bun test --filter=@datazod/zod-sql
```

### Package Scripts

Each package has its own scripts:

```bash
# Build specific package
cd packages/zod-sql && bun run build

# Test specific package
cd packages/zod-turso && bun test

# Type check
bun run check-types
```

### Creating a Changeset

When making changes that need to be released:

```bash
bun changeset
```

## Package Dependencies

The packages are designed to work independently or together:

- **@datazod/zod-sql**: Standalone schema-to-SQL converter
- **@datazod/zod-turso**: Can use zod-sql for table creation, provides data operations
- **@datazod/zod-pinecone**: Works with zod-turso for data sync, provides vector search

## Use Cases

- **E-commerce platforms**: Product catalogs with semantic search
- **Content management**: Articles with AI-powered content discovery
- **Knowledge bases**: Documentation with intelligent search
- **Data analytics**: Structured data with vector-based insights
- **SaaS applications**: User data with semantic user matching

## Roadmap

- [ ] Support for more vector databases (Weaviate, Qdrant)
- [ ] Enhanced query optimization
- [ ] Real-time sync capabilities
- [ ] GraphQL schema generation
- [ ] Migration tools
- [ ] Performance benchmarks
- [ ] More SQL dialect support

## License

MIT - See individual package licenses for details.

## Acknowledgments

Special thanks to:
- The Zod community for the amazing schema validation library
- Turso team for the excellent SQLite platform
- Pinecone team for the vector database
- All contributors and users providing feedback

---

**Start building type-safe, AI-enabled applications with DataZod!**