# Project Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the full project structure for pole-dance-catalog: Next.js init, configs, Prisma schema, auth, shared libs, feature shells, and App Router pages.

**Architecture:** Next.js 14+ App Router as a single deployable unit. Features in `src/features/`, shared infra in `src/shared/`, routing shells in `src/app/`. No separate backend — mutations via Server Actions, public endpoints via Route Handlers.

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, Prisma, NextAuth v5 (beta), bcryptjs, Cloudinary SDK, Vitest + React Testing Library

---

### Task 1: Initialize Next.js project and install dependencies

**Files:**

- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `.gitignore`

- [ ] **Step 1: Run create-next-app**

```bash
cd ~/PROGRAMMING_LEARN/pole-dance-catalog
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-eslint \
  --turbopack
```

When prompted "The directory contains files that could conflict. Continue? (y/n)" — type `y`.

Expected: `src/app/`, `tailwind.config.ts`, `next.config.ts` created.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install next-auth@beta @auth/prisma-adapter @prisma/client bcryptjs cloudinary
npm install -D prisma @types/bcryptjs vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Expected: no errors.

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev
```

Expected: server on `http://localhost:3000`. Ctrl+C to stop.

- [ ] **Step 4: Initialize git and commit**

```bash
git init
git add package.json package-lock.json next.config.ts tailwind.config.ts tsconfig.json .gitignore
git commit -m "chore: initialize Next.js project"
```

---

### Task 2: Configure Vitest

**Files:**

- Create: `vitest.config.ts`
- Create: `src/test-setup.ts`
- Modify: `package.json` (add test scripts)

- [ ] **Step 1: Create vitest.config.ts**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 2: Create test setup file**

```ts
// src/test-setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Add test scripts to package.json**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 4: Run smoke check**

```bash
npm run test:run
```

Expected: exits without crashing (may say "no test files found" — that's fine).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts src/test-setup.ts package.json
git commit -m "chore: configure Vitest + RTL"
```

---

### Task 3: Create environment files

**Files:**

- Create: `.env.example`
- Create: `.env.local`

- [ ] **Step 1: Create .env.example**

```
# .env.example
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

- [ ] **Step 2: Copy to .env.local and fill values**

```bash
cp .env.example .env.local
```

Fill in:

- `DATABASE_URL` — Neon connection string (from neon.tech dashboard)
- `NEXTAUTH_SECRET` — generate with: `openssl rand -base64 32`

- [ ] **Step 3: Verify .env.local is gitignored**

Open `.gitignore` and confirm `.env.local` is listed. If not, add it.

- [ ] **Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add environment variable template"
```

---

### Task 4: Initialize Prisma and write schema

**Files:**

- Create: `prisma/schema.prisma`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

Expected: `prisma/schema.prisma` created. Prisma also creates `.env` — ignore it, we use `.env.local`.

- [ ] **Step 2: Replace prisma/schema.prisma with full schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  image         String?
  password      String?
  role          Role      @default(USER)
  createdAt     DateTime  @default(now())

  progress UserProgress[]
  accounts Account[]
  sessions Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Move {
  id          String     @id @default(cuid())
  title       String
  description String?
  difficulty  Difficulty
  category    Category
  youtubeUrl  String
  imageUrl    String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  progress UserProgress[]
  tags     Tag[]
}

model UserProgress {
  id     String      @id @default(cuid())
  userId String
  moveId String
  status LearnStatus @default(WANT_TO_LEARN)

  user User @relation(fields: [userId], references: [id])
  move Move @relation(fields: [moveId], references: [id])

  @@unique([userId, moveId])
}

model Tag {
  id    String @id @default(cuid())
  name  String @unique
  moves Move[]
}

enum Role        { USER ADMIN }
enum Difficulty  { BEGINNER INTERMEDIATE ADVANCED }
enum Category    { SPINS CLIMBS HOLDS COMBOS FLOORWORK }
enum LearnStatus { WANT_TO_LEARN IN_PROGRESS LEARNED }
```

- [ ] **Step 3: Generate Prisma client**

```bash
npx prisma generate
```

Expected: "Generated Prisma Client" with no errors.

- [ ] **Step 4: Push schema to Neon (requires DATABASE_URL in .env.local)**

```bash
npx prisma db push
```

Expected: "Your database is now in sync with your Prisma schema."

> Skip this step if DATABASE_URL is not set yet — run it when Neon DB is configured.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Prisma schema — User, Move, UserProgress, Tag"
```

