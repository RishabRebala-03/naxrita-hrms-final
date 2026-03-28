import React, { useState, useEffect, useRef } from "react";
import "./DataMaintenance.css";
import { apiGet, apiPost, apiDelete } from "../services/api";

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const Icon = {
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Trash: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  ),
  Check: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Close: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Refresh: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Gender: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M12 12v8M9 18h6" />
    </svg>
  ),
  Stream: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  Certificate: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  ),
  College: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Warning: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface MasterItem {
  id: string;
  label: string;
  createdAt: string;
}

interface MasterData {
  genders: MasterItem[];
  streams: MasterItem[];
  certifications: MasterItem[];
  colleges: MasterItem[];
}

type Category = keyof MasterData;

interface ColMeta {
  key: Category;
  label: string;
  placeholder: string;
  Icon: React.FC;
}

const COLUMNS: ColMeta[] = [
  { key: "genders",       label: "Gender",           placeholder: "e.g. Male",                Icon: Icon.Gender },
  { key: "streams",       label: "Course Stream",    placeholder: "e.g. Computer Science",    Icon: Icon.Stream },
  { key: "certifications",label: "SAP Certification",placeholder: "e.g. SAP FICO",            Icon: Icon.Certificate },
  { key: "colleges",      label: "College Name",     placeholder: "e.g. MIT College of Engg", Icon: Icon.College },
];

// ─── Component ────────────────────────────────────────────────────────────────

