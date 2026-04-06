/**
 * Inventory DB — Supabase PostgreSQL backend
 * Reemplaza el antiguo sistema de archivos JSON
 */
import { supabase } from "./supabase";

/**
 * Obtener todos los items de un usuario
 */
export async function getInventoryByUser(userId) {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error reading inventory:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Obtener todos los items de la org (todos los usuarios)
 */
export async function getAllInventory() {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error reading org inventory:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Buscar item existente del mismo usuario con mismo nombre y tipo (para merge)
 */
export async function findExistingItem(userId, name, type) {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .ilike("name", name)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found (not an error for us)
    console.error("Error finding existing item:", error.message);
  }
  return data || null;
}

/**
 * Crear un nuevo item
 */
export async function createItem(item) {
  const { data, error } = await supabase
    .from("inventory")
    .insert({
      user_id:     item.userId,
      user_name:   item.userName || "",
      type:        item.type || "ship",
      name:        item.name,
      manufacturer: item.manufacturer || "",
      category:    item.category || "",
      image_url:   item.imageUrl || null,
      quantity:    item.quantity || 1,
      quality:     item.quality ?? 0,
      status:      item.status || "available",
      assigned_to: item.assignedTo || "",
      notes:       item.notes || "",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating item:", error.message);
    return null;
  }
  return mapToFrontend(data);
}

/**
 * Actualizar un item existente
 */
export async function updateItem(id, userId, updates) {
  const updateData = {};
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.name !== undefined) updateData.name = updates.name.trim();
  if (updates.manufacturer !== undefined) updateData.manufacturer = updates.manufacturer;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl;
  if (updates.quantity !== undefined) updateData.quantity = Math.max(1, parseInt(updates.quantity) || 1);
  if (updates.quality !== undefined) updateData.quality = Math.min(1000, Math.max(0, parseInt(updates.quality) || 0));
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("inventory")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating item:", error.message);
    return null;
  }
  return mapToFrontend(data);
}

/**
 * Incrementar cantidad de un item existente
 */
export async function incrementItemQuantity(id, addQty, extraUpdates = {}) {
  // Primero obtener el item actual
  const { data: current, error: fetchErr } = await supabase
    .from("inventory")
    .select("quantity")
    .eq("id", id)
    .single();

  if (fetchErr || !current) return null;

  const newQty = (current.quantity ?? 1) + addQty;
  const updateData = {
    quantity: newQty,
    updated_at: new Date().toISOString(),
  };
  if (extraUpdates.notes) updateData.notes = extraUpdates.notes;
  if (extraUpdates.imageUrl) updateData.image_url = extraUpdates.imageUrl;

  const { data, error } = await supabase
    .from("inventory")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error incrementing quantity:", error.message);
    return null;
  }
  return mapToFrontend(data);
}

/**
 * Eliminar un item
 */
export async function deleteItem(id, userId) {
  const { error } = await supabase
    .from("inventory")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting item:", error.message);
    return false;
  }
  return true;
}

/**
 * Mapear columnas snake_case de Supabase a camelCase del frontend
 */
function mapToFrontend(row) {
  if (!row) return null;
  return {
    id:           row.id,
    userId:       row.user_id,
    userName:     row.user_name,
    type:         row.type,
    name:         row.name,
    manufacturer: row.manufacturer,
    category:     row.category,
    imageUrl:     row.image_url,
    quantity:     row.quantity,
    quality:      row.quality,
    status:       row.status,
    assignedTo:   row.assigned_to,
    notes:        row.notes,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

/**
 * Mapear array completo
 */
export function mapAllToFrontend(rows) {
  return (rows || []).map(mapToFrontend);
}
