#!/usr/bin/env node
/**
 * Script de importación — Star Citizen Items Library → Supabase
 *
 * Fuente: Star Citizen Wiki API (api.star-citizen.wiki)
 *   - /api/items   → armas, armaduras, componentes, etc.
 *   - /api/vehicles → naves y vehículos
 *
 * Destino: Supabase PostgreSQL (tabla items_library)
 *
 * Uso: node scripts/import-items.mjs [--items-only] [--vehicles-only]
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Cargar .env.local
config({ path: path.join(ROOT, ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos en .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const API_BASE   = "https://api.star-citizen.wiki/api";
const PAGE_LIMIT = 50;
const DELAY_MS   = 300;
const BATCH_SIZE = 500; // Rows per upsert batch

/* ── Helpers ──────────────────────────────────────────── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "Accept-Language": "en_EN" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/* ── Clasificación interna ────────────────────────────── */
const CLASS_MAP = {
  "FPS.Weapon.Small":   { type: "weapon",    sub: "Pistol" },
  "FPS.Weapon.Medium":  { type: "weapon",    sub: "Rifle" },
  "FPS.Weapon.Heavy":   { type: "weapon",    sub: "Heavy" },
  "FPS.Weapon.Gun":     { type: "weapon",    sub: "Gun" },
  "FPS.Armor.Helmet":   { type: "armor",     sub: "Helmet" },
  "FPS.Armor.Core":     { type: "armor",     sub: "Core" },
  "FPS.Armor.Arms":     { type: "armor",     sub: "Arms" },
  "FPS.Armor.Legs":     { type: "armor",     sub: "Legs" },
  "FPS.Armor.Backpack": { type: "armor",     sub: "Backpack" },
  "FPS.Armor.Undersuit":{ type: "armor",     sub: "Undersuit" },
  "Ship.Cooler":        { type: "component", sub: "Cooler" },
  "Ship.PowerPlant":    { type: "component", sub: "Power Plant" },
  "Ship.QuantumDrive":  { type: "component", sub: "Quantum Drive" },
  "Ship.Shield":        { type: "component", sub: "Shield" },
  "Ship.Weapon.Gun":    { type: "component", sub: "Ship Weapon" },
  "Ship.Weapon.Missile":{ type: "component", sub: "Missile" },
  "Ship.MissileRack":   { type: "component", sub: "Missile Rack" },
  "Ship.FuelIntake":    { type: "component", sub: "Fuel Intake" },
  "Ship.FuelTank":      { type: "component", sub: "Fuel Tank" },
  "Ship.Turret":        { type: "component", sub: "Turret" },
  "Ship.Radar":         { type: "component", sub: "Radar" },
  "Ship.Thruster":      { type: "component", sub: "Thruster" },
  "Ship.Mining":        { type: "component", sub: "Mining Laser" },
  "Ship.Paints":        { type: "other",     sub: "Paint" },
};

function classify(classification) {
  if (!classification) return { type: "other", sub: "Misc" };
  if (CLASS_MAP[classification]) return CLASS_MAP[classification];
  for (const [k, v] of Object.entries(CLASS_MAP)) {
    if (classification.startsWith(k)) return v;
  }
  if (classification.startsWith("FPS.Weapon"))   return { type: "weapon",    sub: "Other" };
  if (classification.startsWith("FPS.Armor"))    return { type: "armor",     sub: "Other" };
  if (classification.startsWith("FPS.Clothing")) return { type: "armor",     sub: "Clothing" };
  if (classification.startsWith("Ship."))        return { type: "component", sub: "Other" };
  return { type: "other", sub: "Misc" };
}

/* ── Insertar en Supabase por lotes ───────────────────── */
async function upsertBatch(rows) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("items_library")
      .upsert(batch, { onConflict: "uuid", ignoreDuplicates: false });

    if (error) {
      console.error(`  Batch error (${i}-${i + batch.length}):`, error.message);
      // Retry individual rows
      for (const row of batch) {
        const { error: singleErr } = await supabase
          .from("items_library")
          .upsert(row, { onConflict: "uuid", ignoreDuplicates: true });
        if (!singleErr) inserted++;
      }
    } else {
      inserted += batch.length;
    }
    process.stdout.write(`  Subidos ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}\r`);
  }
  console.log(`  Total insertados: ${inserted}/${rows.length}`);
  return inserted;
}

/* ── Importar ITEMS (armas, armaduras, componentes) ──── */
async function importItems() {
  console.log("\n=== IMPORTANDO ITEMS (armas, armaduras, componentes) ===\n");
  const allRows = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    process.stdout.write(`  Pagina ${page}/${totalPages}...`);
    try {
      const data = await fetchJSON(`${API_BASE}/items?page=${page}&limit=${PAGE_LIMIT}`);

      if (page === 1) {
        totalPages = data.meta?.last_page ?? data.last_page ?? 1;
        console.log(` (${data.meta?.total ?? "?"} items, ${totalPages} paginas)`);
      }

      const items = data.data || [];
      for (const item of items) {
        const name = item.name;
        if (!name || name.startsWith("@") || name === "YOURNAME") continue;

        const { type, sub } = classify(item.classification);

        allRows.push({
          uuid:         item.uuid,
          class_name:   item.class_name || "",
          name:         name,
          type:         type,
          category:     item.classification || "",
          sub_category: sub,
          manufacturer: item.manufacturer?.name || "",
          size:         item.size ?? null,
          grade:        item.grade ?? null,
          image_url:    null,
          version:      item.version || null,
          source:       "wiki",
        });
      }

      console.log(` +${items.length} (total: ${allRows.length})`);
    } catch (err) {
      console.error(` ERROR: ${err.message}`);
    }

    page++;
    if (page <= totalPages) await sleep(DELAY_MS);
  }

  console.log(`\n  Total items validos: ${allRows.length}`);
  console.log("  Subiendo a Supabase...");
  const inserted = await upsertBatch(allRows);
  return inserted;
}

