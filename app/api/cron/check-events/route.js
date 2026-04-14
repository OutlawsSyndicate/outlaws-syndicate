import { supabase } from "../../../../lib/supabase";
import { sendPushToAll } from "../../../../lib/push";

/**
 * Check for new Discord events and send push notifications.
 * Called by:
 *  - Vercel Cron (daily)
 *  - Frontend (on every Events page load, for near-real-time checks)
 *  - External cron service (optional, for more frequent checks)
 *
 * Safe to call frequently — uses known_events table to prevent duplicate notifications.
 */
export async function GET() {

  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId  = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    return Response.json({ error: "Discord not configured" }, { status: 500 });
  }

  try {
    // 1. Fetch current events from Discord
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/scheduled-events?with_user_count=true`,
      {
        headers: { Authorization: `Bot ${botToken}` },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Discord API error: ${res.status} — ${errText}`);
      return Response.json({ error: `Discord API ${res.status}` }, { status: 502 });
    }

    const discordEvents = await res.json();

    // 2. Get known event IDs from Supabase
    const { data: knownEvents } = await supabase
      .from("known_events")
      .select("event_id");

    const knownIds = new Set((knownEvents || []).map((e) => e.event_id));

    // 3. Find new events (scheduled or active, not completed/canceled)
    const newEvents = discordEvents.filter(
      (ev) => !knownIds.has(ev.id) && (ev.status === 1 || ev.status === 2)
    );

    if (newEvents.length === 0) {
      return Response.json({ checked: discordEvents.length, new: 0, pushed: 0 });
    }

    // 4. Save new event IDs so we don't notify again
    const { error: insertErr } = await supabase
      .from("known_events")
      .upsert(
        newEvents.map((ev) => ({
          event_id:   ev.id,
          event_name: ev.name,
          created_at: new Date().toISOString(),
        })),
        { onConflict: "event_id" }
      );

    if (insertErr) {
      console.error("Error saving known events:", insertErr);
    }

    // 5. Get all push subscriptions
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");

    if (!subs || subs.length === 0) {
      return Response.json({ checked: discordEvents.length, new: newEvents.length, pushed: 0, reason: "no_subscribers" });
    }

    // 6. Send push for each new event
    let totalPushed = 0;
    const allExpired = [];

    for (const ev of newEvents) {
      const payload = {
        title: `Nuevo evento: ${ev.name}`,
        body:  ev.description
          ? ev.description.substring(0, 120)
          : "Se ha creado un nuevo evento en el sindicato",
        image: ev.image
          ? `https://cdn.discordapp.com/guild-events/${ev.id}/${ev.image}.png`
          : undefined,
        tag:   `event-${ev.id}`,
        url:   "/",
      };

      const subscriptions = subs.map((s) => ({
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      }));

      const { sent, expired } = await sendPushToAll(subscriptions, payload);
      totalPushed += sent;
      allExpired.push(...expired);
    }

    // 7. Clean up expired subscriptions
    if (allExpired.length > 0) {
      const uniqueExpired = [...new Set(allExpired)];
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", uniqueExpired);
      console.log(`Cleaned up ${uniqueExpired.length} expired push subscriptions`);
    }

    return Response.json({
      checked: discordEvents.length,
      new: newEvents.length,
      pushed: totalPushed,
      expiredCleaned: allExpired.length,
    });
  } catch (err) {
    console.error("Cron check-events error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
