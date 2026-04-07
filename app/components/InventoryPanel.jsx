"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

/* ── Catálogos SC ─────────────────────────────────── */
export const ITEM_TYPES = [
  { value: "ship",      label: "Nave",        icon: "🚀" },
  { value: "weapon",    label: "Arma",        icon: "🔫" },
  { value: "armor",     label: "Armadura",    icon: "🛡️" },
  { value: "component", label: "Componente",  icon: "⚙️" },
  { value: "vehicle",   label: "Vehículo",    icon: "🚗" },
  { value: "other",     label: "Otro",        icon: "📦" },
];

const CATS = {
  ship:      ["Fighter", "Bomber", "Cargo", "Mining", "Exploration", "Medical", "Racing", "Capital", "Multi-role", "Support", "Stealth"],
  weapon:    ["Ballistic", "Laser", "Missile", "Cannon", "Shotgun", "Railgun", "Pistol", "Rifle", "Heavy", "Gun"],
  armor:     ["Undersuit", "Helmet", "Core", "Arms", "Legs", "Full Set", "Backpack", "Clothing"],
  component: ["Shield", "Quantum Drive", "Power Plant", "Cooler", "Fuel Intake", "Weapon Mount", "Ship Weapon", "Missile", "Missile Rack", "Turret", "Radar", "Thruster", "Mining Laser", "Fuel Tank"],
  vehicle:   ["Ground", "Submersible"],
  other:     ["Consumable", "Tool", "Misc", "Paint"],
};

export const STATUSES = [
  { value: "available", label: "Disponible", color: "#4ade80" },
  { value: "in_use",    label: "En Uso",     color: "#f26419" },
  { value: "damaged",   label: "Dañado",     color: "#ef4444" },
  { value: "loaned",    label: "Prestado",   color: "#60a5fa" },
];

export const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.value, s]));
export const TYPE_MAP   = Object.fromEntries(ITEM_TYPES.map((t) => [t.value, t]));

const PAGE_SIZE  = 12;
const EMPTY_FORM = {
  type: "ship", name: "", manufacturer: "", category: "",
  quantity: 1, quality: 0, assignedTo: "", notes: "", imageUrl: "",
};