---

### Task 5: Create Prisma client singleton

**Files:**

- Create: `src/shared/lib/prisma.ts`
- Create: `src/shared/lib/prisma.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/lib/prisma.test.ts
import { describe, it, expect } from 'vitest'

describe('prisma singleton', () => {
  it('exports a prisma instance', async () => {
    const { prisma } = await import('./prisma')
    expect(prisma).toBeDefined()
  })

  it('returns the same instance on repeated imports', async () => {
    const { prisma: a } = await import('./prisma')
    const { prisma: b } = await import('./prisma')
    expect(a).toBe(b)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test:run -- src/shared/lib/prisma.test.ts
```

Expected: FAIL — "Cannot find module './prisma'"

- [ ] **Step 3: Create the singleton**

```ts
// src/shared/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm run test:run -- src/shared/lib/prisma.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/prisma.ts src/shared/lib/prisma.test.ts
git commit -m "feat: add Prisma client singleton"
```

---

### Task 6: Set up NextAuth v5

**Files:**

- Create: `src/shared/lib/auth.ts`
- Create: `src/shared/lib/auth.test.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/lib/auth.test.ts
import { describe, it, expect } from 'vitest'
import { authConfig } from './auth'

describe('authConfig', () => {
  it('includes google, facebook, and credentials providers', () => {
    const ids = authConfig.providers.map((p: { id: string }) => p.id)
    expect(ids).toContain('google')
    expect(ids).toContain('facebook')
    expect(ids).toContain('credentials')
  })

  it('uses jwt session strategy', () => {
    expect(authConfig.session?.strategy).toBe('jwt')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test:run -- src/shared/lib/auth.test.ts
```

Expected: FAIL — "Cannot find module './auth'"

- [ ] **Step 3: Create auth config**

```ts
// src/shared/lib/auth.ts
import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import Facebook from 'next-auth/providers/facebook'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user?.password) return null

        const valid = await bcrypt.compare(credentials.password as string, user.password)

        return valid ? user : null
      },
    }),
  ],
  session: { strategy: 'jwt' as const },
  callbacks: {
    jwt({ token, user }: { token: Record<string, unknown>; user?: { role?: string } }) {
      if (user) token.role = user.role
      return token
    },
    session({
      session,
      token,
    }: {
      session: Record<string, unknown> & { user?: Record<string, unknown> }
      token: Record<string, unknown>
    }) {
      if (session.user) session.user.role = token.role
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
```

- [ ] **Step 4: Create the route handler**

```ts
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/shared/lib/auth'

export const { GET, POST } = handlers
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
npm run test:run -- src/shared/lib/auth.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/shared/lib/auth.ts src/shared/lib/auth.test.ts src/app/api/auth/
git commit -m "feat: configure NextAuth v5 — Google, Facebook, Credentials"
```

---

### Task 7: Set up Cloudinary utility

**Files:**

- Create: `src/shared/lib/cloudinary.ts`
- Create: `src/shared/lib/cloudinary.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/lib/cloudinary.test.ts
import { describe, it, expect } from 'vitest'
import { getCloudinaryUrl } from './cloudinary'

describe('getCloudinaryUrl', () => {
  it('includes the public ID in the URL', () => {
    const url = getCloudinaryUrl('moves/spin_basic')
    expect(url).toContain('moves/spin_basic')
    expect(url).toContain('cloudinary.com')
  })

  it('applies width transformation when provided', () => {
    const url = getCloudinaryUrl('moves/spin_basic', { width: 400 })
    expect(url).toContain('w_400')
  })

  it('omits width when not provided', () => {
    const url = getCloudinaryUrl('moves/spin_basic')
    expect(url).not.toContain('w_')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test:run -- src/shared/lib/cloudinary.test.ts
```

Expected: FAIL — "Cannot find module './cloudinary'"

- [ ] **Step 3: Create the utility**

