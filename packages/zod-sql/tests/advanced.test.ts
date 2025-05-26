import { test, expect, describe } from 'bun:test'
import { z } from 'zod'
import { createTableDDL, extractTableStructure } from '../src/index'

describe('Advanced Features', () => {
  test('handles nullable fields', () => {
    const Schema = z.object({
      name: z.string(),
      bio: z.string().nullable(),
      age: z.number().optional()
    })

    const result = createTableDDL('users', Schema, { dialect: 'postgres' })
    
    expect(result).toContain('"name" TEXT NOT NULL')
    expect(result).toContain('"bio" TEXT')
    expect(result).not.toContain('"bio" TEXT NOT NULL')
    expect(result).toContain('"age" INTEGER')
    expect(result).not.toContain('"age" INTEGER NOT NULL')
  })

  test('handles arrays', () => {
    const Schema = z.object({
      name: z.string(),
      tags: z.array(z.string()),
      scores: z.array(z.number())
    })

    const result = createTableDDL('posts', Schema, { dialect: 'postgres' })
    
    expect(result).toContain('"tags" TEXT[]')
    expect(result).toContain('"scores" INTEGER[]')
  })

  test('handles nested objects with flattening', () => {
    const Schema = z.object({
      user: z.object({
        name: z.string(),
        contact: z.object({
          email: z.string(),
          phone: z.string().optional()
        })
      }),
      metadata: z.object({
        version: z.number(),
        flags: z.object({
          active: z.boolean(),
          premium: z.boolean()
        })
      })
    })

    const result = createTableDDL('records', Schema, { 
      dialect: 'postgres',
      flattenDepth: 3
    })
    
    expect(result).toContain('"user_name"')
    expect(result).toContain('"user_contact_email"')
    expect(result).toContain('"user_contact_phone"')
    expect(result).toContain('"metadata_version"')
    expect(result).toContain('"metadata_flags_active"')
    expect(result).toContain('"metadata_flags_premium"')
  })

  test('handles primary keys', () => {
    const Schema = z.object({
      userId: z.string(),
      name: z.string(),
      email: z.string()
    })

    const result = createTableDDL('users', Schema, { 
      dialect: 'postgres',
      primaryKey: 'userId'
    })
    
    expect(result).toContain('"userId" TEXT NOT NULL PRIMARY KEY')
  })

  test('handles compound primary keys', () => {
    const Schema = z.object({
      userId: z.string(),
      projectId: z.string(),
      role: z.string()
    })

    const result = createTableDDL('user_projects', Schema, { 
      dialect: 'postgres',
      primaryKey: ['userId', 'projectId']
    })
    
    expect(result).toContain('PRIMARY KEY ("userId", "projectId")')
  })

  test('handles indexes', () => {
    const Schema = z.object({
      id: z.string(),
      email: z.string(),
      status: z.string(),
      createdAt: z.string()
    })

    const result = createTableDDL('users', Schema, { 
      dialect: 'postgres',
      indexes: {
        'idx_email': ['email'],
        'idx_status_created': ['status', 'createdAt']
      }
    })
    
    expect(result).toContain('CREATE INDEX IF NOT EXISTS "idx_email" ON "users" ("email")')
    expect(result).toContain('CREATE INDEX IF NOT EXISTS "idx_status_created" ON "users" ("status", "createdAt")')
  })

  test('handles extra columns', () => {
    const Schema = z.object({
      name: z.string(),
      email: z.string()
    })

    const result = createTableDDL('users', Schema, { 
      dialect: 'postgres',
      extraColumns: [
        {
          name: 'id',
          type: 'SERIAL',
          primaryKey: true,
          position: 'start'
        },
        {
          name: 'created_at',
          type: 'TIMESTAMP',
          default: 'CURRENT_TIMESTAMP',
          position: 'end'
        }
      ]
    })
    
    expect(result).toContain('"id" SERIAL PRIMARY KEY')
    expect(result).toContain('"created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
  })
})

describe('Table Structure Extraction', () => {
  test('extracts table structure correctly', () => {
    const Schema = z.object({
      name: z.string(),
      age: z.number().optional(),
      email: z.string().email()
    })

    const structure = extractTableStructure(Schema, { 
      autoId: true,
      timestamps: true 
    })
    
    expect(structure.columns).toHaveProperty('id')
    expect(structure.columns).toHaveProperty('name')
    expect(structure.columns).toHaveProperty('age')
    expect(structure.columns).toHaveProperty('email')
    expect(structure.columns).toHaveProperty('created_at')
    expect(structure.columns).toHaveProperty('updated_at')
    
    expect(structure.columns.name.nullable).toBe(false)
    expect(structure.columns.age.nullable).toBe(true)
    expect(structure.columns.email.nullable).toBe(false)
  })
})