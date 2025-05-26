import { test, expect, describe } from 'bun:test'
import { z } from 'zod'
import { 
  createTableDDL, 
  createFlattenedSchemaJson,
  timeStampsSchema,
  autoIdSchema,
  autoIdSchemaWithTimestamps 
} from '../src/index'

describe('Basic Schema to SQL', () => {
  const UserSchema = z.object({
    name: z.string(),
    age: z.number().int(),
    email: z.string().email(),
    isActive: z.boolean()
  })

  test('creates basic table DDL for SQLite', () => {
    const result = createTableDDL('users', UserSchema, { dialect: 'sqlite' })
    
    expect(result).toContain('CREATE TABLE IF NOT EXISTS')
    expect(result).toContain('users')
    expect(result).toContain('name TEXT NOT NULL')
    expect(result).toContain('age INTEGER NOT NULL')
    expect(result).toContain('email TEXT NOT NULL')
    expect(result).toContain('isActive INTEGER NOT NULL')
  })

  test('creates table DDL for PostgreSQL', () => {
    const result = createTableDDL('users', UserSchema, { dialect: 'postgres' })
    
    expect(result).toContain('CREATE TABLE IF NOT EXISTS')
    expect(result).toContain('"users"')
    expect(result).toContain('"name" TEXT NOT NULL')
    expect(result).toContain('"age" INTEGER NOT NULL')
    expect(result).toContain('"isActive" BOOLEAN NOT NULL')
  })

  test('creates table DDL for MySQL', () => {
    const result = createTableDDL('users', UserSchema, { dialect: 'mysql' })
    
    expect(result).toContain('CREATE TABLE IF NOT EXISTS')
    expect(result).toContain('`users`')
    expect(result).toContain('`name` TEXT NOT NULL')
    expect(result).toContain('`age` INT NOT NULL')
    expect(result).toContain('`isActive` BOOLEAN NOT NULL')
  })

  test('adds auto ID when requested', () => {
    const result = createTableDDL('users', UserSchema, { 
      dialect: 'postgres',
      autoId: true 
    })
    
    expect(result).toContain('"id" SERIAL PRIMARY KEY')
  })

  test('adds timestamps when requested', () => {
    const result = createTableDDL('users', UserSchema, { 
      dialect: 'postgres',
      timestamps: true 
    })
    
    expect(result).toContain('"created_at"')
    expect(result).toContain('"updated_at"')
  })
})

describe('Flattened Schema JSON', () => {
  test('creates flattened schema JSON', () => {
    const NestedSchema = z.object({
      user: z.object({
        name: z.string(),
        profile: z.object({
          bio: z.string(),
          age: z.number()
        })
      }),
      active: z.boolean()
    })

    const result = createFlattenedSchemaJson(NestedSchema, { flattenDepth: 2 })
    
    expect(result).toHaveProperty('user_name')
    expect(result).toHaveProperty('user_profile_bio')
    expect(result).toHaveProperty('user_profile_age')
    expect(result).toHaveProperty('active')
  })
})

describe('Predefined Schemas', () => {
  test('timeStampsSchema has correct fields', () => {
    const schema = timeStampsSchema
    expect(schema.shape).toHaveProperty('created_at')
    expect(schema.shape).toHaveProperty('updated_at')
  })

  test('autoIdSchema has id field', () => {
    const schema = autoIdSchema
    expect(schema.shape).toHaveProperty('id')
  })

  test('autoIdSchemaWithTimestamps has all fields', () => {
    const schema = autoIdSchemaWithTimestamps
    expect(schema.shape).toHaveProperty('id')
    expect(schema.shape).toHaveProperty('created_at')
    expect(schema.shape).toHaveProperty('updated_at')
  })

  test('can extend schemas', () => {
    const UserWithTimestamps = z.object({
      name: z.string(),
      email: z.string()
    }).merge(timeStampsSchema)

    const result = createTableDDL('users', UserWithTimestamps, { dialect: 'postgres' })
    
    expect(result).toContain('"name"')
    expect(result).toContain('"email"')
    expect(result).toContain('"created_at"')
    expect(result).toContain('"updated_at"')
  })
})