```ts
// src/shared/lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export { cloudinary }

export function getCloudinaryUrl(
  publicId: string,
  options: { width?: number; height?: number; quality?: number } = {},
): string {
  const { width, height, quality = 80 } = options
  const transforms = [`q_${quality}`, 'f_auto']
  if (width) transforms.push(`w_${width}`)
  if (height) transforms.push(`h_${height}`)

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? 'demo'
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms.join(',')}/${publicId}`
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm run test:run -- src/shared/lib/cloudinary.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/cloudinary.ts src/shared/lib/cloudinary.test.ts
git commit -m "feat: add Cloudinary utility with URL builder"
```

---

### Task 8: Create shared types

**Files:**

- Create: `src/shared/types/index.ts`

- [ ] **Step 1: Write shared types**

```ts
// src/shared/types/index.ts
import type { Role, Difficulty, Category, LearnStatus } from '@prisma/client'

export type { Role, Difficulty, Category, LearnStatus }

export interface UserSession {
  id: string
  email: string
  name: string | null
  image: string | null
  role: Role
}

export interface MoveFilters {
  category?: Category
  difficulty?: Difficulty
  search?: string
  tags?: string[]
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/types/index.ts
git commit -m "feat: add shared TypeScript types"
```

---

### Task 9: Scaffold feature modules

**Files:**

- Create: `src/features/auth/{index,actions,types}.ts`
- Create: `src/features/catalog/{index,actions,types}.ts`
- Create: `src/features/moves/{index,actions,types}.ts`
- Create: `src/features/admin/{index,actions,types}.ts`
- Create: `src/features/profile/{index,actions,types}.ts`

- [ ] **Step 1: Create auth feature**

```ts
// src/features/auth/types.ts
export interface LoginFormData {
  email: string
  password: string
}

export interface SignupFormData {
  name: string
  email: string
  password: string
}
```

```ts
// src/features/auth/actions.ts
'use server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/shared/lib/prisma'
import type { SignupFormData } from './types'

export async function signupAction(data: SignupFormData) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) throw new Error('Email already in use')

  const hashed = await bcrypt.hash(data.password, 10)
  await prisma.user.create({
    data: { email: data.email, name: data.name, password: hashed },
  })
}
```

```ts
// src/features/auth/index.ts
export { signupAction } from './actions'
export type { LoginFormData, SignupFormData } from './types'
```

- [ ] **Step 2: Create catalog feature**

```ts
// src/features/catalog/types.ts
import type { Move, Tag } from '@prisma/client'
import type { MoveFilters } from '@/shared/types'

export type { MoveFilters }
export type MoveWithTags = Move & { tags: Tag[] }
```

```ts
// src/features/catalog/actions.ts
'use server'
import { prisma } from '@/shared/lib/prisma'
import type { MoveFilters } from '@/shared/types'
import type { MoveWithTags } from './types'

export async function getMovesAction(filters: MoveFilters = {}): Promise<MoveWithTags[]> {
  return prisma.move.findMany({
    where: {
      ...(filters.category && { category: filters.category }),
      ...(filters.difficulty && { difficulty: filters.difficulty }),
      ...(filters.search && {
        title: { contains: filters.search, mode: 'insensitive' },
      }),
    },
    include: { tags: true },
    orderBy: { createdAt: 'desc' },
  })
}
```

```ts
// src/features/catalog/index.ts
export { getMovesAction } from './actions'
export type { MoveWithTags, MoveFilters } from './types'
```

- [ ] **Step 3: Create moves feature**

```ts
// src/features/moves/types.ts
import type { Move, Tag, UserProgress } from '@prisma/client'

export type MoveDetail = Move & { tags: Tag[]; progress: UserProgress[] }
```

```ts
// src/features/moves/actions.ts
'use server'
import { prisma } from '@/shared/lib/prisma'
import type { MoveDetail } from './types'

export async function getMoveByIdAction(id: string): Promise<MoveDetail | null> {
  return prisma.move.findUnique({
    where: { id },
    include: { tags: true, progress: true },
  })
}
```

```ts
// src/features/moves/index.ts
export { getMoveByIdAction } from './actions'
export type { MoveDetail } from './types'
```

- [ ] **Step 4: Create admin feature**

```ts
// src/features/admin/types.ts
import type { Move } from '@prisma/client'

