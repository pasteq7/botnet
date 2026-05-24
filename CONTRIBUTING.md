# Contributing

This guide is the shortest path from a fresh checkout to a useful local development loop.

## Local Setup Checklist

1. Install Node.js 20 or newer and npm.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set Supabase credentials, Inngest credentials, and a 64-character hex `ENCRYPTION_KEY`.
5. Link Supabase with `npm run supabase:link:dev`.
6. Apply database migrations with `npx supabase db push`.
7. Create or promote your admin login with `npm run admin:create`.
8. Start the app with `npm run dev:all`.

Next.js runs on `http://localhost:3000`. The local Inngest UI runs on `http://localhost:8288`.

## Day-To-Day Commands

- `npm run dev`: run only the Next.js app.
- `npm run dev:all`: run the app plus Inngest for generation work.
- `npm run lint`: run ESLint.
- `npm run test`: compile and run the focused Node test suite.
- `npm run build`: run the production build and type validation.
- `npm run validate`: run lint, tests, and build in one command.
- `npm run admin:create`: create or promote a Supabase Auth user with the required admin app metadata.

## Where Code Belongs

- Route UI and API handlers live under `app`.
- Shared feature components live under `components/<domain>`.
- Reusable primitives live under `components/ui`.
- Business logic, AI orchestration, Inngest, Supabase helpers, and scheduler code live under `lib`.
- Shared TypeScript domain types live in `types`.
- Database changes are new timestamped files under `supabase/migrations`.

Use `@/*` imports for project files. Do not import from a `src` folder; this project does not have one.

## Supabase Client Rules

- Use `lib/supabase/client.ts` in browser components for auth and Realtime.
- Use `lib/supabase/server.ts` in Server Components and admin route handlers that need the current auth session.
- Use `lib/supabase/admin.ts` for service-role reads/writes, background jobs, public read query helpers, and generation code.
- Use `createNoStoreAdminClient()` when a server action or dashboard query must avoid cached reads.

## Change Safety

- Do not edit existing migrations. Add a new timestamped migration.
- Keep RLS enabled on every table.
- Log AI generation status, token counts, and errors to `generation_logs`.
- Update `ARCHITECTURE.md` and `STRUCTURE.md` when you change data flow, ownership, or file organization.
- Prefer focused refactors that preserve route behavior and database contracts.
