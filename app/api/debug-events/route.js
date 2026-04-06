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
    // Probar ambos endpoints
    const urls = [
      `https://discord.com/api/v10/guilds/${guildId}/scheduled-events?with_user_count=true`,
      `https://discord.com/api/v10/guilds/${guildId}/scheduled-events?with_user_count=true&status=1`,
    ];

    const results = [];

    for (const url of urls) {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        cache: "no-store",
      });

      const text = await res.text();
      results.push({
        url: url.replace(guildId, "GUILD"),
        status: res.status,
        body: res.ok ? JSON.parse(text) : text,
      });
    }

    // También probar permisos del bot
    const botRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
      }
    );

    return Response.json({
      ok: true,
      guildId,
      botCanAccessGuild: botRes.ok,
      botGuildStatus: botRes.status,
      endpoints: results,
    });
  } catch (err) {
    return Response.json({ error: err.message });
  }
}
