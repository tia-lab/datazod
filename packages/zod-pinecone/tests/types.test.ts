import { test, expect, describe } from 'bun:test'
import type { 
  TursoPineconeAdapterOptions,
  PineconeQueryOptions,
  MappingFields,
  QueryByTextOptions,
  HybridSearchOptions
} from '../src/types/index'

describe('TypeScript Types', () => {
  test('TursoPineconeAdapterOptions accepts valid configuration', () => {
    const options: TursoPineconeAdapterOptions = {
      indexName: 'test-index',
      generateEmbedding: async (text: string) => [0.1, 0.2, 0.3],
      embeddingFields: ['title', 'description'],
      metadataFields: ['category', 'price'],
      mappingFields: {
        turso_id: true,
        custom_id: 'external_id'
      },
      batchSize: 100,
      idField: 'id',
      excludeFromEmbedding: ['password', 'internal_notes']
    }

    expect(options.indexName).toBe('test-index')
    expect(typeof options.generateEmbedding).toBe('function')
    expect(options.embeddingFields).toEqual(['title', 'description'])
    expect(options.batchSize).toBe(100)
  })

  test('TursoPineconeAdapterOptions accepts wildcard embedding fields', () => {
    const options: TursoPineconeAdapterOptions = {
      indexName: 'test-index',
      generateEmbedding: async (text: string) => [0.1, 0.2, 0.3],
      embeddingFields: '*',
      excludeFromEmbedding: ['id', 'created_at', 'password']
    }

    expect(options.embeddingFields).toBe('*')
    expect(options.excludeFromEmbedding).toContain('password')
  })

  test('PineconeQueryOptions provides proper query configuration', () => {
    const queryOptions: PineconeQueryOptions = {
      topK: 10,
      includeMetadata: true,
      includeValues: false,
      filter: {
        category: { $eq: 'electronics' },
        price: { $gte: 10, $lte: 1000 }
      }
    }

    expect(queryOptions.topK).toBe(10)
    expect(queryOptions.includeMetadata).toBe(true)
    expect(queryOptions.filter.category).toEqual({ $eq: 'electronics' })
  })

  test('MappingFields type supports database integration', () => {
    const mappingFields: MappingFields = {
      turso_id: true,
      custom_id: 'external_mapping_id'
    }

    expect(mappingFields.turso_id).toBe(true)
    expect(mappingFields.custom_id).toBe('external_mapping_id')
  })

  test('QueryByTextOptions combines text and filter options', () => {
    const options: QueryByTextOptions = {
      indexName: 'products',
      queryText: 'wireless headphones',
      generateEmbedding: async (text: string) => [0.1, 0.2, 0.3],
      topK: 5,
      filter: {
        category: { $eq: 'electronics' },
        inStock: { $eq: true }
      },
      namespace: 'production'
    }

    expect(options.queryText).toBe('wireless headphones')
    expect(options.topK).toBe(5)
    expect(options.namespace).toBe('production')
    expect(typeof options.generateEmbedding).toBe('function')
  })

  test('HybridSearchOptions supports complex search scenarios', () => {
    const options: HybridSearchOptions = {
      indexName: 'products',
      queryText: 'gaming laptop',
      generateEmbedding: async (text: string) => Array.from({ length: 1536 }, () => Math.random()),
      filter: {
        $and: [
          { category: { $eq: 'computers' } },
          { price: { $gte: 500, $lte: 2000 } },
          { brand: { $in: ['Dell', 'HP', 'Lenovo'] } }
        ]
      },
      topK: 20,
      namespace: 'catalog',
      includeValues: true
    }

    expect(options.queryText).toBe('gaming laptop')
    expect(options.topK).toBe(20)
    expect(options.includeValues).toBe(true)
    
    // Verify complex filter structure
    const filterAnd = options.filter.$and
    expect(filterAnd).toHaveLength(3)
    expect(filterAnd[0]).toEqual({ category: { $eq: 'computers' } })
    expect(filterAnd[1]).toEqual({ price: { $gte: 500, $lte: 2000 } })
    expect(filterAnd[2]).toEqual({ brand: { $in: ['Dell', 'HP', 'Lenovo'] } })
  })

  test('Type system enforces required fields', () => {
    // This test ensures TypeScript compilation catches missing required fields
    
    // Valid minimal configuration
    const validOptions: TursoPineconeAdapterOptions = {
      indexName: 'test',
      generateEmbedding: async () => [0.1]
    }

    expect(validOptions.indexName).toBeDefined()
    expect(validOptions.generateEmbedding).toBeDefined()

    // TypeScript would catch these errors at compile time:
    // const invalidOptions: TursoPineconeAdapterOptions = {
    //   // indexName: missing required field
    //   generateEmbedding: async () => [0.1]
    // }
  })

  test('Optional fields have correct defaults or undefined behavior', () => {
    const minimalOptions: TursoPineconeAdapterOptions = {
      indexName: 'test',
      generateEmbedding: async () => [0.1]
    }

    // Optional fields should be undefined when not specified
    expect(minimalOptions.embeddingFields).toBeUndefined()
    expect(minimalOptions.metadataFields).toBeUndefined()
    expect(minimalOptions.batchSize).toBeUndefined()
    expect(minimalOptions.mappingFields).toBeUndefined()
  })

  test('Function types are properly typed', async () => {
    const embeddingFunction = async (text: string): Promise<number[]> => {
      return text.split('').map((_, i) => i * 0.1)
    }

    const options: TursoPineconeAdapterOptions = {
      indexName: 'test',
      generateEmbedding: embeddingFunction
    }

    // Test that the function works as expected
    const result = await options.generateEmbedding('test')
    expect(result).toHaveLength(4)
    expect(result[0]).toBe(0)
    expect(result[1]).toBeCloseTo(0.1, 5)
    expect(result[2]).toBeCloseTo(0.2, 5)
    expect(result[3]).toBeCloseTo(0.3, 5)
    expect(result.every(n => typeof n === 'number')).toBe(true)
  })
})