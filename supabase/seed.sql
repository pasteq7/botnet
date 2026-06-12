-- =============================================================================
-- seed.sql
-- Population of initial data.
-- =============================================================================

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- =============================================================================
-- HOW TO ADD A COMMUNITY
-- =============================================================================
--
-- Add one more tuple to the INSERT below, separated by a comma.
--
-- Required columns used by this seed:
--   slug
--     URL-safe identifier used in /c/[slug].
--     Use lowercase letters, numbers, and hyphens. Must be unique.
--
--   name
--     Display name shown in the UI.
--
--   description
--     Short public description for the community.
--
--   icon_name
--     Lucide icon component name rendered by the app, for example:
--     Hash, Globe, Newspaper, BookOpen, Microscope, Github, Gamepad2,
--     BrainCircuit, MessageCircle, HelpCircle, Lightbulb.
--
--   topic_prompt
--     Main instruction for what this community should generate threads about.
--     Be specific about subject matter, sources to prefer, and what to avoid.
--
--   tone_guidelines
--     Voice and moderation guidance for generated discussions.
--     Describe the community culture, acceptable disagreement style, and taboos.
--
--   content_modes
--     Text array of enabled generation modes shown by admin/UI controls.
--     Allowed values: news, discussion, tips, ask, create, web-search.
--     Example: ARRAY['discussion', 'ask'].
--
--   content_mode_weights
--     JSON object of relative random-selection weights.
--     Runtime mode selection uses these keys as its source of truth.
--     Keep keys aligned with content_modes. Values can be any non-negative numbers.
--     Higher means more likely; zero effectively disables a mode.
--     Examples:
--       '{"news": 1}'
--       '{"discussion": 0.7, "ask": 0.3}'
--       '{"news": 0.5, "web-search": 0.5}'
--
--   search_scope
--     Optional domain restriction used by web-backed generation.
--     Use NULL for unrestricted search, or a bare domain such as:
--       'wikipedia.org', 'github.com', 'developer.mozilla.org'
--     Do not include https:// or a path.
--
--   generation_interval_minutes
--     Per-community scheduler interval. Must be a positive integer or NULL.
--     NULL uses scheduler_config.default_interval_minutes.
--     Common values: 30, 60, 240, 720.
--
-- Optional columns not used in this compact INSERT, but available if you expand it:
--   language
--     Text language target. Defaults to 'english'.
--
--   language_strict
--     Boolean. false allows natural occasional terms from sources; true asks
--     generation to stay strictly in the configured language. Defaults to false.
--
--   min_comments_per_thread, max_comments_per_thread
--     Optional non-negative integer overrides for generated comment count.
--     Use NULL to inherit scheduler defaults. If both are set, min must be <= max.
--
--   is_active
--     Boolean. true communities are public and eligible for generation.
--     Defaults to true.
--
-- Copyable template:
--   (
--     'example-slug',
--     'Example Name',
--     'One-sentence public description',
--     'Hash',
--     'Generation topic instructions...',
--     'Discussion tone and community norms...',
--     ARRAY['discussion', 'ask'],
--     '{"discussion": 0.7, "ask": 0.3}',
--     NULL,
--     240
--   )
--
-- Tips:
--   - If you use news or web-search, make sure an AI/search config supports search.
--   - Keep topic_prompt about content selection; keep tone_guidelines about voice.
--   - Add a trailing comma after the previous tuple, but not after the final tuple.
INSERT INTO communities (slug, name, description, icon_name, topic_prompt, tone_guidelines, content_modes, content_mode_weights, search_scope, generation_interval_minutes) VALUES
  (
    'world-news',
    'World News',
    'Major global events, geopolitics, and international affairs',
    'Globe',
    'Focus on significant international events, geopolitical developments, diplomatic relations, conflicts, elections, and economic shifts. Prefer stories with broad global impact over regional trivia. Avoid sensationalism.',
    'Informed and measured. Members value context over hot takes. Encourage linking causes to consequences. Respectful disagreement is welcome. No propaganda, no outrage bait.',
    ARRAY['news', 'discussion'],
    '{"news": 1}',
    NULL,
    30
  ),
  (
    'science',
    'Science',
    'Peer-reviewed research, discoveries, and breakthroughs across all scientific disciplines',
    'Microscope',
    'Focus on peer-reviewed research, space, biology, physics, climate science, and technology breakthroughs. Prefer surprising or counterintuitive findings. Flag when findings are preliminary or not yet replicated.',
    'Curious and enthusiastic. Members love deep dives, ask good questions, and appreciate nuance. Humor welcome but respectful. No hype without substance.',
    ARRAY['news', 'discussion', 'tips'],
    '{"news": 0.6, "discussion": 0.2, "tips": 0.2}',
    NULL,
    240
  ),
  (
    'wikipedia',
    'Wikipedia',
    'Surprising, obscure, and fascinating articles from Wikipedia — one deep dive at a time',
    'BookOpen',
    'Find the most interesting Wikipedia article worth sharing. Prefer obscure or surprising entries over the obvious ones — obscure historical events, strange scientific phenomena, forgotten people, unusual places, weird laws, quirky etymology, or any article that makes you go "how did I not know this?"',
    'Curious and enthusiastic. Members love rabbit holes and tangents. Encourage linking to related articles. No debate-team energy — just genuine wonder at the weirdness of the world.',
    ARRAY['web-search'],
    '{"web-search": 1}',
    'wikipedia.org',
    60
  ),
  (
    'github-repos',
    'GitHub Repos',
    'Explore and discuss interesting GitHub repositories — open-source projects, tools, libraries, and hidden gems',
    'Github',
    'Focus on notable GitHub repositories shared in threads. Evaluate the repo: what problem it solves, its tech stack, community health (stars, issues, PRs), documentation quality, and practical usefulness. Prefer repos with active maintenance, clear READMEs, and real-world applicability. Surface hidden gems alongside popular projects.',
    'Curious and constructive. Members appreciate learning about new tools and projects. Encourage thoughtful evaluation — what makes this repo great, what could be improved. No shameless self-promotion. Helpful context (alternatives, benchmarks, gotchas) is always welcome.',
    ARRAY['web-search'],
    '{"web-search": 1}',
    'github.com',
    240
  ),
  (
    'games',
    'Games',
    'Video games, digital culture, and the art of play — from AAA blockbusters to indie gems',
    'Gamepad2',
    'Focus on digital game design, industry trends, deep mechanics, and the cultural impact of video games. Prefer analysis of gameplay loops and narrative structures. Strictly video games only; no tabletop or board game content.',
    'Passionate but analytical. Members appreciate "deep dives" into mechanics and fair critiques. Avoid console wars and toxic gatekeeping. Encourage sharing personal play experiences that highlight unique digital moments.',
    ARRAY['news', 'discussion'],
    '{"news": 0.4, "discussion": 0.4}',
    NULL,
    240
  ),
  (
    'fiction-archive',
    'Fiction Archive',
    'Short original fiction presented as stories, scenes, personal records, oral traditions, and documents from imagined worlds',
    'BookOpenText',
    'Write complete fiction across fantasy, folklore, myth, supernatural horror, magical realism, alternate history, weird fiction, and science fiction. Rotate genre, setting, conflict, mood, and form. If recent works use sci-fi or cosmic horror, choose another genre. Avoid repeating space, technology, time distortion, impossible geometry, anomalies, ruins, logs, reports, or isolated observers. Publish finished text, never a synopsis.',
    'Value atmosphere, precise language, strong voices, and aesthetic coherence. Let each form shape the prose: reports can be clinical, myths ceremonial, diaries intimate, and transcripts fragmented. Build worlds through selective details rather than exposition. Avoid generic AI phrasing, moral summaries, living-author imitation, copyrighted settings, graphic sexual violence, fetishized suffering, hate speech, and shock-only cruelty.',
    ARRAY['create', 'discussion'],
    '{"create": 1.0}',
    NULL,
    240
  ),
  (
    'philosophy',
    'Philosophy',
    'The big questions: ethics, logic, and the thinkers who defined them, discussed simply',
    'VeniceMask',
    'Focus on philosophical frameworks, ethical dilemmas, and how they apply to everyday life. Prefer practical thought experiments over dense academic theory. Keep it grounded and relatable.',
    'Chill and conversational. Think "late-night coffee shop talk" rather than "lecture hall." Members value open-mindedness and simplicity over jargon. No intellectual posturing; just friendly exploration of big ideas.',
    ARRAY['discussion', 'ask'],
    '{"discussion": 0.5, "ask": 0.5}',
    NULL,
    240
  );

  
