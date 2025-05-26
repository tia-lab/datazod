import { test, expect, describe } from 'bun:test'
import { EmbeddingHelper } from '../src/utils/index'

describe('EmbeddingHelper', () => {
  test('calculates cosine similarity correctly', () => {
    const a = [1, 0, 0]
    const b = [0, 1, 0]
    const c = [1, 0, 0]
    
    // Perpendicular vectors should have similarity 0
    expect(EmbeddingHelper.cosineSimilarity(a, b)).toBeCloseTo(0, 5)
    
    // Identical vectors should have similarity 1
    expect(EmbeddingHelper.cosineSimilarity(a, c)).toBeCloseTo(1, 5)
  })

  test('throws error for different length embeddings', () => {
    const a = [1, 2, 3]
    const b = [1, 2]
    
    expect(() => EmbeddingHelper.cosineSimilarity(a, b)).toThrow('Embeddings must have the same length')
  })

  test('handles cosine similarity with zero vectors', () => {
    const a = [0, 0, 0]
    const b = [1, 2, 3]
    
    // Zero vector should result in NaN or 0
    const similarity = EmbeddingHelper.cosineSimilarity(a, b)
    expect(typeof similarity).toBe('number')
  })

  test('calculates similarity for complex vectors', () => {
    const a = [0.1, 0.2, 0.3, 0.4]
    const b = [0.2, 0.4, 0.6, 0.8]
    
    const similarity = EmbeddingHelper.cosineSimilarity(a, b)
    expect(similarity).toBeGreaterThan(0)
    expect(similarity).toBeLessThanOrEqual(1)
  })
})

describe('Utility Module Structure', () => {
  test('exports expected classes and functions', () => {
    expect(EmbeddingHelper).toBeDefined()
    expect(typeof EmbeddingHelper.cosineSimilarity).toBe('function')
  })

  test('embedding helper has correct static methods', () => {
    expect(EmbeddingHelper.cosineSimilarity).toBeInstanceOf(Function)
  })
})