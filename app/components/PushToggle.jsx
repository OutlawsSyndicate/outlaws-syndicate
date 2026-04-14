"use client";
import { useState, useEffect } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushToggle() {
  const [supported,   setSupported]   = useState(false);
  const [permission,  setPermission]  = useState("default");
  const [subscribed,  setSubscribed]  = useState(false);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const hasPush =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    const isSupported = hasPush && !!VAPID_PUBLIC_KEY;
    setSupported(isSupported);

    if (!hasPush) {
      setLoading(false);
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      setLoading(false);
      return;
    }

    setPermission(Notification.permission);

    // Check if already subscribed
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setSubscribed(!!sub);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Register service worker on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("SW register failed:", err);
      });
    }
  }, []);

  async function subscribe() {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Send subscription to server
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      if (res.ok) {
        setSubscribed(true);
      }
    } catch (err) {
      console.error("Push subscribe error:", err);
    }
    setLoading(false);
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setSubscribed(false);
    } catch (err) {
      console.error("Push unsubscribe error:", err);
    }
    setLoading(false);
  }

  // Browser doesn't support push at all
  if (typeof window !== "undefined" && (!("serviceWorker" in navigator) || !("PushManager" in window))) {
    return null;
  }

  // VAPID key missing — show nothing (env var not configured)
  if (!VAPID_PUBLIC_KEY) {
    return (
      <span className="text-[10px] font-mono text-red-500/60" title="NEXT_PUBLIC_VAPID_PUBLIC_KEY not set">
        [PUSH N/A]
      </span>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600">
        <span>🔕</span>
        <span>Notificaciones bloqueadas en el navegador</span>
      </div>
    );
  }

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 border transition-colors disabled:opacity-40 ${
        subscribed
          ? "border-emerald-600/40 text-emerald-400 hover:border-red-600/40 hover:text-red-400"
          : "border-outlaw-border text-gray-400 hover:text-outlaw-orange hover:border-outlaw-orange/40"
      }`}
    >
      <span>{subscribed ? "🔔" : "🔕"}</span>
      <span>
        {loading
          ? "..."
          : subscribed
          ? "Notificaciones ON"
          : "Activar notificaciones"}
      </span>
    </button>
  );
}
