# BotNet Coding Skill

## Strict Tech Stack Constraints

- Use Next.js 16.2.6 App Router. This repository intentionally uses newer Next conventions; read relevant files in `node_modules/next/dist/docs/` before changing routes, caching, server/client component boundaries, route handlers, or `proxy.ts`.
- Use React 19.2.4 and TypeScript 5 with `strict` mode enabled.
- Use Tailwind CSS 4 via `@tailwindcss/postcss`; do not add Tailwind 3 config patterns unless the project is intentionally migrated.
- Use Supabase through the existing helpers:
  - Browser client: `lib/supabase/client.ts`.
  - Cookie-aware server client: `lib/supabase/server.ts`.
  - Service-role client: `lib/supabase/admin.ts` or local service-role factories in server-only generation code.
- Use Inngest for scheduled/background generation. Do not replace the generation scheduler with ad hoc timers, client polling loops, or long-running route handlers.
- Use the existing AI adapter architecture in `lib/ai/adapters`. Add new LLM providers as adapters behind `getAdapter`.
- Use the existing search provider architecture in `lib/ai/search/providers`. Add new search providers there and wire them through `lib/ai/search`.
- Use `lucide-react` for icons and `framer-motion` for existing animated UI patterns.
- Use npm and the existing `package-lock.json`; do not introduce pnpm/yarn lockfiles.
- Do not introduce a separate backend framework, ORM, database client abstraction, styling system, or state manager unless the architecture docs are updated and the need is explicit.

## Coding Conventions

- Prefer Server Components for route-level data loading. Add `"use client"` only where hooks, browser APIs, Realtime subscriptions, local state, or event handlers are required.
- Use the `@/*` path alias for internal imports.
- Keep route handlers in `app/api/**/route.ts` and export HTTP method functions such as `GET`, `POST`, `PATCH`, and `DELETE`.
- Admin API route handlers must call `supabase.auth.getUser()` and return `NextResponse.json({ error: "Unauthorized" }, { status: 401 })` when unauthenticated.
- Return JSON with `NextResponse.json`. Use clear status codes for invalid input, auth failures, and server errors.
- Follow the existing defensive data-access style: log Supabase errors with `console.error`, return empty arrays for non-critical public-feed read failures, and return structured JSON errors for API failures.
- Use TypeScript interfaces and domain types from `types/index.ts`; extend them when schema changes.
- Use snake_case for database column names and camelCase for local variables, functions, and React props.
- Keep Supabase schema changes in migrations, not scattered runtime setup code.
- Encrypt provider API keys before storage and decrypt only in server-side AI/search configuration code.
- Preserve the generation workflow: resolve config, load community/personas, route content mode, search when needed, generate thread/comments, persist, mark ready, log trace, revalidate paths.
- When adding public feed behavior, account for `is_published` and `is_ready`.
- When adding admin UI, place feature-specific client components under `app/admin/<feature>` or `components/admin/<feature>` according to existing patterns.
- Use CSS variables from `app/globals.css` and Tailwind utility classes for visual styling. Keep theme-aware colors tied to existing tokens such as `background`, `foreground`, `surface`, `border`, `muted`, `accent`, `success`, `error`, `warning`, and `pending`.
- Keep components focused and named exports common, while preserving default exports where the local folder already uses them.
- Avoid broad refactors while making feature changes. Match nearby file style, including error handling, `Promise.all` batching, and `useCallback` usage in client components.

## Verification Commands

- `npm run lint`
- `npm run build`
- `npm run dev`
- `npm run dev:all` when local Vercel and Inngest development services are both needed.

## Context Drift Rule

CRITICAL: If you modify the directory structure, add new dependencies, or change data flows, you MUST update ARCHITECTURE.md and STRUCTURE.md to reflect these changes.
