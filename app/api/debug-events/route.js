/**
 * DEBUG endpoint — eliminar después de verificar
 * Prueba la conexión con Discord Events API sin requerir sesión
 */
export async function GET() {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId  = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    return Response.json({
      error: "Missing env vars",
      hasBotToken: !!botToken,
      hasGuildId: !!guildId,
      botTokenPrefix: botToken ? botToken.substring(0, 10) + "..." : "NOT SET",
    });
  }

  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/scheduled-events?with_user_count=true`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const text = await res.text();

    if (!res.ok) {
      return Response.json({
        error: `Discord API ${res.status}`,
        body: text,
        guildId,
      });
    }

    const events = JSON.parse(text);
    return Response.json({
      ok: true,
      totalEvents: events.length,
      events: events.map((e) => ({
        id: e.id,
        name: e.name,
        status: e.status,
        entityType: e.entity_type,
        startTime: e.scheduled_start_time,
      })),
    });
  } catch (err) {
    return Response.json({ error: err.message });
  }
}
