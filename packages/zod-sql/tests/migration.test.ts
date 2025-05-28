import { test, expect, describe, beforeEach } from 'bun:test'
import { z } from 'zod'
import { 
  createTable,
  createTableWithMigration,
  migrateTableSchema,
  getTableColumns
} from '../src/index'

// Mock database client for testing
class MockClient {
  private tables: Map<string, { columns: Map<string, string>, rows: any[] }> = new Map()
  
  async execute(sql: string): Promise<any> {
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
    
    // Handle CREATE TABLE
    if (sqlUpper.startsWith('CREATE TABLE')) {
      const match = sql.match(/CREATE TABLE IF NOT EXISTS [\"`]?(\w+)[\"`]?\s*\(/i)
      if (match) {
        const tableName = match[1]
        if (!this.tables.has(tableName)) {
          this.tables.set(tableName, { columns: new Map(), rows: [] })
        }
        return { success: true }
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
    
    // Handle DROP TABLE
    if (sqlUpper.startsWith('DROP TABLE')) {
      const match = sql.match(/DROP TABLE (\w+)/i)
      if (match) {
        const tableName = match[1]
        this.tables.delete(tableName)
        return { success: true }
      }
    }
    
    // Handle SELECT (for backup)
    if (sqlUpper.startsWith('SELECT')) {
      const match = sql.match(/SELECT .+ FROM (\w+)/i)
      if (match) {
        const tableName = match[1]
        const table = this.tables.get(tableName)
        return { rows: table?.rows || [] }
      }
    }
    
    // Handle INSERT
    if (sqlUpper.startsWith('INSERT')) {
      // Mock successful insert
      return { success: true }
    }
    
    return { success: true }
  }
  
  // Helper methods for testing
  createTable(name: string, columns: Record<string, string>) {
    const columnMap = new Map(Object.entries(columns))
    this.tables.set(name, { columns: columnMap, rows: [] })
  }
  
  hasTable(name: string): boolean {
    return this.tables.has(name)
  }
  
  getTableColumns(name: string): string[] {
    const table = this.tables.get(name)
    return table ? Array.from(table.columns.keys()) : []
  }
  
  clear() {
    this.tables.clear()
  }
}

describe('Migration Tests', () => {
  let mockClient: MockClient
  
  beforeEach(() => {
    mockClient = new MockClient()
  })
  
  describe('getTableColumns', () => {
    test('returns empty array for non-existent table', async () => {
      const columns = await getTableColumns('nonexistent', mockClient)
      expect(columns).toEqual([])
    })
    
    test('returns column names for existing table', async () => {
      mockClient.createTable('users', { id: 'TEXT', name: 'TEXT', age: 'INTEGER' })
      
      const columns = await getTableColumns('users', mockClient)
      expect(columns).toEqual(['id', 'name', 'age'])
    })
  })
  
  describe('migrateTableSchema', () => {
    test('skips migration for non-existent table', async () => {
      const schema = z.object({ name: z.string() })
      
      // Should not throw error for non-existent table
      await migrateTableSchema('users', schema, mockClient, { debug: true })
      
      expect(mockClient.hasTable('users')).toBe(false)
    })
    
    test('adds new columns to existing table', async () => {
      // Create initial table
      mockClient.createTable('users', { id: 'TEXT', name: 'TEXT' })
      
      // Schema with new column
      const newSchema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        age: z.number()
      })
      
      await migrateTableSchema('users', newSchema, mockClient, { debug: true })
      
      const columns = mockClient.getTableColumns('users')
      expect(columns).toContain('email')
      expect(columns).toContain('age')
    })
    
    test('handles column removal with allowDrop', async () => {
      // Create table with extra column
      mockClient.createTable('users', { id: 'TEXT', name: 'TEXT', oldColumn: 'TEXT' })
      
      // Schema without old column
      const newSchema = z.object({
        id: z.string(),
        name: z.string()
      })
      
      await migrateTableSchema('users', newSchema, mockClient, { 
        allowDrop: true,
        debug: true 
      })
      
      // Table should be recreated without old column
      const columns = mockClient.getTableColumns('users')
      expect(columns).not.toContain('oldColumn')
      expect(columns).toContain('id')
      expect(columns).toContain('name')
    })
    
    test('throws error for column removal without allowDrop', async () => {
      mockClient.createTable('users', { id: 'TEXT', name: 'TEXT', oldColumn: 'TEXT' })
      
      const newSchema = z.object({
        id: z.string(),
        name: z.string()
      })
      
      await expect(
        migrateTableSchema('users', newSchema, mockClient, { allowDrop: false })
      ).rejects.toThrow('Cannot remove columns')
    })
  })
  
  describe('createTableWithMigration', () => {
    test('creates table DDL without migration when no client provided', async () => {
      const schema = z.object({
        id: z.string(),
        name: z.string()
      })
      
      const result = await createTableWithMigration('users', schema, {
        migrate: true // Should be ignored without client
      })
      
      expect(result.table).toContain('CREATE TABLE')
      expect(result.table).toContain('users')
      expect(result.table).toContain('id')
      expect(result.table).toContain('name')
    })
    
    test('runs migration when client and migrate option provided', async () => {
      // Create existing table
      mockClient.createTable('users', { id: 'TEXT', name: 'TEXT' })
      
      const schema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string() // New column
      })
      
      const result = await createTableWithMigration('users', schema, {
        migrate: true,
        debug: true
      }, mockClient)
      
      // Should have added new column
      const columns = mockClient.getTableColumns('users')
      expect(columns).toContain('email')
      
      // Should still return table DDL
      expect(result.table).toContain('CREATE TABLE')
    })
    
    test('supports all table options', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      })
      
      const result = await createTableWithMigration('users', schema, {
        dialect: 'sqlite',
        timestamps: true,
        autoId: { enabled: true, type: 'uuid' },
        primaryKey: 'id',
        indexes: { name_idx: ['name'] },
        migrate: false
      })
      
      expect(result.table).toContain('CREATE TABLE')
      expect(result.table).toContain('created_at')
      expect(result.table).toContain('updated_at')
      expect(result.indexes).toHaveLength(1)
      expect(result.indexes[0]).toContain('CREATE INDEX')
    })
  })
  
  describe('Backward Compatibility', () => {
    test('createTable remains synchronous', () => {
      const schema = z.object({
        id: z.string(),
        name: z.string()
      })
      
      const result = createTable('users', schema)
      
      // Should return result immediately (not a Promise)
      expect(result.table).toContain('CREATE TABLE')
      expect(result.table).toContain('users')
    })
    
    test('createTable and createTableWithMigration return same structure', async () => {
      const schema = z.object({
        id: z.string(),
        name: z.string()
      })
      
      const options = {
        dialect: 'sqlite' as const,
        timestamps: true,
        autoId: { enabled: true, type: 'uuid' as const }
      }
      
      const syncResult = createTable('users', schema, options)
      const asyncResult = await createTableWithMigration('users', schema, options)
      
      // Structure should be identical
      expect(Object.keys(syncResult)).toEqual(Object.keys(asyncResult))
      expect(syncResult.table).toBe(asyncResult.table)
      expect(syncResult.indexes).toEqual(asyncResult.indexes)
    })
  })
})