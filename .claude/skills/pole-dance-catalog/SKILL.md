````markdown
# pole-dance-catalog Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill documents the core development patterns and workflows used in the `pole-dance-catalog` repository, a TypeScript project built with Next.js. It covers coding conventions, commit practices, testing strategies, and step-by-step guides for common workflows such as feature implementation, route handling, and form creation. Use this skill to contribute code that aligns with the established practices of the codebase.

## Coding Conventions

### File Naming

- Use **camelCase** for file and directory names.
  - Example: `loginForm.tsx`, `validationSchema.ts`

### Import Style

- Use **alias-based imports** for internal modules.
  - Example:
    ```typescript
    import { validateEmail } from '@/features/auth/lib/validation'
    ```

### Export Style

- **Mixed**: Both named and default exports are used.
  - Named export:
    ```typescript
    export function validateEmail(email: string): boolean { ... }
    ```
  - Default export:
    ```typescript
    export default LoginForm
    ```

### Commit Messages

- Follow **conventional commit** style.
- Prefixes: `feat`, `fix`, `chore`, `docs`
- Example:
````

feat(auth): add email validation logic
fix(login): correct error handling in LoginForm

````

## Workflows

### Feature Implementation with Tests
**Trigger:** When adding a new feature, utility, or form and ensuring it is tested
**Command:** `/new-feature-with-test`

1. **Create or update the implementation file.**
 - Example: `src/features/auth/lib/validation.ts`
2. **Create or update the corresponding test file.**
 - Example: `src/features/auth/lib/validation.test.ts`
3. **Commit with a conventional message.**
 - Example:
   ```
   feat(auth): implement password reset utility
   ```
4. **Run tests to verify correctness.**
 - Example:
   ```
   npx vitest run
   ```

#### Example
```typescript
// src/features/auth/lib/tokens.ts
export function generateToken() { ... }

// src/features/auth/lib/tokens.test.ts
import { generateToken } from './tokens';
test('generates a valid token', () => { ... });
````

---

### Route or Page Handler Addition and Fix

**Trigger:** When introducing a new route or page and then quickly iterating to fix or improve it  
**Command:** `/add-route-then-fix`

1. **Create or update a route or page handler file.**
   - Example: `src/app/api/auth/verify/route.ts`
2. **Commit the addition.**
   - Example:
     ```
     feat(api): add email verification route
     ```
3. **Shortly after, make a fix or enhancement to the same file.**
   - Example: `src/app/api/auth/verify/route.ts`
4. **Commit the fix.**
   - Example:
     ```
     fix(api): correct response status in verify route
     ```

#### Example

```typescript
// Initial implementation
export async function POST(req: Request) { ... }

// Later fix
export async function POST(req: Request) {
  // Improved error handling
}
```

---

### Form Component Creation with Validation

**Trigger:** When adding a new form (e.g., login, signup) with validation and tests  
**Command:** `/new-form-component`

1. **Create the form component using React Hook Form and Zod.**
   - Example: `src/features/auth/components/LoginForm.tsx`
2. **Create the corresponding test file.**
   - Example: `src/features/auth/components/LoginForm.test.tsx`
3. **Update or create the validation schema file.**
   - Example: `src/features/auth/lib/validation.ts`
4. **Wire the form component into the relevant page.**
   - Example: `src/app/(auth)/login/page.tsx`
5. **Commit with a conventional message.**
   - Example:
     ```
     feat(auth): add LoginForm with validation and tests
     ```

#### Example

```typescript
// src/features/auth/lib/validation.ts
import { z } from 'zod'
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// src/features/auth/components/LoginForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '@/features/auth/lib/validation'
// ...
```

## Testing Patterns

- **Testing Framework:** [Vitest](https://vitest.dev/)
- **Test File Pattern:** `*.test.ts` or `*.test.tsx`
- **Test Placement:** Test files are located alongside their implementation files.
- **Test Example:**
  ```typescript
  // src/features/auth/lib/email.test.ts
  import { isValidEmail } from './email'
  test('validates email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
  })
  ```
- **Running Tests:**
  ```
  npx vitest run
  ```

## Commands

| Command                | Purpose                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| /new-feature-with-test | Scaffold a new feature or utility with its corresponding test file |
| /add-route-then-fix    | Add or update a route/page handler, then follow up with a fix      |
| /new-form-component    | Create a new form component with validation and tests              |

```

```
