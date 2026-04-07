import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import {
  getInventoryByUser,
  findExistingItem,
  incrementItemQuantity,
  createItem,
  mapAllToFrontend,
} from "../../../lib/inventory-db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const items = await getInventoryByUser(session.user.id);
  return Response.json({ items: mapAllToFrontend(items) });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.name?.trim()) return Response.json({ error: "Name required" }, { status: 400 });

  const incomingName = body.name.trim();
  const incomingType = body.type || "ship";
  const incomingQuality = parseInt(body.quality) || 0;
  const addQty = Math.max(1, parseInt(body.quantity) || 1);

  // Buscar item existente del mismo usuario con mismo nombre, tipo Y calidad
  const existing = await findExistingItem(session.user.id, incomingName, incomingType, incomingQuality);

  if (existing) {
    // Unificar: sumar unidades al item existente
    const updated = await incrementItemQuantity(existing.id, addQty, {
      notes: body.notes || null,
      imageUrl: body.imageUrl && !existing.image_url ? body.imageUrl : null,
    });
    if (updated) {
      return Response.json({ item: updated, merged: true }, { status: 200 });
    }
  }

  // Crear nuevo item
  const newItem = await createItem({
    userId:       session.user.id,
    userName:     session.user.callsign || session.user.name,
    type:         incomingType,
    name:         incomingName,
    manufacturer: body.manufacturer || "",
    category:     body.category || "",
    imageUrl:     body.imageUrl || null,
    quantity:     addQty,
    quality:      parseInt(body.quality) || 0,
    status:       body.status || "available",
    assignedTo:   body.assignedTo || session.user.callsign || session.user.name || "",
    notes:        body.notes || "",
  });

  if (!newItem) {
    return Response.json({ error: "Error creating item" }, { status: 500 });
  }

  return Response.json({ item: newItem, merged: false }, { status: 201 });
}
