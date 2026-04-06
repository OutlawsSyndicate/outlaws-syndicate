"use client";
import { useState, useEffect } from "react";
import { ITEM_TYPES, STATUSES, STATUS_MAP, TYPE_MAP, exportCSV } from "./InventoryPanel";

const PAGE_SIZE = 10;

export default function OrgInventoryPanel() {
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [search,       setSearch]       = useState("");
  const [filterType,   setFilterType]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterUser,   setFilterUser]   = useState("");
  const [page,         setPage]         = useState(1);

  useEffect(() => { fetchItems(); }, []);
  useEffect(() => { setPage(1); }, [search, filterType, filterStatus, filterUser]);

  async function fetchItems() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/org-inventory");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch { setError("Error cargando inventario de la org"); }
    finally  { setLoading(false); }
  }

  const users    = [...new Set(items.map((i) => i.userName))].filter(Boolean).sort();
  const filtered = items.filter((i) =>
    (!search       || i.name.toLowerCase().includes(search.toLowerCase()) || (i.manufacturer ?? "").toLowerCase().includes(search.toLowerCase())) &&
    (!filterType   || i.type   === filterType) &&
    (!filterStatus || i.status === filterStatus) &&
    (!filterUser   || i.userName === filterUser)
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── Stats ── */
  const totalShips = items.filter((i) => i.type === "ship").length;
  const available  = items.filter((i) => i.status === "available").length;
  const inUse      = items.filter((i) => i.status === "in_use").length;
  const damaged    = items.filter((i) => i.status === "damaged").length;

  return (
    <div id="priv-org-inventario" className="mt-2">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-outlaw-orange text-xs tracking-[0.3em] uppercase font-display flex items-center gap-2">
          <span>//</span> INVENTARIO DE LA ORG
          <span className="text-gray-700 font-mono normal-case tracking-normal">({items.length} activos · {users.length} pilotos)</span>
        </p>
        <button onClick={() => exportCSV(filtered, "org-inventario.csv")}
          className="text-xs font-mono px-3 py-1.5 border border-outlaw-border text-gray-400 hover:text-outlaw-orange hover:border-outlaw-orange/40 transition-colors">
          ↓ CSV
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Activos", value: items.length,  color: "#f26419" },
          { label: "Naves",         value: totalShips,    color: "#60a5fa" },
          { label: "Disponibles",   value: available,     color: "#4ade80" },
          { label: "Dañados",       value: damaged,       color: "#ef4444" },
        ].map((s) => (
          <div key={s.label} className="hud-panel clip-panel bg-outlaw-panel/40 border border-outlaw-border p-3 text-center">
            <p className="text-gray-600 text-[10px] tracking-widest uppercase font-mono mb-0.5">{s.label}</p>
            <p className="font-display text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input type="text" placeholder="Buscar..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="login-input flex-1 min-w-[140px] text-xs py-1.5" />
        <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="login-input text-xs py-1.5 w-auto">
          <option value="">Todos los pilotos</option>
          {users.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="login-input text-xs py-1.5 w-auto">
          <option value="">Todos los tipos</option>
          {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="login-input text-xs py-1.5 w-auto">
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {(search || filterType || filterStatus || filterUser) && (
          <button onClick={() => { setSearch(""); setFilterType(""); setFilterStatus(""); setFilterUser(""); }}
            className="text-xs font-mono px-3 py-1.5 border border-outlaw-border text-gray-600 hover:text-gray-300 transition-colors">
            ✕ limpiar
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && <p className="text-red-500 text-xs font-mono mb-3 border border-red-900/50 bg-red-950/20 px-3 py-2">{error}</p>}

      {/* ── Table ── */}
      {loading ? (
        <div className="text-center py-16 text-gray-600 font-mono text-xs animate-pulse">[ CARGANDO DATOS ORG... ]</div>
      ) : paged.length === 0 ? (
        <div className="text-center py-16 text-gray-700 font-mono text-xs border border-outlaw-border/20">
          {items.length === 0
            ? "Ningún miembro ha registrado activos aún."
            : "Sin resultados para los filtros actuales."}
        </div>
      ) : (
        <div className="overflow-x-auto border border-outlaw-border/30">
          <table className="w-full text-xs font-mono border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-outlaw-panel/60 border-b border-outlaw-border/50">
                <th className="text-outlaw-orange/60 tracking-widest text-left py-2.5 px-3 font-normal">#</th>
                <th className="text-outlaw-orange/60 tracking-widest text-left py-2.5 px-3 font-normal">NOMBRE</th>
                <th className="text-outlaw-orange/60 tracking-widest text-left py-2.5 px-3 font-normal hidden sm:table-cell">TIPO</th>
                <th className="text-outlaw-orange/60 tracking-widest text-left py-2.5 px-3 font-normal hidden md:table-cell">CATEGORÍA</th>
                <th className="text-outlaw-orange/60 tracking-widest text-left py-2.5 px-3 font-normal">ESTADO</th>
                <th className="text-outlaw-orange/60 tracking-widest text-left py-2.5 px-3 font-normal">PILOTO</th>
                <th className="text-outlaw-orange/60 tracking-widest text-left py-2.5 px-3 font-normal hidden lg:table-cell">ADQUIRIDO</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((item) => {
                const ti = TYPE_MAP[item.type]    ?? { icon: "📦", label: item.type };
                const si = STATUS_MAP[item.status] ?? { label: item.status, color: "#94a3b8" };
                return (
                  <tr key={item.id} className="border-b border-outlaw-border/15 hover:bg-outlaw-panel/25 transition-colors">
                    <td className="py-3 px-3 text-gray-700">{item.id}</td>
                    <td className="py-3 px-3">
                      <span className="text-gray-100 font-semibold">{item.name}</span>
                      {item.manufacturer && <span className="text-gray-600 ml-2 text-[10px]">{item.manufacturer}</span>}
                      {item.assignedTo   && <span className="text-outlaw-orange/40 ml-2 text-[10px]">→ {item.assignedTo}</span>}
                    </td>
                    <td className="py-3 px-3 hidden sm:table-cell text-gray-500">{ti.icon} {ti.label}</td>
                    <td className="py-3 px-3 hidden md:table-cell text-gray-600">{item.category || "—"}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 border text-[10px] tracking-wider"
                        style={{ color: si.color, borderColor: `${si.color}40`, background: `${si.color}12` }}>
                        {si.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-outlaw-orange/60">{item.userName || "—"}</td>
                    <td className="py-3 px-3 hidden lg:table-cell text-gray-700">{item.acquiredAt || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-xs font-mono text-gray-600">
          <span>{filtered.length} activos · pág {page}/{totalPages}</span>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 border border-outlaw-border disabled:opacity-30 hover:text-outlaw-orange hover:border-outlaw-orange/40 transition-colors">←</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 border border-outlaw-border disabled:opacity-30 hover:text-outlaw-orange hover:border-outlaw-orange/40 transition-colors">→</button>
          </div>
        </div>
      )}
    </div>
  );
}
