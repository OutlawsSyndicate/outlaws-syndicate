-- ══════════════════════════════════════════════════════════════════════════
--  OUTLAWS SYNDICATE — Supabase Schema
--  Ejecutar en: Supabase Dashboard > SQL Editor > New Query
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Tabla de inventario ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  user_name   TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'ship',
  name        TEXT NOT NULL,
  manufacturer TEXT DEFAULT '',
  category    TEXT DEFAULT '',
  image_url   TEXT,
  quantity    INT NOT NULL DEFAULT 1,
  quality     INT NOT NULL DEFAULT 0,
  status      TEXT DEFAULT 'available',
  assigned_to TEXT DEFAULT '',
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_name_type ON inventory(user_id, lower(name), type);

-- ── 2. Tabla de librería de items (master DB) ───────────────────────────
CREATE TABLE IF NOT EXISTS items_library (
  id           BIGSERIAL PRIMARY KEY,
  uuid         TEXT UNIQUE,
  class_name   TEXT DEFAULT '',
  name         TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'other',
  category     TEXT DEFAULT '',
  sub_category TEXT DEFAULT '',
  manufacturer TEXT DEFAULT '',
  size         INT,
  grade        TEXT,
  crew         INT,
  cargo        INT,
  msrp         BIGINT,
  pledge_url   TEXT,
  image_url    TEXT,
  version      TEXT,
  source       TEXT DEFAULT 'wiki'  -- 'wiki' o 'fleetyards'
);

-- Índices para búsqueda de items
CREATE INDEX IF NOT EXISTS idx_items_library_type ON items_library(type);
CREATE INDEX IF NOT EXISTS idx_items_library_name ON items_library USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_items_library_search ON items_library USING gin(
  to_tsvector('english', coalesce(name,'') || ' ' || coalesce(manufacturer,'') || ' ' || coalesce(class_name,'') || ' ' || coalesce(sub_category,''))
);

-- ── 3. Metadatos de importación ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_meta (
  id          SERIAL PRIMARY KEY,
  last_import TIMESTAMPTZ NOT NULL DEFAULT now(),
  version     TEXT,
  total_items INT DEFAULT 0,
  total_vehicles INT DEFAULT 0
);

-- ── 4. RLS (Row Level Security) ─────────────────────────────────────────
-- Habilitar RLS en inventory (cada usuario solo ve lo suyo vía API)
-- NOTA: Usamos service_role key en el servidor, así que RLS no bloquea
-- pero lo dejamos preparado por si se accede desde el cliente directo
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_meta ENABLE ROW LEVEL SECURITY;

-- Política: acceso total vía service_role (backend Next.js)
CREATE POLICY "Service role full access inventory" ON inventory
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access items_library" ON items_library
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access import_meta" ON import_meta
  FOR ALL USING (true) WITH CHECK (true);

-- ── 5. Función de búsqueda full-text optimizada ─────────────────────────
CREATE OR REPLACE FUNCTION search_items_library(
  search_query TEXT DEFAULT '',
  filter_type TEXT DEFAULT '',
  result_limit INT DEFAULT 25,
  result_offset INT DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  uuid TEXT,
  class_name TEXT,
  name TEXT,
  type TEXT,
  category TEXT,
  sub_category TEXT,
  manufacturer TEXT,
  size INT,
  grade TEXT,
  crew INT,
  cargo INT,
  msrp BIGINT,
  pledge_url TEXT,
  image_url TEXT,
  version TEXT,
  source TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    il.id, il.uuid, il.class_name, il.name, il.type,
    il.category, il.sub_category, il.manufacturer,
    il.size, il.grade, il.crew, il.cargo, il.msrp,
    il.pledge_url, il.image_url, il.version, il.source,
    CASE
      WHEN search_query = '' THEN 0
      ELSE ts_rank(
        to_tsvector('english', coalesce(il.name,'') || ' ' || coalesce(il.manufacturer,'') || ' ' || coalesce(il.class_name,'') || ' ' || coalesce(il.sub_category,'')),
        plainto_tsquery('english', search_query)
      )
    END AS rank
  FROM items_library il
  WHERE
    (filter_type = '' OR il.type = filter_type)
    AND (
      search_query = ''
      OR il.name ILIKE '%' || search_query || '%'
      OR il.manufacturer ILIKE '%' || search_query || '%'
      OR il.class_name ILIKE '%' || search_query || '%'
      OR il.sub_category ILIKE '%' || search_query || '%'
    )
  ORDER BY
    CASE WHEN search_query = '' THEN il.name ELSE NULL END ASC,
    rank DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql;
