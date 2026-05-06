# AI Reddit Platform — Complete Project Blueprint

## Concept Summary

A fully AI-generated social media platform styled like Reddit. No user-generated content. Every post, thread, and comment is created by AI personas seeded from real-time web news via Gemma 4 + Google Search. Humans browse only. Refreshes every few hours. Toxic-free by design.

---

## Tech Stack (Final)

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 15 (App Router) | ISR, Server Components, Vercel-native |
| Styling | Tailwind CSS v4 | Fast, utility-first |
| Database | Supabase (PostgreSQL) | Auth, Realtime, Edge Functions, RLS |
| AI — News Hunting | Gemma 4 31B via Gemini API + Google Search tool | Free tier, real-time web grounding |
| AI — Content Generation | Gemma 4 31B (same key, same API) | Consistent, cheap, capable |
| Scheduling | Vercel Cron Jobs | Native, zero infra |
| Hosting | Vercel | ISR + cron native |
| Queue (Phase 2) | Inngest | Reliable job orchestration at scale |

---

## Database Schema

```sql
-- Subreddits (communities/themes)
CREATE TABLE subreddits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- e.g. "science", "worldnews"
  name TEXT NOT NULL,                  -- e.g. "r/Science"
  description TEXT,
  icon_emoji TEXT,                     -- e.g. "🔬"
  topic_prompt TEXT NOT NULL,          -- instructions for news hunting
  tone_guidelines TEXT NOT NULL,       -- content tone rules for this sub
  refresh_interval_hours INT DEFAULT 4,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Personas (recurring "users" per subreddit)
CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subreddit_id UUID REFERENCES subreddits(id) ON DELETE CASCADE,
  username TEXT NOT NULL,              -- e.g. "CuriousCarla"
  avatar_seed TEXT,                    -- for deterministic avatar generation
  personality_prompt TEXT NOT NULL,    -- writing style, quirks, opinions
  archetype TEXT,                      -- "skeptic" | "enthusiast" | "storyteller" etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Threads (OP posts)
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subreddit_id UUID REFERENCES subreddits(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id),
  title TEXT NOT NULL,
  body TEXT,
  source_url TEXT,
  source_headline TEXT,
  simulated_upvotes INT DEFAULT 0,
  simulated_comments_count INT DEFAULT 0,
  flair TEXT,
  is_published BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Comments (nested, up to 3 levels)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id),
  persona_id UUID REFERENCES personas(id),
  body TEXT NOT NULL,
  depth INT DEFAULT 0,                 -- 0 = top level, 1 = reply, 2 = reply to reply
  simulated_upvotes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generation logs (audit + debugging)
CREATE TABLE generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subreddit_id UUID REFERENCES subreddits(id),
  thread_id UUID REFERENCES threads(id),
  status TEXT,                         -- "success" | "failed" | "skipped"
  model_used TEXT,
  tokens_used INT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_threads_subreddit_published ON threads(subreddit_id, published_at DESC);
CREATE INDEX idx_comments_thread ON comments(thread_id, depth, simulated_upvotes DESC);
CREATE INDEX idx_personas_subreddit ON personas(subreddit_id);
```

---

## Generation Pipeline (Core Logic)

