# Project Structure Design — Pole Dance Move Catalog

**Date:** 2026-04-19  
**Status:** Approved

---

## Overview

Next.js 14+ App Router приложение для каталога pole dance движений. Монорепо не нужен — один Next.js проект закрывает и фронтенд, и API через Route Handlers / Server Actions.

**Расположение:** `~/PROGRAMMING_LEARN/pole-dance-catalog/`

---

## Tech Stack

| Слой           | Технология                                          |
| -------------- | --------------------------------------------------- |
| Frontend + API | Next.js 14+ (App Router) + TypeScript               |
| Стилизация     | Tailwind CSS                                        |
| БД             | PostgreSQL (Neon, free tier)                        |
| ORM            | Prisma                                              |
| Auth           | NextAuth v5 (Google + Facebook OAuth + Credentials) |
| Видео          | YouTube IFrame API                                  |
| Хранилище фото | Cloudinary (free tier)                              |
| Деплой         | Vercel (free tier)                                  |
| Тесты          | Vitest + React Testing Library                      |

---

## Folder Structure

```
pole-dance-catalog/
├── src/
│   ├── app/                        # Next.js App Router — только routing
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (main)/
│   │   │   ├── catalog/page.tsx
│   │   │   ├── moves/[id]/page.tsx
│   │   │   └── profile/page.tsx
│   │   ├── admin/
│   │   │   └── page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── moves/route.ts
│   │   │   └── users/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx                # лендинг
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── actions.ts
│   │   │   └── types.ts
│   │   ├── catalog/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── actions.ts
│   │   │   └── types.ts
│   │   ├── moves/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── actions.ts
│   │   │   └── types.ts
│   │   ├── admin/
│   │   │   ├── components/
│   │   │   ├── actions.ts
│   │   │   └── types.ts
│   │   └── profile/
│   │       ├── components/
│   │       ├── actions.ts
│   │       └── types.ts
│   │
│   └── shared/
│       ├── components/ui/          # переиспользуемые UI компоненты
│       ├── lib/
│       │   ├── prisma.ts           # Prisma client singleton
│       │   ├── auth.ts             # NextAuth config
│       │   └── cloudinary.ts
│       └── types/
│           └── index.ts
│
├── prisma/
│   └── schema.prisma
├── public/
├── tests/
├── .env.local
├── next.config.ts
├── tailwind.config.ts
└── vitest.config.ts
```

---

## Prisma Schema

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  image         String?
  password      String?   // null для OAuth пользователей (bcrypt hash)
  role          Role      @default(USER)
  createdAt     DateTime  @default(now())

  progress  UserProgress[]
  accounts  Account[]
  sessions  Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String  // "google" | "facebook"
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
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
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
  imageUrl    String?    // Cloudinary
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  progress    UserProgress[]
  tags        Tag[]
}

model UserProgress {
  id     String      @id @default(cuid())
  userId String
  moveId String
  status LearnStatus @default(WANT_TO_LEARN)

  user   User @relation(fields: [userId], references: [id])
  move   Move @relation(fields: [moveId], references: [id])

  @@unique([userId, moveId])
}

model Tag {
  id    String @id @default(cuid())
  name  String @unique
  moves Move[]
}

enum Role       { USER ADMIN }
enum Difficulty { BEGINNER INTERMEDIATE ADVANCED }
enum Category   { SPINS CLIMBS HOLDS COMBOS FLOORWORK }
enum LearnStatus { WANT_TO_LEARN IN_PROGRESS LEARNED }
```

---

## Conventions

### Именование файлов

- Компоненты — `PascalCase.tsx` (`MoveCard.tsx`)
- Всё остальное — `kebab-case.ts` (`use-moves.ts`, `actions.ts`)
- Тесты рядом с файлом — `MoveCard.test.tsx`

### Экспорты фич

Каждая фича экспортирует публичный API через `index.ts`:

```ts
// features/catalog/index.ts
export { CatalogPage } from './components/CatalogPage'
export { useMovesFilter } from './hooks/use-moves-filter'
export type { MoveFilters } from './types'
```

Импорты снаружи — только через `index.ts`, не напрямую внутрь фичи.

### Server Actions vs Route Handlers

- Мутации (create/update/delete) → Server Actions в `actions.ts`
- Публичные API / webhooks → Route Handlers в `app/api/`

---

## Environment Variables

```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## Testing

- **Vitest** + **React Testing Library** для unit/integration тестов
- Тесты располагаются рядом с компонентом: `Component.test.tsx`
- E2e (Playwright) — добавить позже при необходимости