/* ── Importar VEHICLES (naves y vehiculos) ────────────── */
async function importVehicles() {
  console.log("\n=== IMPORTANDO VEHICULOS Y NAVES ===\n");
  const allRows = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    process.stdout.write(`  Pagina ${page}/${totalPages}...`);
    try {
      const data = await fetchJSON(`${API_BASE}/vehicles?page=${page}&limit=${PAGE_LIMIT}`);

      if (page === 1) {
        totalPages = data.meta?.last_page ?? data.last_page ?? 1;
        console.log(` (${data.meta?.total ?? "?"} vehiculos, ${totalPages} paginas)`);
      }

      const vehicles = data.data || [];
      for (const v of vehicles) {
        const name = v.name;
        if (!name) continue;

        const isGround = v.is_vehicle === true ||
                         v.is_gravlev === true ||
                         (v.career || "").toLowerCase().includes("ground") ||
                         (v.foci || []).some((f) => {
                           const label = typeof f === "string" ? f : (f?.en_EN || f?.name || "");
                           return label.toLowerCase().includes("ground");
                         });
        const type = isGround ? "vehicle" : "ship";

        allRows.push({
          uuid:         v.uuid,
          class_name:   v.class_name || "",
          name:         name,
          type:         type,
          category:     `Vehicle.${v.size_class || "unknown"}`,
          sub_category: v.role || v.career || "Multi-role",
          manufacturer: v.manufacturer?.name || "",
          size:         null,
          grade:        null,
          crew:         v.crew ?? null,
          cargo:        v.cargo_capacity ?? null,
          msrp:         v.msrp ?? null,
          pledge_url:   v.pledge_url || null,
          image_url:    null,
          version:      v.version || null,
          source:       "wiki",
        });
      }

      console.log(` +${vehicles.length} (total: ${allRows.length})`);
    } catch (err) {
      console.error(` ERROR: ${err.message}`);
    }

    page++;
    if (page <= totalPages) await sleep(DELAY_MS);
  }

  console.log(`\n  Total vehiculos: ${allRows.length}`);
  console.log("  Subiendo a Supabase...");
  const inserted = await upsertBatch(allRows);
  return inserted;
}

/* ── Enriquecer con imagenes de FleetYards (solo naves) ── */
async function enrichWithImages() {
  console.log("\n=== ENRIQUECIENDO IMAGENES DESDE FLEETYARDS ===\n");

  let page = 1;
  let hasMore = true;
  let totalUpdated = 0;

  while (hasMore) {
    process.stdout.write(`  FleetYards pagina ${page}...`);
    try {
      const raw = await fetchJSON(`https://api.fleetyards.net/v1/models?perPage=100&page=${page}`);
      const models = Array.isArray(raw) ? raw : (raw.items || raw.data || []);
      const totalPages = raw.meta?.pagination?.totalPages || 99;

      if (!models || models.length === 0) {
        hasMore = false;
        console.log(" (fin)");
        break;
      }

      // Actualizar imagenes directamente en Supabase
      for (const model of models) {
        const imgUrl = model.media?.storeImage?.mediumUrl
                    || model.media?.storeImage?.url
                    || model.storeImageMedium
                    || model.storeImage
                    || null;
        if (!imgUrl) continue;

        const searchName = model.name;
        if (!searchName) continue;

        // Buscar por nombre (case insensitive)
        const { data: matches } = await supabase
          .from("items_library")
          .select("id")
          .ilike("name", searchName)
          .is("image_url", null)
          .limit(5);

        if (matches?.length) {
          const ids = matches.map((m) => m.id);
          const { error } = await supabase
            .from("items_library")
            .update({ image_url: imgUrl })
            .in("id", ids);

          if (!error) totalUpdated += matches.length;
        }
      }

      console.log(` +${models.length} modelos (${totalUpdated} imagenes)`);
      if (page >= totalPages) { hasMore = false; break; }
      page++;
      await sleep(200);
    } catch (err) {
      console.log(` error: ${err.message}`);
      hasMore = false;
    }
  }

  console.log(`  Total imagenes actualizadas: ${totalUpdated}`);
}

/* ── Main ─────────────────────────────────────────────── */
async function main() {
  const args = process.argv.slice(2);
  const itemsOnly    = args.includes("--items-only");
  const vehiclesOnly = args.includes("--vehicles-only");

  console.log("========================================================");
  console.log("  SC DATAPAD — Importador de Items Library → Supabase");
  console.log("  Fuente: Star Citizen Wiki API + FleetYards");
  console.log("========================================================");
  console.log(`  Supabase: ${supabaseUrl}`);

  let totalItems = 0;
  let totalVehicles = 0;

  if (!vehiclesOnly) {
    totalItems = await importItems();
  }

  if (!itemsOnly) {
    totalVehicles = await importVehicles();
    await enrichWithImages();
  }

  // Guardar metadatos de importacion
  const version = "4.7.0-LIVE"; // Se podria extraer de la API
  const { error: metaErr } = await supabase
    .from("import_meta")
    .insert({
      last_import:    new Date().toISOString(),
      version:        version,
      total_items:    totalItems,
      total_vehicles: totalVehicles,
    });

  if (metaErr) console.error("Error guardando metadatos:", metaErr.message);

  // Contar totales finales
  const { count: finalItems } = await supabase
    .from("items_library")
    .select("id", { count: "exact", head: true });

  console.log("\n========================================================");
  console.log(`  Total en base de datos: ${finalItems || "?"} entries`);
  console.log(`  Version: ${version}`);
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