/* ── CSV export ─────────────────────────────────────── */
export function exportCSV(items, filename = "inventario.csv") {
  const headers = ["ID", "Nombre", "Tipo", "Fabricante", "Categoría", "Calidad", "Cantidad", "Asignado a", "Propietario", "Notas"];
  const rows = items.map((i) =>
    [i.id, i.name, i.type, i.manufacturer, i.category, i.quality ?? 0, i.quantity ?? 1, i.assignedTo, i.userName, i.notes]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
  );
  const csv  = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────────────────
   ItemSearchBox — Buscador de items de la librería SC
   ───────────────────────────────────────────────────── */
function ItemSearchBox({ onSelect, activeType, onTypeChange }) {
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [open,      setOpen]      = useState(false);
  const [libStatus, setLibStatus] = useState(null);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef(null);
  const debounceRef  = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const typeParam = activeType ? `&type=${activeType}` : "";
      const res  = await fetch(`/api/items-library?q=${encodeURIComponent(q)}&limit=15${typeParam}`);
      const data = await res.json();
      if (!data.imported) { setLibStatus("empty"); setResults([]); }
      else { setLibStatus("ok"); setResults(data.results || []); }
      setOpen(true); setHighlighted(-1);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [activeType]);

  function handleInput(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  }
  function handleSelect(item) { setQuery(""); setOpen(false); setResults([]); onSelect(item); }
  function handleKeyDown(e) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown")      { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, results.length - 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" && highlighted >= 0) { e.preventDefault(); handleSelect(results[highlighted]); }
    else if (e.key === "Escape") setOpen(false);
  }

  const typeIcon = (t) => TYPE_MAP[t]?.icon || "📦";

  return (
    <div ref={containerRef} className="relative">
      <label className="inv-label flex items-center gap-2 mb-2">
        &#128269; Buscar en la Base de Datos SC
      </label>
      <div className="flex gap-2 items-stretch">
        <select value={activeType} onChange={(e) => onTypeChange(e.target.value)}
          className="login-input text-xs py-1.5 flex-shrink-0" style={{ width: "140px" }}>
          {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
        </select>
        <div className="relative flex-1 min-w-0">
          <input type="text" value={query} onChange={handleInput} onKeyDown={handleKeyDown}
            onFocus={() => { if (results.length > 0) setOpen(true); }}
            placeholder="Buscar item... (ej: Hornet, Morozov, Behring...)"
            className="login-input w-full pr-8" />
          {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outlaw-orange text-xs animate-pulse">...</span>}
        </div>
      </div>
      {open && (
        <div className="absolute z-[10000] left-0 right-0 top-full mt-1 bg-[#0d0d0d] border border-outlaw-orange/30 max-h-64 overflow-y-auto shadow-2xl"
          style={{ backdropFilter: "blur(8px)" }}>
          {libStatus === "empty" ? (
            <div className="px-4 py-6 text-center">
              <p className="text-gray-500 text-xs font-mono mb-2">Base de datos no importada</p>
              <p className="text-gray-700 text-[10px] font-mono">Ejecuta: <span className="text-outlaw-orange">node scripts/import-items.mjs</span></p>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-4 text-center text-gray-600 text-xs font-mono">Sin resultados para &quot;{query}&quot;</div>
          ) : results.map((item, idx) => (
            <button key={item.uuid || `${item.className}-${idx}`} onClick={() => handleSelect(item)}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-3 border-b border-outlaw-border/10 transition-colors ${
                idx === highlighted ? "bg-outlaw-orange/15 text-gray-100" : "hover:bg-outlaw-panel/40 text-gray-300"
              }`}>
              {/* Thumbnail */}
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="w-10 h-10 object-cover rounded flex-shrink-0 bg-black/40" />
              ) : (
                <span className="text-lg flex-shrink-0 w-10 h-10 flex items-center justify-center bg-outlaw-panel/40 rounded">{typeIcon(item.type)}</span>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold truncate">{item.name}</span>
                  {item.manufacturer && <span className="text-[10px] text-gray-600 flex-shrink-0">{item.manufacturer}</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-outlaw-orange/60">{TYPE_MAP[item.type]?.label || item.type}</span>
                  {item.subCategory && <span className="text-[10px] text-gray-700">{item.subCategory}</span>}
                  {item.msrp && <span className="text-[10px] text-green-700">${item.msrp} USD</span>}
                </div>
              </div>
              <span className="text-outlaw-orange/40 text-xs flex-shrink-0">{">"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   InventoryCard — tarjeta individual del mosaico
   ───────────────────────────────────────────────────── */
function InventoryCard({ item, onEdit, onDelete, deleteConfirm, setDeleteConfirm }) {
  const ti = TYPE_MAP[item.type] ?? { icon: "📦", label: item.type };
  const qty = item.quantity ?? 1;
  const hasImage = !!item.imageUrl;

  return (
    <div className="group relative overflow-hidden border border-outlaw-border/40 hover:border-outlaw-orange/50 transition-all duration-300 bg-[#111]"
      style={{ clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))" }}>

      {/* Image / Fallback background */}
      <div className="relative h-40 sm:h-44 lg:h-48 overflow-hidden">
        {hasImage ? (
          <img src={item.imageUrl} alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
        ) : null}
        {/* Fallback (always rendered, hidden if image loads) */}
        <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] ${hasImage ? "hidden" : ""}`}
          style={hasImage ? { display: "none" } : undefined}>
          <span className="text-5xl opacity-30">{ti.icon}</span>
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/40 to-transparent" />

        {/* Badges (quantity + quality) */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {qty > 1 && (
            <div className="bg-outlaw-orange text-[#0d0d0d] font-mono text-[10px] font-bold px-2 py-0.5 tracking-wider">
              x{qty}
            </div>
          )}
          {(item.quality ?? 0) > 0 && (
            <div className="bg-emerald-600/90 text-white font-mono text-[10px] font-bold px-2 py-0.5 tracking-wider">
              Q:{item.quality}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {deleteConfirm === item.id ? (
            <>
              <button onClick={() => onDelete(item.id)}
                className="w-7 h-7 flex items-center justify-center bg-red-600/90 hover:bg-red-500 text-white text-xs rounded-sm transition-colors backdrop-blur-sm">
                {"✓"}
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="w-7 h-7 flex items-center justify-center bg-gray-700/80 hover:bg-gray-600 text-white text-xs rounded-sm transition-colors backdrop-blur-sm">
                {"✕"}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onEdit(item)}
                className="w-7 h-7 flex items-center justify-center bg-outlaw-orange/80 hover:bg-outlaw-orange text-[#0d0d0d] text-xs rounded-sm transition-colors backdrop-blur-sm"
                title="Editar">
                {"✎"}
              </button>
              <button onClick={() => setDeleteConfirm(item.id)}
                className="w-7 h-7 flex items-center justify-center bg-gray-700/80 hover:bg-red-600/90 text-white text-xs rounded-sm transition-colors backdrop-blur-sm"
                title="Eliminar">
                🗑
              </button>
            </>
          )}
        </div>

        {/* Name + info overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3 lg:p-4">
          <h3 className="font-display text-sm lg:text-base font-bold text-gray-100 leading-tight truncate">
            {item.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono text-outlaw-orange/70">{ti.icon} {ti.label}</span>
            {item.category && (
              <span className="text-[10px] font-mono text-gray-500">{item.category}</span>
            )}
          </div>
          {item.manufacturer && (
            <p className="text-[10px] font-mono text-gray-600 mt-0.5">{item.manufacturer}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   InventoryPanel — inventario personal mosaico
   ───────────────────────────────────────────────────── */
export default function InventoryPanel({ userName }) {
  const [items,         setItems]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [search,        setSearch]        = useState("");
  const [filterType,    setFilterType]    = useState("");
  const [page,          setPage]          = useState(1);
  const [modal,         setModal]         = useState(null);
  const [editItem,      setEditItem]      = useState(null);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [saving,        setSaving]        = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchItems(); }, []);
  useEffect(() => { setPage(1); }, [search, filterType]);

  async function fetchItems() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/inventory");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch { setError("Error cargando inventario"); }
    finally  { setLoading(false); }
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url    = modal === "edit" ? `/api/inventory/${editItem.id}` : "/api/inventory";
      const method = modal === "edit" ? "PUT" : "POST";
      const payload = { ...form, assignedTo: form.assignedTo || userName || "" };
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      await fetchItems();
      closeModal();
    } catch { setError("Error guardando. Inténtalo de nuevo."); }
    finally  { setSaving(false); }
  }

  async function handleDelete(id) {
    try {
      await fetch(`/api/inventory/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      setDeleteConfirm(null);
    } catch { setError("Error eliminando el activo."); }
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM, assignedTo: userName || "" });
    setModal("add");
  }
  function openEdit(item) {
    setEditItem(item);
    setForm({
      type: item.type, name: item.name, manufacturer: item.manufacturer,
      category: item.category, quantity: item.quantity ?? 1, quality: item.quality ?? 0,
      assignedTo: item.assignedTo, notes: item.notes, imageUrl: item.imageUrl || "",
    });
    setModal("edit");
  }
  function closeModal() { setModal(null); setEditItem(null); setForm(EMPTY_FORM); }
  function setF(k) { return (e) => setForm((f) => ({ ...f, [k]: e.target.value })); }

  function handleLibrarySelect(libItem) {
    setForm((f) => ({
      ...f,
      type:         libItem.type         || f.type,
      name:         libItem.name         || f.name,
      manufacturer: libItem.manufacturer || f.manufacturer,
      category:     libItem.subCategory  || f.category,
      imageUrl:     libItem.imageUrl     || f.imageUrl,
    }));
  }

  const filtered = items.filter((i) =>
    (!search     || i.name.toLowerCase().includes(search.toLowerCase()) || (i.manufacturer ?? "").toLowerCase().includes(search.toLowerCase())) &&
    (!filterType || i.type === filterType)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div id="priv-inventario" className="mt-2">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-outlaw-orange text-xs tracking-[0.3em] uppercase font-display flex items-center gap-2">
          <span>//</span> INVENTARIO PERSONAL
          <span className="text-gray-700 font-mono normal-case tracking-normal">({items.length} activos)</span>
        </p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => exportCSV(filtered, "mi-inventario.csv")}
            className="text-xs font-mono px-3 py-1.5 border border-outlaw-border text-gray-400 hover:text-outlaw-orange hover:border-outlaw-orange/40 transition-colors">
            ↓ CSV
          </button>
          <button onClick={openAdd}
            className="text-xs font-display font-bold px-4 py-1.5 border border-outlaw-orange text-outlaw-orange hover:bg-outlaw-orange hover:text-[#0d0d0d] transition-colors tracking-widest">
            + AÑADIR
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 mb-5">
        <input type="text" placeholder="Buscar nombre o fabricante..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="login-input flex-1 min-w-[160px] text-xs py-1.5" />
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

      {/* ── Mosaic Grid ── */}
      {loading ? (
        <div className="text-center py-16 text-gray-600 font-mono text-xs animate-pulse">[ CARGANDO DATOS... ]</div>
      ) : paged.length === 0 ? (
        <div className="text-center py-16 text-gray-700 font-mono text-xs border border-outlaw-border/20">
          {items.length === 0
            ? "Inventario vacío. Añade tu primer activo con el botón + AÑADIR."
            : "Sin resultados para los filtros actuales."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paged.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              onEdit={openEdit}
              onDelete={handleDelete}
              deleteConfirm={deleteConfirm}
              setDeleteConfirm={setDeleteConfirm}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5 text-xs font-mono text-gray-600">
          <span>{filtered.length} items {"·"} pág {page}/{totalPages}</span>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 border border-outlaw-border disabled:opacity-30 hover:text-outlaw-orange hover:border-outlaw-orange/40 transition-colors">{"←"}</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 border border-outlaw-border disabled:opacity-30 hover:text-outlaw-orange hover:border-outlaw-orange/40 transition-colors">{"→"}</button>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal (portal) ── */}
      {modal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(6px)" }}>
          <div className="bg-[#111] border border-outlaw-orange/40 w-full max-w-2xl p-8 relative"
            style={{ maxHeight: "calc(100vh - 2rem)", overflowY: "auto" }}>

            <button onClick={closeModal}
              className="absolute top-4 right-4 text-gray-600 hover:text-outlaw-orange text-xs font-mono transition-colors z-10">
              [ X ]
            </button>

            <p className="text-outlaw-orange text-xs tracking-[0.3em] uppercase font-display mb-5">
              {modal === "add" ? "// NUEVO ACTIVO" : "// EDITAR ACTIVO"}
            </p>

            {/* Buscador (solo en add) */}
            {modal === "add" && (
              <div className="mb-5 pb-5 border-b border-outlaw-border/30">
                <ItemSearchBox
                  onSelect={handleLibrarySelect}
                  activeType={form.type}
                  onTypeChange={(val) => setForm((f) => ({ ...f, type: val, category: "" }))}
                />
                <p className="text-gray-700 text-[10px] font-mono mt-2 italic">
                  Selecciona tipo y busca un item para autorellenar, o rellena manualmente.
                </p>
              </div>
            )}

            {/* Image preview */}
            {form.imageUrl && (
              <div className="mb-4 relative h-32 overflow-hidden border border-outlaw-border/30 bg-black/30">
                <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover opacity-70" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent" />
                <span className="absolute bottom-2 left-3 text-[10px] font-mono text-gray-500">Vista previa</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {modal === "edit" && (
                <div className="col-span-2">
                  <label className="inv-label">Tipo *</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value, category: "" }))} className="login-input w-full">
                    {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
              )}

              <div className="col-span-2">
                <label className="inv-label">Nombre *</label>
                <input type="text" value={form.name} onChange={setF("name")}
                  placeholder={form.type === "ship" ? "Ej: Hornet F7C" : "Nombre del activo"}
                  className="login-input w-full" />
              </div>

              <div>
                <label className="inv-label">Fabricante</label>
                <input type="text" value={form.manufacturer} onChange={setF("manufacturer")}
                  placeholder="Ej: Anvil" className="login-input w-full" />
              </div>
              <div>
                <label className="inv-label">Categoría</label>
                <select value={form.category} onChange={setF("category")} className="login-input w-full">
                  <option value="">— seleccionar —</option>
                  {(CATS[form.type] ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="inv-label">Unidades</label>
                <input type="number" min="1" value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                  className="login-input w-full" />
              </div>
              <div>
                <label className="inv-label">Calidad (0-1000)</label>
                <input type="number" min="0" max="1000" value={form.quality}
                  onChange={(e) => setForm((f) => ({ ...f, quality: Math.min(1000, Math.max(0, parseInt(e.target.value) || 0)) }))}
                  className="login-input w-full" />
              </div>

              <div className="col-span-2">
                <label className="inv-label">Notas</label>
                <input type="text" value={form.notes} onChange={setF("notes")}
                  placeholder="Notas adicionales..." className="login-input w-full" />
              </div>

              <div className="col-span-2 flex gap-3 pt-2">
                <button onClick={handleSave} disabled={!form.name.trim() || saving}
                  className="flex-1 font-display font-bold text-sm tracking-[0.15em] uppercase py-3 border-2 border-outlaw-orange text-outlaw-orange hover:bg-outlaw-orange hover:text-[#0d0d0d] transition-all duration-300 disabled:opacity-40">
                  {saving ? "GUARDANDO..." : modal === "add" ? "AÑADIR ACTIVO" : "GUARDAR CAMBIOS"}
                </button>
                <button onClick={closeModal}
                  className="px-8 font-mono text-xs border border-outlaw-border text-gray-600 hover:text-gray-300 transition-colors">
                  CANCELAR
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
