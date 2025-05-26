# @datazod/zod-pinecone

A library that bridges Turso/SQLite databases with Pinecone vector search, enabling type-safe hybrid search capabilities with seamless data synchronization.

[![NPM Version](https://img.shields.io/npm/v/@datazod/zod-pinecone.svg)](https://www.npmjs.com/package/@datazod/zod-pinecone)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Experimental Status

This package is currently in **experimental status**. While I strive for stability and have comprehensive tests, the API may change in future versions as I continue to improve and add features based on community feedback.

## Related Packages

This package is part of the **@datazod** ecosystem, which includes complementary tools for working with Zod schemas and databases:

- **[@datazod/zod-sql](https://www.npmjs.com/package/@datazod/zod-sql)** - Convert Zod schemas to SQL table definitions with multi-dialect support and intelligent type mapping
- **[@datazod/zod-turso](https://www.npmjs.com/package/@datazod/zod-turso)** - A type-safe Turso/SQLite ORM with data flattening, batch operations, and query building capabilities

Together, these packages provide a complete solution for schema-driven database design, data operations, and vector search integration.

## Contributing

Contributions are **really welcome**! As a solo developer, I'm actively looking for help to make this package better. Whether you want to:

- Report bugs or issues
- Suggest new features
- Improve documentation
- Add support for more vector databases
- Optimize performance
- Write more tests

Please feel free to:

- Open issues on [GitHub](https://github.com/tia-lab/datazod/issues)
- Submit pull requests
- Share your use cases and feedback

Every contribution, no matter how small, helps make this package better for everyone.

## Thanks

Special thanks to all contributors and users who have provided feedback, reported issues, and helped improve this package. Your input is invaluable in making @datazod/zod-pinecone better!

> **Note:** This package is optimized for [Bun](https://bun.sh) but works with any JavaScript runtime.

## Features

### Core Functionality

- **Turso-Pinecone Integration** - Seamlessly bridge relational data with vector search capabilities
- **Type-safe Operations** - Full TypeScript support with comprehensive type definitions
- **Hybrid Search** - Combine traditional filters with semantic vector search
- **Automatic Synchronization** - Keep your Turso database and Pinecone index in sync

### Advanced Capabilities

- **Flexible Embedding Strategy** - Configure which fields to embed and how to combine them
- **Metadata Management** - Automatically sync database fields as Pinecone metadata for filtering
- **Batch Processing** - Efficient bulk operations for large datasets
- **Custom ID Mapping** - Link records between systems with flexible ID strategies
- **Query Optimization** - Smart caching and batching for optimal performance

### Vector Search Features

- **Semantic Search** - Find records by meaning, not just keywords
- **Similarity Search** - Discover related content using vector similarity
- **Multi-modal Queries** - Combine text, metadata filters, and vector search
- **Real-time Updates** - Keep vector embeddings synchronized with database changes

## Installation

```bash
# With Bun (recommended)
bun add @datazod/zod-pinecone @libsql/client @pinecone-database/pinecone

# With npm
npm install @datazod/zod-pinecone @libsql/client @pinecone-database/pinecone

# With yarn
yarn add @datazod/zod-pinecone @libsql/client @pinecone-database/pinecone

# With pnpm
pnpm add @datazod/zod-pinecone @libsql/client @pinecone-database/pinecone
```

## Quick Start

```typescript
import { createClient } from '@libsql/client'
import { Pinecone } from '@pinecone-database/pinecone'
import { createTursoPineconeAdapter } from '@datazod/zod-pinecone'

// Initialize clients
const turso = createClient({
	url: 'your-turso-database-url',
	authToken: 'your-auth-token'
})

const pinecone = new Pinecone({
	apiKey: 'your-pinecone-api-key'
})

// Create the adapter
const adapter = createTursoPineconeAdapter({
	indexName: 'products',
	embeddingFields: ['title', 'description'], // Fields to convert to embeddings
	metadataFields: ['category', 'price', 'brand'], // Fields to sync as metadata
	generateEmbedding: async (text: string) => {
		// Your embedding generation logic (OpenAI, Cohere, etc.)
		const response = await openai.embeddings.create({
			model: 'text-embedding-ada-002',
			input: text
		})
		return response.data[0].embedding
	}
})

// Sync data from Turso to Pinecone
const products = await turso.execute('SELECT * FROM products')
const syncResult = await adapter.syncRecords(pinecone, products.rows)

// Perform semantic search
const results = await adapter.queryByText(pinecone, 'wireless headphones', {
	topK: 10,
	filter: { category: 'electronics', price: { $lte: 200 } }
})

console.log('Found products:', results)
```

## Core Concepts

### 1. Database-Vector Bridge

The adapter acts as a bridge between your Turso database (structured, relational data) and Pinecone (vector search):

```typescript
// Your Turso table
// products: id, title, description, category, price, created_at

// Becomes Pinecone vectors with:
// - Vector: embedding of title + description
// - Metadata: { category, price, created_at }
// - ID: linked to your database record
```

### 2. Embedding Strategy

Configure which fields to embed and how:

```typescript
const adapter = createTursoPineconeAdapter({
	indexName: 'products',

	// Embed specific fields
	embeddingFields: ['title', 'description'],

	// Or embed all fields except excluded ones
	embeddingFields: '*',
	excludeFromEmbedding: ['id', 'created_at', 'price'],

	// Fields to include as searchable metadata
	metadataFields: ['category', 'brand', 'price'],

	generateEmbedding: async (text: string) => {
		// Combine multiple fields into a single embedding
		return await yourEmbeddingService(text)
	}
})
```

### 3. Hybrid Search

Combine semantic search with traditional filters:

```typescript
// Find "gaming laptops" under $1500 in electronics category
const results = await adapter.queryByText(pinecone, 'gaming laptop', {
	filter: {
		$and: [
			{ category: { $eq: 'electronics' } },
			{ price: { $lte: 1500 } },
			{ brand: { $in: ['Dell', 'HP', 'Lenovo'] } }
		]
	},
	topK: 20
})
```

## API Reference

### Creating an Adapter

```typescript
const adapter = createTursoPineconeAdapter(options: TursoPineconeAdapterOptions)
```

#### TursoPineconeAdapterOptions

```typescript
interface TursoPineconeAdapterOptions {
	// Required
	indexName: string
	generateEmbedding: (text: string) => Promise<number[]>

	// Embedding configuration
	embeddingFields?: string[] | '*' // Fields to embed
	excludeFromEmbedding?: string[] // Fields to exclude when using '*'

	// Metadata configuration
	metadataFields?: string[] // Fields to sync as metadata

	// ID and mapping
	idField?: string // Database ID field (default: 'id')
	mappingFields?: {
		turso_id?: boolean // Include database ID in metadata
		custom_id?: string // Custom ID field name
	}

	// Performance
	batchSize?: number // Batch size for operations (default: 100)
}
```

### Core Methods

#### syncRecords()

Synchronize records from Turso to Pinecone:

```typescript
const result = await adapter.syncRecords(
  pineconeClient: Pinecone,
  records: any[],
  options?: {
    onProgress?: (completed: number, total: number) => void
    onError?: (error: Error, record: any, index: number) => void
  }
)

// Returns: { success: boolean, syncedCount: number, errors: string[] }
```

#### queryByText()

Semantic search by text:

```typescript
const results = await adapter.queryByText(
  pineconeClient: Pinecone,
  queryText: string,
  options?: {
    topK?: number
    filter?: Record<string, any>
    namespace?: string
    includeValues?: boolean
  }
)
```

#### findSimilar()

Find records similar to a given record:

```typescript
const results = await adapter.findSimilar(
  pineconeClient: Pinecone,
  referenceId: string,
  options?: {
    topK?: number
    filter?: Record<string, any>
    namespace?: string
  }
)
```

#### hybridSearch()

Advanced search combining text and filters:

```typescript
const results = await adapter.hybridSearch(
  pineconeClient: Pinecone,
  options: {
    queryText: string
    filter?: Record<string, any>
    topK?: number
    namespace?: string
  }
)
```

## Advanced Usage

### Custom Embedding Generation

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: 'your-api-key' })

const adapter = createTursoPineconeAdapter({
	indexName: 'products',
	embeddingFields: ['title', 'description', 'features'],

	generateEmbedding: async (text: string) => {
		const response = await openai.embeddings.create({
			model: 'text-embedding-3-small',
			input: text,
			dimensions: 1536
		})
		return response.data[0].embedding
	}
})
```

### Batch Synchronization with Progress Tracking

```typescript
const products = await turso.execute('SELECT * FROM products LIMIT 10000')

const result = await adapter.syncRecords(pinecone, products.rows, {
	onProgress: (completed, total) => {
		console.log(
			`Progress: ${completed}/${total} (${Math.round((completed / total) * 100)}%)`
		)
	},
	onError: (error, record, index) => {
		console.error(`Failed to sync record ${index}:`, error.message)
	}
})

console.log(
	`Synced ${result.syncedCount} records, ${result.errors.length} errors`
)
```

### Complex Filter Queries

```typescript
// Find products with advanced filtering
const results = await adapter.queryByText(pinecone, 'wireless bluetooth', {
	filter: {
		$and: [
			{ category: { $eq: 'electronics' } },
			{
				$or: [
					{ brand: { $in: ['Apple', 'Sony', 'Bose'] } },
					{ rating: { $gte: 4.5 } }
				]
			},
			{ price: { $gte: 50, $lte: 500 } },
			{ inStock: { $eq: true } }
		]
	},
	topK: 25
})
```

### ID Mapping and Cross-References

```typescript
const adapter = createTursoPineconeAdapter({
	indexName: 'products',
	embeddingFields: ['title', 'description'],
	idField: 'product_id', // Use custom ID field from database

	mappingFields: {
		turso_id: true, // Include database ID in metadata
		custom_id: 'sku' // Also include SKU for cross-referencing
	},

	generateEmbedding: async (text) => await embedText(text)
})

// Now vectors will have metadata like:
// { title: "Product Name", turso_id: "123", sku: "PROD-456" }
```

## Utility Functions

### Standalone Query Functions

```typescript
import {
	queryByText,
	queryByIds,
	findSimilar,
	hybridSearch,
	deleteByFilter
} from '@datazod/zod-pinecone'

// Query without adapter
const results = await queryByText(pinecone, {
	indexName: 'products',
	queryText: 'gaming mouse',
	generateEmbedding: embedFunction,
	topK: 10,
	filter: { category: 'gaming' }
})

// Delete by filter
const deleteResult = await deleteByFilter(pinecone, {
	indexName: 'products',
	filter: { discontinued: true }
})
```

### Helper Utilities

```typescript
import {
	EmbeddingHelper,
	FilterHelper,
	MetadataHelper
} from '@datazod/zod-pinecone'

// Embedding utilities
const normalized = EmbeddingHelper.normalize([0.1, 0.2, 0.3])
const similarity = EmbeddingHelper.cosineSimilarity(vectorA, vectorB)

// Filter building
const filter = FilterHelper.createFilter({ category: 'electronics' })
const rangeFilter = FilterHelper.createRangeFilter('price', 10, 100)
const combinedFilter = FilterHelper.combineFilters([filter, rangeFilter], 'and')

// Metadata processing
const cleanedMetadata = MetadataHelper.cleanMetadata(rawObject)
const selectedMetadata = MetadataHelper.extractMetadata(object, [
	'title',
	'price'
])
```

## Performance Tips

### 1. Optimize Embedding Fields

```typescript
// Good: Specific, relevant fields
embeddingFields: ['title', 'description']

// Less optimal: Too many fields
embeddingFields: ['title', 'description', 'category', 'brand', 'specs', 'reviews']

// Good alternative: Use wildcard with exclusions
embeddingFields: '*',
excludeFromEmbedding: ['id', 'created_at', 'updated_at', 'internal_notes']
```

### 2. Batch Operations

```typescript
// Process in batches for large datasets
const adapter = createTursoPineconeAdapter({
	indexName: 'products',
	batchSize: 50 // Adjust based on your embedding service limits
	// ...other options
})
```

### 3. Filter Early

```typescript
// Better: Filter in Pinecone first, then process
const results = await adapter.queryByText(pinecone, 'query', {
	filter: { category: 'electronics', inStock: true },
	topK: 100
})

// Then post-process if needed
const filtered = results.filter((r) => r.score > 0.8)
```

## Error Handling

```typescript
try {
	const result = await adapter.syncRecords(pinecone, records, {
		onError: (error, record, index) => {
			// Log individual record errors
			console.error(`Record ${index} failed:`, error.message)
		}
	})

	if (!result.success) {
		console.error('Sync completed with errors:', result.errors)
	}
} catch (error) {
	console.error('Sync failed completely:', error)
}
```

## Best Practices

### 1. Embedding Strategy

- Use concise, descriptive fields for embeddings
- Combine related fields (title + description) for richer context
- Exclude metadata-only fields (IDs, timestamps) from embeddings

### 2. Metadata Design

- Include fields you'll filter on frequently
- Keep metadata values simple (strings, numbers, booleans)
- Avoid deeply nested objects in metadata

### 3. Index Management

- Use consistent naming conventions for indexes
- Consider separate indexes for different content types
- Monitor index size and performance

### 4. Query Optimization

- Start with broader queries, then add filters
- Use appropriate `topK` values (don't over-fetch)
- Cache expensive embedding generations

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
	TursoPineconeAdapterOptions,
	QueryByTextOptions,
	HybridSearchOptions,
	MappingFields
} from '@datazod/zod-pinecone'

// All operations are fully typed
const adapter: TursoPineconeAdapter = createTursoPineconeAdapter(options)
const results: QueryResult[] = await adapter.queryByText(pinecone, 'query')
```

## License

MIT
