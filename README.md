# DataZod

A collection of packages for working with Zod schemas and data. The primary package is `@datazod/zod-sql` which allows you to convert Zod schemas to SQL table definitions.

## Packages

### @datazod/zod-sql

A powerful library for converting Zod schemas to SQL table definitions and working with databases in a type-safe way.

```bash
npm install @datazod/zod-sql
```

[View Documentation](./packages/zod-sql/README.md)

#### Features

- Convert Zod schemas to SQL table definitions
- Support for multiple SQL dialects (SQLite, PostgreSQL, MySQL)
- Generate type-safe SQL queries
- Define relationships with foreign keys
- Control table structure with flexible options

#### Basic Usage

```typescript
import { z } from 'zod';
import { createTableDDL } from '@datazod/zod-sql';

// Define your schema with Zod
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  isActive: z.boolean().default(true),
  createdAt: z.date()
});

// Generate SQLite table definition
const sql = createTableDDL('users', UserSchema, {
  primaryKey: 'id'
});

console.log(sql);
// CREATE TABLE IF NOT EXISTS "users" (
//   "id" TEXT NOT NULL PRIMARY KEY,
//   "name" TEXT NOT NULL,
//   "email" TEXT NOT NULL,
//   "isActive" BOOLEAN NOT NULL,
//   "createdAt" TEXT NOT NULL
// );
```

## Development

This is a monorepo using Turborepo and Bun.

### Setup

```bash
# Install dependencies
bun install

# Run development server
bun dev

# Build all packages
bun build

# Run tests
bun test
```

### Creating a changeset

When making changes that need to be released:

```bash
bun changeset
```

## License

MIT