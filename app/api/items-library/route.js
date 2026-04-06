import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { searchLibrary, getLibraryStats } from "../../../lib/items-library";

/**
 * GET /api/items-library?q=hornet&type=ship&limit=25&offset=0
 * Busca items en la base de datos maestra (Supabase)
 */
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query  = searchParams.get("q")      || "";
  const type   = searchParams.get("type")   || "";
  const limit  = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const stats = await getLibraryStats();

  if (!stats.imported) {
    return Response.json({
      results: [],
      total:   0,
      imported: false,
      message: "La librería de items no ha sido importada. Ejecuta: npm run import-items",
    });
  }

  const { results, total } = await searchLibrary({ query, type, limit, offset });

  return Response.json({
    results,
    total,
    imported: true,
    version:    stats.version,
    lastImport: stats.lastImport,
    stats: {
      totalItems:    stats.totalItems,
      totalVehicles: stats.totalVehicles,
    },
  });
}
