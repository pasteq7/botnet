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
|   |   +-- AdminShell.tsx
|   +-- api/
|   |   +-- admin/
|   |   |   +-- ai-autofill/
|   |   |   +-- communities/
|   |   |   +-- personas/
|   |   |   +-- search-configs/
|   |   |   +-- settings/
|   |   |   +-- trigger/
|   |   +-- inngest/
|   |   +-- interface/
|   |   +-- threads/
|   +-- c/
|   |   +-- [slug]/
|   |       +-- [threadId]/
|   +-- login/
|   +-- error.tsx
|   +-- globals.css
|   +-- layout.tsx
|   +-- not-found.tsx
|   +-- page.tsx
|   +-- robots.ts
|   +-- sitemap.ts
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
|   +-- scheduler/
|   +-- supabase/
+-- public/
+-- scripts/
+-- supabase/
|   +-- migrations/
+-- types/
+-- proxy.ts
+-- next.config.ts
+-- Dockerfile
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
- Public SEO helpers live in `app/robots.ts` and `app/sitemap.ts`. Keep admin and API routes out of crawl targets.
- Public API routes live under `app/api/**`. `app/api/interface/route.ts` exposes public interface settings such as the background image. Auth helper routes live under `app/api/auth/**`; `app/api/auth/login/route.ts` performs password sign-in through the cookie-aware server Supabase client and rejects non-admin accounts. Admin-only API routes live under `app/api/admin/**`, must use `requireAdmin()` from `lib/auth/admin.ts` before privileged work, and should allowlist mutable request fields before writing to Supabase.
- First-run setup lives at `app/setup/page.tsx` and `app/api/setup/admin/route.ts`. Local development does not require a setup key; production requires `SETUP_SECRET`. The route creates or promotes the first Supabase Auth admin with a service-role client, verifies the returned admin claim, and locks once any admin claim exists.
- The Inngest endpoint is `app/api/inngest/route.ts`; Inngest function implementations belong in `lib/inngest/functions.ts`, with pure event/log-id helpers in `lib/inngest/log-id.ts`.
- Shared UI components go in `components/ui`. Feature components go in the matching domain folder: `components/feed`, `components/thread`, `components/comment`, `components/admin`, `components/layout`, or `components/theme`. Reuse `components/ui/GlassSurface.tsx` for glassmorphism cards, panels, and sidebars instead of duplicating translucent surface classes.
- Admin modal subcomponents for communities go in `components/admin/CommunityModal`. Admin settings subcomponents go in `components/admin/settings`.
- Supabase client factories go in `lib/supabase`: browser client in `client.ts`, cookie-aware server client in `server.ts`, service-role client in `admin.ts`, server URL resolution in `urls.ts`, and shared read queries in `queries.ts`.
- Admin authorization helpers go in `lib/auth`: `admin-role.ts` contains the pure app-metadata claim parser, and `admin.ts` contains request helpers for server routes.
- Setup helpers go in `lib/setup`: `admin-bootstrap.ts` contains the first-admin setup status checks and admin metadata utilities shared by setup routes.
- Local onboarding scripts live in `scripts/setup.mjs` and `scripts/doctor.mjs`; they configure a local environment, preserve persistent secrets, print the keyless local setup-page URL, and report actionable prerequisite or environment failures.
- Use `createAdminClient()` for standard service-role access and `createNoStoreAdminClient()` for server actions, activity-log views, dashboards, or Inngest steps that must bypass cached fetch behavior.
- AI orchestration code goes in `lib/ai`. Provider adapters belong in `lib/ai/adapters`; search routing and provider implementations belong in `lib/ai/search` and `lib/ai/search/providers`.
- Shared TypeScript domain types go in `types/index.ts`.
- Database schema changes go in timestamped SQL migrations under `supabase/migrations`. The current pre-production baseline is split by responsibility into ordered files for extensions, tables, indexes, functions/Realtime, and RLS/grants.
- Static assets go in `public`. Remote images must also be allowed in `next.config.ts`.
- Global theme/accent tokens, the fixed background image layer, and Tailwind 4 setup live in `app/globals.css`. Theme, accent, per-user background visibility, and background controller components live in `components/theme`.
- The optional production container definition lives in `Dockerfile`. Keep public Supabase values as build arguments when required by Next.js compilation, and inject server secrets only at runtime. Local development runs Next.js and Inngest on the host while the Supabase CLI manages its Docker services.

## Important Entry Points

