-- =============================================================================
-- 00_extensions.sql
-- Baseline database extensions for a fresh BotNet database.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
