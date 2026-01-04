# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expense Reimbursement Application - A digital solution for expense submission, review, and reimbursement between employees and managers. Uses LINE OAuth for authentication.

**User Roles:**
- **Employee**: Submits expenses with receipt photos, receives reimbursement notifications
- **Manager**: Reviews/approves expenses, processes reimbursements

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Database | PostgreSQL with Prisma ORM |
| Authentication | NextAuth.js with LINE OAuth |
| Forms | React Hook Form + Zod validation |
| Testing | Vitest, React Testing Library, Playwright (E2E) |
| Mocking | MSW (Mock Service Worker) |

## Build & Test Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Linting
npm run lint

# Run tests (watch mode)
npm run test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

## Development Setup

```bash
# 1. Start PostgreSQL with Docker
docker-compose -f docker-compose.dev.yml up -d

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your LINE OAuth credentials

# 3. Generate Prisma client
npx prisma generate

# 4. Run database migrations
npx prisma db push

# 5. Start development server
npm run dev
```

## Production Deployment

```bash
# Build and start with Docker
docker-compose up -d --build
```

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth.js route
│   │   ├── expenses/             # Expenses API endpoints
│   │   └── uploads/[filename]/   # File upload handling
│   ├── expenses/
│   │   └── new/                  # New expense form page
│   ├── login/                    # Login page
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/
│   ├── ExpenseForm/              # Expense form component
│   │   ├── ExpenseForm.tsx
│   │   └── index.ts
│   └── Providers.tsx             # Context providers wrapper
├── lib/
│   ├── auth.ts                   # NextAuth configuration
│   ├── prisma.ts                 # Prisma client singleton
│   └── validations.ts            # Zod validation schemas
├── types/
│   └── next-auth.d.ts            # NextAuth type extensions
└── middleware.ts                 # Next.js middleware (auth protection)

tests/
├── setup.ts                      # Test setup configuration
├── unit/
│   ├── components/               # Component tests
│   └── lib/                      # Utility/lib tests
├── integration/                  # API integration tests
└── e2e/                          # Playwright E2E tests

prisma/
└── schema.prisma                 # Database schema
```

## Naming Conventions

### Files & Folders
| Type | Convention | Example |
|------|------------|---------|
| React Components | PascalCase | `ExpenseForm.tsx` |
| Hooks | camelCase with `use` prefix | `useExpenses.ts` |
| Utilities | camelCase | `formatCurrency.ts` |
| API Routes | kebab-case | `expense-summary.ts` |
| Test Files | Source name + `.test` | `ExpenseForm.test.tsx` |
| Folders | kebab-case | `expense-management/` |

### Variables & Functions (TypeScript/JavaScript)
| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `expenseList`, `totalAmount` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE`, `API_BASE_URL` |
| Functions | camelCase, verb prefix | `getExpenses()`, `submitForm()` |
| Booleans | `is/has/can/should` prefix | `isSubmitting`, `hasError` |
| Event Handlers | `handle` prefix | `handleSubmit`, `handleFileUpload` |
| Types/Interfaces | PascalCase | `Expense`, `UserProfile` |
| Enums | PascalCase type, SCREAMING_SNAKE values | `ExpenseStatus.PENDING` |

### Database
| Type | Convention | Example |
|------|------------|---------|
| Tables | snake_case, plural | `expenses`, `expense_summaries` |
| Columns | snake_case | `created_at`, `user_id` |
| Foreign Keys | `{table_singular}_id` | `user_id`, `expense_id` |
| Boolean Columns | `is_` prefix | `is_approved`, `is_active` |

### API Endpoints (RESTful)
```
GET    /api/{resource}          # List all
GET    /api/{resource}/:id      # Get one
POST   /api/{resource}          # Create
PUT    /api/{resource}/:id      # Update
DELETE /api/{resource}/:id      # Delete
POST   /api/{resource}/:id/{action}  # Action on resource
```

## Testing Strategy

**Test Pyramid:** 70% Unit, 20% Integration, 10% E2E

**Coverage Requirements:**
- Business Logic/Services: 80% minimum, 90% target
- API Endpoints: 80% minimum
- Utility Functions: 90% minimum
- React Components: 70% minimum
- Overall: 75% minimum

**Test naming:** `describe('[ComponentName]', () => { it('should [behavior] when [condition]', ...) })`

## Security Requirements

**Required ESLint Plugins:**
- `eslint-plugin-security`
- `eslint-plugin-no-secrets`
- `eslint-plugin-xss`
- `@typescript-eslint`

**Key Security Rules:**
- Use httpOnly cookies for tokens (not localStorage)
- Validate LINE OAuth responses server-side
- Sanitize all user inputs
- Avoid `dangerouslySetInnerHTML`
- Run `npm audit` regularly

## Architecture Notes

- Authentication: LINE OAuth with server-side validation via NextAuth.js
- Automated summaries: Scheduled jobs run Tuesday and Friday
- Image uploads: Must complete within 5 seconds, implement compression
- Page loads: Target under 2 seconds
- Scalability: Support up to 10 concurrent users
