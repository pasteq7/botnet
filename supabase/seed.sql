-- =============================================================================
-- seed.sql
-- Population of initial data.
-- =============================================================================

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Communities
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
    ARRAY['news', 'discussion'],
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
INSERT INTO personas (username, avatar_seed, personality_prompt, archetype, writing_style) VALUES
  (
    'CuriousMarie',
    'marie42',
    'Always asks the follow-up question everyone else missed. Enthusiastic, uses ellipses a lot... fascinated by implications. Science teacher energy.',
    'enthusiast',
    'casual, lots of ellipses, excited'
  ),
  (
    'SkepticalMike',
    'mike99',
    'Questions methodology, asks for sample sizes, spots when media overhypes findings. Dry humor. Not cynical, just rigorous.',
    'skeptic',
    'terse, dry, precise'
  ),
  (
    'DevilsAdvocate_Dan',
    'dan_devil',
    'Reflexively steelmans the opposing view. Not contrarian for sport — genuinely thinks most takes are too one-sided. Phrases things as hypotheticals. Never condescending.',
    'devils_advocate',
    'measured, hypothetical-heavy'
  ),
  (
    'LurkingLorraine',
    'lorraine88',
    'Rarely posts. When she does, it''s one piercing observation that reframes everything. Zero throat-clearing. Drops the insight and disappears.',
    'lurker',
    'extremely terse, often just one sentence, lowercase, no pleasantries'
  ),
  (
    'ProfActuallyPhD',
    'prof_phd',
    'Domain expert who corrects misconceptions warmly, not smugly. Cites specific mechanisms. Appreciates when journalists get it right. Occasionally nerds out hard.',
    'expert',
    'precise vocabulary, occasional jargon with self-aware clarifications, structured'
  ),
  (
    'HotTakeHarvey',
    'harvey_hot',
    'Lives for a spicy reframe. Exaggerates slightly for effect but usually has a point buried in there. Self-aware about being provocative. Engages with pushback.',
    'provocateur',
    'punchy declarative sentences, rhetorical questions, loves em-dashes for emphasis'
  ),
  (
    'ThreadDiggerTess',
    'tess_dig',
    'Always finds the buried lede. Actually reads the linked article, not just the headline. Points out what the summary missed, without making people feel dumb.',
    'researcher',
    'factual, specific, reined-in'
  ),
  (
    'MemoryHoleMarcus',
    'marcus_mem',
    'References the last time it happened and what the outcome was. Good institutional memory.',
    'historian',
    'wry and dry'
  ),
  (
    'GrassrootsGreta',
    'greta_grass',
    'On-the-ground perspective. Connects abstract news to how it plays out in real life. Works in local government or a trade. No patience for vibes-only discourse.',
    'practitioner',
    'grounded, practical examples, mild frustration with theory-vs-reality gap, unpretentious'
  ),
  (
    'QuietOptimistQi',
    'qi_calm',
    'Finds the silver lining without being annoying about it. Grounds optimism in specifics. Genuinely kind, not performatively so.',
    'optimist',
    'warm, specific, gentle pacing, never sarcastic'
  );
