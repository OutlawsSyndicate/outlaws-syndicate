import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { matchTechnicalName } from "../../../../lib/items-library";

/**
 * POST /api/items-library/match
 * Body: { technicalName: "entity_armour_heavy_red" }
 *
 * Mapea un nombre técnico del juego al item amigable de la librería
 */
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { technicalName } = body;

  if (!technicalName) {
    return Response.json({ error: "technicalName required" }, { status: 400 });
  }

  const match = await matchTechnicalName(technicalName);

  if (!match) {
    return Response.json({ match: null, found: false });
  }

  return Response.json({ match, found: true });
}
