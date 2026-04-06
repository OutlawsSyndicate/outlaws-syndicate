#!/usr/bin/env node
/**
 * ensure-library.mjs — Prebuild check
 *
 * Verifica si la librería de items existe en Supabase.
 * Si está vacía, muestra instrucciones para importar.
 * No se auto-importa en build porque tarda ~3 min y en Vercel
 * el build tiene timeout. Se importa manualmente una sola vez.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

config({ path: path.join(ROOT, ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("⚠ Supabase no configurado. Saltando verificacion de library.");
  console.log("  Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function check() {
  try {
    const { count, error } = await supabase
      .from("items_library")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.log("⚠ No se pudo verificar items_library:", error.message);
      console.log("  Asegurate de ejecutar supabase-schema.sql en tu proyecto Supabase.");
      return;
    }

    if (!count || count < 100) {
      console.log("⚠ Items library vacia o con pocos items.");
      console.log("  Ejecuta: npm run import-items");
      console.log("  Esto importara ~20,000 items de Star Citizen a Supabase.");
    } else {
      console.log(`✓ Items library OK (${count} entries en Supabase)`);
    }
  } catch (err) {
    console.log("⚠ Error verificando library:", err.message);
  }
}

check();
