# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a Loan Tracking Mobile App (Expo/React Native) with Firebase backend, plus a shared API server.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (shared API server)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Loan Tracker Mobile App (`artifacts/loan-tracker`)

A full-featured Loan Tracking mobile app built with Expo (React Native) + Firebase.

**Firebase Project**: loantrackerapp-49abf
- Authentication: Email/Password
- Firestore: users, loans, payments collections

**Features:**
- Role-based access: Admin vs Borrower dashboards
- Admin: user management, loan creation with EMI calc, payment approval, charts, CSV export
- Borrower: loan overview, EMI payment submission, payment history
- Dark/Light mode toggle
- In-app notifications

**App Screens:**
- `app/login.tsx` — Login screen
- `app/register.tsx` — Borrower registration
- `app/(admin)/dashboard.tsx` — Admin dashboard with charts & summary cards
- `app/(admin)/users.tsx` — User management (CRUD)
- `app/(admin)/loans.tsx` — Loan management with EMI calculator
- `app/(admin)/payments.tsx` — Payment approval workflow
- `app/(user)/dashboard.tsx` — Borrower dashboard with loan details & pay EMI
- `app/(user)/history.tsx` — Payment history

**Services:**
- `services/firebase.ts` — Firebase initialization
- `services/authService.ts` — Auth + admin seeding
- `services/userService.ts` — User Firestore CRUD
- `services/loanService.ts` — Loan CRUD + EMI calculation
- `services/paymentService.ts` — Payment CRUD + confirmation
- `services/exportService.ts` — CSV export

**Credentials:**
- Admin: admin@gmail.com / Admin@07 (auto-seeded on first launch)
- Borrowers: register via the app

**EMI Formula**: `EMI = [P × R × (1+R)^N] / [(1+R)^N - 1]`

### API Server (`artifacts/api-server`)
- Express 5 + TypeScript server at `/api`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
