"use client";

import { useEffect, useState, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import InventoryPanel   from "./components/InventoryPanel";
import OrgInventoryPanel from "./components/OrgInventoryPanel";
import ObjectivesPanel   from "./components/ObjectivesPanel";
import PushToggle        from "./components/PushToggle";

/* ──────────────────────────────────────────────────
   DATA
   ────────────────────────────────────────────────── */

const VALUES = [
  {
    title: "Autosuficiencia",
    icon: "⚙",
    text: "No esperamos que nadie nos salve. Forjamos nuestras propias herramientas, rutas y destino. Cada miembro es capaz de sostenerse en el vacío.",
  },
  {
    title: "Familia Elegida",
    icon: "⬡",
    text: "La sangre no define lazos. Elegimos a quién protegemos con nuestras vidas. El Sindicato es una hermandad sellada por confianza, no por contratos.",
  },
  {
    title: "Libertad",
    icon: "◈",
    text: "No respondemos ante imperios, corporaciones ni burócratas. Nuestra lealtad es al Sindicato y al viento estelar. Somos libres o no somos nada.",
  },
];

const CODE_ITEMS = [
  "La palabra es ley. Si das tu palabra, se cumple o se paga.",
  "La familia se defiende. Un ataque a uno es un ataque a todos.",
  "No se roba a los hermanos. Lo que es del Sindicato, es sagrado.",
  "Los conflictos internos se resuelven entre nosotros, nunca fuera.",
  "Nadie queda atrás. Si un hermano cae, se le recoge.",
  "El respeto se gana con acciones, no con palabras.",
  "La información es poder. Lo que sepas del Sindicato, muere contigo.",
];

/* Jerarquía de rangos */
const RANKS = [
  { name: "COMANDANTE", icon: "👑", color: "#f472b6" },
  { name: "GENERAL",    icon: "⚔️",  color: "#f97316" },
  { name: "CAPITAN",    icon: "💧", color: "#34d399" },
  { name: "TENIENTE",   icon: "🔑", color: "#60a5fa" },
  { name: "SOLDADO",    icon: "💀", color: "#a78bfa" },
  { name: "RECLUTA",    icon: "🔧", color: "#4ade80" },
  { name: "ALIADO",     icon: "👤", color: "#94a3b8" },
  { name: "NOVATO",     icon: "🎯", color: "#94a3b8" },
];

/* Credenciales demo — reemplazar con auth real */
const DEMO_USERS = [
  { user: "outlaw",     pass: "syndicate2950", role: "RECLUTA",    callsign: "Ghost" },
  { user: "comandante", pass: "pyro#1",        role: "COMANDANTE", callsign: "Viper" },
  { user: "capitan",    pass: "stanton99",     role: "CAPITAN",    callsign: "Stryker" },
];

/* ──────────────────────────────────────────────────
   SUB-COMPONENTS
   ────────────────────────────────────────────────── */

function SectionTag({ label }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-outlaw-orange text-xs tracking-[0.3em] uppercase font-display">{"//"}</span>
      <span className="text-outlaw-orange text-xs tracking-[0.3em] uppercase font-display">{label}</span>
      <span className="flex-1 h-px bg-outlaw-orange/20" />
    </div>
  );
}

/* ── Discord Login Modal ── */
function LoginModal({ onClose }) {
  const [loading, setLoading] = useState(false);

  function handleDiscordLogin() {
    setLoading(true);
    signIn("discord", { callbackUrl: "/" });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="hud-panel clip-panel bg-outlaw-panel border border-outlaw-orange/40 w-full max-w-sm p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-outlaw-orange text-xs font-mono transition-colors"
        >
          [ X ]
        </button>

        <p className="text-outlaw-orange text-xs tracking-[0.35em] uppercase font-display mb-1">
          ACCESO RESTRINGIDO
        </p>
        <h2 className="font-display text-xl font-bold text-gray-100 mb-2">
          Identificación Syndicate
        </h2>
        <p className="text-gray-600 text-xs font-mono mb-8">
          Tu rango y callsign se cargarán automáticamente desde el servidor de Discord.
        </p>

        <button
          onClick={handleDiscordLogin}
          disabled={loading}
          className="btn-charge w-full flex items-center justify-center gap-3 font-display font-bold text-sm tracking-[0.15em] uppercase py-4 border-2 border-[#5865f2] text-[#5865f2] hover:bg-[#5865f2] hover:text-white transition-all duration-300 clip-panel disabled:opacity-50"
        >
          {loading ? (
            <span className="font-mono text-xs">CONECTANDO...</span>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.05a19.91 19.91 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              ENTRAR CON DISCORD
            </>
          )}
        </button>

        <p className="text-gray-700 text-xs font-mono mt-5 text-center">
          Solo miembros del Sindicato tienen acceso.
        </p>
      </div>
    </div>
  );
}

