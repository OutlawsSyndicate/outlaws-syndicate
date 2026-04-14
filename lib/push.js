import webpush from "web-push";

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@outlawsyndicate.es";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

/**
 * Send push notification to a subscription
 */
export async function sendPush(subscription, payload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn("VAPID keys not configured, skipping push");
    return { success: false, reason: "no_vapid" };
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (err) {
    // 410 Gone or 404 = subscription expired, should be removed
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { success: false, reason: "expired", endpoint: subscription.endpoint };
    }
    console.error("Push send error:", err.message);
    return { success: false, reason: err.message };
  }
}

/**
 * Send push to multiple subscriptions, returns expired endpoints to clean up
 */
export async function sendPushToAll(subscriptions, payload) {
  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPush(sub, payload))
  );

  const expired = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled" && r.value.reason === "expired") {
      expired.push(subscriptions[i].endpoint);
    }
  }

  return { sent: results.length, expired };
}
