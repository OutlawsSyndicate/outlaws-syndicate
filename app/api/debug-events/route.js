export async function GET() {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId  = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    return Response.json({ error: "Missing env vars", hasBotToken: !!botToken, hasGuildId: !!guildId });
  }

  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/scheduled-events?with_user_count=true`,
      {
        headers: { Authorization: `Bot ${botToken}` },
        cache: "no-store",
      }
    );

    if (res.status === 429) {
      const data = await res.json();
      return Response.json({ error: "rate_limited", retry_after: data.retry_after, tip: "Espera unos segundos y recarga" });
    }

    if (!res.ok) {
      return Response.json({ error: `Discord ${res.status}`, body: await res.text() });
    }

    const events = await res.json();
    return Response.json({
      ok: true,
      total: events.length,
      events: events.map((e) => ({ id: e.id, name: e.name, status: e.status, start: e.scheduled_start_time })),
    });
  } catch (err) {
    return Response.json({ error: err.message });
  }
}