const DISCORD_INVITE = "JxTEA7FC";
const DISCORD_URL    = `https://discord.gg/${DISCORD_INVITE}`;

/* ── Discord Events panel ── */
function formatEventDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} — ${d.getUTCHours().toString().padStart(2,"0")}:${d.getUTCMinutes().toString().padStart(2,"0")} UTC`;
}

function DiscordEvents() {
  const [discord, setDiscord] = useState(null);
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    // Discord online count
    fetch(`https://discord.com/api/v10/invites/${DISCORD_INVITE}?with_counts=true`)
      .then((r) => r.json())
      .then((d) => setDiscord(d))
      .catch(() => {});

    // Real events from our API
    setLoading(true);
    fetch("/api/discord-events")
      .then((r) => r.json())
      .then((data) => {
        if (!data.configured) {
          setError("Bot Token no configurado. Añade DISCORD_BOT_TOKEN en .env.local");
        } else if (data.error && data.events.length === 0) {
          setError(data.error);
        }
        setEvents(data.events || []);
      })
      .catch(() => setError("Error cargando eventos"))
      .finally(() => setLoading(false));

    // Silently trigger push check for new events on every page load
    fetch("/api/cron/check-events").catch(() => {});
  }, []);

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-outlaw-orange text-xs tracking-[0.3em] uppercase font-display flex items-center gap-2">
          <span>//</span> EVENTOS DEL SINDICATO
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <PushToggle />
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 border border-[#5865f2]/40 bg-[#5865f2]/10 hover:bg-[#5865f2]/20 px-3 py-1 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#5865f2">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.05a19.91 19.91 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          <span className="text-[#5865f2] text-xs font-mono">
            {discord ? `${discord.approximate_presence_count ?? "?"} online` : "Discord"}
          </span>
        </a>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-600 font-mono text-xs animate-pulse">[ CARGANDO EVENTOS... ]</div>
      ) : error && events.length === 0 ? (
        <div className="hud-panel clip-panel bg-outlaw-panel/30 border border-outlaw-border p-6 text-center">
          <p className="text-gray-600 text-xs font-mono mb-2">{error}</p>
          <p className="text-gray-700 text-[10px] font-mono">
            Configura <span className="text-outlaw-orange">DISCORD_BOT_TOKEN</span> en .env.local para ver los eventos reales del servidor.
          </p>
        </div>
      ) : events.length === 0 ? (
        <div className="hud-panel clip-panel bg-outlaw-panel/30 border border-outlaw-border p-6 text-center">
          <p className="text-gray-500 text-xs font-mono">No hay eventos programados en este momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const isActive    = ev.status === 2;
            const isCompleted = ev.status === 3;
            const color = isActive ? "#4ade80" : isCompleted ? "#6b7280" : "#f26419";
            const typeLabel = isActive ? "EN CURSO" : isCompleted ? "COMPLETADO" : ev.entityType === 3 ? "EXTERNO" : ev.entityType === 1 ? "STAGE" : "VOZ";
            return (
              <div key={ev.id}
                className="hud-panel clip-panel bg-outlaw-panel/40 border border-outlaw-border hover:border-outlaw-orange/40 transition-all overflow-hidden">
                {/* Event image banner */}
                {ev.image && (
                  <div className="h-28 lg:h-36 relative overflow-hidden">
                    <img src={ev.image} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/50 to-transparent" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono border px-2 py-0.5 shrink-0"
                        style={{ color, borderColor: `${color}50`, background: `${color}12` }}>
                        {isActive && <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-pulse" />}
                        {typeLabel}
                      </span>
                      <h4 className="font-display text-sm lg:text-base font-bold text-gray-100">{ev.name}</h4>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-gray-600 text-xs font-mono block">{formatEventDate(ev.startTime)}</span>
                      {ev.userCount > 0 && (
                        <span className="text-outlaw-orange/50 text-[10px] font-mono">{ev.userCount} interesados</span>
                      )}
                    </div>
                  </div>
                  {ev.description && (
                    <p className="text-gray-500 text-xs font-mono line-clamp-2">{ev.description}</p>
                  )}
                  {ev.location && (
                    <p className="text-outlaw-orange/40 text-[10px] font-mono mt-1">📍 {ev.location}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-2 w-full border border-[#5865f2]/30 hover:border-[#5865f2]/70 hover:bg-[#5865f2]/10 py-2 transition-all text-xs font-mono text-[#5865f2]/60 hover:text-[#5865f2]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.05a19.91 19.91 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        Ver todos los eventos en Discord
      </a>
    </div>
  );
}

/* ── Home tab ── */
function HomePanel({ member, rankData, onTab }) {
  const [previewEvents, setPreviewEvents] = useState([]);

  useEffect(() => {
    fetch("/api/discord-events")
      .then((r) => r.json())
      .then((data) => setPreviewEvents((data.events || []).slice(0, 3)))
      .catch(() => {});
  }, []);
  const QUICK_LINKS = [
    { id: "eventos",       label: "Eventos",       icon: "📡", desc: "Próximas operaciones" },
    { id: "transmisiones", label: "Transmisiones", icon: "📻", desc: "Comms internas" },
    { id: "inventario",    label: "Inventario",    icon: "🚀", desc: "Mis activos" },
    { id: "org",           label: "ORG",           icon: "🏴", desc: "Flota del sindicato" },
    { id: "perfil",        label: "Mi Perfil",     icon: "👤", desc: "Editar datos" },
  ];
  return (
    <div className="space-y-8">
      {/* stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        {[
          { label: "Rango",   value: `${rankData.icon} ${member.role}`, color: rankData.color },
          { label: "Estado",  value: "ACTIVO",                          color: "#4ade80" },
          { label: "Sindicato", value: "OUTLAWS",                       color: "#f26419" },
        ].map((s) => (
          <div key={s.label} className="hud-panel clip-panel bg-outlaw-panel/60 border border-outlaw-border p-5 lg:p-6 text-center">
            <p className="text-outlaw-orange/60 text-xs tracking-widest uppercase font-mono mb-2">{s.label}</p>
            <p className="font-display text-sm lg:text-base font-bold truncate" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* upcoming events preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionTag label="PRÓXIMOS EVENTOS" />
          <button onClick={() => onTab("eventos")}
            className="text-[10px] font-mono text-outlaw-orange/60 hover:text-outlaw-orange transition-colors tracking-widest">
            VER TODOS →
          </button>
        </div>
        <div className="space-y-2">
          {previewEvents.length === 0 ? (
            <div className="text-center py-4 text-gray-700 font-mono text-xs">
              No hay eventos programados
            </div>
          ) : previewEvents.map((ev) => {
            const isActive = ev.status === 2;
            const color = isActive ? "#4ade80" : "#f26419";
            return (
              <div key={ev.id} className="flex items-center gap-3 hud-panel clip-panel bg-outlaw-panel/30 border border-outlaw-border px-4 py-3">
                <span className="text-[10px] font-mono border px-2 py-0.5 shrink-0"
                  style={{ color, borderColor: `${color}50`, background: `${color}12` }}>
                  {isActive ? "EN CURSO" : "EVENTO"}
                </span>
                <span className="text-gray-200 text-xs font-mono flex-1 truncate">{ev.name}</span>
                <span className="text-gray-600 text-[10px] font-mono shrink-0 hidden sm:block">{formatEventDate(ev.startTime)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* quick nav */}
      <div>
        <SectionTag label="ACCESO RÁPIDO" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mt-3">
          {QUICK_LINKS.map((l) => (
            <button key={l.id} onClick={() => onTab(l.id)}
              className="hud-panel clip-panel bg-outlaw-panel/30 border border-outlaw-border hover:border-outlaw-orange/50 p-4 lg:p-5 text-left transition-all group">
              <div className="text-xl lg:text-2xl mb-2">{l.icon}</div>
              <p className="font-display text-xs lg:text-sm font-bold text-gray-200 group-hover:text-outlaw-orange transition-colors tracking-wider uppercase">{l.label}</p>
              <p className="text-gray-600 text-[10px] lg:text-xs font-mono mt-0.5">{l.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Comms panel ── */
function CommsPanel() {
  return (
    <div className="hud-panel clip-panel bg-outlaw-panel/30 border border-outlaw-border p-6 lg:p-9">
      <p className="text-outlaw-orange text-xs lg:text-sm tracking-[0.3em] uppercase font-display mb-5 flex items-center gap-2">
        <span>//</span> TRANSMISIONES INTERNAS
      </p>
      <div className="space-y-3 lg:space-y-4">
        {[
          { from: "Viper",   msg: "Reunión de escuadra — Pyro HEX, 22:00 UTC.",      time: "hace 2h" },
          { from: "Sistema", msg: "Nuevo contrato disponible. Nivel T2. Revisar.",    time: "hace 5h" },
          { from: "Ghost",   msg: "Confirmada extracción en Nyx. Necesito respaldo.", time: "hace 8h" },
        ].map((c, i) => (
          <div key={i} className="flex gap-3 text-sm border-b border-outlaw-border/20 pb-3 lg:pb-4 last:border-0 last:pb-0">
            <span className="text-outlaw-orange/70 font-mono shrink-0 text-xs lg:text-sm mt-0.5">[{c.from}]</span>
            <span className="text-gray-400 font-mono flex-1 text-xs lg:text-sm">{c.msg}</span>
            <span className="text-gray-700 font-mono text-xs shrink-0">{c.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Private Area ── */
function PrivateArea({ member, onLogout, activeTab, setActiveTab }) {
  const rankData = RANKS.find((r) => r.name === member.role) ?? RANKS[RANKS.length - 1];

  const TABS = [
    { id: "inicio",        label: "Inicio"         },
    { id: "eventos",       label: "Eventos"        },
    { id: "transmisiones", label: "Transmisiones"  },
    { id: "inventario",    label: "Inventario"     },
    { id: "org",           label: "ORG"            },
    { id: "objetivos",    label: "Objetivos"      },
    { id: "perfil",        label: "Mi Perfil"      },
  ];

  return (
    <section id="zona-privada" className="relative py-10 lg:py-14 px-4 sm:px-8 lg:px-12 max-w-7xl mx-auto">

      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 lg:mb-10">
        <div>
          <SectionTag label="ZONA RESTRINGIDA" />
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-gray-100 mt-2">
            Bienvenido,{" "}
            <span className="text-outlaw-orange">{member.callsign}</span>
          </h2>
          <p className="font-mono text-xs mt-1 tracking-widest uppercase flex items-center gap-2"
             style={{ color: rankData.color }}>
            <span>{rankData.icon}</span>
            <span>{member.role}</span>
            <span className="text-gray-700">&mdash; Acceso concedido</span>
          </p>
        </div>
        <button
          onClick={onLogout}
          className="self-start sm:self-auto text-xs font-mono text-gray-600 hover:text-outlaw-orange border border-outlaw-border hover:border-outlaw-orange/40 px-4 py-2 transition-colors"
        >
          [ CERRAR SESIÓN ]
        </button>
      </div>

      {/* Tab nav */}
      <div className="flex flex-wrap gap-0.5 mb-8 lg:mb-10 border-b border-outlaw-border/30">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`font-mono text-xs lg:text-sm px-3 lg:px-5 py-2 lg:py-3 tracking-widest uppercase transition-colors relative ${
              activeTab === tab.id
                ? "text-outlaw-orange border-b-2 border-outlaw-orange -mb-px"
                : "text-gray-600 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[500px] lg:min-h-[600px]">
        {activeTab === "inicio"        && <HomePanel member={member} rankData={rankData} onTab={setActiveTab} />}
        {activeTab === "eventos"       && <DiscordEvents />}
        {activeTab === "transmisiones" && <CommsPanel />}
        {activeTab === "inventario"    && (
          <div className="hud-panel clip-panel bg-outlaw-panel/30 border border-outlaw-border p-5 sm:p-7 lg:p-9">
            <InventoryPanel userName={member.callsign} />
          </div>
        )}
        {activeTab === "org"           && (
          <div className="hud-panel clip-panel bg-outlaw-panel/30 border border-outlaw-border p-5 sm:p-7 lg:p-9">
            <OrgInventoryPanel />
          </div>
        )}
        {activeTab === "objetivos"     && (
          <div className="hud-panel clip-panel bg-outlaw-panel/30 border border-outlaw-border p-5 sm:p-7 lg:p-9">
            <ObjectivesPanel />
          </div>
        )}
        {activeTab === "perfil"        && <ProfilePanel member={member} rankData={rankData} />}
      </div>
    </section>
  );
}

/* ── Profile Panel ── */
function ProfilePanel({ member, rankData }) {
  const [callsign,      setCallsign]      = useState(member.callsign);
  const [bio,           setBio]           = useState("");
  const [ship,          setShip]          = useState("");
  const [saved,         setSaved]         = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileRef = useRef(null);

  /* Load saved avatar from localStorage */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`syn_avatar_${member.callsign}`);
      if (stored) setAvatarPreview(stored);
    } catch {}
  }, [member.callsign]);

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setAvatarPreview(dataUrl);
      try { localStorage.setItem(`syn_avatar_${member.callsign}`, dataUrl); } catch {}
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatarPreview(null);
    try { localStorage.removeItem(`syn_avatar_${member.callsign}`); } catch {}
  }

  function handleSave(e) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  /* Current avatar: custom > Discord > rank icon */
  const currentAvatar = avatarPreview || member.avatar;

  return (
    <div className="hud-panel clip-panel bg-outlaw-panel/40 border border-outlaw-border p-6 sm:p-8 lg:p-10">
      <p className="text-outlaw-orange text-xs lg:text-sm tracking-[0.3em] uppercase font-display mb-6 lg:mb-8 flex items-center gap-2">
        <span>//</span> MI PERFIL
      </p>

      {/* Avatar + info */}
      <div className="flex items-start gap-6 lg:gap-8 mb-8 lg:mb-10">
        {/* Avatar upload zone */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div
            className="relative group cursor-pointer w-20 h-20 lg:w-28 lg:h-28 clip-panel overflow-hidden border"
            style={{ borderColor: rankData.color }}
            onClick={() => fileRef.current?.click()}
            title="Cambiar avatar"
          >
            {currentAvatar ? (
              <img src={currentAvatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl"
                style={{ background: `${rankData.color}15` }}>
                {rankData.icon}
              </div>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-[9px] font-mono tracking-widest text-center leading-tight">CAMBIAR<br/>AVATAR</span>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          {avatarPreview && (
            <button onClick={removeAvatar}
              className="text-[9px] font-mono text-gray-700 hover:text-red-500 transition-colors tracking-wider">
              ✕ quitar
            </button>
          )}
          <p className="text-[9px] font-mono text-gray-700 text-center leading-tight">
            Haz clic<br/>para cambiar
          </p>
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <p className="font-display text-2xl lg:text-3xl font-bold text-gray-100 truncate">{member.callsign}</p>
          <p className="font-mono text-xs tracking-widest mt-1" style={{ color: rankData.color }}>
            {rankData.icon} {member.role}
          </p>
          <p className="text-gray-700 text-xs font-mono mt-2">
            SYN-ID: {Math.abs(member.callsign.split("").reduce((a, c) => a + c.charCodeAt(0), 0))}
          </p>
          {ship && (
            <p className="text-gray-500 text-xs font-mono mt-1">🚀 {ship}</p>
          )}
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-outlaw-orange/70 text-xs tracking-widest uppercase mb-1 font-mono">Callsign</label>
            <input type="text" value={callsign} onChange={(e) => setCallsign(e.target.value)} className="login-input w-full" />
          </div>
          <div>
            <label className="block text-outlaw-orange/70 text-xs tracking-widest uppercase mb-1 font-mono">Nave Principal</label>
            <input type="text" value={ship} onChange={(e) => setShip(e.target.value)}
              placeholder="Ej: Cutlass Black" className="login-input w-full" />
          </div>
        </div>
        <div>
          <label className="block text-outlaw-orange/70 text-xs tracking-widest uppercase mb-1 font-mono">Bio / Descripción</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
            placeholder="Cuéntale algo al Sindicato..." className="login-input w-full resize-none" />
        </div>
        <div className="flex items-center gap-4">
          <button type="submit"
            className="btn-charge font-display font-bold text-xs tracking-[0.2em] uppercase px-6 py-2.5 border border-outlaw-orange text-outlaw-orange hover:bg-outlaw-orange hover:text-outlaw-bg transition-all duration-300">
            GUARDAR CAMBIOS
          </button>
          {saved && <span className="text-green-400 text-xs font-mono animate-fade-in">✓ Perfil actualizado</span>}
        </div>
      </form>

      {/* Danger zone */}
      <div className="mt-8 pt-6 border-t border-outlaw-border/30">
        <p className="text-gray-700 text-xs font-mono tracking-widest uppercase mb-3">Zona de peligro</p>
        <button className="text-xs font-mono text-red-800 hover:text-red-500 border border-red-900/30 hover:border-red-800/60 px-4 py-2 transition-colors">
          SOLICITAR BAJA DEL SINDICATO
        </button>
      </div>
    </div>
  );
}

/* ── Mobile hamburger menu ── */
function MobileMenu({ member, activeTab, onTabChange }) {
  const [open, setOpen] = useState(false);

  const privateLinks = [
    { label: "Inicio",        tab: "inicio"        },
    { label: "Eventos",       tab: "eventos"       },
    { label: "Transmisiones", tab: "transmisiones" },
    { label: "Inventario",    tab: "inventario"    },
    { label: "ORG",           tab: "org"           },
    { label: "Mi Perfil",     tab: "perfil"        },
  ];
  const publicLinks = [
    { label: "Historia",  href: "#historia" },
    { label: "Valores",   href: "#valores"  },
    { label: "El Código", href: "#codigo"   },
  ];

  return (
    <div className="md:hidden relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-gray-500 hover:text-outlaw-orange transition-colors p-1"
        aria-label="Menú"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {open
            ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
            : <><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></>
          }
        </svg>
      </button>
      {open && (
        <div className="absolute top-8 left-0 bg-outlaw-bg border border-outlaw-border/60 min-w-[160px] py-1 z-50">
          {member
            ? privateLinks.map((l) => (
                <button
                  key={l.tab}
                  onClick={() => {
                    onTabChange(l.tab);
                    setOpen(false);
                    document.getElementById("zona-privada")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`block w-full text-left px-4 py-2 font-mono text-xs tracking-widest uppercase transition-colors ${
                    activeTab === l.tab ? "text-outlaw-orange" : "text-gray-500 hover:text-outlaw-orange hover:bg-outlaw-panel/50"
                  }`}
                >
                  {l.label}
                </button>
              ))
            : publicLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 font-mono text-xs text-gray-500 hover:text-outlaw-orange hover:bg-outlaw-panel/50 tracking-widest uppercase transition-colors"
                >
                  {l.label}
                </a>
              ))
          }
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────
   PAGE
   ────────────────────────────────────────────────── */

export default function Home() {
  const { data: session, status } = useSession();
  const [showLogin, setShowLogin] = useState(false);
  const [activeTab, setActiveTab] = useState("inicio");

  /* Map NextAuth session → member shape the rest of the UI expects */
  const member = session?.user
    ? {
        callsign: session.user.callsign ?? session.user.name,
        role:     session.user.rank?.name ?? "NOVATO",
        avatar:   session.user.avatar ?? session.user.image,
      }
    : null;

  /* Intersection observer for reveal animations */
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.1 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [member]);

  /* Scroll to private area after login */
  useEffect(() => {
    if (member) {
      setTimeout(() => {
        document.getElementById("zona-privada")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [!!member]);

  return (
    <>
      {/* ── NAVBAR ──────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-5 py-3 border-b border-outlaw-border/40 bg-outlaw-bg/80 backdrop-blur-md">
        <div className="flex items-center gap-5">
          <a href="#" className="flex items-center gap-2 shrink-0">
            <img src="/logo.jpeg" alt="logo" className="w-7 h-7 object-contain logo-blend-nav" />
            <span className="font-display text-xs tracking-[0.25em] text-gray-300 uppercase hidden lg:block">
              Outlaws Syndicate
            </span>
          </a>

          <div className="hidden md:flex items-center gap-1">
            {member
              ? [
                  { label: "Inicio",        tab: "inicio"        },
                  { label: "Eventos",       tab: "eventos"       },
                  { label: "Transmisiones", tab: "transmisiones" },
                  { label: "Inventario",    tab: "inventario"    },
                  { label: "ORG",           tab: "org"           },
                  { label: "Mi Perfil",     tab: "perfil"        },
                ].map((link) => (
                  <button
                    key={link.tab}
                    onClick={() => {
                      setActiveTab(link.tab);
                      document.getElementById("zona-privada")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`nav-link font-mono text-xs px-3 py-1.5 tracking-widest uppercase transition-colors relative ${
                      activeTab === link.tab ? "text-outlaw-orange" : "text-gray-500 hover:text-outlaw-orange"
                    }`}
                  >
                    {link.label}
                  </button>
                ))
              : [
                  { label: "Historia",  href: "#historia" },
                  { label: "Valores",   href: "#valores"  },
                  { label: "El Código", href: "#codigo"   },
                ].map((link) => (
                  <a key={link.href} href={link.href}
                    className="nav-link font-mono text-xs text-gray-500 hover:text-outlaw-orange px-3 py-1.5 tracking-widest uppercase transition-colors relative">
                    {link.label}
                  </a>
                ))
            }
          </div>

          <MobileMenu member={member} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {status === "loading" ? (
          <span className="text-gray-700 text-xs font-mono animate-pulse">VERIFICANDO...</span>
        ) : member ? (
          <div className="flex items-center gap-3">
            {member.avatar && (
              <img src={member.avatar} alt="" className="w-6 h-6 rounded-full opacity-80" />
            )}
            <span className="text-outlaw-orange text-xs font-mono tracking-widest hidden sm:block">
              {member.callsign}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-xs font-mono text-gray-600 hover:text-outlaw-orange border border-outlaw-border hover:border-outlaw-orange/40 px-3 py-1.5 transition-colors"
            >
              SALIR
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <a
              href="https://discord.gg/GNN6j7WZNg"
              target="_blank"
              rel="noopener noreferrer"
              className="font-display font-bold text-xs tracking-[0.2em] uppercase px-5 py-2 border border-gray-600 text-gray-400 hover:border-outlaw-orange hover:text-outlaw-orange transition-all duration-300"
            >
              UNIRSE
            </a>
            <button
              onClick={() => setShowLogin(true)}
              className="btn-charge font-display font-bold text-xs tracking-[0.2em] uppercase px-5 py-2 border border-outlaw-orange text-outlaw-orange hover:bg-outlaw-orange hover:text-outlaw-bg transition-all duration-300"
            >
              ACCESO MIEMBROS
            </button>
          </div>
        )}
      </nav>

      {/* ── LOGIN MODAL ─────────────────────────────── */}
      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} />
      )}

      <main className="relative min-h-screen grid-bg pt-[52px]">

        {/* ── PRIVATE AREA (when logged in) ──────── */}
        {member && (
          <PrivateArea member={member} onLogout={() => signOut({ callbackUrl: "/" })} activeTab={activeTab} setActiveTab={setActiveTab} />
        )}

        {/* ── PUBLIC SECTIONS (only when logged out) ── */}
        {!member && (
        <><section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 scanlines overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(242,100,25,0.08)_0%,_transparent_70%)] pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-outlaw-orange/40 to-transparent" />

          <p className="relative z-10 text-outlaw-orange/60 text-xs tracking-[0.4em] uppercase mb-8 font-mono animate-flicker">
            [ SIGNAL INTERCEPTED &mdash; FREQUENCY LOCKED ]
          </p>

          <div className="relative z-10 mb-6 logo-blend">
            <img
              src="/logo.jpeg"
              alt="Outlaws Syndicate Logo"
              className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 object-contain animate-fade-in"
            />
          </div>

          <h1
            className="glitch relative z-10 font-display font-black text-5xl sm:text-7xl md:text-8xl lg:text-9xl tracking-wider text-gray-100 leading-none"
            data-text="OUTLAWS SYNDICATE"
          >
            OUTLAWS
            <br />
            <span className="text-outlaw-orange">SYNDICATE</span>
          </h1>

          <p className="relative z-10 mt-6 text-lg sm:text-xl text-gray-400 tracking-wide max-w-xl font-mono">
            Nacidos fuera del sistema.{" "}
            <span className="text-outlaw-orange">Unidos por elecci&oacute;n.</span>
          </p>

          <div className="absolute bottom-10 flex flex-col items-center gap-2 z-10">
            <span className="text-gray-600 text-xs tracking-widest uppercase">scroll</span>
            <div className="w-px h-10 bg-gradient-to-b from-outlaw-orange/60 to-transparent animate-pulse" />
          </div>
        </section>

        {/* ── HISTORIA ──────────────────────────────── */}
        <section id="historia" className="relative py-24 px-6 md:px-16 lg:px-32 max-w-5xl mx-auto">
          <div className="reveal">
            <SectionTag label="NUESTRA HISTORIA" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-100 mt-4 mb-8">
              La chispa que encendi&oacute; la llama
            </h2>
            <div className="hud-panel clip-panel bg-outlaw-panel/60 border border-outlaw-border p-6 sm:p-10 space-y-5 text-gray-400 leading-relaxed backdrop-blur-sm">
              <p>
                En los confines m&aacute;s alejados de los sistemas controlados por el UEE,
                donde las leyes son solo sugerencias y las patrullas no llegan,
                naci&oacute; una verdad compartida:{" "}
                <span className="text-gray-200">el sistema no fue construido para protegernos.</span>{" "}
                Las corporaciones exprimen cada cr&eacute;dito, el Senado mira hacia otro lado,
                y los ciudadanos &laquo;modelo&raquo; fingen que todo funciona.
              </p>
              <p>
                Nosotros no fing&iacute;amos.{" "}
                <span className="text-outlaw-orange">Nosotros sobreviv&iacute;amos.</span>{" "}
                Pilotos sin bandera, contrabandistas con c&oacute;digo, mercenarios con honor.
                Nos encontramos en estaciones olvidadas, en bares de Grim HEX, en cuevas de Pyro.
                Y donde el imperio solo ve criminales, nosotros vimos hermanos.
              </p>
              <p>
                As&iacute; naci&oacute; el{" "}
                <span className="text-outlaw-orange font-bold">Outlaws Syndicate</span>: no como
                una banda, sino como una familia forjada en el fuego del abandono. Una hermandad
                donde tu pasado no importa, solo tu lealtad.
              </p>
              <p className="terminal-cursor text-outlaw-orange/80 text-sm italic">
                &gt; Archivo desclasificado &mdash; Nivel de acceso: SYNDICATE ONLY
              </p>
            </div>
          </div>
        </section>

        <div className="divider mx-auto max-w-3xl" />

        {/* ── VALORES ───────────────────────────────── */}
        <section id="valores" className="relative py-24 px-6 md:px-16 lg:px-32 max-w-6xl mx-auto">
          <div className="reveal">
            <SectionTag label="NUESTROS VALORES" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-100 mt-4 mb-12">
              En qu&eacute; creemos
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map((v, i) => (
              <div
                key={v.title}
                className="reveal card-glow hud-panel clip-panel bg-outlaw-panel/50 border border-outlaw-border p-8 transition-all"
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div className="text-outlaw-orange text-4xl mb-4 font-display">{v.icon}</div>
                <h3 className="font-display text-lg font-bold text-gray-100 mb-3 tracking-wide uppercase">{v.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{v.text}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="divider mx-auto max-w-3xl" />

        {/* ── EL CÓDIGO ─────────────────────────────── */}
        <section id="codigo" className="relative py-24 px-6 md:px-16 lg:px-32 max-w-5xl mx-auto">
          <div className="reveal">
            <SectionTag label="EL CODIGO" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-100 mt-4 mb-4">
              Nuestro c&oacute;digo
            </h2>
            <p className="text-gray-500 mb-10 max-w-2xl">
              No hay leyes escritas en papel. Solo palabras grabadas a fuego en cada uno de nosotros.
            </p>
          </div>
          <div className="reveal hud-panel bg-outlaw-panel/40 border border-outlaw-border p-6 sm:p-10 backdrop-blur-sm">
            <ol className="space-y-5">
              {CODE_ITEMS.map((item, i) => (
                <li
                  key={i}
                  className="code-item group flex items-start gap-4 text-gray-400 hover:text-gray-200 transition-colors cursor-default"
                >
                  <span className="shrink-0 font-display text-outlaw-orange/50 group-hover:text-outlaw-orange text-xs mt-1 transition-colors">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <div className="divider mx-auto max-w-3xl" />

        {/* ── CTA ───────────────────────────────────── */}
        <section className="relative py-32 px-6 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(242,100,25,0.06)_0%,_transparent_60%)] pointer-events-none" />
          <div className="reveal relative z-10">
            <p className="text-outlaw-orange text-xs tracking-[0.4em] uppercase mb-6 font-display">
              TRANSMISION ABIERTA
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-black text-gray-100 mb-4">
              &iquest;Est&aacute;s listo para volar libre?
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto mb-10">
              El Sindicato no recluta. El Sindicato reconoce. Si llegaste hasta
              aqu&iacute;, quiz&aacute; ya eres uno de los nuestros.
            </p>
            <a
              href="https://discord.gg/GNN6j7WZNg"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-charge inline-block font-display font-bold text-sm tracking-[0.2em] uppercase px-10 py-4 border-2 border-outlaw-orange text-outlaw-orange hover:bg-outlaw-orange hover:text-outlaw-bg transition-all duration-300 clip-panel animate-glow-pulse"
            >
              UNIRSE AL SINDICATO
            </a>
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────── */}
        <footer className="border-t border-outlaw-border/30 py-8 px-6 text-center">
          <p className="text-gray-700 text-xs tracking-widest uppercase font-mono">
            OUTLAWS SYNDICATE &mdash; STAR CITIZEN ORG &mdash; {new Date().getFullYear()}
          </p>
        </footer>
        </>
        )}
      </main>
    </>
  );
}
