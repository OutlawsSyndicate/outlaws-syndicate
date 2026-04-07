"use client";
import { useState, useEffect } from "react";
import { ITEM_TYPES, TYPE_MAP, exportCSV } from "./InventoryPanel";

const PAGE_SIZE = 15;

/**
 * Agrupa items por nombre (case-insensitive) + calidad.
 * Suma cantidades y recopila pilotos con sus cantidades individuales.
 */
function aggregateItems(items) {
  const map = new Map();
  for (const item of items) {
    const key = `${item.name.toLowerCase()}::${item.quality ?? 0}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        name:         item.name,
        type:         item.type,
        category:     item.category,
        manufacturer: item.manufacturer,
        quality:      item.quality ?? 0,
        totalQty:     0,
        pilots:       [],
      });
    }
    const agg = map.get(key);
    const qty = item.quantity ?? 1;
    agg.totalQty += qty;
    agg.pilots.push({ userName: item.userName || "—", quantity: qty });
  }
  return Array.from(map.values());
}

export default function OrgInventoryPanel() {
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [search,       setSearch]       = useState("");
  const [filterType,   setFilterType]   = useState("");
  const [page,         setPage]         = useState(1);
  const [expanded,     setExpanded]     = useState(null); // key of expanded row

  useEffect(() => { fetchItems(); }, []);
  useEffect(() => { setPage(1); }, [search, filterType]);

  async function fetchItems() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/org-inventory");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch { setError("Error cargando inventario de la org"); }
    finally  { setLoading(false); }
  }

  const users      = [...new Set(items.map((i) => i.userName))].filter(Boolean).sort();
  const aggregated = aggregateItems(items);

  const filtered = aggregated.filter((a) =>
    (!search     || a.name.toLowerCase().includes(search.toLowerCase()) || (a.manufacturer ?? "").toLowerCase().includes(search.toLowerCase())) &&
    (!filterType || a.type === filterType)
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── Stats ── */
  const uniqueItems = aggregated.length;
  const totalUnits  = aggregated.reduce((sum, a) => sum + a.totalQty, 0);
  const totalShips  = aggregated.filter((a) => a.type === "ship").length;

  return (
    <div id="priv-org-inventario" className="mt-2">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-outlaw-orange text-xs tracking-[0.3em] uppercase font-display flex items-center gap-2">
          <span>//</span> INVENTARIO DE LA ORG
          <span className="text-gray-700 font-mono normal-case tracking-normal">({uniqueItems} materiales · {users.length} pilotos)</span>
        </p>
        <button onClick={() => exportCSV(items, "org-inventario.csv")}
          className="text-xs font-mono px-3 py-1.5 border border-outlaw-border text-gray-400 hover:text-outlaw-orange hover:border-outlaw-orange/40 transition-colors">
          ↓ CSV
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: "Materiales",   value: uniqueItems, color: "#f26419" },
          { label: "Naves",        value: totalShips,  color: "#60a5fa" },
        ].map((s) => (
          <div key={s.label} className="hud-panel clip-panel bg-outlaw-panel/40 border border-outlaw-border p-3 text-center">
            <p className="text-gray-600 text-[10px] tracking-widest uppercase font-mono mb-0.5">{s.label}</p>
            <p className="font-display text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input type="text" placeholder="Buscar nombre o fabricante..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="login-input flex-1 min-w-[140px] text-xs py-1.5" />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="login-input text-xs py-1.5 w-auto">
          <option value="">Todos los tipos</option>
          {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
        </select>
        {(search || filterType) && (
          <button onClick={() => { setSearch(""); setFilterType(""); }}
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
          <table className="w-full text-xs font-mono border-collapse min-w-[480px]">
            <thead>
              <tr className="bg-outlaw-panel/60 border-b border-outlaw-border/50">
                <th className="text-outlaw-orange/60 tracking-widest text-left py-2.5 px-3 font-normal">NOMBRE</th>
                <th className="text-outlaw-orange/60 tracking-widest text-left py-2.5 px-3 font-normal hidden sm:table-cell">TIPO</th>
                <th className="text-outlaw-orange/60 tracking-widest text-left py-2.5 px-3 font-normal hidden md:table-cell">CATEGORÍA</th>
                <th className="text-outlaw-orange/60 tracking-widest text-center py-2.5 px-3 font-normal">CANT. TOTAL</th>
                <th className="text-outlaw-orange/60 tracking-widest text-center py-2.5 px-3 font-normal">CALIDAD</th>
                <th className="text-outlaw-orange/60 tracking-widest text-center py-2.5 px-3 font-normal">PILOTOS</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((agg) => {
                const ti = TYPE_MAP[agg.type] ?? { icon: "📦", label: agg.type };
                const isExpanded = expanded === agg.key;
                return (
                  <>
                    <tr key={agg.key}
                      className={`border-b border-outlaw-border/15 hover:bg-outlaw-panel/25 transition-colors cursor-pointer ${isExpanded ? "bg-outlaw-panel/30" : ""}`}
                      onClick={() => setExpanded(isExpanded ? null : agg.key)}>
                      <td className="py-3 px-3">
                        <span className="text-gray-100 font-semibold">{agg.name}</span>
                        {agg.manufacturer && <span className="text-gray-600 ml-2 text-[10px]">{agg.manufacturer}</span>}
                        <span className="text-outlaw-orange/30 ml-2 text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                      </td>
                      <td className="py-3 px-3 hidden sm:table-cell text-gray-500">{ti.icon} {ti.label}</td>
                      <td className="py-3 px-3 hidden md:table-cell text-gray-600">{agg.category || "—"}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="bg-outlaw-orange/20 text-outlaw-orange px-1.5 py-0.5 text-[10px] font-bold tracking-wider">x{agg.totalQty}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {agg.quality > 0 ? (
                          <span className="bg-emerald-600/15 text-emerald-400 px-1.5 py-0.5 text-[10px] font-bold tracking-wider">{agg.quality}</span>
                        ) : (
                          <span className="text-gray-700">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-gray-500">{agg.pilots.length}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${agg.key}-detail`} className="border-b border-outlaw-border/15">
                        <td colSpan={6} className="p-0">
                          <div className="bg-outlaw-panel/20 border-l-2 border-outlaw-orange/40 mx-3 my-2 px-4 py-3">
                            <p className="text-outlaw-orange/60 text-[10px] tracking-[0.2em] uppercase mb-2">PILOTOS CON ESTE MATERIAL</p>
                            <div className="space-y-1.5">
                              {agg.pilots.map((p, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-300">{p.userName}</span>
                                  <span className="text-outlaw-orange font-bold">x{p.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-xs font-mono text-gray-600">
          <span>{filtered.length} materiales · pág {page}/{totalPages}</span>
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
