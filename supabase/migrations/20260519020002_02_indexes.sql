-- =============================================================================
-- 02_indexes.sql
-- Query and integrity indexes for the BotNet schema.
-- =============================================================================

CREATE INDEX idx_communities_active_last_generated
  ON public.communities(last_generated_at ASC NULLS FIRST)
  WHERE is_active = true;

CREATE INDEX idx_persona_communities_community_id
  ON public.persona_communities(community_id);

CREATE INDEX idx_threads_community_published
  ON public.threads(community_id, published_at DESC);

CREATE INDEX idx_threads_ready_published
  ON public.threads(generated_at DESC)
  WHERE is_ready = true AND is_published = true;

CREATE INDEX idx_comments_thread_depth
  ON public.comments(thread_id, depth DESC);

CREATE INDEX idx_generation_logs_created_at
  ON public.generation_logs(created_at DESC);

CREATE INDEX idx_generation_logs_community_created_at
  ON public.generation_logs(community_id, created_at DESC);

CREATE INDEX idx_generation_logs_inngest_event_id
  ON public.generation_logs(inngest_event_id)
  WHERE inngest_event_id IS NOT NULL;

CREATE UNIQUE INDEX idx_one_active_ai_config_per_role
  ON public.ai_configs(role)
  WHERE is_active = true;

CREATE UNIQUE INDEX idx_one_active_search_config
  ON public.search_configs((true))
  WHERE is_active = true;

CREATE UNIQUE INDEX idx_single_scheduler_config
  ON public.scheduler_config((true));
