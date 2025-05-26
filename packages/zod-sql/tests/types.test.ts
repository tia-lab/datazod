import { test, expect, describe } from 'bun:test'
import { z } from 'zod'
import type { TableTypes, TimeStampsSchema, AutoIdSchema, AutoIdSchemaWithTimestamps } from '../src/index'

describe('TypeScript Types', () => {
  test('TableTypes flattens interfaces correctly', () => {
    type TestInterface = {
      user: {
        name: string
        profile: {
          bio: string
          age: number
        }
      }
      active: boolean
    }

    type Flattened = TableTypes<TestInterface>
    
    // This test mainly ensures the types compile correctly
    const mockFlattened: Flattened = {
      user_name: 'test',
      user_profile_bio: 'bio',
      user_profile_age: 25,
      active: true
    }
    
    expect(mockFlattened.user_name).toBe('test')
    expect(mockFlattened.user_profile_bio).toBe('bio')
    expect(mockFlattened.user_profile_age).toBe(25)
    expect(mockFlattened.active).toBe(true)
  })

  test('TimeStampsSchema type inference', () => {
    const timestamps: TimeStampsSchema = {
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    }
    
    expect(timestamps.created_at).toBeTypeOf('string')
    expect(timestamps.updated_at).toBeTypeOf('string')
  })

  test('AutoIdSchema type inference', () => {
    const autoId: AutoIdSchema = {
      id: 'user-123'
    }
    
    expect(autoId.id).toBeTypeOf('string')
  })

  test('AutoIdSchemaWithTimestamps type inference', () => {
    const autoIdWithTimestamps: AutoIdSchemaWithTimestamps = {
      id: 'user-123',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    }
    
    expect(autoIdWithTimestamps.id).toBeTypeOf('string')
    expect(autoIdWithTimestamps.created_at).toBeTypeOf('string')
    expect(autoIdWithTimestamps.updated_at).toBeTypeOf('string')
  })

  test('Schema merging with predefined schemas', () => {
    const UserSchema = z.object({
      name: z.string(),
      email: z.string()
    })

    // Test that we can infer types from merged schemas
    type UserWithId = z.infer<typeof UserSchema> & AutoIdSchema
    type UserWithTimestamps = z.infer<typeof UserSchema> & TimeStampsSchema
    type UserWithBoth = z.infer<typeof UserSchema> & AutoIdSchemaWithTimestamps

    const userWithId: UserWithId = {
      id: 'user-123',
      name: 'John',
      email: 'john@example.com'
    }

    const userWithTimestamps: UserWithTimestamps = {
      name: 'John',
      email: 'john@example.com',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    }

    const userWithBoth: UserWithBoth = {
      id: 'user-123',
      name: 'John',
      email: 'john@example.com',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    }

    expect(userWithId.id).toBeTypeOf('string')
    expect(userWithTimestamps.created_at).toBeTypeOf('string')
    expect(userWithBoth.id).toBeTypeOf('string')
    expect(userWithBoth.created_at).toBeTypeOf('string')
  })
})