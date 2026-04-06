import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { updateItem, deleteItem } from "../../../../lib/inventory-db";

export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id, 10);
  const body = await request.json();

  const updated = await updateItem(id, session.user.id, {
    type:         body.type,
    name:         body.name,
    manufacturer: body.manufacturer,
    category:     body.category,
    imageUrl:     body.imageUrl,
    quantity:     body.quantity,
    status:       body.status,
    assignedTo:   body.assignedTo,
    notes:        body.notes,
  });

  if (!updated) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ item: updated });
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id, 10);
  const ok = await deleteItem(id, session.user.id);

  if (!ok) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
