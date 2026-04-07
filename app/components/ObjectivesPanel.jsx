"use client";
import { useState, useEffect } from "react";
import { TYPE_MAP } from "./InventoryPanel";

/* ── Polaris Blueprint ─────────────────────────────── */
const POLARIS_BLUEPRINT = {
  name: "Polaris",
  alias: "Wikelo",
  imageUrl: "https://api.fleetyards.net/files/representations/redirect/eyJfcmFpbHMiOnsiZGF0YSI6ImU0NTE3NzNiLWRjZmMtNGEyZS1hN2QwLWExYjgwNjQwM2I4OSIsInB1ciI6ImJsb2JfaWQifX0=--ff89b0b659bbb7dbc40111e513f17a9bb69aa169/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fbGltaXQiOlsxMDAwLDEwMDBdLCJzYXZlciI6eyJxdWFsaXR5Ijo5MH19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--0255f19aa51b0278809e817bb9bb7491a7e8f422/Star_Citizen_Polaris_Banner_4k-a3d0875b-8fc5-4113-a7e1-1e34951a7955-701fae60-ae68-4e2c-b7cb-e986d56309ab.jpg/",
  materials: [
    { name: "Wikelo Favors",                         required: 50  },
    { name: "Polaris Bits",                           required: 15  },
    { name: "DCHS-05 Comp-Board",                     required: 10  },
    { name: "Carinite",                               required: 20  },
    { name: "Irradiated Valakkar Fang (Apex)",        required: 20  },
    { name: "MG Scrip",                               required: 20  },
    { name: "Ace Interceptor Helmet",                 required: 15  },
    { name: "Irradiated Valakkar Pearl (Grade AAA)",  required: 15  },
    { name: "UEE 6th Platoon Medal (Pristine)",       required: 15  },
    { name: "Carinite (Pure)",                        required: 15  },
    { name: "ASD Secure Drive",                       required: 15  },
    { name: "RCMBNT-PWL-2",                           required: 1   },
    { name: "RCMBNT-RGL-2",                           required: 1   },
    { name: "RCMBNT-XTL-2",                           required: 1   },
    { name: "RCMBNT-PWL-3",                           required: 1   },
    { name: "RCMBNT-RGL-3",                           required: 1   },
    { name: "RCMBNT-XTL-3",                           required: 1   },
    { name: "RCMBNT-PWL-1",                           required: 1   },
    { name: "RCMBNT-RGL-1",                           required: 1   },
    { name: "RCMBNT-XTL-1",                           required: 1   },
    { name: "Quantanium",                             required: 360 },
    { name: "Irradiated Valakkar Pearl (Grade AA)",   required: 1   },
    { name: "concil scrip",                           required: 1   },
  ],
};

/* ── Idris Blueprint ───────────────────────────────── */
const IDRIS_BLUEPRINT = {
  name: "Idris",
  alias: "Wikelo",
  imageUrl: "https://api.fleetyards.net/files/representations/redirect/eyJfcmFpbHMiOnsiZGF0YSI6IjhhMDI1ZWUzLTk5YzgtNDI4OC1hZTY2LThlOTg3NmY0Mzc1NCIsInB1ciI6ImJsb2JfaWQifX0=--27d51a22041df22a0ddc8bb4228db9c03cce5e59/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGVnIiwicmVzaXplX3RvX2xpbWl0IjpbMTAwMCwxMDAwXSwic2F2ZXIiOnsicXVhbGl0eSI6OTB9fSwicHVyIjoidmFyaWF0aW9uIn19--655a6fd8f896c239be9fd09eee55030bc69d8d6d/Idris-M-Min-b78cb2bb-84ed-40e0-a268-cd0f16904716-385d6e7b-df2c-4e13-99b3-528f19cb2fbc.jpeg/",
  materials: [
    { name: "Wikelo Favors",                         required: 50   },
    { name: "Polaris Bits",                           required: 50   },
    { name: "DCHS-05 Comp-Board",                     required: 50   },
    { name: "Carinite",                               required: 50   },
    { name: "Irradiated Valakkar Fang (Apex)",        required: 50   },
    { name: "MG Scrip",                               required: 50   },
    { name: "Ace Interceptor Helmet",                 required: 50   },
    { name: "Irradiated Valakkar Pearl (Grade AAA)",  required: 30   },
    { name: "UEE 6th Platoon Medal (Pristine)",       required: 30   },
    { name: "Carinite (Pure)",                        required: 30   },
    { name: "ASD Secure Drive",                       required: 30   },
    { name: "RCMBNT-PWL-2",                           required: 5    },
    { name: "RCMBNT-RGL-2",                           required: 5    },
    { name: "RCMBNT-XTL-2",                           required: 5    },
    { name: "RCMBNT-PWL-3",                           required: 5    },
    { name: "RCMBNT-RGL-3",                           required: 5    },
    { name: "RCMBNT-XTL-3",                           required: 5    },
    { name: "RCMBNT-PWL-1",                           required: 5    },
    { name: "RCMBNT-RGL-1",                           required: 5    },
    { name: "RCMBNT-XTL-1",                           required: 5    },
    { name: "Quantanium",                             required: 1200 },
    { name: "Irradiated Valakkar Pearl (Grade AA)",   required: 0    },
    { name: "concil scrip",                           required: 0    },
  ],
};