const DataMaintenance: React.FC = () => {
  const [masterData, setMasterData] = useState<MasterData>({
    genders: [], streams: [], certifications: [], colleges: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Per-column "new value" input state
  const [newValues, setNewValues] = useState<Record<Category, string>>({
    genders: "", streams: "", certifications: "", colleges: "",
  });
  // Per-column "adding" loading state
  const [adding, setAdding] = useState<Record<Category, boolean>>({
    genders: false, streams: false, certifications: false, colleges: false,
  });
  // Per-column search filter
  const [searches, setSearches] = useState<Record<Category, string>>({
    genders: "", streams: "", certifications: "", colleges: "",
  });
  // Which input row is focused (show inline input)
  const [activeInput, setActiveInput] = useState<Category | null>(null);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<MasterData>("/admin/master-data");
      setMasterData({
        genders:        res.genders        || [],
        streams:        res.streams        || [],
        certifications: res.certifications || [],
        colleges:       res.colleges       || [],
      });
    } catch (e) {
      console.error("Failed to load master data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (cat: Category) => {
    const label = newValues[cat].trim();
    if (!label) return;
    setAdding(prev => ({ ...prev, [cat]: true }));
    try {
      const res = await apiPost<MasterItem>(`/admin/master-data/${cat}`, { label });
      setMasterData(prev => ({ ...prev, [cat]: [...prev[cat], res] }));
      setNewValues(prev => ({ ...prev, [cat]: "" }));
      setActiveInput(null);
    } catch (e: any) {
      alert(e?.message || "Failed to add item.");
    } finally {
      setAdding(prev => ({ ...prev, [cat]: false }));
    }
  };

  const handleDelete = async (cat: Category, id: string, label: string) => {
    if (!window.confirm(`Delete "${label}"? This may affect the registration form.`)) return;
    try {
      await apiDelete(`/admin/master-data/${cat}/${id}`);
      setMasterData(prev => ({ ...prev, [cat]: prev[cat].filter(i => i.id !== id) }));
    } catch (e: any) {
      alert(e?.message || "Failed to delete item.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, cat: Category) => {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(cat); }
    if (e.key === "Escape") { setActiveInput(null); setNewValues(prev => ({ ...prev, [cat]: "" })); }
  };

  // Build a unified row count — max items across all columns
  const maxRows = Math.max(...COLUMNS.map(c => {
    const q = searches[c.key].toLowerCase();
    return q ? masterData[c.key].filter(i => i.label.toLowerCase().includes(q)).length : masterData[c.key].length;
  }), 0);

  const getFilteredItems = (cat: Category): MasterItem[] => {
    const q = searches[cat].toLowerCase();
    return q ? masterData[cat].filter(i => i.label.toLowerCase().includes(q)) : masterData[cat];
  };

  const totalItems = COLUMNS.reduce((sum, c) => sum + masterData[c.key].length, 0);

  return (
    <div className="data-maintenance" style={{ paddingTop: "2rem" }}>

      {/* ── Header ── */}
      <div className="dm-page-header">
        <div>
          <h2>Data Maintenance</h2>
          <p className="dm-subtitle">
            Manage dropdown values shown to students during registration
            {!isLoading && <span className="dm-total-badge">{totalItems} total entries</span>}
          </p>
        </div>
        <button className="dm-refresh-btn" onClick={loadData} title="Refresh data">
          <Icon.Refresh /> Refresh
        </button>
      </div>

      {/* ── SAP-style Grid ── */}
      <div className="dm-grid-container">

        {/* Column headers */}
        <div className="dm-grid-header">
          <div className="dm-row-num-header">#</div>
          {COLUMNS.map(col => {
            const ColIcon = col.Icon;
            return (
            <div key={col.key} className="dm-col-header">
              <div className="dm-col-header-top">
                <span className="dm-col-header-icon"><ColIcon /></span>
                <span className="dm-col-header-label">{col.label}</span>
                <span className="dm-col-count">{masterData[col.key].length}</span>
              </div>
              {/* Per-column search */}
              <div className="dm-col-search-wrap">
                <span className="dm-col-search-icon"><Icon.Search /></span>
                <input
                  className="dm-col-search"
                  type="text"
                  placeholder={`Filter ${col.label.toLowerCase()}…`}
                  value={searches[col.key]}
                  onChange={e => setSearches(prev => ({ ...prev, [col.key]: e.target.value }))}
                />
              </div>
            </div>
          );
          })}
        </div>

        {/* Add-new row (always visible at top) */}
        <div className="dm-add-row">
          <div className="dm-row-num dm-row-num-add">
            <Icon.Plus />
          </div>
          {COLUMNS.map(col => (
            <div key={col.key} className="dm-add-cell">
              {activeInput === col.key ? (
                <div className="dm-inline-input-wrap">
                  <input
                    ref={el => { inputRefs.current[col.key] = el; }}
                    className="dm-inline-input"
                    type="text"
                    value={newValues[col.key]}
                    onChange={e => setNewValues(prev => ({ ...prev, [col.key]: e.target.value }))}
                    onKeyDown={e => handleKeyDown(e, col.key)}
                    placeholder={col.placeholder}
                    autoFocus
                    disabled={adding[col.key]}
                  />
                  <button
                    className="dm-inline-btn confirm"
                    onClick={() => handleAdd(col.key)}
                    disabled={adding[col.key] || !newValues[col.key].trim()}
                    title="Add (Enter)"
                  >
                    <Icon.Check />
                  </button>
                  <button
                    className="dm-inline-btn cancel"
                    onClick={() => { setActiveInput(null); setNewValues(prev => ({ ...prev, [col.key]: "" })); }}
                    title="Cancel (Esc)"
                  >
                    <Icon.Close />
                  </button>
                </div>
              ) : (
                <button
                  className="dm-add-trigger"
                  onClick={() => {
                    setActiveInput(col.key);
                    setTimeout(() => inputRefs.current[col.key]?.focus(), 50);
                  }}
                >
                  <Icon.Plus />
                  <span>Add {col.label}</span>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Data rows */}
        <div className="dm-grid-body">
          {isLoading ? (
            <div className="dm-loading-row">
              <div className="dm-spinner" />
              Loading data…
            </div>
          ) : maxRows === 0 ? (
            <div className="dm-empty-row">
              No entries found. Use the row above to add values.
            </div>
          ) : (
            Array.from({ length: maxRows }).map((_, rowIdx) => (
              <div key={rowIdx} className={`dm-data-row ${rowIdx % 2 === 0 ? "even" : "odd"}`}>
                <div className="dm-row-num">{rowIdx + 1}</div>
                {COLUMNS.map(col => {
                  const items = getFilteredItems(col.key);
                  const item = items[rowIdx];
                  return (
                    <div key={col.key} className="dm-data-cell">
                      {item ? (
                        <div className="dm-cell-content">
                          <span className="dm-cell-label" title={item.label}>{item.label}</span>
                          <button
                            className="dm-delete-btn"
                            onClick={() => handleDelete(col.key, item.id, item.label)}
                            title={`Delete "${item.label}"`}
                          >
                            <Icon.Trash />
                          </button>
                        </div>
                      ) : (
                        <span className="dm-cell-empty" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer summary */}
        {!isLoading && (
          <div className="dm-grid-footer">
            <div className="dm-row-num-footer" />
            {COLUMNS.map(col => (
              <div key={col.key} className="dm-footer-cell">
                {searches[col.key] ? (
                  <span className="dm-footer-filtered">
                    <Icon.Search /> {getFilteredItems(col.key).length} of {masterData[col.key].length}
                  </span>
                ) : (
                  <span className="dm-footer-count">{masterData[col.key].length} {masterData[col.key].length === 1 ? "entry" : "entries"}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="dm-info-note">
        <Icon.Warning />
        <span>Deleting a value will not affect students who have already registered with that value. It will only remove the option from the registration form.</span>
      </div>
    </div>
  );
};

export default DataMaintenance;