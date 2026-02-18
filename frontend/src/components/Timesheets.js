// Timesheets.jsx — 100% inline styles, zero Tailwind dependency
import { useState, useMemo, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, parseISO, subMonths } from 'date-fns';
import {
  ChevronDown, Plus, Trash2, Coffee, Send, AlertCircle,
  CheckCircle, CheckCircle2, XCircle, Clock, Eye, Search,
  Filter, Users, Calendar, FileText, Download, TrendingUp,
  BarChart3, Building2, UserCheck,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const API_BASE = 'http://localhost:5000/api';

// ─── Theme tokens ───────────────────────────────────────────────────────────
const C = {
  purple:       '#6b5b7a',
  purpleDark:   '#5a4a69',
  purpleLight:  '#f3f0f7',
  purpleBorder: '#c8bfd4',
  purpleMid:    '#8b7a99',
  green:        '#4a7c59',
  greenLight:   '#f0f7f0',
  greenBorder:  '#b8d4bc',
  red:          '#c1666b',
  redLight:     '#fef3f3',
  redBorder:    '#e8c4c6',
  amber:        '#d97706',
  amberLight:   '#fff4e6',
  amberBorder:  '#fcd34d',
  holiday:      '#fef3c7',
  holidayText:  '#92400e',
  text:         '#32363a',
  textMid:      '#6a6d70',
  bg:           '#f8f8f8',
  white:        '#ffffff',
  border:       '#e0e0e0',
  borderLight:  '#f0f0f0',
  rowAlt:       '#fcfcfc',
  headerBg:     '#fafafa',
  totalBg:      '#f9f8fb',
  totalBorder:  '#e0dae6',
};

// ─── Shared style objects ────────────────────────────────────────────────────
const S = {
  page: { minHeight: '100vh', background: C.bg, overflowX: 'auto' },
  inner: { padding: '24px', minWidth: 0 },
  maxW: { maxWidth: '1600px', margin: '0 auto', minWidth: 0 },
  pageHeader: { marginBottom: '24px' },
  pageTitle: { fontSize: '28px', fontWeight: '400', color: C.text, margin: '0 0 6px 0' },
  pageSubtitle: { fontSize: '14px', color: C.textMid, margin: 0 },

  card: {
    background: C.white,
    borderRadius: '6px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    border: `1px solid ${C.border}`,
  },
  cardPad: { padding: '20px' },
  cardPadSm: { padding: '16px' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
  statsGrid5: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' },
  statsGrid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' },

  statCard: {
    background: C.white, borderRadius: '6px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    border: `1px solid ${C.border}`, padding: '20px',
  },
  statLabel: { fontSize: '13px', color: C.textMid, margin: '0 0 8px 0', fontWeight: '500' },
  statValue: { fontSize: '30px', fontWeight: '600', color: C.text, margin: '0 0 4px 0' },
  statSub: { fontSize: '12px', color: C.textMid, margin: 0 },
  statRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' },

  row: { display: 'flex', alignItems: 'center' },
  rowBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' },
  rowGap4: { display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },
  rowGap2: { display: 'flex', alignItems: 'center', gap: '8px' },

  select: {
    appearance: 'none', background: C.white,
    border: `1px solid ${C.border}`, borderRadius: '5px',
    padding: '8px 36px 8px 12px', fontSize: '14px', color: C.text,
    cursor: 'pointer', outline: 'none',
  },
  selectWrap: { position: 'relative', display: 'inline-block' },
  chevron: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: C.textMid },

  input: {
    border: `1px solid ${C.border}`, borderRadius: '5px',
    padding: '8px 12px', fontSize: '14px', color: C.text,
    outline: 'none', background: C.white,
  },
  searchWrap: { position: 'relative' },
  searchIcon: { position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: C.textMid },

  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 16px', background: C.purple, color: C.white,
    border: 'none', borderRadius: '5px', fontSize: '14px', fontWeight: '500',
    cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  btnSecondary: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px', background: C.white, color: C.text,
    border: `1px solid #b0b0b0`, borderRadius: '5px', fontSize: '14px',
    fontWeight: '500', cursor: 'pointer',
  },
  btnGreen: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 16px', background: C.green, color: C.white,
    border: 'none', borderRadius: '5px', fontSize: '14px', fontWeight: '500',
    cursor: 'pointer',
  },
  btnDisabled: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 16px', background: '#d1d5db', color: '#9ca3af',
    border: 'none', borderRadius: '5px', fontSize: '14px', fontWeight: '500',
    cursor: 'not-allowed',
  },
  btnIcon: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '6px', background: 'transparent', border: 'none',
    borderRadius: '4px', cursor: 'pointer', color: C.textMid,
  },

  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: C.headerBg, borderBottom: `1px solid ${C.border}` },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: C.text, whiteSpace: 'nowrap' },
  thRight: { padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: C.text },
  thCenter: { padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: C.text },
  td: { padding: '14px 16px', fontSize: '14px', color: C.text, borderBottom: `1px solid ${C.borderLight}` },
  tdMid: { padding: '14px 16px', fontSize: '14px', color: C.textMid, borderBottom: `1px solid ${C.borderLight}` },
  tdRight: { padding: '14px 16px', fontSize: '14px', color: C.text, textAlign: 'right', borderBottom: `1px solid ${C.borderLight}` },
  tdCenter: { padding: '14px 16px', textAlign: 'center', borderBottom: `1px solid ${C.borderLight}` },
  trEven: { background: C.white },
  trOdd: { background: C.rowAlt },

  badge: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '4px 10px', borderRadius: '20px', fontSize: '12px',
    fontWeight: '500', border: '1px solid',
  },
  tag: {
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 8px', borderRadius: '4px',
    fontSize: '12px', fontWeight: '500',
  },

  infoBox: {
    padding: '14px 16px', borderRadius: '6px',
    border: `1px solid ${C.totalBorder}`,
    background: C.totalBg, marginTop: '20px',
  },
  infoTitle: { fontSize: '13px', fontWeight: '600', color: C.purple, margin: '0 0 8px 0' },
  infoList: { listStyle: 'none', margin: 0, padding: 0 },
  infoItem: { fontSize: '13px', color: C.textMid, marginBottom: '4px' },

  alertBox: (type) => ({
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    padding: '14px 16px', borderRadius: '6px', marginBottom: '20px',
    border: `1px solid ${type === 'error' ? '#fca5a5' : type === 'success' ? C.greenBorder : C.purpleBorder}`,
    background: type === 'error' ? '#fef2f2' : type === 'success' ? C.greenLight : C.purpleLight,
  }),

  // Scrollable table wrapper — used everywhere we render a <table>
  tableScroll: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
};

// ─── fetchAPI ───────────────────────────────────────────────────────────────
const fetchAPI = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }
  return response.json();
};