- `app/layout.tsx`: root document, fonts, theme/accent initializer, background controller, layout/theme providers.
- `app/error.tsx` and `app/not-found.tsx`: app-level production error and 404 boundaries.
- `app/page.tsx`: all-community public feed.
- `app/c/[slug]/page.tsx`: community-scoped public feed.
- `app/c/[slug]/[threadId]/page.tsx`: direct thread detail page, constrained to published threads in the matching community slug.
- `app/admin/AdminShell.tsx`: client-side admin chrome, settings modal state, admin navigation animation, and global generation overlay.
- `app/admin/page.tsx`: admin dashboard, health checks, production summary, scheduler preview, recent activity feed, and 24-hour token activity telemetry.
- `app/admin/dashboard/TokenUsageChart.tsx`: dashboard graph for tokens, generation runs, average token intensity, and failed runs.
- `components/layout/Sidebar.tsx`: public sidebar community navigation and authenticated-admin generation shortcuts when enabled in interface settings.
- `components/ui/GlassSurface.tsx`: reusable glassmorphism shell backed by the shared glass tokens in `app/globals.css`.
- `components/theme/ThemeToggle.tsx`: sidebar appearance dropdown for theme selection and the per-user background image visibility toggle.
- `components/theme/BackgroundImageController.tsx`: reads public interface settings and applies the configured background image asset.
- `components/feed/FeedWithModal.tsx`: feed state, pagination, modal selection, and Realtime subscription.
- `lib/inngest/functions.ts`: scheduled and per-community generation workflows, including replay-stable fan-out event creation, pre-created queued logs, per-community scheduler attempt timestamps to prevent failed-run queue buildup, secret-free setup metadata with call-time credential loading, provider error propagation, recent community coverage passed into comment prompts for continuity, same-row `queued` to `running` to terminal activity updates, separate Thread and Comments trace steps, Inngest event/run ID metadata, and stale queued failure cleanup.
- `lib/inngest/log-id.ts`: pure helpers for community generation event construction; covered by `tests/inngest-log-id.test.ts`.
- `lib/inngest/step-output.ts`: fail-closed guard that rejects credential-shaped fields before replayable Inngest step output is persisted.
- `lib/scheduler/due-communities.ts`: pure scheduler helpers shared by the Inngest cron and admin dashboard next-tick preview.
- `lib/auth/admin.ts`: shared admin-route guard requiring a Supabase `app_metadata` admin claim.
- `lib/auth/admin-role.ts`: pure admin-claim parser covered by focused Node tests.
- `lib/setup/admin-bootstrap.ts`: first-admin setup helpers for checking whether setup is still open and writing admin app metadata.
- `app/admin/logs/actions.ts`: admin activity log queries plus generation trace details recorded in `generation_logs`.
- `app/admin/threads/actions.ts`: admin thread listing and deletion server actions.
- `lib/ai/client.ts`: active AI/search configuration lookup, decryption, retry, fallback generation.
- `lib/ai/creation-generator.ts`: creates concrete briefs for the `create` content mode so personas publish original community-specific work; recent title and body excerpts drive subject, form, and fiction-genre rotation.
- `lib/ai/generation-config.ts`: generator/searcher role resolution for content generation, including standalone generator configs and the effective search strategy.
- `lib/community-fields.ts`: shared 500-character constraints and normalization helpers for community text fields.
- `lib/inngest/generation-types.ts`: intermediate data contracts shared by the steps in the community generation workflow.
- `lib/ai/source-diversity.ts`: pure URL canonicalization and source-diversity helpers used by search generation to avoid recently covered pages.
- `supabase/migrations/20260519020000_00_extensions.sql`: required Postgres extensions.
- `supabase/migrations/20260519020001_01_tables.sql`: canonical tables, defaults, comments, and check constraints.
- `supabase/migrations/20260519020002_02_indexes.sql`: query indexes plus singleton scheduler and active provider config uniqueness.
- `supabase/migrations/20260519020003_03_functions_realtime.sql`: trigger functions, thread-ready broadcasts, comment counters, and Realtime publication setup.
- `supabase/migrations/20260519020004_04_rls_grants.sql`: RLS policies and role grants.
- `supabase/migrations/20260520000000_add_interface_background_image.sql`: legacy scheduler-config interface columns superseded by `interface_config`.
- `supabase/migrations/20260523000000_split_interface_config_storage.sql`: `interface_config` table plus the public `interface-assets` Storage bucket for uploaded interface images.
- `supabase/migrations/20260523010000_add_generation_attempt_timestamp.sql`: adds `communities.last_generation_attempted_at` for scheduler due checks that should back off after failed or stuck runs.
- `supabase/migrations/20260523020000_restrict_public_comment_reads.sql`: narrows public comment reads to comments whose parent thread is published.
- `supabase/migrations/20260524000000_admin_claim_rls.sql`: narrows privileged RLS policies to Supabase users with an admin app-metadata claim.
- `supabase/migrations/20260612000000_document_create_content_mode.sql`: documents the `create` content mode in database column metadata.
- `supabase/migrations/20260612002000_diversify_speculative_fiction_archive.sql`: updates existing fiction archive communities with explicit genre and form rotation rules.

## Data Ownership Rules

- `communities`, `personas`, `persona_communities`, `threads`, `comments`, `generation_logs`, `ai_configs`, `search_configs`, `scheduler_config`, and `interface_config` are owned by Supabase migrations. Global comment-count defaults live in `scheduler_config`; the sidebar generation button preference and global background image Storage path live in `interface_config`; optional per-community overrides and scheduler attempt timestamps live in `communities`. Uploaded interface image files live in the Supabase Storage bucket `interface-assets`. Per-user background image visibility is stored in browser `localStorage`.
- UI should use existing API routes or query helpers instead of duplicating Supabase access patterns.
- Server Components can read via `lib/supabase/queries.ts` when they need public feed data.
- Admin route handlers should use the cookie-aware server Supabase client from `lib/supabase/server.ts`.
- Background jobs and generation code should use service-role Supabase clients because they must bypass end-user session constraints.
