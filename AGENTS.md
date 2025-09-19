# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js App Router (routes, layouts, server actions, API routes under `src/app/api`). Example: `src/app/cotizaciones/[id]/page.tsx`.
- `src/components`: Reusable React/TSX components (UI, domain: `finanzas`, `produccion`, etc.).
- `src/lib`: Utilities, `@/*` path alias configured in `tsconfig.json`.
- `src/contexts`, `src/hooks`, `src/services`: Client state, hooks, service helpers.
- `public`: Static assets; `database/` SQL migrations and checks; `scripts/` Node utilities.
- Legacy API routes may exist in `src/pages/api`.

## Build, Test, and Development Commands
- `npm run dev`: Start local dev server at `http://localhost:3000`.
- `npm run build`: Production build (Next.js).
- `npm start`: Run the production server (after build).
- `npm run lint`: Lint project using Next/ESLint rules.
- Data/scripts: `npm run match-productos`, `npm run update-productos-csv`, `npm run update-cotizacion-statuses` (see `scripts/`).
- Ad‑hoc tests: `node test-api-calculations.js` (requires local server running).

## Coding Style & Naming Conventions
- Language: TypeScript, strict mode enabled; React functional components.
- Indentation: 2 spaces; prefer explicit types on exported APIs.
- Filenames: kebab-case for files (`layout-wrapper.tsx`); Components in PascalCase inside.
- Routes: kebab-case directory names in `src/app` (e.g., `nueva-cotizacion/`).
- Imports: use `@/*` alias (e.g., `import { cn } from '@/lib/utils'`).
- Linting: Next.js core web vitals via `eslint.config.mjs`; fix issues before committing.

## Testing Guidelines
- No Jest configured; use provided Node scripts (e.g., `node test-api-calculations.js`).
- Keep scripts self-contained and idempotent (clean up created records when possible).
- Place new test scripts at repo root or under `scripts/testing/` with `test-*.js` naming.

## Commit & Pull Request Guidelines
- Commits: short, imperative subject; include scope when helpful (e.g., `finanzas:`). Avoid bundling unrelated changes.
- PRs: clear description, linked issues, steps to test, and screenshots/GIFs for UI.
- Ensure `npm run lint` passes; include notes on env or migration changes.

## Security & Configuration Tips
- Copy `.env.example` to `.env.local`; never commit secrets. Keys for Supabase, Auth0, S3, and database are required for full functionality.
- Review `SUPABASE_AUTH_GUIDE.md` before auth-related changes.
- Do not modify `node_modules/` or `.next/`. Prefer server actions/API routes for data mutations.

