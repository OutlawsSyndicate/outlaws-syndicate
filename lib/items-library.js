/**
 * Items Library — Supabase PostgreSQL backend
 * Búsqueda de items usando la función RPC o queries directas
 */
import { supabase } from "./supabase";

/**
 * Búsqueda de items en la librería (para el buscador del frontend)
 */
export async function searchLibrary({ query = "", type = "", limit = 25, offset = 0 } = {}) {
  // Usar la función RPC de Supabase para búsqueda optimizada
  const { data, error } = await supabase.rpc("search_items_library", {
    search_query: query,
    filter_type: type,
    result_limit: limit,
    result_offset: offset,
  });

  if (error) {
    console.error("Error searching items library:", error.message);
    // Fallback: búsqueda directa con ILIKE
    return fallbackSearch({ query, type, limit, offset });
  }

  const results = (data || []).map(mapLibraryItem);

  // Obtener total
  const { count } = await supabase
    .from("items_library")
    .select("id", { count: "exact", head: true })
    .or(
      query
        ? `name.ilike.%${query}%,manufacturer.ilike.%${query}%,class_name.ilike.%${query}%`
        : "id.gt.0"
    )
    .eq(...(type ? ["type", type] : ["id", "id"])); // workaround for conditional

  return { results, total: count || results.length };
}

/**
 * Fallback search sin RPC (por si la función no existe aún)
 */
async function fallbackSearch({ query, type, limit, offset }) {
  let q = supabase.from("items_library").select("*", { count: "exact" });

  if (type) q = q.eq("type", type);
  if (query) {
    q = q.or(
      `name.ilike.%${query}%,manufacturer.ilike.%${query}%,class_name.ilike.%${query}%,sub_category.ilike.%${query}%`
    );
  }

  q = q.order("name").range(offset, offset + limit - 1);

  const { data, count, error } = await q;
  if (error) {
    console.error("Fallback search error:", error.message);
    return { results: [], total: 0 };
  }

  return {
    results: (data || []).map(mapLibraryItem),
    total: count || 0,
  };
}

/**
 * Buscar por nombre técnico (class_name)
 */
export async function matchTechnicalName(technicalName) {
  if (!technicalName) return null;

  // 1. Match exacto por class_name
  const { data: exact } = await supabase
    .from("items_library")
    .select("*")
    .ilike("class_name", technicalName)
    .limit(1)
    .single();

  if (exact) return mapLibraryItem(exact);

  // 2. Match parcial
  const { data: partial } = await supabase
    .from("items_library")
    .select("*")
    .or(`class_name.ilike.%${technicalName}%,name.ilike.%${technicalName}%`)
    .limit(1);

  if (partial?.length) return mapLibraryItem(partial[0]);

  return null;
}

/**
 * Obtener estadísticas de la librería
 */
export async function getLibraryStats() {
  const { count: totalItems } = await supabase
    .from("items_library")
    .select("id", { count: "exact", head: true })
    .neq("type", "ship")
    .neq("type", "vehicle");

  const { count: totalVehicles } = await supabase
    .from("items_library")
    .select("id", { count: "exact", head: true })
    .in("type", ["ship", "vehicle"]);

  const { data: meta } = await supabase
    .from("import_meta")
    .select("*")
    .order("id", { ascending: false })
    .limit(1)
    .single();

  return {
    totalItems: totalItems || 0,
    totalVehicles: totalVehicles || 0,
    lastImport: meta?.last_import || null,
    version: meta?.version || null,
    imported: (totalItems || 0) + (totalVehicles || 0) > 0,
  };
}

/**
 * Mapear columnas snake_case → camelCase
 */
function mapLibraryItem(row) {
  if (!row) return null;
  return {
    uuid:        row.uuid,
    className:   row.class_name,
    name:        row.name,
    type:        row.type,
    category:    row.category,
    subCategory: row.sub_category,
    manufacturer: row.manufacturer,
    size:        row.size,
    grade:       row.grade,
    crew:        row.crew,
    cargo:       row.cargo,
    msrp:        row.msrp,
    pledgeUrl:   row.pledge_url,
    imageUrl:    row.image_url,
    version:     row.version,
  };
}