const OBJECTIVES = [POLARIS_BLUEPRINT, IDRIS_BLUEPRINT];

/**
 * Match org inventory items to a material name (case-insensitive).
 * Returns { total, pilots: [{ userName, quantity }] }
 */
function matchMaterial(materialName, orgItems) {
  const key = materialName.toLowerCase();
  const matching = orgItems.filter((i) => i.name.toLowerCase() === key);
  const total = matching.reduce((sum, i) => sum + (i.quantity ?? 1), 0);
  const pilots = matching.map((i) => ({ userName: i.userName || "—", quantity: i.quantity ?? 1 }));
  return { total, pilots };
}

function ObjectiveCard({ objective, orgItems, isOpen, onToggle }) {
  const materials = objective.materials.map((mat) => {
    const match = matchMaterial(mat.name, orgItems);
    return { ...mat, gathered: match.total, pilots: match.pilots };
  });

  const totalRequired = materials.reduce((s, m) => s + m.required, 0);
  const totalGathered = materials.reduce((s, m) => s + Math.min(m.gathered, m.required), 0);
  const pct = totalRequired > 0 ? Math.round((totalGathered / totalRequired) * 100) : 0;

  const completedMats = materials.filter((m) => m.gathered >= m.required).length;

  return (
    <div className="border border-outlaw-border/40 hover:border-outlaw-orange/40 transition-colors bg-[#111]">
      {/* Card header — always visible */}
      <button onClick={onToggle} className="w-full text-left p-4 sm:p-5 flex items-center gap-4 sm:gap-6">
        {/* Thumbnail */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 overflow-hidden border border-outlaw-border/30 bg-black/40">
          {objective.imageUrl ? (
            <img src={objective.imageUrl} alt={objective.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">🚀</div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-display text-base sm:text-lg font-bold text-gray-100">{objective.name}</h3>
            {objective.alias && <span className="text-gray-600 text-xs font-mono">({objective.alias})</span>}
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-2.5 bg-outlaw-panel/60 border border-outlaw-border/30 overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: pct >= 100 ? "#4ade80" : pct >= 50 ? "#f26419" : "#ef4444",
                }}
              />
            </div>
            <span className="font-mono text-sm font-bold flex-shrink-0" style={{
              color: pct >= 100 ? "#4ade80" : pct >= 50 ? "#f26419" : "#ef4444",
            }}>
              {pct}%
            </span>
          </div>

          <p className="text-gray-600 text-[10px] font-mono tracking-wider">
            {completedMats}/{materials.length} materiales completados
          </p>
        </div>

        <span className="text-outlaw-orange/40 text-xs flex-shrink-0">{isOpen ? "▲" : "▼"}</span>
      </button>

      {/* Expanded detail */}
      {isOpen && (
        <div className="border-t border-outlaw-border/30 px-4 sm:px-5 pb-5">
          {/* Ship image banner */}
          {objective.imageUrl && (
            <div className="relative h-40 sm:h-52 overflow-hidden my-4 border border-outlaw-border/20">
              <img src={objective.imageUrl} alt={objective.name} className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/40 to-transparent" />
              <div className="absolute bottom-3 left-4">
                <h3 className="font-display text-xl font-bold text-gray-100">{objective.name}</h3>
                {objective.alias && <p className="text-outlaw-orange/60 text-xs font-mono">{objective.alias}</p>}
              </div>
            </div>
          )}

          <p className="text-outlaw-orange text-[10px] tracking-[0.3em] uppercase font-display mb-3 mt-4">
            // COMPONENTES Y MATERIALES
          </p>

          <MaterialsTable materials={materials} />
        </div>
      )}
    </div>
  );
}

function MaterialsTable({ materials }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="overflow-x-auto border border-outlaw-border/30">
      <table className="w-full text-xs font-mono border-collapse min-w-[420px]">
        <thead>
          <tr className="bg-outlaw-panel/60 border-b border-outlaw-border/50">
            <th className="text-outlaw-orange/60 tracking-widest text-left py-2.5 px-3 font-normal">MATERIAL</th>
            <th className="text-outlaw-orange/60 tracking-widest text-center py-2.5 px-3 font-normal">NECESARIOS</th>
            <th className="text-outlaw-orange/60 tracking-widest text-center py-2.5 px-3 font-normal">CONSEGUIDOS</th>
            <th className="text-outlaw-orange/60 tracking-widest text-center py-2.5 px-3 font-normal">PROGRESO</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((mat, idx) => {
            const pct = mat.required > 0 ? Math.min(100, Math.round((mat.gathered / mat.required) * 100)) : 0;
            const done = mat.gathered >= mat.required;
            const isExp = expanded === idx;
            const hasPilots = mat.pilots.length > 0;

            return (
              <>
                <tr
                  key={idx}
                  className={`border-b border-outlaw-border/15 transition-colors ${
                    hasPilots ? "cursor-pointer hover:bg-outlaw-panel/25" : ""
                  } ${isExp ? "bg-outlaw-panel/30" : ""}`}
                  onClick={() => hasPilots && setExpanded(isExp ? null : idx)}
                >
                  <td className="py-2.5 px-3">
                    <span className={done ? "text-emerald-400" : "text-gray-200"}>{mat.name}</span>
                    {hasPilots && (
                      <span className="text-outlaw-orange/30 ml-2 text-[10px]">{isExp ? "▲" : "▼"}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center text-gray-500">{mat.required}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`font-bold ${
                      done ? "text-emerald-400" : mat.gathered > 0 ? "text-outlaw-orange" : "text-gray-700"
                    }`}>
                      {mat.gathered}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 h-1.5 bg-outlaw-panel/60 border border-outlaw-border/20 overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${pct}%`,
                            background: done ? "#4ade80" : pct > 0 ? "#f26419" : "transparent",
                          }}
                        />
                      </div>
                      <span className="text-[10px] w-8 text-right" style={{
                        color: done ? "#4ade80" : pct > 0 ? "#f26419" : "#374151",
                      }}>
                        {pct}%
                      </span>
                    </div>
                  </td>
                </tr>
                {isExp && hasPilots && (
                  <tr key={`${idx}-pilots`} className="border-b border-outlaw-border/15">
                    <td colSpan={4} className="p-0">
                      <div className="bg-outlaw-panel/20 border-l-2 border-outlaw-orange/40 mx-3 my-2 px-4 py-3">
                        <p className="text-outlaw-orange/60 text-[10px] tracking-[0.2em] uppercase mb-2">PILOTOS CON ESTE MATERIAL</p>
                        <div className="space-y-1.5">
                          {mat.pilots.map((p, pidx) => (
                            <div key={pidx} className="flex items-center justify-between text-xs">
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
  );
}

export default function ObjectivesPanel() {
  const [orgItems, setOrgItems] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [openObj,  setOpenObj]  = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res  = await fetch("/api/org-inventory");
        const data = await res.json();
        setOrgItems(data.items ?? []);
      } catch { setError("Error cargando datos de inventario"); }
      finally  { setLoading(false); }
    }
    load();
  }, []);

  return (
    <div id="priv-objetivos" className="mt-2">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-outlaw-orange text-xs tracking-[0.3em] uppercase font-display flex items-center gap-2">
          <span>//</span> OBJETIVOS
          <span className="text-gray-700 font-mono normal-case tracking-normal">({OBJECTIVES.length} activos)</span>
        </p>
      </div>

      {error && <p className="text-red-500 text-xs font-mono mb-3 border border-red-900/50 bg-red-950/20 px-3 py-2">{error}</p>}

      {loading ? (
        <div className="text-center py-16 text-gray-600 font-mono text-xs animate-pulse">[ CARGANDO OBJETIVOS... ]</div>
      ) : (
        <div className="space-y-4">
          {OBJECTIVES.map((obj, idx) => (
            <ObjectiveCard
              key={idx}
              objective={obj}
              orgItems={orgItems}
              isOpen={openObj === idx}
              onToggle={() => setOpenObj(openObj === idx ? null : idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
