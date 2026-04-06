import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

/**
 * GET /api/discord-events
 *
 * Obtiene los Scheduled Events reales del servidor de Discord
 * usando el Bot Token de la aplicación.
 *
 * Requiere:
 *   - DISCORD_BOT_TOKEN en .env.local
 *   - DISCORD_GUILD_ID en .env.local
 *   - El bot debe estar añadido al servidor con el scope "bot"
 *     y el permiso "Manage Events" (o al menos "View Events")
 */

/* ── Caché en memoria (evita spam a Discord) ── */
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId  = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    return Response.json({
      events: [],
      error: "DISCORD_BOT_TOKEN o DISCORD_GUILD_ID no configurados en .env.local",
      configured: false,
    });
  }

  // Retornar caché si es reciente
  const now = Date.now();
  if (_cache && now - _cacheTime < CACHE_TTL) {
    return Response.json({ events: _cache, configured: true });
  }

  try {
    // Discord API: GET /guilds/{guild.id}/scheduled-events
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/scheduled-events?with_user_count=true`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Discord Events API error: ${res.status} — ${errText}`);
      return Response.json({
        events: [],
        error: `Discord API ${res.status}`,
        configured: true,
      });
    }

    const rawEvents = await res.json();

    // Mapear a formato simplificado
    const events = rawEvents.map((ev) => ({
      id:          ev.id,
      name:        ev.name,
      description: ev.description || "",
      startTime:   ev.scheduled_start_time,
      endTime:     ev.scheduled_end_time,
      status:      ev.status, // 1=SCHEDULED, 2=ACTIVE, 3=COMPLETED, 4=CANCELED
      entityType:  ev.entity_type, // 1=STAGE, 2=VOICE, 3=EXTERNAL
      location:    ev.entity_metadata?.location || "",
      channelId:   ev.channel_id,
      userCount:   ev.user_count ?? 0,
      creatorId:   ev.creator_id,
      image:       ev.image
        ? `https://cdn.discordapp.com/guild-events/${ev.id}/${ev.image}.png`
        : null,
    }));

    // Filtrar solo activos y programados (no completados/cancelados)
    const activeEvents = events.filter((e) => e.status === 1 || e.status === 2);

    // Ordenar por fecha de inicio
    activeEvents.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    _cache = activeEvents;
    _cacheTime = now;

    return Response.json({ events: activeEvents, configured: true });
  } catch (err) {
    console.error("Error fetching Discord events:", err);
    return Response.json({
      events: [],
      error: err.message,
      configured: true,
    });
  }
}
