# Company Task Tracker — Wealth Management Operations

## Overview

Full-stack task tracker for a wealth management startup. Managers create and assign tasks to multiple employees. Each employee tracks their own per-task progress independently. Managers see a team workload panel. Professional light blue + white UI.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + Tailwind CSS
- **Auth**: express-session (email + password, hashed with SHA-256)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Architecture

- `artifacts/api-server/` — Express backend with routes for auth, users, tasks
- `artifacts/task-tracker/` — React frontend, served at `/`
- `lib/db/` — Drizzle ORM schema (users, tasks, task_assignees, task_employee_progress tables)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/` — Generated React Query hooks
- `lib/api-zod/` — Generated Zod schemas for server-side validation

## Features

- Email login with two roles: manager and employee
- Manager: create tasks (title + deadline required), assign to multiple employees, set deadlines, give feedback, update status, edit assignees, view team workload panel
- Employee: view assigned tasks, update own status, set own completion % and expected completion date per task (per-employee progress tracking)
- Dashboard with task summary cards (todo/in progress/done), progress bars per task, team workload panel (managers)
- Filter tasks: all / pending / completed
- Per-employee progress (`task_employee_progress` table) — each employee's progress saved separately, average shown as overall task progress
- Light blue + white professional theme with "Company Task Tracker / Wealth Management Operations" branding

## Demo Accounts

- manager@example.com / password123 (Manager role)
- alice@example.com / password123 (Employee role)
- bob@example.com / password123 (Employee role)

## Key Commands

- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/task-tracker run dev` — run frontend locally

## Session / Auth

Uses express-session with SHA-256 password hashing. Session cookie is httpOnly. The `SESSION_SECRET` environment variable is used as the session secret.