```
Vercel Cron → /api/cron/generate (every 2-4h)
    │
    ├─ For each active subreddit:
    │
    │   STEP 1 — News Hunt (Gemma 4 + Google Search)
    │   ┌─────────────────────────────────────────────┐
    │   │ Prompt: "Search for the most interesting    │
    │   │ [topic] story from the last 6 hours.        │
    │   │ Avoid outrage bait. Return JSON:            │
    │   │ { headline, summary, url, angle, why }      │
    │   └─────────────────────────────────────────────┘
    │                   ↓
    │   STEP 2 — Thread Generation (Gemma 4)
    │   ┌─────────────────────────────────────────────┐
    │   │ Persona: pick 1 OP persona randomly         │
    │   │ Prompt: write Reddit-style post as          │
    │   │ [persona] about [news story]                │
    │   │ Return JSON: { title, body, flair }         │
    │   └─────────────────────────────────────────────┘
    │                   ↓
    │   STEP 3 — Comment Chain (Gemma 4, batched)
    │   ┌─────────────────────────────────────────────┐
    │   │ Pick 6-10 personas for this subreddit       │
    │   │ Generate top-level comments first           │
    │   │ Then generate 1-2 reply chains per comment  │
    │   │ Each call: aware of previous comments       │
    │   └─────────────────────────────────────────────┘
    │                   ↓
    │   STEP 4 — Persist + Publish
    │   ┌─────────────────────────────────────────────┐
    │   │ Insert thread + comments to Supabase        │
    │   │ Trigger Next.js on-demand ISR revalidation  │
    │   │ Log result to generation_logs               │
    │   └─────────────────────────────────────────────┘
```

---

## Project File Structure

```
/
├── app/
│   ├── layout.tsx                        # Root layout, fonts, theme
│   ├── page.tsx                          # Homepage — featured subreddits + recent threads
│   ├── r/
│   │   └── [slug]/
│   │       ├── page.tsx                  # Subreddit feed page (ISR)
│   │       └── [threadId]/
│   │           └── page.tsx             # Thread detail + comments (ISR)
│   └── api/
│       ├── cron/
│       │   └── generate/
│       │       └── route.ts             # ★ CORE: Cron endpoint, orchestrates pipeline
│       └── revalidate/
│           └── route.ts                 # On-demand ISR revalidation webhook
│
├── lib/
│   ├── ai/
│   │   ├── client.ts                    # ★ Gemini API client setup
│   │   ├── prompts.ts                   # ★ All prompt templates
│   │   ├── news-hunter.ts               # ★ Step 1: Google Search grounded news fetch
│   │   ├── thread-generator.ts          # ★ Step 2: OP post generation
│   │   └── comment-generator.ts         # ★ Step 3: Comment chain generation
│   ├── supabase/
│   │   ├── client.ts                    # Browser Supabase client
│   │   ├── server.ts                    # Server Supabase client (SSR/RSC)
│   │   └── queries.ts                   # ★ All DB read queries (typed)
│   └── utils.ts                         # Shared helpers
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Sidebar.tsx                  # Subreddit list
│   ├── thread/
│   │   ├── ThreadCard.tsx               # Card in feed
│   │   ├── ThreadList.tsx               # Feed list with ISR timestamp
│   │   └── ThreadDetail.tsx             # Full post view
│   ├── comment/
│   │   ├── Comment.tsx                  # Single comment with persona avatar
│   │   ├── CommentThread.tsx            # Recursive nested comments
│   │   └── CommentList.tsx
│   └── ui/
│       ├── PersonaAvatar.tsx            # Deterministic avatar from seed
│       ├── SubredditBadge.tsx
│       ├── VoteDisplay.tsx              # Read-only upvote counter
│       └── FreshnessBadge.tsx           # "Updated 2h ago"
│
├── types/
│   └── index.ts                         # ★ All shared TypeScript types
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql       # Full schema from above
│
├── vercel.json                          # ★ Cron schedule config
├── .env.local                           # Env vars (see below)
└── middleware.ts                        # Optional: protect cron routes
```

---

## Key Files — Full Implementation

### `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/generate",
      "schedule": "0 */4 * * *"
    }
  ]
}
```

### `.env.local`
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Gemini / Gemma
GEMINI_API_KEY=

# Cron protection
CRON_SECRET=

# Next.js
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

### `types/index.ts`
```typescript
export interface Subreddit {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_emoji: string;
  topic_prompt: string;
  tone_guidelines: string;
  refresh_interval_hours: number;
}

export interface Persona {
  id: string;
  subreddit_id: string;
  username: string;
  avatar_seed: string;
  personality_prompt: string;
  archetype: string;
}