// ─── StatusBadge ────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  draft:              { bg: '#f9fafb', color: '#6b7280', border: '#d1d5db' },
  pending_lead:       { bg: C.purpleLight, color: C.purple, border: C.purpleBorder },
  pending_manager:    { bg: C.amberLight, color: C.amber, border: C.amberBorder },
  approved:           { bg: C.greenLight, color: C.green, border: C.greenBorder },
  rejected_by_lead:   { bg: C.redLight, color: C.red, border: C.redBorder },
  rejected_by_manager:{ bg: C.redLight, color: C.red, border: C.redBorder },
  pending:            { bg: C.purpleLight, color: C.purple, border: C.purpleBorder },
  submitted:          { bg: C.purpleLight, color: C.purple, border: C.purpleBorder },
  rejected:           { bg: C.redLight, color: C.red, border: C.redBorder },
};
const STATUS_LABELS = {
  draft: 'Draft', pending_lead: 'Pending Lead', pending_manager: 'Pending Manager',
  approved: 'Approved', rejected_by_lead: 'Rejected by Lead',
  rejected_by_manager: 'Rejected by Manager', pending: 'Pending',
  submitted: 'Pending', rejected: 'Rejected',
};

function StatusBadge({ status }) {
  const st = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <span style={{ ...S.badge, background: st.bg, color: st.color, borderColor: st.border }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ─── SelectWrap ─────────────────────────────────────────────────────────────
function SelectWrap({ value, onChange, children, style = {} }) {
  return (
    <div style={{ ...S.selectWrap, ...style }}>
      <select value={value} onChange={onChange} style={S.select}>{children}</select>
      <ChevronDown size={14} style={S.chevron} />
    </div>
  );
}

// ─── ChargeCodeSelector ──────────────────────────────────────────────────────
function ChargeCodeSelector({ chargeCodes, selectedId, onChange, disabled }) {
  return (
    <div style={S.selectWrap}>
      <select
        value={selectedId} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        style={{ ...S.select, width: '100%', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <option value="">Select charge code</option>
        {chargeCodes.map((code) => (
          <option key={code._id} value={code.charge_code_id}>
            {code.charge_code} - {code.charge_code_name}
          </option>
        ))}
      </select>
      <ChevronDown size={14} style={S.chevron} />
    </div>
  );
}

// ─── PeriodSelector ──────────────────────────────────────────────────────────
function PeriodSelector({ currentMonth, selectedPeriod, onPeriodChange }) {
  return (
    <SelectWrap value={selectedPeriod} onChange={(e) => onPeriodChange(e.target.value)}>
      <option value="1st-half">{currentMonth} – 1st Half</option>
      <option value="2nd-half">{currentMonth} – 2nd Half</option>
      <option value="past">Past Timesheets</option>
    </SelectWrap>
  );
}

// ─── TabBar ──────────────────────────────────────────────────────────────────
function TimesheetTabBar({ activeTab, setActiveTab, user }) {
  const role = user?.role || 'Employee';
  const tabs = role === 'Admin'
    ? [
        { key: 'all_timesheets', label: 'All Timesheets', Icon: Building2 },
        { key: 'approvals', label: 'Approvals', Icon: CheckCircle },
      ]
    : [
        { key: 'timesheet', label: 'My Timesheet', Icon: FileText },
        ...(user?.reportsTo || role === 'Manager' ? [{ key: 'team_timesheets', label: 'Team Timesheets', Icon: Users }] : []),
        { key: 'approvals', label: 'Approvals', Icon: CheckCircle },
        { key: 'history', label: 'History', Icon: Clock },
        { key: 'reports', label: 'Reports', Icon: BarChart3 },
      ];

  return (
    <div style={{ background: C.headerBg, borderBottom: `1px solid ${C.border}`, padding: '0 24px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <nav style={{ display: 'flex', gap: '4px', minWidth: 'max-content' }}>
        {tabs.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '12px 16px', background: 'none', border: 'none',
                borderBottom: active ? `2px solid ${C.purple}` : '2px solid transparent',
                color: active ? C.purple : C.textMid,
                fontSize: '14px', fontWeight: active ? '600' : '400',
                cursor: 'pointer', marginBottom: '-1px', whiteSpace: 'nowrap',
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ─── TimesheetGrid ────────────────────────────────────────────────────────────
function TimesheetGrid({ dates, rows, chargeCodes, onRowUpdate, onRowAdd, onRowDelete, readOnly = false, approvedLeaves = [], holidays = [] }) {
  const updateEntry = (rowId, dateStr, field, value) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    onRowUpdate(rowId, { entries: row.entries.map((e) => e.date === dateStr ? { ...e, [field]: value } : e) });
  };
  const getEntry = (row, dateStr) =>
    row.entries.find((e) => e.date === dateStr) || { date: dateStr, hours: 0, entry_type: 'work' };
  const getRowTotal = (row) =>
    row.entries.reduce((s, e) => s + (e.entry_type === 'leave' || e.entry_type === 'holiday' || e.isLeave ? 8 : (e.hours || 0)), 0);
  const getColTotal = (dateStr) =>
    rows.reduce((s, row) => {
      const e = getEntry(row, dateStr);
      return s + (e.entry_type === 'leave' || e.entry_type === 'holiday' || e.isLeave ? 8 : (e.hours || 0));
    }, 0);
  const isHoliday = (d) => holidays.some((h) => h.date === d);
  const hasLeave = (d) => approvedLeaves.some((l) => l.start_date <= d && l.end_date >= d && l.status === 'Approved');

  const thStyle = (isHol) => ({
    padding: '10px 8px', textAlign: 'center', fontSize: '12px', fontWeight: '600',
    minWidth: '90px', borderLeft: `1px solid ${C.borderLight}`,
    background: isHol ? C.holiday : C.headerBg, color: isHol ? C.holidayText : C.text,
  });

  return (
    <div style={{ ...S.card, overflow: 'hidden' }}>
      {/* Key fix: overflowX scroll on the wrapper so the table can scroll horizontally */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ ...S.table, minWidth: 'max-content' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.headerBg }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: C.text, position: 'sticky', left: 0, background: C.headerBg, zIndex: 10, minWidth: '260px' }}>
                Charge Code
              </th>
              {dates.map((d) => {
                const isHol = isHoliday(d);
                return (
                  <th key={d} style={thStyle(isHol)}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <span style={{ fontSize: '11px', color: isHol ? C.holidayText : C.textMid }}>{format(parseISO(d), 'EEE')}</span>
                      <span>{format(parseISO(d), 'MMM d')}</span>
                      {isHol && <span style={{ fontSize: '10px' }}>🎉</span>}
                    </div>
                  </th>
                );
              })}
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: C.purple, background: C.totalBg, minWidth: '80px', borderLeft: `1px solid ${C.border}` }}>
                Total
              </th>
              {!readOnly && <th style={{ padding: '12px', background: C.headerBg, position: 'sticky', right: 0, borderLeft: `1px solid ${C.borderLight}`, width: '50px' }} />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.id} style={{ background: ri % 2 === 0 ? C.white : C.rowAlt, borderBottom: `1px solid ${C.borderLight}` }}>
                <td style={{ padding: '10px 16px', position: 'sticky', left: 0, background: ri % 2 === 0 ? C.white : C.rowAlt, zIndex: 5, borderRight: `1px solid ${C.borderLight}` }}>
                  <ChargeCodeSelector chargeCodes={chargeCodes} selectedId={row.chargeCodeId}
                    onChange={(id) => onRowUpdate(row.id, { chargeCodeId: id })} disabled={readOnly} />
                </td>
                {dates.map((d) => {
                  const entry = getEntry(row, d);
                  const isHol = isHoliday(d);
                  const isLeave = entry.entry_type === 'leave' || entry.isLeave;
                  const isHolidayEntry = entry.entry_type === 'holiday';
                  return (
                    <td key={d} style={{ padding: '8px', textAlign: 'center', borderLeft: `1px solid ${C.borderLight}`, background: isHol ? '#fffbeb' : 'transparent' }}>
                      {isLeave ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <Coffee size={13} style={{ color: C.purpleMid }} />
                          <span style={{ fontSize: '12px', color: C.textMid }}>Leave</span>
                          {!readOnly && (
                            <button onClick={() => updateEntry(row.id, d, 'entry_type', 'work')}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: C.textMid, padding: '0 2px' }}>✕</button>
                          )}
                        </div>
                      ) : isHolidayEntry ? (
                        <span style={{ fontSize: '12px', color: C.holidayText, fontWeight: '500' }}>Holiday</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <input type="number" min="0" max="24" step="0.5"
                            value={entry.hours || ''} disabled={readOnly || isHol}
                            onChange={(e) => updateEntry(row.id, d, 'hours', parseFloat(e.target.value) || 0)}
                            style={{ width: '52px', padding: '4px 6px', border: `1px solid ${C.border}`, borderRadius: '4px', textAlign: 'center', fontSize: '13px', outline: 'none', background: readOnly || isHol ? C.headerBg : C.white }} />
                          {!readOnly && !isHol && (
                            <button onClick={() => { if (!hasLeave(d) && approvedLeaves.length > 0) { alert('No approved leave for this date.'); return; } updateEntry(row.id, d, 'entry_type', 'leave'); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0b8cc', padding: '2px' }} title="Mark as leave">
                              <Coffee size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: '600', background: C.totalBg, borderLeft: `1px solid ${C.border}`, color: C.purple }}>
                  {getRowTotal(row)}h
                </td>
                {!readOnly && (
                  <td style={{ padding: '10px', textAlign: 'center', position: 'sticky', right: 0, background: ri % 2 === 0 ? C.white : C.rowAlt, borderLeft: `1px solid ${C.borderLight}` }}>
                    <button onClick={() => onRowDelete(row.id)} style={{ ...S.btnIcon, color: C.red }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            <tr style={{ background: C.totalBg, borderTop: `2px solid ${C.totalBorder}` }}>
              <td style={{ padding: '10px 16px', fontWeight: '600', color: C.purple, position: 'sticky', left: 0, background: C.totalBg }}>Daily Total</td>
              {dates.map((d) => (
                <td key={d} style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '600', color: C.purple, borderLeft: `1px solid ${C.borderLight}` }}>{getColTotal(d)}h</td>
              ))}
              <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: '700', background: C.purpleLight, color: C.purple, borderLeft: `1px solid ${C.totalBorder}` }}>
                {rows.reduce((s, r) => s + getRowTotal(r), 0)}h
              </td>
              {!readOnly && <td style={{ borderLeft: `1px solid ${C.borderLight}` }} />}
            </tr>
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.headerBg }}>
          <button onClick={onRowAdd} style={S.btnSecondary}>
            <Plus size={14} /> Add Charge Code
          </button>
        </div>
      )}
    </div>
  );
}

// ─── TimesheetPage (Employee) ─────────────────────────────────────────────────
function TimesheetPage({ user }) {
  const currentDate = new Date();
  const [selectedPeriod, setSelectedPeriod] = useState('1st-half');
  const [timesheetStatus, setTimesheetStatus] = useState('draft');
  const [rows, setRows] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [chargeCodes, setChargeCodes] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);

  const dates = useMemo(() => {
    const ms = startOfMonth(currentDate), me = endOfMonth(currentDate);
    if (selectedPeriod === '1st-half') return eachDayOfInterval({ start: ms, end: addDays(ms, 13) }).map((d) => format(d, 'yyyy-MM-dd'));
    if (selectedPeriod === '2nd-half') return eachDayOfInterval({ start: addDays(ms, 14), end: me }).map((d) => format(d, 'yyyy-MM-dd'));
    return eachDayOfInterval({ start: addDays(ms, -14), end: addDays(ms, -1) }).map((d) => format(d, 'yyyy-MM-dd'));
  }, [selectedPeriod]);

  useEffect(() => {
    if (!user?._id) return;
    fetchAPI(`/charge_codes/employee/${user._id}?active_only=true`).then(setChargeCodes).catch(console.error);
    fetchAPI(`/leaves/history/${user._id}`).then((d) => setApprovedLeaves(d.filter((l) => l.status === 'Approved'))).catch(console.error);
  }, [user]);

  useEffect(() => {
    if (!dates.length) return;
    fetchAPI('/timesheets/populate_holidays', { method: 'POST', body: JSON.stringify({ period_start: dates[0], period_end: dates[dates.length - 1] }) })
      .then((d) => setHolidays(d.holidays || [])).catch(console.error);
  }, [dates]);

  useMemo(() => {
    if (rows.length === 0 && chargeCodes.length > 0) {
      setRows([{ id: 'row1', chargeCodeId: '', entries: dates.map((d) => ({ date: d, hours: 0, entry_type: 'work' })) }]);
    } else {
      setRows((prev) => prev.map((row) => {
        const map = row.entries.reduce((a, e) => { a[e.date] = e; return a; }, {});
        return { ...row, entries: dates.map((d) => map[d] || { date: d, hours: 0, entry_type: 'work' }) };
      }));
    }
  }, [dates, chargeCodes]);

  const validate = () => {
    const errors = [];
    if (rows.filter((r) => !r.chargeCodeId).length > 0) errors.push(`${rows.filter((r) => !r.chargeCodeId).length} row(s) missing charge code`);
    if (rows.every((r) => r.entries.every((e) => e.hours === 0 && e.entry_type === 'work'))) errors.push('Enter hours or mark leave days for at least one row');
    if (rows.length === 0) errors.push('Add at least one charge code row');
    return errors;
  };

  useEffect(() => { setValidationErrors(validate()); }, [rows]);

  const handleSubmit = async () => {
    const errors = validate();
    if (errors.length) { alert('Please fix:\n\n' + errors.join('\n')); return; }
    setLoading(true);
    try {
      const entries = [];
      rows.forEach((row) => {
        if (!row.chargeCodeId) return;
        row.entries.forEach((e) => { if (e.hours > 0 || e.entry_type !== 'work') entries.push({ date: e.date, entry_type: e.entry_type, charge_code_id: e.entry_type === 'work' ? row.chargeCodeId : undefined, hours: e.hours || 8, description: '' }); });
      });
      await fetchAPI('/timesheets/create', { method: 'POST', body: JSON.stringify({ employee_id: user._id, period_start: dates[0], period_end: dates[dates.length - 1], entries }) });
      setTimesheetStatus('pending_lead');
      alert('Timesheet submitted successfully!');
    } catch (err) { alert(`Failed: ${err.message}`); }
    finally { setLoading(false); }
  };

  const getTotalHours = () => rows.reduce((t, row) => t + row.entries.reduce((s, e) => s + (e.entry_type === 'leave' || e.entry_type === 'holiday' || e.isLeave ? 8 : (e.hours || 0)), 0), 0);
  const currentMonth = format(currentDate, 'MMMM yyyy');
  const isReadOnly = ['approved', 'pending_lead', 'pending_manager'].includes(timesheetStatus);
  const canSubmit = timesheetStatus === 'draft' || timesheetStatus.startsWith('rejected');

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.maxW}>
          <div style={S.pageHeader}>
            <h1 style={S.pageTitle}>My Timesheet</h1>
            <p style={S.pageSubtitle}>Track your hours by fortnight period</p>
          </div>

          {/* Controls */}
          <div style={{ ...S.card, ...S.cardPadSm, marginBottom: '20px' }}>
            <div style={S.rowBetween}>
              <div style={S.rowGap4}>
                <PeriodSelector currentMonth={currentMonth} selectedPeriod={selectedPeriod}
                  onPeriodChange={(p) => { setSelectedPeriod(p); setTimesheetStatus(p === 'past' ? 'approved' : 'draft'); }} />
                <StatusBadge status={timesheetStatus} />
              </div>
              <div style={S.rowGap4}>
                <span style={{ fontSize: '13px', color: C.textMid }}>
                  Total: <strong style={{ color: C.text }}>{getTotalHours()}h</strong>
                </span>
                {canSubmit && (
                  <button onClick={handleSubmit} disabled={validationErrors.length > 0 || loading}
                    style={validationErrors.length > 0 || loading ? S.btnDisabled : S.btnPrimary}>
                    <Send size={14} />{loading ? 'Submitting…' : 'Submit Timesheet'}
                  </button>
                )}
                {(timesheetStatus === 'pending_lead' || timesheetStatus === 'pending_manager') && (
                  <button onClick={() => setTimesheetStatus('draft')}
                    style={{ ...S.btnPrimary, background: '#ea580c' }}>
                    Edit Timesheet
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Validation errors */}
          {canSubmit && validationErrors.length > 0 && (
            <div style={{ ...S.alertBox('error'), marginBottom: '20px' }}>
              <AlertCircle size={16} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#991b1b', margin: '0 0 6px 0' }}>Please fix the following issues before submitting:</p>
                {validationErrors.map((e, i) => (
                  <p key={i} style={{ fontSize: '13px', color: '#b91c1c', margin: '0 0 2px 0' }}>• {e}</p>
                ))}
              </div>
            </div>
          )}

          {/* Status message */}
          {timesheetStatus !== 'draft' && (() => {
            const isPending = timesheetStatus === 'pending_lead' || timesheetStatus === 'pending_manager';
            const isApproved = timesheetStatus === 'approved';
            return (
              <div style={{ padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px',
                background: isPending ? C.purpleLight : isApproved ? C.greenLight : C.redLight,
                border: `1px solid ${isPending ? C.purpleBorder : isApproved ? C.greenBorder : C.redBorder}`,
                color: isPending ? C.purple : isApproved ? C.green : C.red }}>
                {timesheetStatus === 'pending_lead' && <><strong>Pending Lead Approval:</strong> Your timesheet is awaiting approval from your reporting lead.</>}
                {timesheetStatus === 'pending_manager' && <><strong>Pending Manager Approval:</strong> Approved by your lead, now awaiting final manager approval.</>}
                {timesheetStatus === 'approved' && <><strong>Approved:</strong> This timesheet is permanently locked. Contact your manager for corrections.</>}
                {timesheetStatus.startsWith('rejected') && <><strong>Rejected:</strong> Please review feedback, make changes, and resubmit.</>}
              </div>
            );
          })()}

          <TimesheetGrid dates={dates} rows={rows} chargeCodes={chargeCodes}
            onRowUpdate={(id, u) => setRows((p) => p.map((r) => r.id === id ? { ...r, ...u } : r))}
            onRowAdd={() => setRows((p) => [...p, { id: `row${Date.now()}`, chargeCodeId: '', entries: dates.map((d) => ({ date: d, hours: 0, entry_type: 'work' })) }])}
            onRowDelete={(id) => setRows((p) => p.filter((r) => r.id !== id))}
            readOnly={isReadOnly} approvedLeaves={approvedLeaves} holidays={holidays} />

          <div style={S.infoBox}>
            <p style={S.infoTitle}>Instructions</p>
            <ul style={S.infoList}>
              {['Select a charge code for each row (only your assigned codes are shown)',
                'Enter hours worked per day (0.5 hour increments)',
                'Click the ☕ icon to mark a day as leave (requires approved leave)',
                'Public holidays are automatically highlighted',
                'After submitting, click "Edit Timesheet" to make changes while pending',
              ].map((t, i) => <li key={i} style={S.infoItem}>• {t}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Approvals ───────────────────────────────────────────────────────────────
function Approvals({ user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedTimesheets, setSelectedTimesheets] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?._id) return;
    setLoading(true);
    const ep = user?.role === 'Manager' ? `/timesheets/pending/manager/${user._id}` : `/timesheets/pending/lead/${user._id}`;
    fetchAPI(ep).then(setApprovals).catch(() => alert('Failed to load')).finally(() => setLoading(false));
  }, [user]);

  const filtered = approvals.filter((a) => {
    const name = (a.employee_name || a.employeeName || '').toLowerCase();
    const email = (a.employee_email || a.employeeId || '').toLowerCase();
    return (name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase())) &&
      (statusFilter === 'all' || a.status === statusFilter);
  });

  const pendingCount = approvals.filter((a) => ['pending', 'pending_lead', 'pending_manager'].includes(a.status)).length;
  const approvedCount = approvals.filter((a) => a.status === 'approved').length;
  const pendingHours = approvals.filter((a) => ['pending', 'pending_lead', 'pending_manager'].includes(a.status)).reduce((s, a) => s + (a.total_hours || a.totalHours || 0), 0);

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this timesheet?')) return;
    setLoading(true);
    const ep = user?.role === 'Manager' ? `/timesheets/approve/manager/${id}` : `/timesheets/approve/lead/${id}`;
    try {
      await fetchAPI(ep, { method: 'PUT', body: JSON.stringify({ approved_by: user._id, comments: '' }) });
      setApprovals((p) => p.map((a) => (a._id === id || a.id === id) ? { ...a, status: 'approved' } : a));
      alert('Approved');
    } catch (err) { alert(`Failed: ${err.message}`); }
    finally { setLoading(false); }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) return;
    setLoading(true);
    const ep = user?.role === 'Manager' ? `/timesheets/reject/manager/${id}` : `/timesheets/reject/lead/${id}`;
    try {
      await fetchAPI(ep, { method: 'PUT', body: JSON.stringify({ rejected_by: user._id, rejection_reason: reason }) });
      setApprovals((p) => p.map((a) => (a._id === id || a.id === id) ? { ...a, status: 'rejected' } : a));
    } catch (err) { alert(`Failed: ${err.message}`); }
    finally { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.maxW}>
          <div style={S.pageHeader}>
            <h1 style={S.pageTitle}>Timesheet Approvals</h1>
            <p style={S.pageSubtitle}>Review and approve team member timesheets</p>
          </div>

          <div style={S.statsGrid}>
            {[
              { label: 'Pending Review', value: pendingCount, sub: 'Awaiting approval', Icon: Clock, color: C.text },
              { label: 'Approved', value: approvedCount, sub: 'This period', Icon: CheckCircle, color: C.green },
              { label: 'Hours Pending', value: `${pendingHours}h`, sub: 'Awaiting approval', Icon: Clock, color: C.text },
              { label: 'Your Role', value: user?.role || 'Lead', sub: 'Approval authority', Icon: UserCheck, color: C.text },
            ].map(({ label, value, sub, Icon, color }) => (
              <div key={label} style={S.statCard}>
                <div style={S.statRow}>
                  <span style={S.statLabel}>{label}</span>
                  <Icon size={18} style={{ color: C.purpleMid }} />
                </div>
                <div style={{ ...S.statValue, color }}>{value}</div>
                <div style={S.statSub}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ ...S.card, ...S.cardPadSm, marginBottom: '20px' }}>
            <div style={S.rowBetween}>
              <div style={S.rowGap4}>
                <div style={{ ...S.searchWrap }}>
                  <Search size={14} style={{ ...S.searchIcon }} />
                  <input placeholder="Search by name…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ ...S.input, paddingLeft: '32px', width: '220px' }} />
                </div>
                <SelectWrap value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="pending_lead">Pending Lead</option>
                  <option value="pending_manager">Pending Manager</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </SelectWrap>
              </div>
              {selectedTimesheets.length > 0 && (
                <button onClick={() => selectedTimesheets.forEach(handleApprove)} style={S.btnGreen}>
                  <CheckCircle size={14} /> Approve Selected ({selectedTimesheets.length})
                </button>
              )}
            </div>
          </div>

          {pendingCount > 0 && (
            <div style={{ ...S.alertBox('purple'), marginBottom: '20px' }}>
              <AlertCircle size={16} style={{ color: C.purple, flexShrink: 0, marginTop: '1px' }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: C.purple, margin: '0 0 2px 0' }}>
                  {pendingCount} timesheet{pendingCount !== 1 ? 's' : ''} pending approval
                </p>
                <p style={{ fontSize: '12px', color: C.textMid, margin: 0 }}>Please review to ensure timely payroll processing</p>
              </div>
            </div>
          )}

          <div style={{ ...S.card, overflow: 'hidden', marginBottom: '20px' }}>
            <div style={S.tableScroll}>
              <table style={{ ...S.table, minWidth: '800px' }}>
                <thead style={S.thead}>
                  <tr>
                    <th style={S.th}></th>
                    {['Employee', 'Period', 'Projects', 'Total Hours', 'Submitted', 'Status', 'Actions'].map((h) => (
                      <th key={h} style={h === 'Total Hours' ? S.thRight : h === 'Status' || h === 'Actions' ? S.thCenter : S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ ...S.td, textAlign: 'center', padding: '40px' }}>Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} style={{ ...S.tdMid, textAlign: 'center', padding: '40px' }}>No timesheets found</td></tr>
                  ) : filtered.map((a, i) => {
                    const id = a._id || a.id;
                    const isPending = ['pending', 'pending_lead', 'pending_manager'].includes(a.status);
                    const period = a.period || (a.period_start ? `${format(new Date(a.period_start), 'MMM d')} – ${format(new Date(a.period_end), 'MMM d, yyyy')}` : '');
                    return (
                      <tr key={id} style={i % 2 === 0 ? S.trEven : S.trOdd}>
                        <td style={S.td}>
                          {isPending && (
                            <input type="checkbox" checked={selectedTimesheets.includes(id)}
                              onChange={() => setSelectedTimesheets((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
                              style={{ width: '15px', height: '15px' }} />
                          )}
                        </td>
                        <td style={S.td}>
                          <div style={{ fontWeight: '500' }}>{a.employee_name || a.employeeName}</div>
                          <div style={{ fontSize: '12px', color: C.textMid }}>{a.employee_email || a.employeeId}</div>
                        </td>
                        <td style={S.td}>{period}</td>
                        <td style={S.td}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {(a.projects || []).slice(0, 2).map((p) => (
                              <span key={p} style={{ ...S.tag, background: C.totalBg, color: C.purple, border: `1px solid ${C.totalBorder}` }}>{p}</span>
                            ))}
                            {(a.projects || []).length > 2 && <span style={{ fontSize: '12px', color: C.textMid }}>+{a.projects.length - 2}</span>}
                          </div>
                        </td>
                        <td style={S.tdRight}><strong>{a.total_hours || a.totalHours}h</strong></td>
                        <td style={S.tdMid}>{a.submitted_at ? format(new Date(a.submitted_at), 'MMM d, yyyy') : '—'}</td>
                        <td style={S.tdCenter}><StatusBadge status={a.status} /></td>
                        <td style={S.tdCenter}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button onClick={() => alert(`View ${a.employee_name || a.employeeName}`)} style={S.btnIcon} title="View"><Eye size={15} /></button>
                            {isPending && (<>
                              <button onClick={() => handleApprove(id)} disabled={loading} style={{ ...S.btnIcon, color: C.green }} title="Approve"><CheckCircle size={15} /></button>
                              <button onClick={() => handleReject(id)} disabled={loading} style={{ ...S.btnIcon, color: C.red }} title="Reject"><XCircle size={15} /></button>
                            </>)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={S.infoBox}>
            <p style={S.infoTitle}>Approval Guidelines</p>
            <ul style={S.infoList}>
              {['Review each timesheet for accuracy and completeness',
                'Use bulk approve for multiple timesheets at once',
                'Rejected timesheets are returned to employee for revision',
                'Approve within 2 business days of submission',
              ].map((t, i) => <li key={i} style={S.infoItem}>• {t}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── History ─────────────────────────────────────────────────────────────────
function History({ user }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?._id) return;
    setLoading(true);
    fetchAPI(`/timesheets/employee/${user._id}`).then(setSubmissions).catch(() => alert('Failed')).finally(() => setLoading(false));
  }, [user]);

  const approved = submissions.filter((s) => s.status === 'approved');
  const rejected = submissions.filter((s) => s.status.startsWith('rejected'));
  const totalApprovedHours = approved.reduce((s, x) => s + (x.total_hours || 0), 0);
  const rate = submissions.length > 0 ? Math.round((approved.length / submissions.length) * 100) : 0;

  const filtered = submissions.filter((s) => {
    const period = s.period || '';
    const projects = s.projects || [];
    return (period.toLowerCase().includes(searchQuery.toLowerCase()) || projects.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase()))) &&
      (statusFilter === 'all' || (statusFilter === 'approved' && s.status === 'approved') || (statusFilter === 'rejected' && s.status.startsWith('rejected')));
  });

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.maxW}>
          <div style={S.pageHeader}>
            <h1 style={S.pageTitle}>Timesheet History</h1>
            <p style={S.pageSubtitle}>View and download your past timesheet submissions</p>
          </div>

          <div style={S.statsGrid}>
            {[
              { label: 'Total Submissions', value: submissions.length, sub: 'All time', Icon: Calendar, color: C.text },
              { label: 'Approved', value: approved.length, sub: `${rate}% approval rate`, Icon: CheckCircle2, color: C.green },
              { label: 'Rejected', value: rejected.length, sub: 'Needs resubmission', Icon: XCircle, color: C.red },
              { label: 'Total Hours', value: `${totalApprovedHours}h`, sub: 'Approved hours', Icon: Clock, color: C.text },
            ].map(({ label, value, sub, Icon, color }) => (
              <div key={label} style={S.statCard}>
                <div style={S.statRow}>
                  <span style={S.statLabel}>{label}</span>
                  <Icon size={18} style={{ color: C.purpleMid }} />
                </div>
                <div style={{ ...S.statValue, color }}>{value}</div>
                <div style={S.statSub}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{ ...S.card, overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <Search size={14} style={S.searchIcon} />
                <input placeholder="Search by period or project…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ ...S.input, paddingLeft: '32px', width: '100%', boxSizing: 'border-box' }} />
              </div>
              <SelectWrap value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </SelectWrap>
            </div>
            <div style={S.tableScroll}>
              <table style={{ ...S.table, minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Period', 'Date Range', 'Projects', 'Total Hours', 'Submitted', 'Status', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: C.textMid, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ ...S.tdMid, textAlign: 'center', padding: '40px' }}>Loading history…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ ...S.tdMid, textAlign: 'center', padding: '40px' }}>No submissions found</td></tr>
                  ) : filtered.map((s, i) => {
                    const period = s.period || (s.period_start ? `${format(new Date(s.period_start), 'MMM d')} – ${format(new Date(s.period_end), 'MMM d, yyyy')}` : '');
                    const isApproved = s.status === 'approved';
                    return (
                      <tr key={s._id || s.id} style={i % 2 === 0 ? S.trEven : S.trOdd}>
                        <td style={S.td}><strong>{period}</strong></td>
                        <td style={S.tdMid}>{period}</td>
                        <td style={S.td}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {(s.projects || []).map((p) => (
                              <span key={p} style={{ ...S.tag, background: '#f3f4f6', color: '#4b5563' }}>{p}</span>
                            ))}
                          </div>
                        </td>
                        <td style={S.td}><strong>{s.total_hours || s.totalHours || 0}h</strong></td>
                        <td style={S.tdMid}>{s.submitted_at ? format(new Date(s.submitted_at), 'MMM d, yyyy') : '—'}</td>
                        <td style={S.td}>
                          <span style={{ ...S.tag, background: isApproved ? '#dcfce7' : '#fee2e2', color: isApproved ? '#16a34a' : '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {isApproved ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {isApproved ? 'Approved' : 'Rejected'}
                          </span>
                        </td>
                        <td style={S.td}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button style={{ ...S.btnSecondary, padding: '4px 10px', fontSize: '13px' }}><Eye size={13} /> View</button>
                            <button style={{ ...S.btnIcon, border: `1px solid ${C.border}`, borderRadius: '5px' }}><Download size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────
const MOCK_CHARGE = [
  { code: 'PROJ-001', name: 'Website Redesign', hours: 84 },
  { code: 'PROJ-002', name: 'Mobile App Development', hours: 62 },
  { code: 'PROJ-003', name: 'Database Migration', hours: 48 },
  { code: 'ADMIN-001', name: 'Admin & Meetings', hours: 24 },
  { code: 'TRAIN-001', name: 'Training & Development', hours: 16 },
];
const MOCK_MONTHLY = [
  { month: 'Sep', hours: 168, leave: 16 }, { month: 'Oct', hours: 176, leave: 8 },
  { month: 'Nov', hours: 160, leave: 24 }, { month: 'Dec', hours: 144, leave: 32 },
  { month: 'Jan', hours: 168, leave: 16 }, { month: 'Feb', hours: 156, leave: 20 },
];
const MOCK_PIE = [
  { project: 'Website Redesign', hours: 84 }, { project: 'Mobile App', hours: 62 },
  { project: 'Database Migration', hours: 48 }, { project: 'Admin', hours: 24 }, { project: 'Training', hours: 16 },
];
const PIE_COLORS = [C.purple, C.purpleMid, '#a89db5', '#c5bfd1', '#e0dae6'];

function Reports({ user }) {
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const totalHours = MOCK_CHARGE.reduce((s, i) => s + i.hours, 0);

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.maxW}>
          <div style={S.pageHeader}>
            <h1 style={S.pageTitle}>Reports & Analytics</h1>
            <p style={S.pageSubtitle}>View your time allocation and project summaries</p>
          </div>

          <div style={{ ...S.card, ...S.cardPadSm, marginBottom: '20px' }}>
            <div style={S.rowBetween}>
              <div style={S.rowGap4}>
                <Calendar size={15} style={{ color: C.textMid }} />
                <span style={{ fontSize: '13px', color: C.textMid }}>Date Range:</span>
                <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} style={S.input} />
                <span style={{ color: C.textMid }}>to</span>
                <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} style={S.input} />
              </div>
              <button onClick={() => alert('Exporting…')} style={S.btnPrimary}><Download size={14} /> Export Report</button>
            </div>
          </div>

          <div style={S.statsGrid}>
            {[
              { label: 'Total Hours', value: `${totalHours}h`, sub: 'Last 3 months', Icon: Clock },
              { label: 'Avg/Week', value: `${(totalHours / 12).toFixed(1)}h`, sub: 'Weekly average', Icon: TrendingUp },
              { label: 'Active Projects', value: MOCK_CHARGE.length, sub: 'Charge codes used', Icon: FileText },
              { label: 'Utilization', value: '87%', sub: 'Billable hours', Icon: BarChart3 },
            ].map(({ label, value, sub, Icon }) => (
              <div key={label} style={S.statCard}>
                <div style={S.statRow}><span style={S.statLabel}>{label}</span><Icon size={18} style={{ color: C.purpleMid }} /></div>
                <div style={S.statValue}>{value}</div>
                <div style={S.statSub}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div style={{ ...S.card, padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: C.text, margin: '0 0 16px 0' }}>Monthly Hours Trend</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={MOCK_MONTHLY}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
                  <XAxis dataKey="month" stroke={C.textMid} tick={{ fontSize: 12 }} />
                  <YAxis stroke={C.textMid} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '4px', fontSize: '13px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="hours" fill={C.purple} name="Work Hours" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="leave" fill="#c5bfd1" name="Leave Hours" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ ...S.card, padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: C.text, margin: '0 0 16px 0' }}>Time by Project</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={MOCK_PIE} cx="50%" cy="50%" outerRadius={100} dataKey="hours"
                    label={({ name, value }) => `${name}: ${value}h`} labelLine={false}>
                    {MOCK_PIE.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '4px', fontSize: '13px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ ...S.card, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: C.text, margin: '0 0 4px 0' }}>Hours by Charge Code</h3>
              <p style={{ fontSize: '13px', color: C.textMid, margin: 0 }}>Detailed breakdown of time allocation</p>
            </div>
            <div style={S.tableScroll}>
              <table style={{ ...S.table, minWidth: '500px' }}>
                <thead style={S.thead}>
                  <tr>
                    {['Charge Code', 'Description', 'Total Hours', 'Percentage', 'Status'].map((h, i) => (
                      <th key={h} style={i >= 2 && i <= 3 ? S.thRight : i === 4 ? S.thCenter : S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_CHARGE.map((item, i) => (
                    <tr key={item.code} style={i % 2 === 0 ? S.trEven : S.trOdd}>
                      <td style={{ ...S.td, fontWeight: '500' }}>{item.code}</td>
                      <td style={S.tdMid}>{item.name}</td>
                      <td style={S.tdRight}><strong>{item.hours}h</strong></td>
                      <td style={S.tdRight}>{((item.hours / totalHours) * 100).toFixed(1)}%</td>
                      <td style={S.tdCenter}>
                        <span style={{ ...S.badge, background: C.greenLight, color: C.green, borderColor: C.greenBorder }}>Approved</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: C.totalBg, borderTop: `2px solid ${C.totalBorder}` }}>
                    <td colSpan={2} style={{ padding: '12px 16px', fontWeight: '600', color: C.purple }}>Total</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: C.purple }}>{totalHours}h</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: C.purple }}>100%</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TeamTimesheets ───────────────────────────────────────────────────────────
function TeamTimesheets({ user }) {
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!user?.email) return;
    setLoading(true);
    fetchAPI(`/users/get_employees_by_manager/${user.email}`)
      .then(async (emps) => {
        const all = [];
        for (const e of emps) { const ts = await fetchAPI(`/timesheets/employee/${e._id}`); all.push(...ts); }
        setTimesheets(all);
      }).catch(() => alert('Failed')).finally(() => setLoading(false));
  }, [user]);

  const filtered = timesheets.filter((ts) =>
    ((ts.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (ts.employee_email || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
    (statusFilter === 'all' || ts.status === statusFilter)
  );
  const stats = { total: timesheets.length, pending: timesheets.filter((t) => t.status.startsWith('pending')).length, approved: timesheets.filter((t) => t.status === 'approved').length, rejected: timesheets.filter((t) => t.status.startsWith('rejected')).length };

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.maxW}>
          <div style={S.pageHeader}>
            <h1 style={S.pageTitle}>Team Timesheets</h1>
            <p style={S.pageSubtitle}>View timesheets from your team members</p>
          </div>
          <div style={S.statsGrid}>
            {[
              { label: 'Total', value: stats.total, sub: 'All time', Icon: FileText },
              { label: 'Pending', value: stats.pending, sub: 'Awaiting approval', Icon: Clock },
              { label: 'Approved', value: stats.approved, sub: 'Completed', Icon: CheckCircle },
              { label: 'Rejected', value: stats.rejected, sub: 'Needs revision', Icon: XCircle },
            ].map(({ label, value, sub, Icon }) => (
              <div key={label} style={S.statCard}>
                <div style={S.statRow}><span style={S.statLabel}>{label}</span><Icon size={18} style={{ color: C.purpleMid }} /></div>
                <div style={S.statValue}>{value}</div>
                <div style={S.statSub}>{sub}</div>
              </div>
            ))}
          </div>
          <div style={{ ...S.card, ...S.cardPadSm, marginBottom: '20px' }}>
            <div style={S.rowGap4}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={14} style={S.searchIcon} />
                <input placeholder="Search by employee…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ ...S.input, paddingLeft: '32px', width: '100%', boxSizing: 'border-box' }} />
              </div>
              <SelectWrap value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="pending_lead">Pending Lead</option>
                <option value="pending_manager">Pending Manager</option>
                <option value="approved">Approved</option>
                <option value="rejected_by_lead">Rejected by Lead</option>
                <option value="rejected_by_manager">Rejected by Manager</option>
              </SelectWrap>
            </div>
          </div>
          <div style={{ ...S.card, overflow: 'hidden' }}>
            <div style={S.tableScroll}>
              <table style={{ ...S.table, minWidth: '650px' }}>
                <thead style={S.thead}>
                  <tr>
                    {['Employee', 'Period', 'Total Hours', 'Submitted', 'Status', 'Actions'].map((h) => (
                      <th key={h} style={h === 'Total Hours' ? S.thRight : h === 'Status' || h === 'Actions' ? S.thCenter : S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={6} style={{ ...S.tdMid, textAlign: 'center', padding: '40px' }}>Loading…</td></tr>
                    : filtered.length === 0 ? <tr><td colSpan={6} style={{ ...S.tdMid, textAlign: 'center', padding: '40px' }}>No timesheets found</td></tr>
                    : filtered.map((ts, i) => (
                      <tr key={ts._id} style={i % 2 === 0 ? S.trEven : S.trOdd}>
                        <td style={S.td}><div style={{ fontWeight: '500' }}>{ts.employee_name}</div><div style={{ fontSize: '12px', color: C.textMid }}>{ts.employee_email}</div></td>
                        <td style={S.td}>{format(new Date(ts.period_start), 'MMM d')} – {format(new Date(ts.period_end), 'MMM d, yyyy')}</td>
                        <td style={S.tdRight}><strong>{ts.total_hours}h</strong></td>
                        <td style={S.tdMid}>{format(new Date(ts.submitted_at), 'MMM d, yyyy')}</td>
                        <td style={S.tdCenter}><StatusBadge status={ts.status} /></td>
                        <td style={S.tdCenter}><button onClick={() => alert('View details')} style={S.btnIcon}><Eye size={15} /></button></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AdminTimesheets ──────────────────────────────────────────────────────────
function AdminTimesheets({ user }) {
  const [timesheets, setTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAPI('/timesheets/all'), fetchAPI('/users/get_all_employees')])
      .then(([ts, emps]) => { setTimesheets(ts); setEmployees(emps); })
      .catch(() => alert('Failed')).finally(() => setLoading(false));
  }, []);

  const filtered = timesheets.filter((ts) =>
    ((ts.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (ts.employee_email || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
    (statusFilter === 'all' || ts.status === statusFilter) &&
    (selectedEmployee === 'all' || ts.employee_id === selectedEmployee)
  );
  const stats = { total: timesheets.length, pending: timesheets.filter((t) => t.status.startsWith('pending')).length, approved: timesheets.filter((t) => t.status === 'approved').length, rejected: timesheets.filter((t) => t.status.startsWith('rejected')).length, hours: timesheets.reduce((s, t) => s + (t.total_hours || 0), 0) };

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={{ ...S.maxW, maxWidth: '1800px' }}>
          <div style={S.pageHeader}>
            <h1 style={S.pageTitle}>All Timesheets</h1>
            <p style={S.pageSubtitle}>Complete overview of all employee timesheets</p>
          </div>
          <div style={S.statsGrid5}>
            {[
              { label: 'Total', value: stats.total, sub: 'All time', Icon: FileText },
              { label: 'Pending', value: stats.pending, sub: 'In queue', Icon: Clock },
              { label: 'Approved', value: stats.approved, sub: 'Completed', Icon: CheckCircle },
              { label: 'Rejected', value: stats.rejected, sub: 'Needs revision', Icon: XCircle },
              { label: 'Total Hours', value: `${stats.hours}h`, sub: 'All employees', Icon: TrendingUp },
            ].map(({ label, value, sub, Icon }) => (
              <div key={label} style={S.statCard}>
                <div style={S.statRow}><span style={S.statLabel}>{label}</span><Icon size={18} style={{ color: C.purpleMid }} /></div>
                <div style={S.statValue}>{value}</div>
                <div style={S.statSub}>{sub}</div>
              </div>
            ))}
          </div>
          <div style={{ ...S.card, ...S.cardPadSm, marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                <Search size={14} style={S.searchIcon} />
                <input placeholder="Search by employee name or email…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ ...S.input, paddingLeft: '32px', width: '100%', boxSizing: 'border-box' }} />
              </div>
              <SelectWrap value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} style={{ minWidth: '180px' }}>
                <option value="all">All Employees</option>
                {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
              </SelectWrap>
              <SelectWrap value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="pending_lead">Pending Lead</option>
                <option value="pending_manager">Pending Manager</option>
                <option value="approved">Approved</option>
                <option value="rejected_by_lead">Rejected by Lead</option>
                <option value="rejected_by_manager">Rejected by Manager</option>
              </SelectWrap>
              <button onClick={() => alert('Export')} style={S.btnPrimary}><Download size={14} /> Export</button>
            </div>
          </div>
          <div style={{ ...S.card, overflow: 'hidden', marginBottom: '20px' }}>
            <div style={S.tableScroll}>
              <table style={{ ...S.table, minWidth: '900px' }}>
                <thead style={S.thead}>
                  <tr>
                    {['Employee', 'Department', 'Period', 'Total Hours', 'Submitted', 'Status', 'Approver', 'Actions'].map((h) => (
                      <th key={h} style={h === 'Total Hours' ? S.thRight : h === 'Status' || h === 'Actions' ? S.thCenter : S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={8} style={{ ...S.tdMid, textAlign: 'center', padding: '40px' }}>Loading…</td></tr>
                    : filtered.length === 0 ? <tr><td colSpan={8} style={{ ...S.tdMid, textAlign: 'center', padding: '40px' }}>No timesheets found</td></tr>
                    : filtered.map((ts, i) => (
                      <tr key={ts._id} style={i % 2 === 0 ? S.trEven : S.trOdd}>
                        <td style={S.td}><div style={{ fontWeight: '500' }}>{ts.employee_name}</div><div style={{ fontSize: '12px', color: C.textMid }}>{ts.employee_email}</div></td>
                        <td style={S.tdMid}>{ts.employee_department || 'N/A'}</td>
                        <td style={S.td}>{format(new Date(ts.period_start), 'MMM d')} – {format(new Date(ts.period_end), 'MMM d, yyyy')}</td>
                        <td style={S.tdRight}><strong>{ts.total_hours}h</strong></td>
                        <td style={S.tdMid}>{format(new Date(ts.submitted_at), 'MMM d, yyyy')}</td>
                        <td style={S.tdCenter}><StatusBadge status={ts.status} /></td>
                        <td style={S.tdMid}>{ts.status === 'pending_lead' ? 'Reporting Lead' : ts.status === 'pending_manager' ? 'Manager' : '—'}</td>
                        <td style={S.tdCenter}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button onClick={() => alert('View')} style={S.btnIcon}><Eye size={15} /></button>
                            <button onClick={() => alert('Download')} style={S.btnIcon}><Download size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={S.infoBox}>
            <p style={S.infoTitle}>Admin View Features</p>
            <ul style={S.infoList}>
              {['View all employee timesheets across the organization',
                'Filter by employee, status, or search by name/email',
                'Monitor approval workflow and current approver stage',
                'Export timesheet data for reporting and payroll',
              ].map((t, i) => <li key={i} style={S.infoItem}>• {t}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function Timesheets({ user }) {
  const [activeTab, setActiveTab] = useState(user?.role === 'Admin' ? 'all_timesheets' : 'timesheet');

  const renderTab = () => {
    switch (activeTab) {
      case 'timesheet':       return <TimesheetPage user={user} />;
      case 'team_timesheets': return <TeamTimesheets user={user} />;
      case 'all_timesheets':  return <AdminTimesheets user={user} />;
      case 'approvals':       return <Approvals user={user} />;
      case 'history':         return <History user={user} />;
      case 'reports':         return <Reports user={user} />;
      default:                return <TimesheetPage user={user} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: '14px', color: C.text, overflowX: 'auto' }}>
      <TimesheetTabBar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
      {renderTab()}
    </div>
  );
}