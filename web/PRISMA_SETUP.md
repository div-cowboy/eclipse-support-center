# Prisma Setup with Supabase

This project is configured to use Prisma ORM with Supabase PostgreSQL database.

## Setup Instructions

### 1. Environment Variables

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your Supabase credentials:
   - Get your database URL from Supabase project settings under Database > Connection string
   - Replace `[YOUR-PASSWORD]` with your database password
   - Replace `[YOUR-PROJECT-REF]` with your Supabase project reference

### 2. Database Setup

1. Generate Prisma client:

   ```bash
   npm run db:generate
   ```

2. Push the schema to your Supabase database:

   ```bash
   npm run db:push
   ```

3. (Optional) Seed the database with sample data:
   ```bash
   npm run db:seed
   ```

### 3. Available Scripts

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:seed` - Seed database with sample data

### 4. Usage in Your App

Import the Prisma client:

```typescript
import { prisma } from "@/lib/prisma";
```

Or use the utility functions:

```typescript
import { getUsers, getPosts, createPost } from "@/lib/db";
```

### 5. Schema Models

The current schema includes:

- **User**: id, email, name, createdAt, updatedAt
- **Post**: id, title, content, published, authorId, createdAt, updatedAt

You can modify these models in `prisma/schema.prisma` based on your needs.

### 6. Next Steps

1. Set up your Supabase project
2. Update the `.env` file with your database credentials
3. Run the database setup commands
4. Start building your application with Prisma!
