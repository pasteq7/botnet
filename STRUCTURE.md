# Structure

## Directory Tree

```text
.
+-- app/
|   +-- admin/
|   |   +-- communities/
|   |   +-- logs/
|   |   +-- personas/
|   |   +-- settings/
|   |   +-- threads/
|   +-- api/
|   |   +-- admin/
|   |   |   +-- ai-autofill/
|   |   |   +-- communities/
|   |   |   +-- personas/
|   |   |   +-- search-configs/
|   |   |   +-- settings/
|   |   |   +-- trigger/
|   |   +-- inngest/
|   |   +-- revalidate/
|   |   +-- threads/
|   +-- c/
|   |   +-- [slug]/
|   |       +-- [threadId]/
|   +-- login/
|   +-- globals.css
|   +-- layout.tsx
|   +-- page.tsx
+-- components/
|   +-- admin/
|   |   +-- CommunityModal/
|   |   +-- settings/
|   +-- comment/
|   +-- feed/
|   +-- layout/
|   +-- theme/
|   +-- thread/
|   +-- ui/
+-- lib/
|   +-- ai/
|   |   +-- adapters/
|   |   +-- search/
|   |       +-- providers/
|   +-- inngest/
|   +-- supabase/
+-- public/
+-- supabase/
|   +-- migrations/
+-- types/
+-- proxy.ts
+-- next.config.ts
+-- eslint.config.mjs
+-- postcss.config.mjs
+-- tsconfig.json
+-- package.json
```

Generated/build folders such as `.next`, `.vercel`, `node_modules`, and `supabase/.temp` are not source-of-truth code locations.

## Routing and Placement Rules

- App routes live in `app/`. Follow Next.js 16 App Router conventions: `page.tsx` exposes UI routes, `layout.tsx` wraps route segments, and `route.ts` exposes HTTP handlers.
- Do not add a `route.ts` beside a `page.tsx` at the same route segment. Next route handlers are nested under separate route segments, usually `app/api/**/route.ts`.
- Protected admin pages live under `app/admin/**`. `proxy.ts` guards these routes and `/login` with Supabase auth.
- Public community pages live under `app/c/[slug]` and thread detail pages under `app/c/[slug]/[threadId]`.
- Public API routes live under `app/api/**`. Admin-only API routes live under `app/api/admin/**` and must check `supabase.auth.getUser()` before privileged work.
- The Inngest endpoint is `app/api/inngest/route.ts`; Inngest function implementations belong in `lib/inngest/functions.ts`.
- Shared UI components go in `components/ui`. Feature components go in the matching domain folder: `components/feed`, `components/thread`, `components/comment`, `components/admin`, `components/layout`, or `components/theme`.
- Admin modal subcomponents for communities go in `components/admin/CommunityModal`. Admin settings subcomponents go in `components/admin/settings`.
- Supabase client factories go in `lib/supabase`: browser client in `client.ts`, cookie-aware server client in `server.ts`, service-role client in `admin.ts`, and shared read queries in `queries.ts`.
- AI orchestration code goes in `lib/ai`. Provider adapters belong in `lib/ai/adapters`; search routing and provider implementations belong in `lib/ai/search` and `lib/ai/search/providers`.
- Shared TypeScript domain types go in `types/index.ts`.
- Database schema changes go in timestamped SQL migrations under `supabase/migrations`.
- Static assets go in `public`. Remote images must also be allowed in `next.config.ts`.
- Global theme tokens and Tailwind 4 setup live in `app/globals.css`.

## Important Entry Points

- `app/layout.tsx`: root document, fonts, theme initializer, layout/theme providers.
- `app/page.tsx`: all-community public feed.
- `app/c/[slug]/page.tsx`: community-scoped public feed.
- `app/c/[slug]/[threadId]/page.tsx`: direct thread detail page.
- `app/admin/page.tsx`: admin dashboard and health checks.
- `components/feed/FeedWithModal.tsx`: feed state, pagination, modal selection, and Realtime subscription.
- `lib/inngest/functions.ts`: scheduled generation and community generation pipeline.
- `lib/ai/client.ts`: active AI/search configuration lookup, decryption, retry, fallback generation.
- `lib/ai/pipeline-config.ts`: generator/searcher role resolution and effective search strategy.
- `supabase/migrations/20260512183900_core_schema.sql`: canonical schema, RLS, triggers, grants, and Realtime setup.

## Data Ownership Rules

- `communities`, `personas`, `persona_communities`, `threads`, `comments`, `generation_logs`, `ai_configs`, `search_configs`, and `scheduler_config` are owned by Supabase migrations.
- UI should use existing API routes or query helpers instead of duplicating Supabase access patterns.
- Server Components can read via `lib/supabase/queries.ts` when they need public feed data.
- Admin route handlers should use the cookie-aware server Supabase client from `lib/supabase/server.ts`.
- Background jobs and generation code should use service-role Supabase clients because they must bypass end-user session constraints.
