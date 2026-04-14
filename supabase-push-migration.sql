-- ══════════════════════════════════════════════════════════════════════════
--  OUTLAWS SYNDICATE — Push Notifications Migration
--  Ejecutar en: Supabase Dashboard > SQL Editor > New Query
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Tabla de suscripciones push ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  user_name   TEXT NOT NULL DEFAULT '',
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

-- ── 2. Tabla de eventos conocidos (para no notificar duplicados) ───────
CREATE TABLE IF NOT EXISTS known_events (
  id          BIGSERIAL PRIMARY KEY,
  event_id    TEXT NOT NULL UNIQUE,
  event_name  TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. RLS ──────────────────────────────────────────────────────────────
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE known_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access push_subscriptions" ON push_subscriptions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access known_events" ON known_events
  FOR ALL USING (true) WITH CHECK (true);
