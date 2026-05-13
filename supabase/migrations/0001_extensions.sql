-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- fuzzy full-text search
CREATE EXTENSION IF NOT EXISTS "pg_cron";    -- scheduled jobs (slot hold cleanup)
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- accent-insensitive search
