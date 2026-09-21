-- Runs once, when the local Postgres volume is created (docker-compose.yml).
-- The e2e suites drop and recreate every table (refreshDatabase), so they get
-- a database of their own and never touch the one `pnpm dev` uses.
CREATE DATABASE prolobby_e2e OWNER prolobby;
