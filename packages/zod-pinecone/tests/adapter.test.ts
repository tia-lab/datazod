import { test, expect, describe, mock } from 'bun:test'
import type { TursoPineconeAdapterOptions } from '../src/types/index'

// Mock embedding function
const mockGenerateEmbedding = mock(async (text: string) => {
  return Array.from({ length: 1536 }, () => Math.random())
})

describe('TursoPineconeAdapter Configuration', () => {
  test('adapter options interface works correctly', () => {
    const options: TursoPineconeAdapterOptions = {
      indexName: 'test-index',
      generateEmbedding: mockGenerateEmbedding,
      embeddingFields: ['title', 'description'],
      metadataFields: ['category', 'price']
    }

    expect(options.indexName).toBe('test-index')
    expect(typeof options.generateEmbedding).toBe('function')
    expect(options.embeddingFields).toEqual(['title', 'description'])
    expect(options.metadataFields).toEqual(['category', 'price'])
  })

  test('embedding function generates vectors', async () => {
    const options: TursoPineconeAdapterOptions = {
      indexName: 'test-index',
      generateEmbedding: mockGenerateEmbedding
    }

    const result = await options.generateEmbedding('test text')
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1536)
    expect(result.every(n => typeof n === 'number')).toBe(true)
  })

  test('wildcard embedding fields configuration', () => {
    const options: TursoPineconeAdapterOptions = {
      indexName: 'test-index',
      generateEmbedding: mockGenerateEmbedding,
      embeddingFields: '*',
      excludeFromEmbedding: ['id', 'created_at', 'password']
    }

    expect(options.embeddingFields).toBe('*')
    expect(options.excludeFromEmbedding).toContain('password')
  })

  test('custom ID field and mapping configuration', () => {
    const options: TursoPineconeAdapterOptions = {
      indexName: 'test-index',
      generateEmbedding: mockGenerateEmbedding,
      idField: 'custom_id',
      mappingFields: {
        turso_id: true,
        custom_id: 'external_mapping_id'
      },
      batchSize: 50
    }

    expect(options.idField).toBe('custom_id')
    expect(options.mappingFields?.turso_id).toBe(true)
    expect(options.mappingFields?.custom_id).toBe('external_mapping_id')
    expect(options.batchSize).toBe(50)
  })

  test('optional configuration fields', () => {
    const minimalOptions: TursoPineconeAdapterOptions = {
      indexName: 'test-index',
      generateEmbedding: mockGenerateEmbedding
    }

    // Optional fields should be undefined when not specified
    expect(minimalOptions.embeddingFields).toBeUndefined()
    expect(minimalOptions.metadataFields).toBeUndefined()
    expect(minimalOptions.batchSize).toBeUndefined()
    expect(minimalOptions.mappingFields).toBeUndefined()
    expect(minimalOptions.idField).toBeUndefined()
    expect(minimalOptions.excludeFromEmbedding).toBeUndefined()
  })
})