export interface CreateMoveInput {
  title: string
  description?: string
  difficulty: Move['difficulty']
  category: Move['category']
  youtubeUrl: string
  imageUrl?: string
  tags?: string[]
}
```

```ts
// src/features/admin/actions.ts
'use server'
import { prisma } from '@/shared/lib/prisma'
import type { CreateMoveInput } from './types'

export async function createMoveAction(input: CreateMoveInput) {
  return prisma.move.create({
    data: {
      title: input.title,
      description: input.description,
      difficulty: input.difficulty,
      category: input.category,
      youtubeUrl: input.youtubeUrl,
      imageUrl: input.imageUrl,
      tags: {
        connectOrCreate: (input.tags ?? []).map((name) => ({
          where: { name },
          create: { name },
        })),
      },
    },
  })
}

export async function deleteMoveAction(id: string) {
  return prisma.move.delete({ where: { id } })
}
```

```ts
// src/features/admin/index.ts
export { createMoveAction, deleteMoveAction } from './actions'
export type { CreateMoveInput } from './types'
```

- [ ] **Step 5: Create profile feature**

```ts
// src/features/profile/types.ts
import type { UserProgress, Move } from '@prisma/client'

export type ProgressWithMove = UserProgress & { move: Move }
```

```ts
// src/features/profile/actions.ts
'use server'
import { prisma } from '@/shared/lib/prisma'
import type { LearnStatus } from '@/shared/types'
import type { ProgressWithMove } from './types'

export async function getUserProgressAction(userId: string): Promise<ProgressWithMove[]> {
  return prisma.userProgress.findMany({
    where: { userId },
    include: { move: true },
  })
}

export async function updateProgressAction(userId: string, moveId: string, status: LearnStatus) {
  return prisma.userProgress.upsert({
    where: { userId_moveId: { userId, moveId } },
    create: { userId, moveId, status },
    update: { status },
  })
}
```

```ts
// src/features/profile/index.ts
export { getUserProgressAction, updateProgressAction } from './actions'
export type { ProgressWithMove } from './types'
```

- [ ] **Step 6: Commit**

```bash
git add src/features/
git commit -m "feat: scaffold all feature modules with Server Actions"
```

---

### Task 10: Set up App Router page shells

**Files:**

- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/app/(main)/catalog/page.tsx`
- Create: `src/app/(main)/moves/[id]/page.tsx`
- Create: `src/app/(main)/profile/page.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/api/moves/route.ts`

- [ ] **Step 1: Update root layout**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Kinetic Gallery — Pole Artistry Platform',
  description: 'Catalog of pole dance moves',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Update landing page**

```tsx
// src/app/page.tsx
export default function HomePage() {
  return (
    <main>
      <h1>Kinetic Gallery</h1>
    </main>
  )
}
```

- [ ] **Step 3: Create auth pages**

```tsx
// src/app/(auth)/login/page.tsx
export default function LoginPage() {
  return <div>Login</div>
}
```

```tsx
// src/app/(auth)/signup/page.tsx
export default function SignupPage() {
  return <div>Signup</div>
}
```

- [ ] **Step 4: Create main pages**

```tsx
// src/app/(main)/catalog/page.tsx
export default function CatalogPage() {
  return <div>Catalog</div>
}
```

```tsx
// src/app/(main)/moves/[id]/page.tsx
export default function MoveDetailPage({ params }: { params: { id: string } }) {
  return <div>Move: {params.id}</div>
}
```

```tsx
// src/app/(main)/profile/page.tsx
export default function ProfilePage() {
  return <div>Profile</div>
}
```

```tsx
// src/app/admin/page.tsx
export default function AdminPage() {
  return <div>Admin Dashboard</div>
}
```

- [ ] **Step 5: Create moves Route Handler**

```ts
// src/app/api/moves/route.ts
import { NextResponse } from 'next/server'
import { getMovesAction } from '@/features/catalog'

export async function GET() {
  const moves = await getMovesAction()
  return NextResponse.json(moves)
}
```

- [ ] **Step 6: Verify the project builds**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/
git commit -m "feat: add App Router page shells and route handlers"
```
