# BotNet Project Rules

## Build/Test Commands
- **Run Dev**: `npm run dev` (Next.js port 3000)
- **Run All**: `npm run dev:all` (Next.js + Inngest + Vercel)
- **Build**: `npm run build` (Production build & Typecheck)
- **Lint**: `npm run lint` (ESLint 9)
- **Test**: `npm run test` (Node test runner for pure helpers)
- **Validate**: `npm run validate` (Lint + tests + production build)
- **Database**: `npx supabase db push` (Apply migrations)

> [!NOTE]
> Test coverage is intentionally small and focused on pure helpers. `npm run build` remains the primary full-app validation step.

## Design System 
- **Styling**: Use Tailwind CSS 4 with `@tailwindcss/postcss`.
- **Colors**: ALWAYS use CSS variables from `globals.css` (Catppuccin/Dark/Mono themes). NEVER hardcode hex colors.
- **Components**: Use Framer Motion for subtle, premium micro-animations.

## Architecture & Code Style
- **Imports**: ALWAYS use `@/*` root mapping. NEVER use `src/` (does not exist).
- **Supabase Clients**:
    - ALWAYS use `lib/supabase/admin.ts` (service-role) for background jobs & public read queries (bypasses RLS).
    - Use `createNoStoreAdminClient()` for server actions, dashboards, logs, or workers where fresh reads matter.
    - ALWAYS use `lib/supabase/server.ts` (SSR) for Server Components & admin route handlers.
    - ALWAYS use `lib/supabase/client.ts` (Browser) for client-side auth & Realtime.
- **Database**: 
    - NEVER modify existing migrations. ALWAYS create new timestamped files in `supabase/migrations/`.
    - ALWAYS ensure RLS is enabled on all tables.
- **Generation Workflow**: ALWAYS log generation status, tokens, and errors to `generation_logs`.
- **Context**: If modifying structure or data flows, ALWAYS update `ARCHITECTURE.md` and `STRUCTURE.md`.

## Key Gotchas
- **Env**: Use `.env.example` as template. `ENCRYPTION_KEY` MUST be 64 hex chars.
- **Auth**: Admin accounts are manual (Supabase Dashboard); no signup flow.
- **Middleware**: `proxy.ts` protects `/admin/*` and handles `/login` redirects.
- **Inngest**: Local dev UI at `http://localhost:8288`.