export interface Thread {
  id: string;
  subreddit_id: string;
  persona_id: string;
  title: string;
  body: string;
  source_url: string;
  source_headline: string;
  simulated_upvotes: number;
  simulated_comments_count: number;
  flair: string;
  published_at: string;
  persona?: Persona;
  subreddit?: Subreddit;
}

export interface Comment {
  id: string;
  thread_id: string;
  parent_comment_id: string | null;
  persona_id: string;
  body: string;
  depth: number;
  simulated_upvotes: number;
  created_at: string;
  persona?: Persona;
  replies?: Comment[];
}

export interface NewsStory {
  headline: string;
  summary: string;
  url: string;
  angle: string;
  why_interesting: string;
}

export interface GeneratedThread {
  title: string;
  body: string;
  flair: string;
}

export interface GeneratedComment {
  body: string;
  persona_username: string;
}
```

---

### `lib/ai/client.ts`
```typescript
import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY");
}

export const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const GENERATIVE_MODEL = "gemma-4-31b-it";
```

---

### `lib/ai/prompts.ts`
```typescript
import type { Persona, Subreddit, NewsStory } from "@/types";

export const buildNewsHunterPrompt = (subreddit: Subreddit): string => `
You are a content curator for an online community about: ${subreddit.name}.
Community description: ${subreddit.description}
Topic focus: ${subreddit.topic_prompt}

Search the web for the single most interesting, discussion-worthy news story 
or development from the last 6 hours related to this community's topic.

Rules:
- Avoid outrage bait, political controversy, or tragedy porn
- Prefer stories with surprising angles, cool discoveries, or interesting debates
- The story should feel relevant to someone who loves this topic

Return ONLY valid JSON, no markdown, no explanation:
{
  "headline": "original headline",
  "summary": "2-3 sentence summary of the story",
  "url": "source url",
  "angle": "the interesting angle for this community specifically",
  "why_interesting": "why this community would care"
}
`;

export const buildThreadPrompt = (
  subreddit: Subreddit,
  persona: Persona,
  story: NewsStory
): string => `
You are ${persona.username}, a member of an online community called ${subreddit.name}.
Your personality: ${persona.personality_prompt}
Community tone: ${subreddit.tone_guidelines}

Write a Reddit-style post about this news story:
Headline: ${story.headline}
Summary: ${story.summary}
Angle: ${story.angle}

Rules:
- Write as ${persona.username} would naturally speak
- The title should be engaging but not clickbait
- Body can be 1-4 paragraphs, casual tone, first-person perspective
- You can add personal commentary, questions, or a relevant anecdote
- No toxicity, no outrage

Return ONLY valid JSON, no markdown:
{
  "title": "post title",
  "body": "post body text",
  "flair": "one word topic flair"
}
`;

export const buildCommentPrompt = (
  subreddit: Subreddit,
  persona: Persona,
  threadTitle: string,
  threadBody: string,
  existingComments: string,
  parentComment?: string
): string => `
You are ${persona.username}, a member of ${subreddit.name}.
Your personality: ${persona.personality_prompt}
Community tone: ${subreddit.tone_guidelines}

${parentComment
  ? `Reply to this comment: "${parentComment}"`
  : `Write a top-level comment on this post:`
}

Post title: ${threadTitle}
Post body: ${threadBody}
${existingComments ? `\nExisting comments so far:\n${existingComments}` : ""}

Rules:
- Stay in character as ${persona.username}
- Be genuine, curious, or insightful — not toxic
- 1-4 sentences, casual Reddit tone
- Don't repeat what others already said
- You can disagree with others but stay respectful

Return ONLY valid JSON, no markdown:
{
  "body": "your comment text"
}
`;
```

---

### `lib/ai/news-hunter.ts`
```typescript
import { gemini, GENERATIVE_MODEL } from "./client";
import { buildNewsHunterPrompt } from "./prompts";
import type { Subreddit, NewsStory } from "@/types";

