import { supabase } from "../../../../lib/supabase";
import { sendPushToAll } from "../../../../lib/push";

/**
 * Check for new Discord events and send push notifications.
 * Also sends a reminder 15 minutes before an event starts.
 *
 * Called by:
 *  - Vercel Cron (daily)
 *  - Frontend (on every Events page load, for near-real-time checks)
 *  - Scheduled task (every 10 min)
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

    // 2. Get known event IDs and reminded event IDs from Supabase
    const { data: knownEvents } = await supabase
      .from("known_events")
      .select("event_id, reminded");

    const knownIds   = new Set((knownEvents || []).map((e) => e.event_id));
    const remindedIds = new Set((knownEvents || []).filter((e) => e.reminded).map((e) => e.event_id));

    // 3. Get all push subscriptions (needed for both new events and reminders)
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");

    const subscriptions = (subs || []).map((s) => ({
      endpoint: s.endpoint,
      keys: { p256dh: s.p256dh, auth: s.auth },
    }));

    let totalPushed = 0;
    const allExpired = [];

    // ── A. New event notifications ──────────────────────────────────────
    const newEvents = discordEvents.filter(
      (ev) => !knownIds.has(ev.id) && (ev.status === 1 || ev.status === 2)
    );

    if (newEvents.length > 0) {
      // Save new event IDs
      await supabase
        .from("known_events")
        .upsert(
          newEvents.map((ev) => ({
            event_id:   ev.id,
            event_name: ev.name,
            reminded:   false,
            created_at: new Date().toISOString(),
          })),
          { onConflict: "event_id" }
        );

      if (subscriptions.length > 0) {
        for (const ev of newEvents) {
          const payload = {
            title: `Nuevo evento: ${ev.name}`,
            body:  ev.description
              ? ev.description.substring(0, 120)
              : "Se ha creado un nuevo evento en el sindicato",
            image: ev.image
              ? `https://cdn.discordapp.com/guild-events/${ev.id}/${ev.image}.png`
              : undefined,
            tag:   `event-new-${ev.id}`,
            url:   "/",
          };

          const { sent, expired } = await sendPushToAll(subscriptions, payload);
          totalPushed += sent;
          allExpired.push(...expired);
        }
      }
    }

    // ── B. 15-minute reminder notifications ─────────────────────────────
    const now = Date.now();
    const FIFTEEN_MIN = 15 * 60 * 1000;

    const upcomingEvents = discordEvents.filter((ev) => {
      if (ev.status !== 1) return false; // only scheduled (not yet active)
      if (remindedIds.has(ev.id)) return false; // already reminded
      const startMs = new Date(ev.scheduled_start_time).getTime();
      const timeUntilStart = startMs - now;
      // Remind if event starts within the next 15 minutes (but not already past)
      return timeUntilStart > 0 && timeUntilStart <= FIFTEEN_MIN;
    });

    if (upcomingEvents.length > 0 && subscriptions.length > 0) {
      for (const ev of upcomingEvents) {
        const startDate = new Date(ev.scheduled_start_time);
        const minutesLeft = Math.round((startDate.getTime() - now) / 60000);

        const payload = {
          title: `Empieza en ${minutesLeft} min: ${ev.name}`,
          body:  ev.description
            ? ev.description.substring(0, 100)
            : "El evento esta a punto de comenzar",
          image: ev.image
            ? `https://cdn.discordapp.com/guild-events/${ev.id}/${ev.image}.png`
            : undefined,
          tag:   `event-reminder-${ev.id}`,
          url:   "/",
        };

        const { sent, expired } = await sendPushToAll(subscriptions, payload);
        totalPushed += sent;
        allExpired.push(...expired);
      }

      // Mark events as reminded
      for (const ev of upcomingEvents) {
        await supabase
          .from("known_events")
          .upsert(
            {
              event_id:   ev.id,
              event_name: ev.name,
              reminded:   true,
              created_at: new Date().toISOString(),
            },
            { onConflict: "event_id" }
          );
      }
    }

    // ── C. Clean up expired subscriptions ───────────────────────────────
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
      reminders: upcomingEvents.length,
      pushed: totalPushed,
      expiredCleaned: allExpired.length,
    });
  } catch (err) {
    console.error("Cron check-events error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
