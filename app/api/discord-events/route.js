import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

/* ── Caché en memoria (evita spam a Discord) ── */
let _cache = null;
let _cacheTime = 0;
let _rateLimitedUntil = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId  = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    return Response.json({
      events: [],
      error: "DISCORD_BOT_TOKEN o DISCORD_GUILD_ID no configurados",
      configured: false,
    });
  }

  const now = Date.now();

  // Retornar caché si es reciente
  if (_cache && now - _cacheTime < CACHE_TTL) {
    return Response.json({ events: _cache, configured: true });
  }

  // Si estamos rate limited, devolver caché vieja o vacío
  if (now < _rateLimitedUntil) {
    return Response.json({
      events: _cache || [],
      configured: true,
    });
  }

  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/scheduled-events?with_user_count=true`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        cache: "no-store",
      }
    );

    // Rate limited — respetar retry_after
    if (res.status === 429) {
      const rateLimitData = await res.json();
      const retryAfter = (rateLimitData.retry_after || 10) * 1000;
      _rateLimitedUntil = now + retryAfter;
      console.warn(`Discord rate limited, retry after ${retryAfter}ms`);
      return Response.json({
        events: _cache || [],
        configured: true,
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Discord Events API error: ${res.status} — ${errText}`);
      return Response.json({
        events: _cache || [],
        error: `Discord API ${res.status}`,
        configured: true,
      });
    }

    const rawEvents = await res.json();

    const events = rawEvents.map((ev) => ({
      id:          ev.id,
      name:        ev.name,
      description: ev.description || "",
      startTime:   ev.scheduled_start_time,
      endTime:     ev.scheduled_end_time,
      status:      ev.status,
      entityType:  ev.entity_type,
      location:    ev.entity_metadata?.location || "",
      channelId:   ev.channel_id,
      userCount:   ev.user_count ?? 0,
      creatorId:   ev.creator_id,
      image:       ev.image
        ? `https://cdn.discordapp.com/guild-events/${ev.id}/${ev.image}.png`
        : null,
    }));

    // Filtrar solo activos y programados
    const activeEvents = events.filter((e) => e.status === 1 || e.status === 2);
    activeEvents.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    _cache = activeEvents;
    _cacheTime = now;

    return Response.json({ events: activeEvents, configured: true });
  } catch (err) {
    console.error("Error fetching Discord events:", err);
    return Response.json({
      events: _cache || [],
      error: err.message,
      configured: true,
    });
  }
}