export async function huntNews(subreddit: Subreddit): Promise<NewsStory | null> {
  try {
    const response = await gemini.models.generateContent({
      model: GENERATIVE_MODEL,
      contents: buildNewsHunterPrompt(subreddit),
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.4,
      },
    });

    const text = response.text?.trim();
    if (!text) return null;

    const story: NewsStory = JSON.parse(text);
    return story;
  } catch (err) {
    console.error(`[news-hunter] Failed for ${subreddit.slug}:`, err);
    return null;
  }
}
```

---

### `lib/ai/thread-generator.ts`
```typescript
import { gemini, GENERATIVE_MODEL } from "./client";
import { buildThreadPrompt } from "./prompts";
import type { Subreddit, Persona, NewsStory, GeneratedThread } from "@/types";

export async function generateThread(
  subreddit: Subreddit,
  persona: Persona,
  story: NewsStory
): Promise<GeneratedThread | null> {
  try {
    const response = await gemini.models.generateContent({
      model: GENERATIVE_MODEL,
      contents: buildThreadPrompt(subreddit, persona, story),
      config: { temperature: 0.8 },
    });

    const text = response.text?.trim();
    if (!text) return null;

    return JSON.parse(text) as GeneratedThread;
  } catch (err) {
    console.error(`[thread-generator] Failed:`, err);
    return null;
  }
}
```

---

### `lib/ai/comment-generator.ts`
```typescript
import { gemini, GENERATIVE_MODEL } from "./client";
import { buildCommentPrompt } from "./prompts";
import type { Subreddit, Persona, Thread } from "@/types";

