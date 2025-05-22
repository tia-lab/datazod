import { z } from 'zod';
import { createTableAndIndexes } from './index';

// Test schema
const UserSchema = z.object({
  name: z.string(),
  age: z.number().int(),
  email: z.string().email(),
  isActive: z.boolean()
});

const result = createTableAndIndexes('users', UserSchema, {
  dialect: 'postgres',
  autoId: true
});

console.log('Table DDL:');
console.log(result.createTable);