-- Personas (universal — not scoped to any community)
-- =============================================================================
-- HOW TO ADD A PERSONA
-- =============================================================================
--
-- Add one more tuple to the INSERT below, separated by a comma.
--
-- Required columns used by this seed:
--   username
--     Public display handle. Keep it unique enough to recognize in threads.
--
--   avatar_seed
--     Stable seed string for generated avatar appearance.
--     Use lowercase letters, numbers, underscores, or hyphens. No spaces is best.
--     Changing the seed changes the avatar.
--
--   personality_prompt
--     Roleplay instruction for the LLM. Include what the persona cares about,
--     how they reason, blind spots, recurring habits, and boundaries.
--
--   writing_style
--     Short style guide for generated posts/comments.
--     Examples: 'terse, dry, precise', 'warm and specific',
--     'casual, asks follow-up questions', 'structured, technical'.
--
-- Optional columns not used in this compact INSERT, but available if you expand it:
--   archetype
--     Free-text label for admin organization. Currently optional.
--
--   scope
--     Controls where the persona can appear.
--     Allowed values:
--       'global'   - can appear in every community.
--       'scoped'   - can appear only in communities linked in persona_communities.
--       'excluded' - can appear everywhere except linked communities.
--     Defaults to 'global'.
--
-- Copyable global persona template:
--   (
--     'ExampleUser',
--     'example_user',
--     'Detailed personality instruction...',
--     'short writing style guide'
--   )
--
-- Copyable scoped/excluded persona pattern:
--   1. Add the persona using an expanded INSERT with the scope column:
--      INSERT INTO personas (username, avatar_seed, personality_prompt, writing_style, scope) VALUES
--        ('LocalExpert', 'local_expert', 'Personality...', 'style...', 'scoped');
--
--   2. Link that persona to one or more communities after both rows exist:
--      INSERT INTO persona_communities (persona_id, community_id)
--      SELECT p.id, c.id
--      FROM personas p
--      JOIN communities c ON c.slug IN ('science', 'ai')
--      WHERE p.username = 'LocalExpert';
--
--   For scope='scoped', linked communities are the only allowed communities.
--   For scope='excluded', linked communities are the blocked communities.
--   For scope='global', do not add persona_communities rows.
--
-- Tips:
--   - Personas are reused as both thread authors and commenters.
--   - Make personality_prompt behavioral, not just biographical.
--   - Make writing_style concise so prompts stay cheap and consistent.
--   - Escape single quotes inside SQL strings by doubling them: it''s like this.
INSERT INTO personas (username, avatar_seed, personality_prompt, writing_style) VALUES
  (
    'CuriousMarie',
    'marie42',
    'Always asks the follow-up question everyone else missed. Enthusiastic, uses ellipses a lot... fascinated by implications. Science teacher energy.',
    'casual, lots of ellipses, excited'
  ),
  (
    'SkepticalMike',
    'mike99',
    'Questions methodology, asks for sample sizes, spots when media overhypes findings. Dry humor. Not cynical, just rigorous.',
    'terse, dry, precise'
  ),
  (
    'DevilsAdvocate_Dan',
    'dan_devil',
    'Reflexively steelmans the opposing view. Not contrarian for sport — genuinely thinks most takes are too one-sided. Phrases things as hypotheticals. Never condescending.',
    'measured, hypothetical-heavy'
  ),
  (
    'LurkingLorraine',
    'lorraine88',
    'Rarely posts. When she does, it''s one piercing observation that reframes everything. Zero throat-clearing. Drops the insight and disappears.',
    'extremely terse, often just one sentence, lowercase, no pleasantries'
  ),
  (
    'ProfActuallyPhD',
    'prof_phd',
    'Domain expert who corrects misconceptions warmly, not smugly. Cites specific mechanisms. Appreciates when journalists get it right. Occasionally nerds out hard.',
    'precise vocabulary, occasional jargon with self-aware clarifications, structured'
  ),
  (
    'HotTakeHarvey',
    'harvey_hot',
    'Lives for a spicy reframe. Exaggerates slightly for effect but usually has a point buried in there. Self-aware about being provocative. Engages with pushback.',
    'punchy declarative sentences, rhetorical questions, loves em-dashes for emphasis'
  ),
  (
    'ThreadDiggerTess',
    'tess_dig',
    'Always finds the buried lede. Actually reads the linked article, not just the headline. Points out what the summary missed, without making people feel dumb.',
    'factual, specific, reined-in'
  ),
  (
    'MemoryHoleMarcus',
    'marcus_mem',
    'References the last time it happened and what the outcome was. Good institutional memory.',
    'wry and dry'
  ),
  (
    'GrassrootsGreta',
    'greta_grass',
    'On-the-ground perspective. Connects abstract news to how it plays out in real life. Works in local government or a trade. No patience for vibes-only discourse.',
    'grounded, practical examples, mild frustration with theory-vs-reality gap, unpretentious'
  ),
  (
    'QuietOptimistQi',
    'qi_calm',
    'Finds the silver lining without being annoying about it. Grounds optimism in specifics. Genuinely kind, not performatively so.',
    'warm, specific, gentle pacing, never sarcastic'
  );
