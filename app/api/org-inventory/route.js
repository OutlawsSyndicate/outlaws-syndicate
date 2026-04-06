import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getAllInventory, mapAllToFrontend } from "../../../lib/inventory-db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const items = await getAllInventory();
  return Response.json({ items: mapAllToFrontend(items) });
}
