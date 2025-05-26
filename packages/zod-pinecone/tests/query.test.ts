import { test, expect, describe, mock } from 'bun:test'
import type { 
  QueryByTextOptions,
  QueryByIdOptions,
  HybridSearchOptions,
  DeleteByFilterOptions
} from '../src/types/index'

describe('Query Configuration Types', () => {
  test('QueryByTextOptions provides proper configuration', () => {
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
    expect(options.filter.category).toEqual({ $eq: 'electronics' })
  })

  test('QueryByIdOptions supports ID-based queries', () => {
    const options: QueryByIdOptions = {
      indexName: 'products',
      ids: ['1', '2', '3'],
      namespace: 'production'
    }

    expect(options.indexName).toBe('products')
    expect(options.ids).toEqual(['1', '2', '3'])
    expect(options.namespace).toBe('production')
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

  test('DeleteByFilterOptions supports filter-based deletion', () => {
    const options: DeleteByFilterOptions = {
      indexName: 'products',
      filter: { 
        discontinued: { $eq: true },
        lastUpdated: { $lt: '2023-01-01' }
      },
      namespace: 'archive'
    }

    expect(options.indexName).toBe('products')
    expect(options.filter.discontinued).toEqual({ $eq: true })
    expect(options.filter.lastUpdated).toEqual({ $lt: '2023-01-01' })
    expect(options.namespace).toBe('archive')
  })

  test('async embedding function works correctly', async () => {
    const embeddingFunction = async (text: string): Promise<number[]> => {
      return text.split('').map((_, i) => i * 0.1)
    }

    const options: QueryByTextOptions = {
      indexName: 'test',
      queryText: 'test',
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

  test('optional fields have correct behavior', () => {
    const minimalOptions: QueryByTextOptions = {
      indexName: 'test',
      queryText: 'test query',
      generateEmbedding: async () => [0.1]
    }

    // Optional fields should be undefined when not specified
    expect(minimalOptions.topK).toBeUndefined()
    expect(minimalOptions.filter).toBeUndefined()
    expect(minimalOptions.namespace).toBeUndefined()
    expect(minimalOptions.includeValues).toBeUndefined()
  })
})