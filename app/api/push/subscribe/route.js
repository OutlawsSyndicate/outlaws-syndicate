import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { supabase } from "../../../../lib/supabase";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { subscription } = await req.json();

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return Response.json({ error: "Invalid subscription" }, { status: 400 });
    }

    // Upsert subscription (one per endpoint)
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id:  session.user.id,
          user_name: session.user.name || session.user.callsign || "Unknown",
          endpoint: subscription.endpoint,
          p256dh:   subscription.keys.p256dh,
          auth:     subscription.keys.auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      console.error("Supabase push subscribe error:", error);
      return Response.json({ error: "Error saving subscription" }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { endpoint } = await req.json();

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);

    if (error) {
      console.error("Supabase push unsubscribe error:", error);
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
