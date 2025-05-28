import { test, expect, describe, beforeEach } from 'bun:test'
import { z } from 'zod'
import { 
  findBy,
  migrateTable,
  getTableColumns,
  insertSingle,
  insertBatch,
  createTursoInserter
} from '../src/index'

// Mock Turso client for testing
class MockTursoClient {
  private tables: Map<string, { columns: Map<string, string>, rows: any[] }> = new Map()
  
  async execute(query: { sql: string, args?: any[] } | string): Promise<any> {
    const sql = typeof query === 'string' ? query : query.sql
    const sqlUpper = sql.toUpperCase().trim()
    
    // Handle PRAGMA table_info
    if (sqlUpper.startsWith('PRAGMA TABLE_INFO')) {
      const match = sql.match(/PRAGMA table_info\((\w+)\)/i)
      if (match) {
        const tableName = match[1]
        const table = this.tables.get(tableName)
        if (!table) return { rows: [] }
        
        const rows = Array.from(table.columns.entries()).map(([name, type], index) => ({
          cid: index,
          name,
          type,
          notnull: 0,
          dflt_value: null,
          pk: 0
        }))
        return { rows }
      }
    }
    
    // Handle ALTER TABLE ADD COLUMN
    if (sqlUpper.includes('ALTER TABLE') && sqlUpper.includes('ADD COLUMN')) {
      const match = sql.match(/ALTER TABLE (\w+) ADD COLUMN [\"`]?(\w+)[\"`]?\s+(\w+)/i)
      if (match) {
        const [, tableName, columnName, columnType] = match
        const table = this.tables.get(tableName)
        if (table) {
          table.columns.set(columnName, columnType)
        }
        return { success: true }
      }
    }
    
    // Handle INSERT
    if (sqlUpper.startsWith('INSERT')) {
      // Mock successful insert
      return { success: true }
    }
    
    // Handle SELECT (for queries)
    if (sqlUpper.startsWith('SELECT')) {
      const match = sql.match(/SELECT .+ FROM (\w+)/i)
      if (match) {
        const tableName = match[1]
        const table = this.tables.get(tableName)
        if (table) {
          // Return mock data with array indices (simulating Turso behavior)
          return { 
            rows: table.rows.map((row, index) => ({
              ...row,
              "0": row.id || `id_${index}`,
              "1": row.name || `name_${index}`,
              "2": row.email || `email_${index}`,
              length: 3
            }))
          }
        }
      }
      return { rows: [] }
    }
    
    return { success: true }
  }
  
  // Helper methods for testing
  createTable(name: string, columns: Record<string, string>) {
    const columnMap = new Map(Object.entries(columns))
    this.tables.set(name, { columns: columnMap, rows: [] })
  }
  
  addMockData(tableName: string, data: any[]) {
    const table = this.tables.get(tableName)
    if (table) {
      table.rows.push(...data)
    }
  }
  
  getTableColumns(name: string): string[] {
    const table = this.tables.get(name)
    return table ? Array.from(table.columns.keys()) : []
  }
  
  clear() {
    this.tables.clear()
  }
}

describe('Turso Migration Tests', () => {
  let mockClient: MockTursoClient
  
  beforeEach(() => {
    mockClient = new MockTursoClient()
  })
  
  describe('migrateTable', () => {
    test('adds new columns to existing table', async () => {
      // Create initial table
      mockClient.createTable('users', { id: 'TEXT', name: 'TEXT' })
      
      // Schema with new column
      const newSchema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string()
      })
      
      await migrateTable('users', newSchema, mockClient, true)
      
      const columns = mockClient.getTableColumns('users')
      expect(columns).toContain('email')
    })
    
    test('skips migration for non-existent table', async () => {
      const schema = z.object({ name: z.string() })
      
      // Should not throw error
      await migrateTable('nonexistent', schema, mockClient, true)
      
      expect(mockClient.getTableColumns('nonexistent')).toEqual([])
    })
    
    test('handles different Zod types correctly', async () => {
      mockClient.createTable('data', { id: 'TEXT' })
      
      const schema = z.object({
        id: z.string(),
        count: z.number(),
        active: z.boolean(),
        created: z.date(),
        optional: z.string().optional()
      })
      
      await migrateTable('data', schema, mockClient, true)
      
      const columns = mockClient.getTableColumns('data')
      expect(columns).toContain('count')
      expect(columns).toContain('active')
      expect(columns).toContain('created')
      expect(columns).toContain('optional')
    })
  })
  
  describe('Clean Query Results', () => {
    test('findBy returns raw results by default', async () => {
      const schema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string()
      })
      
      mockClient.createTable('users', { id: 'TEXT', name: 'TEXT', email: 'TEXT' })
      mockClient.addMockData('users', [
        { id: 'user1', name: 'John', email: 'john@example.com' }
      ])
      
      const results = await findBy({
        tableName: 'users',
        schema,
        turso: mockClient as any,
        field: 'name',
        value: 'John'
      })
      
      // Should include array indices
      expect(results[0]).toHaveProperty('0')
      expect(results[0]).toHaveProperty('1')
      expect(results[0]).toHaveProperty('2')
      expect(results[0]).toHaveProperty('length')
    })
    
    test('findBy with clean=true removes array indices', async () => {
      const schema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string()
      })
      
      mockClient.createTable('users', { id: 'TEXT', name: 'TEXT', email: 'TEXT' })
      mockClient.addMockData('users', [
        { id: 'user1', name: 'John', email: 'john@example.com' }
      ])
      
      const results = await findBy({
        tableName: 'users',
        schema,
        turso: mockClient as any,
        field: 'name',
        value: 'John',
        clean: true
      })
      
      // Should NOT include array indices
      expect(results[0]).not.toHaveProperty('0')
      expect(results[0]).not.toHaveProperty('1')
      expect(results[0]).not.toHaveProperty('2')
      expect(results[0]).not.toHaveProperty('length')
      
      // Should only include schema-defined properties
      expect(results[0]).toHaveProperty('id')
      expect(results[0]).toHaveProperty('name')
      expect(results[0]).toHaveProperty('email')
    })
  })
  
  describe('Inserter Migration', () => {
    test('insertSingle with migrate=true runs migration', async () => {
      const schema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string() // This will be added by migration
      })
      
      // Create table missing 'email' column
      mockClient.createTable('users', { id: 'TEXT', name: 'TEXT' })
      
      const result = await insertSingle(
        mockClient as any,
        'users',
        schema,
        { id: 'user1', name: 'John', email: 'john@example.com' },
        { migrate: true, debug: true }
      )
      
      expect(result.success).toBe(true)
      
      // Migration should have added email column
      const columns = mockClient.getTableColumns('users')
      expect(columns).toContain('email')
    })
    
    test('insertBatch with migrate=true runs migration', async () => {
      const schema = z.object({
        id: z.string(),
        name: z.string(),
        newField: z.string() // This will be added by migration
      })
      
      // Create table missing 'newField' column
      mockClient.createTable('users', { id: 'TEXT', name: 'TEXT' })
      
      const result = await insertBatch(
        mockClient as any,
        'users',
        schema,
        [
          { id: 'user1', name: 'John', newField: 'value1' },
          { id: 'user2', name: 'Jane', newField: 'value2' }
        ],
        { migrate: true, debug: true }
      )
      
      expect(result.success).toBe(true)
      
      // Migration should have added newField column
      const columns = mockClient.getTableColumns('users')
      expect(columns).toContain('newField')
    })
    
    test('inserter factory with migrate option works', async () => {
      const schema = z.object({
        id: z.string(),
        name: z.string(),
        autoMigrated: z.string()
      })
      
      mockClient.createTable('users', { id: 'TEXT', name: 'TEXT' })
      
      const inserter = createTursoInserter('users', schema, {
        migrate: true,
        debug: true
      })
      
      const result = await inserter.single(
        mockClient as any,
        { id: 'user1', name: 'John', autoMigrated: 'yes' }
      )
      
      expect(result.success).toBe(true)
      
      // Migration should have added autoMigrated column
      const columns = mockClient.getTableColumns('users')
      expect(columns).toContain('autoMigrated')
    })
  })
  
  describe('Integration Tests', () => {
    test('complete workflow: create table, migrate, insert, query', async () => {
      // Step 1: Initial schema
      const initialSchema = z.object({
        id: z.string(),
        name: z.string()
      })
      
      mockClient.createTable('products', { id: 'TEXT', name: 'TEXT' })
      
      // Step 2: Insert initial data
      await insertSingle(
        mockClient as any,
        'products',
        initialSchema,
        { id: 'prod1', name: 'Product 1' },
        { migrate: false }
      )
      
      // Step 3: Evolve schema
      const evolvedSchema = z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        category: z.string()
      })
      
      // Step 4: Insert with auto-migration
      await insertSingle(
        mockClient as any,
        'products',
        evolvedSchema,
        { id: 'prod2', name: 'Product 2', price: 99.99, category: 'Electronics' },
        { migrate: true, debug: true }
      )
      
      // Migration should have added new columns
      const columns = mockClient.getTableColumns('products')
      expect(columns).toContain('price')
      expect(columns).toContain('category')
      
      // Step 5: Query with clean results
      mockClient.addMockData('products', [
        { id: 'prod1', name: 'Product 1', price: null, category: null },
        { id: 'prod2', name: 'Product 2', price: 99.99, category: 'Electronics' }
      ])
      
      const cleanResults = await findBy({
        tableName: 'products',
        schema: evolvedSchema,
        turso: mockClient as any,
        field: 'category',
        value: 'Electronics',
        clean: true
      })
      
      expect(cleanResults).toHaveLength(1)
      expect(cleanResults[0]).toHaveProperty('id')
      expect(cleanResults[0]).toHaveProperty('name')
      expect(cleanResults[0]).toHaveProperty('price')
      expect(cleanResults[0]).toHaveProperty('category')
      expect(cleanResults[0]).not.toHaveProperty('0')
      expect(cleanResults[0]).not.toHaveProperty('length')
    })
  })
})