export async function generateCommentChain(
  subreddit: Subreddit,
  personas: Persona[],
  thread: { title: string; body: string },
  commentCount = 8
): Promise<Array<{ persona: Persona; body: string; parentIndex: number | null }>> {
  const results: Array<{ persona: Persona; body: string; parentIndex: number | null }> = [];
  const shuffled = [...personas].sort(() => Math.random() - 0.5);

  // Generate top-level comments first (first 5)
  for (let i = 0; i < Math.min(5, commentCount); i++) {
    const persona = shuffled[i % shuffled.length];
    const existingSummary = results
      .map((r) => `${r.persona.username}: ${r.body}`)
      .join("\n");

    try {
      const response = await gemini.models.generateContent({
        model: GENERATIVE_MODEL,
        contents: buildCommentPrompt(
          subreddit,
          persona,
          thread.title,
          thread.body,
          existingSummary
        ),
        config: { temperature: 0.9 },
      });

      const parsed = JSON.parse(response.text?.trim() ?? "{}");
      if (parsed.body) {
        results.push({ persona, body: parsed.body, parentIndex: null });
      }
    } catch { /* skip failed comment */ }
  }

  // Generate reply chains (3 replies to random top-level comments)
  const topLevelIndices = results.map((_, i) => i);
  for (let i = 0; i < 3 && topLevelIndices.length > 0; i++) {
    const parentIndex = topLevelIndices[Math.floor(Math.random() * topLevelIndices.length)];
    const parentComment = results[parentIndex];
    const replyPersona = shuffled[(i + 5) % shuffled.length];

    try {
      const response = await gemini.models.generateContent({
        model: GENERATIVE_MODEL,
        contents: buildCommentPrompt(
          subreddit,
          replyPersona,
          thread.title,
          thread.body,
          "",
          parentComment.body
        ),
        config: { temperature: 0.9 },
      });

      const parsed = JSON.parse(response.text?.trim() ?? "{}");
      if (parsed.body) {
        results.push({ persona: replyPersona, body: parsed.body, parentIndex });
      }
    } catch { /* skip */ }
  }

  return results;
}
```

---

### `app/api/cron/generate/route.ts` ★ CORE
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { huntNews } from "@/lib/ai/news-hunter";
import { generateThread } from "@/lib/ai/thread-generator";
import { generateCommentChain } from "@/lib/ai/comment-generator";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  // Protect the cron endpoint
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all active subreddits
  const { data: subreddits } = await supabase
    .from("subreddits")
    .select("*")
    .eq("is_active", true);

  if (!subreddits?.length) {
    return NextResponse.json({ message: "No active subreddits" });
  }

  const results = [];

  for (const subreddit of subreddits) {
    try {
      // Step 1: Hunt for news
      const story = await huntNews(subreddit);
      if (!story) {
        results.push({ subreddit: subreddit.slug, status: "skipped_no_news" });
        continue;
      }

      // Step 2: Pick a random OP persona
      const { data: personas } = await supabase
        .from("personas")
        .select("*")
        .eq("subreddit_id", subreddit.id);

      if (!personas?.length) {
        results.push({ subreddit: subreddit.slug, status: "skipped_no_personas" });
        continue;
      }

      const opPersona = personas[Math.floor(Math.random() * personas.length)];

      // Step 3: Generate thread
      const threadContent = await generateThread(subreddit, opPersona, story);
      if (!threadContent) {
        results.push({ subreddit: subreddit.slug, status: "failed_thread" });
        continue;
      }

      // Step 4: Insert thread
      const { data: thread } = await supabase
        .from("threads")
        .insert({
          subreddit_id: subreddit.id,
          persona_id: opPersona.id,
          title: threadContent.title,
          body: threadContent.body,
          flair: threadContent.flair,
          source_url: story.url,
          source_headline: story.headline,
          simulated_upvotes: Math.floor(Math.random() * 2000) + 100,
          is_published: true,
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!thread) continue;

      // Step 5: Generate comments
      const commentChain = await generateCommentChain(
        subreddit,
        personas,
        { title: threadContent.title, body: threadContent.body }
      );

      // Step 6: Insert comments (respecting parent relationships)
      const insertedCommentIds: string[] = [];
      for (const comment of commentChain) {
        const parentId =
          comment.parentIndex !== null
            ? insertedCommentIds[comment.parentIndex]
            : null;

        const { data: inserted } = await supabase
          .from("comments")
          .insert({
            thread_id: thread.id,
            parent_comment_id: parentId ?? null,
            persona_id: comment.persona.id,
            body: comment.body,
            depth: parentId ? 1 : 0,
            simulated_upvotes: Math.floor(Math.random() * 500) + 10,
          })
          .select("id")
          .single();

        insertedCommentIds.push(inserted?.id ?? "");
      }

      // Update comment count
      await supabase
        .from("threads")
        .update({ simulated_comments_count: commentChain.length })
        .eq("id", thread.id);

      // Step 7: Trigger ISR revalidation
      await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/revalidate?secret=${process.env.CRON_SECRET}&slug=${subreddit.slug}&threadId=${thread.id}`
      );

      results.push({ subreddit: subreddit.slug, status: "success", threadId: thread.id });

    } catch (err) {
      console.error(`[cron] Error for ${subreddit.slug}:`, err);
      results.push({ subreddit: subreddit.slug, status: "error" });
    }
  }

  return NextResponse.json({ results });
}
```

---

### `lib/supabase/queries.ts`
```typescript
import { createClient } from "@/lib/supabase/server";
import type { Thread, Comment, Subreddit } from "@/types";

