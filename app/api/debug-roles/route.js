import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Not logged in" }, { status: 401 });

  // Fetch member roles directly
  const guildId = process.env.DISCORD_GUILD_ID;

  const envRoles = {
    DISCORD_GUILD_ID: guildId || "NOT SET",
    DISCORD_ROLE_COMANDANTE: process.env.DISCORD_ROLE_COMANDANTE || "NOT SET",
    DISCORD_ROLE_GENERAL: process.env.DISCORD_ROLE_GENERAL || "NOT SET",
    DISCORD_ROLE_CAPITAN: process.env.DISCORD_ROLE_CAPITAN || "NOT SET",
    DISCORD_ROLE_TENIENTE: process.env.DISCORD_ROLE_TENIENTE || "NOT SET",
    DISCORD_ROLE_SOLDADO: process.env.DISCORD_ROLE_SOLDADO || "NOT SET",
    DISCORD_ROLE_RECLUTA: process.env.DISCORD_ROLE_RECLUTA || "NOT SET",
    DISCORD_ROLE_ALIADO: process.env.DISCORD_ROLE_ALIADO || "NOT SET",
  };

  return Response.json({
    user: {
      id: session.user.id,
      callsign: session.user.callsign,
      rank: session.user.rank,
      inGuild: session.user.inGuild,
    },
    envRoles,
  });
}