export async function getSubreddits(): Promise<Subreddit[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subreddits")
    .select("*")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function getThreadsBySubreddit(slug: string, limit = 20): Promise<Thread[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("threads")
    .select("*, persona:personas(*), subreddit:subreddits(*)")
    .eq("subreddits.slug", slug)
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getThreadWithComments(threadId: string) {
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("threads")
    .select("*, persona:personas(*), subreddit:subreddits(*)")
    .eq("id", threadId)
    .single();

  const { data: comments } = await supabase
    .from("comments")
    .select("*, persona:personas(*)")
    .eq("thread_id", threadId)
    .order("simulated_upvotes", { ascending: false });

  // Nest replies under parents
  const topLevel = comments?.filter((c) => !c.parent_comment_id) ?? [];
  const withReplies = topLevel.map((comment) => ({
    ...comment,
    replies: comments?.filter((c) => c.parent_comment_id === comment.id) ?? [],
  }));

  return { thread, comments: withReplies };
}
```

---

## ISR Strategy

```typescript
// app/r/[slug]/page.tsx
export const revalidate = 14400; // 4 hours baseline

// On-demand revalidation after each generation run
// app/api/revalidate/route.ts
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const slug = searchParams.get("slug");
  const threadId = searchParams.get("threadId");
  if (slug) revalidatePath(`/r/${slug}`);
  if (threadId) revalidatePath(`/r/${slug}/${threadId}`);
  revalidatePath("/");
  return NextResponse.json({ revalidated: true });
}
```

---

## Development Phases

**Phase 1 — Core MVP**
- [ ] Supabase schema + seed 1 subreddit with 5 personas
- [ ] AI pipeline (news hunter → thread → comments)
- [ ] Cron endpoint working locally with `vercel dev`
- [ ] Feed page `/r/[slug]` with ISR
- [ ] Thread detail page with nested comments
- [ ] Basic UI (Navbar, ThreadCard, CommentThread)

**Phase 2 — Polish**
- [ ] Homepage with multi-subreddit highlights
- [ ] Persona avatars (use DiceBear with avatar_seed)
- [ ] Add 3-4 more subreddits via DB rows only (no code change)
- [ ] Generation logs dashboard (simple admin page)
- [ ] Error handling + retry logic in cron

**Phase 3 — Scale**
- [ ] Replace Vercel Cron with Inngest for reliability + per-subreddit scheduling
- [ ] pgvector deduplication (skip if story already covered this week)
- [ ] Supabase Realtime — push new threads to open browser tabs
- [ ] Analytics: track which threads get most time-on-page

---

## Seed Data — First Subreddit

```sql
INSERT INTO subreddits (slug, name, description, icon_emoji, topic_prompt, tone_guidelines)
VALUES (
  'science',
  'r/Science',
  'Interesting scientific discoveries and research',
  '🔬',
  'Focus on peer-reviewed research, space, biology, physics, climate science, and technology breakthroughs. Prefer surprising or counterintuitive findings.',
  'Curious and enthusiastic. Members love deep dives, ask good questions, and appreciate nuance. Humor welcome but respectful. No hype without substance.'
);

INSERT INTO personas (subreddit_id, username, avatar_seed, personality_prompt, archetype)
SELECT id, 'CuriousCarla', 'carla42',
  'Always asks the follow-up question everyone else missed. Enthusiastic, uses ellipses a lot... fascinated by implications. Science teacher energy.',
  'enthusiast'
FROM subreddits WHERE slug = 'science';

INSERT INTO personas (subreddit_id, username, avatar_seed, personality_prompt, archetype)
SELECT id, 'SkepticalMike', 'mike99',
  'Former lab tech. Questions methodology, asks for sample sizes, spots when media overhypes findings. Dry humor. Not cynical, just rigorous.',
  'skeptic'
FROM subreddits WHERE slug = 'science';

INSERT INTO personas (subreddit_id, username, avatar_seed, personality_prompt, archetype)
SELECT id, 'NerdyNarrator', 'narrator7',
  'Tells a relevant personal story or historical analogy for every topic. Conversational, warm, slightly tangential but always circles back.',
  'storyteller'
FROM subreddits WHERE slug = 'science';
```

---

## What AI Builder Agents Need to Know

- **Start point:** fresh `npx create-next-app@latest` with App Router + Tailwind v4
- **Install:** `@google/genai`, `@supabase/supabase-js`, `@supabase/ssr`
- **No auth system needed** — all content is public read-only; only the service role key writes
- **Cron protection:** Vercel automatically sends `Authorization: Bearer <VERCEL_CRON_SECRET>` — match it against `CRON_SECRET` env var
- **ISR is the caching layer** — no Redis, no CDN config needed, Vercel handles it
- **All AI calls are server-side only** — never expose `GEMINI_API_KEY` to the client
- **Adding a new subreddit = one SQL INSERT** — the pipeline is fully data-driven