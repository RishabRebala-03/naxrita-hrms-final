import { useState, useMemo, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, parseISO, subMonths } from 'date-fns';
import {
  ChevronDown,
  Plus,
  Trash2,
  Coffee,
  Send,
  AlertCircle,
  User,
  Bell,
  HelpCircle,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
  Users,
  Calendar,
  FileText,
  Download,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
// Internal tab navigation — no react-router-dom needed (app uses section-based state)
// Tabs: 'timesheet' | 'reports' | 'approvals' | 'history'

// ─────────────────────────────────────────────
// TYPES (inline since no separate types file)
// ─────────────────────────────────────────────
// TimesheetStatus: 'draft' | 'submitted' | 'approved' | 'rejected'
// ChargeCode: { id, code, description }
// DayEntry: { date, hours, isLeave }
// TimesheetRow: { id, chargeCodeId, entries: DayEntry[] }
// TimesheetSubmission: { id, period, dateRange, projects, totalHours, submittedDate, status }

// ─────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────
const CHARGE_CODES = [
  { id: 'cc1', code: 'PROJ-001', description: 'Website Redesign' },
  { id: 'cc2', code: 'PROJ-002', description: 'Mobile App Development' },
  { id: 'cc3', code: 'PROJ-003', description: 'Database Migration' },
  { id: 'cc4', code: 'ADMIN-001', description: 'Admin & Meetings' },
  { id: 'cc5', code: 'TRAIN-001', description: 'Training & Development' },
  { id: 'cc6', code: 'SUPPORT-001', description: 'Client Support' },
];

const mockApprovals = [
  {
    id: 'ts001',
    employeeName: 'Sarah Johnson',
    employeeId: 'EMP-1234',
    period: 'February 2026 - 1st Half',
    periodStart: '2026-02-01',
    periodEnd: '2026-02-14',
    totalHours: 112,
    status: 'pending',
    submittedDate: '2026-02-14',
    projects: ['PROJ-001', 'PROJ-002', 'ADMIN-001'],
  },
  {
    id: 'ts002',
    employeeName: 'Michael Chen',
    employeeId: 'EMP-1235',
    period: 'February 2026 - 1st Half',
    periodStart: '2026-02-01',
    periodEnd: '2026-02-14',
    totalHours: 96,
    status: 'pending',
    submittedDate: '2026-02-14',
    projects: ['PROJ-002', 'PROJ-003'],
  },
  {
    id: 'ts003',
    employeeName: 'Emily Rodriguez',
    employeeId: 'EMP-1236',
    period: 'February 2026 - 1st Half',
    periodStart: '2026-02-01',
    periodEnd: '2026-02-14',
    totalHours: 104,
    status: 'pending',
    submittedDate: '2026-02-13',
    projects: ['PROJ-001', 'TRAIN-001'],
  },
  {
    id: 'ts004',
    employeeName: 'David Kim',
    employeeId: 'EMP-1237',
    period: 'February 2026 - 1st Half',
    periodStart: '2026-02-01',
    periodEnd: '2026-02-14',
    totalHours: 88,
    status: 'pending',
    submittedDate: '2026-02-14',
    projects: ['PROJ-003', 'SUPPORT-001', 'ADMIN-001'],
  },
  {
    id: 'ts005',
    employeeName: 'Jessica Martinez',
    employeeId: 'EMP-1238',
    period: 'January 2026 - 2nd Half',
    periodStart: '2026-01-15',
    periodEnd: '2026-01-31',
    totalHours: 136,
    status: 'approved',
    submittedDate: '2026-01-31',
    projects: ['PROJ-001', 'PROJ-002'],
  },
  {
    id: 'ts006',
    employeeName: 'Robert Taylor',
    employeeId: 'EMP-1239',
    period: 'January 2026 - 2nd Half',
    periodStart: '2026-01-15',
    periodEnd: '2026-01-31',
    totalHours: 120,
    status: 'approved',
    submittedDate: '2026-01-31',
    projects: ['PROJ-003', 'ADMIN-001'],
  },
];

const mockSubmissions = [
  {
    id: '1',
    period: 'February 2026 - 1st Half',
    dateRange: 'Feb 1 - Feb 14, 2026',
    projects: ['PROJ-001', 'PROJ-002'],
    totalHours: 112,
    submittedDate: 'Feb 14, 2026',
    status: 'approved',
  },
  {
    id: '2',
    period: 'January 2026 - 2nd Half',
    dateRange: 'Jan 16 - Jan 31, 2026',
    projects: ['PROJ-001', 'PROJ-003'],
    totalHours: 120,
    submittedDate: 'Jan 31, 2026',
    status: 'approved',
  },
  {
    id: '3',
    period: 'January 2026 - 1st Half',
    dateRange: 'Jan 1 - Jan 15, 2026',
    projects: ['PROJ-001', 'PROJ-002'],
    totalHours: 96,
    submittedDate: 'Jan 15, 2026',
    status: 'approved',
  },
  {
    id: '4',
    period: 'December 2025 - 2nd Half',
    dateRange: 'Dec 16 - Dec 31, 2025',
    projects: ['PROJ-001', 'PROJ-004'],
    totalHours: 104,
    submittedDate: 'Dec 31, 2025',
    status: 'approved',
  },
  {
    id: '5',
    period: 'December 2025 - 1st Half',
    dateRange: 'Dec 1 - Dec 15, 2025',
    projects: ['PROJ-002', 'PROJ-003'],
    totalHours: 88,
    submittedDate: 'Dec 15, 2025',
    status: 'rejected',
  },
];

const mockChargeCodeData = [
  { code: 'PROJ-001', name: 'Website Redesign', hours: 84 },
  { code: 'PROJ-002', name: 'Mobile App Development', hours: 62 },
  { code: 'PROJ-003', name: 'Database Migration', hours: 48 },
  { code: 'ADMIN-001', name: 'Admin & Meetings', hours: 24 },
  { code: 'TRAIN-001', name: 'Training & Development', hours: 16 },
];

const mockMonthlyData = [
  { month: 'Sep', hours: 168, leave: 16 },
  { month: 'Oct', hours: 176, leave: 8 },
  { month: 'Nov', hours: 160, leave: 24 },
  { month: 'Dec', hours: 144, leave: 32 },
  { month: 'Jan', hours: 168, leave: 16 },
  { month: 'Feb', hours: 156, leave: 20 },
];

const mockProjectSummary = [
  { project: 'Website Redesign', hours: 84, percentage: 35.7 },
  { project: 'Mobile App', hours: 62, percentage: 26.4 },
  { project: 'Database Migration', hours: 48, percentage: 20.4 },
  { project: 'Admin', hours: 24, percentage: 10.2 },
  { project: 'Training', hours: 16, percentage: 6.8 },
];

const CHART_COLORS = ['#6b5b7a', '#8b7a99', '#a89db5', '#c5bfd1', '#e0dae6'];

// ─────────────────────────────────────────────
// ChargeCodeSelector Component
// ─────────────────────────────────────────────
function ChargeCodeSelector({ chargeCodes, selectedId, onChange, disabled = false }) {
  return (
    <div className="relative">
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="appearance-none bg-white border border-[#d0d0d0] rounded px-3 py-2 pr-8 text-sm w-full cursor-pointer hover:border-[#b0b0b0] focus:outline-none focus:ring-2 focus:ring-[#c8bfd4] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">Select charge code</option>
        {chargeCodes.map((code) => (
          <option key={code.id} value={code.id}>
            {code.code} - {code.description}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6d70] pointer-events-none" />
    </div>
  );
}

// ─────────────────────────────────────────────
// PeriodSelector Component
// ─────────────────────────────────────────────
function PeriodSelector({ currentMonth, selectedPeriod, onPeriodChange }) {
  const periods = [
    { value: '1st-half', label: `${currentMonth} - 1st Half` },
    { value: '2nd-half', label: `${currentMonth} - 2nd Half` },
    { value: 'past', label: 'Past Timesheets' },
  ];

  return (
    <div className="relative inline-block">
      <select
        value={selectedPeriod}
        onChange={(e) => onPeriodChange(e.target.value)}
        className="appearance-none bg-white border border-[#d0d0d0] rounded px-4 py-2 pr-10 cursor-pointer hover:border-[#b0b0b0] focus:outline-none focus:ring-2 focus:ring-[#c8bfd4] focus:border-transparent"
      >
        {periods.map((period) => (
          <option key={period.value} value={period.value}>
            {period.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6d70] pointer-events-none" />
    </div>
  );
}

// ─────────────────────────────────────────────
// StatusBadge Component
// ─────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    draft: 'bg-gray-50 text-[#6a6d70] border-[#d0d0d0]',
    submitted: 'bg-[#f3f0f7] text-[#6b5b7a] border-[#c8bfd4]',
    approved: 'bg-[#f0f7f0] text-[#4a7c59] border-[#b8d4bc]',
    rejected: 'bg-[#fef3f3] text-[#c1666b] border-[#e8c4c6]',
  };

  const labels = {
    draft: 'Draft',
    submitted: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

// ─────────────────────────────────────────────
// TimesheetGrid Component
// ─────────────────────────────────────────────
function TimesheetGrid({ dates, rows, chargeCodes, onRowUpdate, onRowAdd, onRowDelete, readOnly = false }) {
  const updateEntry = (rowId, dateStr, field, value) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    const updatedEntries = row.entries.map((entry) =>
      entry.date === dateStr ? { ...entry, [field]: value } : entry
    );
    onRowUpdate(rowId, { entries: updatedEntries });
  };

  const getEntry = (row, dateStr) => {
    return row.entries.find((e) => e.date === dateStr) || { date: dateStr, hours: 0, isLeave: false };
  };

  const getRowTotal = (row) => {
    return row.entries.reduce((sum, entry) => sum + (entry.isLeave ? 8 : entry.hours), 0);
  };

  const getColumnTotal = (dateStr) => {
    return rows.reduce((sum, row) => {
      const entry = getEntry(row, dateStr);
      return sum + (entry.isLeave ? 8 : entry.hours);
    }, 0);
  };

  const getDayName = (dateStr) => format(parseISO(dateStr), 'EEE');
  const getDateDisplay = (dateStr) => format(parseISO(dateStr), 'MMM d');

  return (
    <div className="border border-[#e0e0e0] rounded overflow-hidden bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#fafafa] border-b border-[#e0e0e0]">
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#32363a] sticky left-0 bg-[#fafafa] z-10 min-w-[280px]">
                Charge Code
              </th>
              {dates.map((date) => (
                <th
                  key={date}
                  className="px-3 py-3 text-center text-sm font-semibold text-[#32363a] min-w-[100px] border-l border-[#f0f0f0]"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-[#6a6d70]">{getDayName(date)}</span>
                    <span>{getDateDisplay(date)}</span>
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-center text-sm font-semibold text-[#32363a] bg-[#f9f8fb] min-w-[100px] border-l border-[#e0e0e0]">
                Total
              </th>
              {!readOnly && (
                <th className="px-4 py-3 bg-[#fafafa] sticky right-0 z-10 min-w-[60px] border-l border-[#e0e0e0]"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={row.id}
                className={`border-b border-[#f0f0f0] hover:bg-[#fafafa] ${
                  rowIndex % 2 === 0 ? 'bg-white' : 'bg-[#fcfcfc]'
                }`}
              >
                <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-[#f0f0f0]">
                  <ChargeCodeSelector
                    chargeCodes={chargeCodes}
                    selectedId={row.chargeCodeId}
                    onChange={(id) => onRowUpdate(row.id, { chargeCodeId: id })}
                    disabled={readOnly}
                  />
                </td>
                {dates.map((date) => {
                  const entry = getEntry(row, date);
                  return (
                    <td key={date} className="px-3 py-3 text-center border-l border-[#f0f0f0]">
                      {entry.isLeave ? (
                        <div className="flex items-center justify-center gap-2">
                          <Coffee className="w-4 h-4 text-[#8b7a99]" />
                          <span className="text-sm text-[#6a6d70]">Leave (8h)</span>
                          {!readOnly && (
                            <button
                              onClick={() => updateEntry(row.id, date, 'isLeave', false)}
                              className="text-xs text-[#6a6d70] hover:text-[#32363a]"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={entry.hours || ''}
                            onChange={(e) =>
                              updateEntry(row.id, date, 'hours', parseFloat(e.target.value) || 0)
                            }
                            disabled={readOnly}
                            className="w-16 px-2 py-1 border border-[#d0d0d0] rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#c8bfd4] focus:border-transparent disabled:bg-[#fafafa]"
                          />
                          {!readOnly && (
                            <button
                              onClick={() => updateEntry(row.id, date, 'isLeave', true)}
                              title="Mark as leave"
                              className="text-[#b0b0b0] hover:text-[#8b7a99] transition-colors"
                            >
                              <Coffee className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-center font-semibold bg-[#f9f8fb] border-l border-[#e0e0e0] text-[#6b5b7a]">
                  {getRowTotal(row)}h
                </td>
                {!readOnly && (
                  <td className="px-4 py-3 text-center sticky right-0 bg-white border-l border-[#f0f0f0]">
                    <button
                      onClick={() => onRowDelete(row.id)}
                      className="text-[#c1666b] hover:text-[#a54d52] transition-colors"
                      title="Delete row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}

            {/* Column Totals Row */}
            <tr className="bg-[#f9f8fb] border-t-2 border-[#e0dae6] font-semibold">
              <td className="px-4 py-3 text-left sticky left-0 bg-[#f9f8fb] z-10 text-[#6b5b7a]">
                Daily Total
              </td>
              {dates.map((date) => (
                <td key={date} className="px-3 py-3 text-center border-l border-[#f0f0f0] text-[#6b5b7a]">
                  {getColumnTotal(date)}h
                </td>
              ))}
              <td className="px-4 py-3 text-center bg-[#f3f0f7] border-l border-[#e0dae6] text-[#6b5b7a]">
                {rows.reduce((sum, row) => sum + getRowTotal(row), 0)}h
              </td>
              {!readOnly && <td className="border-l border-[#f0f0f0]"></td>}
            </tr>
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div className="p-4 border-t border-[#e0e0e0] bg-[#fafafa]">
          <button
            onClick={onRowAdd}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#b0b0b0] text-[#32363a] rounded hover:bg-[#f5f5f5] hover:border-[#8b7a99] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Charge Code</span>
          </button>
        </div>
      )}
    </div>
  );
}



// ─────────────────────────────────────────────
// TimesheetPage Component
// ─────────────────────────────────────────────
function TimesheetPage() {
  const currentDate = new Date();
  const [selectedPeriod, setSelectedPeriod] = useState('1st-half');
  const [timesheetStatus, setTimesheetStatus] = useState('draft');
  const [rows, setRows] = useState([{ id: 'row1', chargeCodeId: 'cc1', entries: [] }]);
  const [validationErrors, setValidationErrors] = useState([]);

  const dates = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    if (selectedPeriod === '1st-half') {
      return eachDayOfInterval({ start: monthStart, end: addDays(monthStart, 13) }).map((d) =>
        format(d, 'yyyy-MM-dd')
      );
    } else if (selectedPeriod === '2nd-half') {
      return eachDayOfInterval({ start: addDays(monthStart, 14), end: monthEnd }).map((d) =>
        format(d, 'yyyy-MM-dd')
      );
    } else {
      const prevStart = addDays(monthStart, -14);
      const prevEnd = addDays(monthStart, -1);
      return eachDayOfInterval({ start: prevStart, end: prevEnd }).map((d) =>
        format(d, 'yyyy-MM-dd')
      );
    }
  }, [selectedPeriod]);

  useMemo(() => {
    setRows((prevRows) =>
      prevRows.map((row) => {
        const existingEntries = row.entries.reduce((acc, entry) => {
          acc[entry.date] = entry;
          return acc;
        }, {});
        const newEntries = dates.map((date) =>
          existingEntries[date] || { date, hours: 0, isLeave: false }
        );
        return { ...row, entries: newEntries };
      })
    );
  }, [dates]);

  const validateTimesheet = () => {
    const errors = [];

    const emptyChargeCodes = rows.filter((row) => !row.chargeCodeId);
    if (emptyChargeCodes.length > 0) {
      errors.push(`${emptyChargeCodes.length} row(s) missing charge code`);
    }

    const hasNoHours = rows.every((row) =>
      row.entries.every((entry) => entry.hours === 0 && !entry.isLeave)
    );
    if (hasNoHours) {
      errors.push('Enter hours or mark leave days for at least one row');
    }

    if (rows.length === 0) {
      errors.push('Add at least one charge code row');
    }

    const chargeCodeIds = rows.map((row) => row.chargeCodeId).filter(Boolean);
    const duplicates = chargeCodeIds.filter((id, index) => chargeCodeIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      errors.push('Remove duplicate charge codes');
    }

    rows.forEach((row, rowIndex) => {
      if (!row.chargeCodeId) return;
      const daysWithHours = row.entries.filter((e) => e.hours > 0 || e.isLeave).length;
      const totalDays = row.entries.length;
      if (daysWithHours > 0 && daysWithHours < totalDays) {
        const chargeCode = CHARGE_CODES.find((cc) => cc.id === row.chargeCodeId);
        const chargeName = chargeCode ? chargeCode.code : 'Row ' + (rowIndex + 1);
        errors.push(`${chargeName}: Fill in all ${totalDays} days (currently ${daysWithHours}/${totalDays} filled)`);
      }
    });

    const dayTotals = dates.map((date, dayIndex) => {
      const totalForDay = rows.reduce((sum, row) => {
        const entry = row.entries[dayIndex];
        return sum + (entry?.isLeave ? 8 : entry?.hours || 0);
      }, 0);
      return { date, total: totalForDay };
    });

    const daysWithoutEntries = dayTotals.filter((day) => day.total === 0);
    if (daysWithoutEntries.length > 0 && daysWithoutEntries.length < dates.length) {
      const emptyDates = daysWithoutEntries.map((d) => format(new Date(d.date), 'MMM d')).join(', ');
      errors.push(`Missing entries for ${daysWithoutEntries.length} day(s): ${emptyDates}`);
    }

    return { isValid: errors.length === 0, errors };
  };

  useEffect(() => {
    const { errors } = validateTimesheet();
    setValidationErrors(errors);
  }, [rows]);

  const handleRowUpdate = (rowId, updates) => {
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...updates } : row)));
  };

  const handleRowAdd = () => {
    const newRow = {
      id: `row${Date.now()}`,
      chargeCodeId: '',
      entries: dates.map((date) => ({ date, hours: 0, isLeave: false })),
    };
    setRows([...rows, newRow]);
  };

  const handleRowDelete = (rowId) => {
    setRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const handleSubmit = () => {
    const { isValid, errors } = validateTimesheet();
    if (!isValid) {
      alert('Please fix the following errors:\n\n' + errors.join('\n'));
      return;
    }
    setTimesheetStatus('submitted');
    alert('Timesheet submitted successfully!');
  };

  const handleReopen = () => setTimesheetStatus('draft');

  const getTotalHours = () =>
    rows.reduce(
      (total, row) =>
        total + row.entries.reduce((sum, entry) => sum + (entry.isLeave ? 8 : entry.hours), 0),
      0
    );

  const currentMonth = format(currentDate, 'MMMM yyyy');
  const isReadOnly = timesheetStatus === 'approved' || timesheetStatus === 'submitted';

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      <div className="p-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl text-[#32363a] mb-2">My Timesheet</h1>
            <p className="text-[#6a6d70]">Track your hours by fortnight period</p>
          </div>

          {/* Controls Bar */}
          <div className="bg-white rounded shadow-sm p-4 mb-6 flex items-center justify-between flex-wrap gap-4 border border-[#e0e0e0]">
            <div className="flex items-center gap-4">
              <PeriodSelector
                currentMonth={currentMonth}
                selectedPeriod={selectedPeriod}
                onPeriodChange={(period) => {
                  setSelectedPeriod(period);
                  if (period === 'past') {
                    setTimesheetStatus('approved');
                  } else {
                    setTimesheetStatus('draft');
                  }
                }}
              />
              <StatusBadge status={timesheetStatus} />
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-[#6a6d70]">
                Total Hours:{' '}
                <span className="font-semibold text-[#32363a]">{getTotalHours()}h</span>
              </div>

              {(timesheetStatus === 'draft' || timesheetStatus === 'rejected') && (
                <button
                  onClick={handleSubmit}
                  disabled={validationErrors.length > 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded transition-colors font-medium shadow-sm ${
                    validationErrors.length > 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-[#6b5b7a] text-white hover:bg-[#5a4a69]'
                  }`}
                  title={validationErrors.length > 0 ? validationErrors.join(', ') : 'Submit timesheet'}
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Timesheet</span>
                </button>
              )}

              {timesheetStatus === 'submitted' && (
                <button
                  onClick={handleReopen}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors font-medium shadow-sm"
                >
                  Edit Timesheet
                </button>
              )}
            </div>
          </div>

          {/* Validation Errors */}
          {(timesheetStatus === 'draft' || timesheetStatus === 'rejected') &&
            validationErrors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-800 mb-2">
                      Please fix the following issues before submitting:
                    </h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span>
                          <span>{error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

          {/* Status Message */}
          {timesheetStatus !== 'draft' && (
            <div
              className={`mb-6 p-4 rounded border ${
                timesheetStatus === 'submitted'
                  ? 'bg-[#f9f8fb] border-[#c8bfd4] text-[#6b5b7a]'
                  : timesheetStatus === 'approved'
                  ? 'bg-[#f0f7f0] border-[#b8d4bc] text-[#4a7c59]'
                  : 'bg-[#fef3f3] border-[#e8c4c6] text-[#c1666b]'
              }`}
            >
              {timesheetStatus === 'submitted' && (
                <p>
                  <strong>Pending Approval:</strong> Your timesheet has been submitted and is
                  waiting for manager approval. Click "Edit Timesheet" button if you need to make
                  changes.
                </p>
              )}
              {timesheetStatus === 'approved' && (
                <p>
                  <strong>Approved:</strong> This timesheet has been approved and is permanently
                  locked. Please contact your manager if you need to make any corrections.
                </p>
              )}
              {timesheetStatus === 'rejected' && (
                <p>
                  <strong>Rejected:</strong> This timesheet was rejected. Please review the
                  feedback, make necessary changes, and resubmit.
                </p>
              )}
            </div>
          )}

          <TimesheetGrid
            dates={dates}
            rows={rows}
            chargeCodes={CHARGE_CODES}
            onRowUpdate={handleRowUpdate}
            onRowAdd={handleRowAdd}
            onRowDelete={handleRowDelete}
            readOnly={isReadOnly}
          />

          {/* Instructions */}
          <div className="mt-6 p-4 bg-[#f9f8fb] border border-[#e0dae6] rounded">
            <h3 className="text-sm font-semibold text-[#6b5b7a] mb-2">Instructions:</h3>
            <ul className="text-sm text-[#6a6d70] space-y-1">
              <li>• Select a charge code for each row</li>
              <li>• Enter hours worked for each day (0.5 hour increments)</li>
              <li>
                • Click the coffee icon <Coffee className="w-3 h-3 inline" /> to mark a day as
                leave (automatically counts as 8 hours)
              </li>
              <li>• <strong>All days must be filled</strong> - no partial entries allowed</li>
              <li>• Total hours are automatically calculated</li>
              <li>• After submitting, click "Edit Timesheet" to make changes while pending approval</li>
              <li>• Submit your timesheet when complete</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Reports Component
// ─────────────────────────────────────────────
function Reports() {
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  const totalHours = mockChargeCodeData.reduce((sum, item) => sum + item.hours, 0);
  const avgHoursPerWeek = (totalHours / 12).toFixed(1);
  const totalProjects = mockChargeCodeData.length;

  const handleExport = () => alert('Exporting report data to CSV...');

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      <div className="p-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl text-[#32363a] mb-2">Reports & Analytics</h1>
            <p className="text-[#6a6d70]">View your time allocation and project summaries</p>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded shadow-sm p-4 mb-6 border border-[#e0e0e0]">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#6a6d70]" />
                  <span className="text-sm text-[#6a6d70]">Date Range:</span>
                </div>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="px-3 py-2 border border-[#d0d0d0] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c8bfd4]"
                />
                <span className="text-[#6a6d70]">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="px-3 py-2 border border-[#d0d0d0] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c8bfd4]"
                />
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-[#6b5b7a] text-white rounded hover:bg-[#5a4a69] transition-colors font-medium shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Hours', value: `${totalHours}h`, sub: 'Last 3 months', Icon: Clock },
              { label: 'Avg/Week', value: `${avgHoursPerWeek}h`, sub: 'Weekly average', Icon: TrendingUp },
              { label: 'Active Projects', value: totalProjects, sub: 'Charge codes used', Icon: FileText },
              { label: 'Utilization', value: '87%', sub: 'Billable hours', Icon: BarChart3 },
            ].map(({ label, value, sub, Icon }) => (
              <div key={label} className="bg-white rounded shadow-sm p-5 border border-[#e0e0e0]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#6a6d70]">{label}</span>
                  <Icon className="w-5 h-5 text-[#8b7a99]" />
                </div>
                <div className="text-3xl font-semibold text-[#32363a]">{value}</div>
                <div className="text-xs text-[#6a6d70] mt-1">{sub}</div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded shadow-sm p-6 border border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#32363a] mb-4">Monthly Hours Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockMonthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#6a6d70" />
                  <YAxis stroke="#6a6d70" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '4px' }}
                  />
                  <Legend />
                  <Bar dataKey="hours" fill="#6b5b7a" name="Work Hours" />
                  <Bar dataKey="leave" fill="#c5bfd1" name="Leave Hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded shadow-sm p-6 border border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#32363a] mb-4">Time by Project</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={mockProjectSummary}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="hours"
                  >
                    {mockProjectSummary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '4px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded shadow-sm border border-[#e0e0e0] overflow-hidden">
            <div className="p-6 border-b border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#32363a]">Hours by Charge Code</h3>
              <p className="text-sm text-[#6a6d70] mt-1">Detailed breakdown of time allocation</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#fafafa] border-b border-[#e0e0e0]">
                  <tr>
                    {['Charge Code', 'Description', 'Total Hours', 'Percentage', 'Status'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-6 py-3 text-sm font-semibold text-[#32363a] ${
                          i >= 2 && i <= 3 ? 'text-right' : i === 4 ? 'text-center' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockChargeCodeData.map((item, index) => (
                    <tr
                      key={item.code}
                      className={`border-b border-[#f0f0f0] ${index % 2 === 0 ? 'bg-white' : 'bg-[#fcfcfc]'}`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-[#32363a]">{item.code}</td>
                      <td className="px-6 py-4 text-sm text-[#6a6d70]">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-right text-[#32363a] font-medium">{item.hours}h</td>
                      <td className="px-6 py-4 text-sm text-right text-[#6a6d70]">
                        {((item.hours / totalHours) * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f0f7f0] text-[#4a7c59] border border-[#b8d4bc]">
                          Approved
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#f9f8fb] border-t-2 border-[#e0dae6]">
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-sm font-semibold text-[#6b5b7a]">Total</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-[#6b5b7a]">{totalHours}h</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-[#6b5b7a]">100%</td>
                    <td></td>
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

// ─────────────────────────────────────────────
// Approvals Component
// ─────────────────────────────────────────────
function Approvals() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedTimesheets, setSelectedTimesheets] = useState([]);
  const [approvals, setApprovals] = useState(mockApprovals);

  const filteredApprovals = approvals.filter((approval) => {
    const matchesSearch =
      approval.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || approval.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;
  const approvedCount = approvals.filter((a) => a.status === 'approved').length;
  const totalHoursPending = approvals
    .filter((a) => a.status === 'pending')
    .reduce((sum, a) => sum + a.totalHours, 0);

  const handleApprove = (id) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'approved' } : a))
    );
    setSelectedTimesheets((prev) => prev.filter((tsId) => tsId !== id));
  };

  const handleReject = (id) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'rejected' } : a))
    );
    setSelectedTimesheets((prev) => prev.filter((tsId) => tsId !== id));
  };

  const handleBulkApprove = () => {
    if (selectedTimesheets.length === 0) return;
    setApprovals((prev) =>
      prev.map((a) =>
        selectedTimesheets.includes(a.id) ? { ...a, status: 'approved' } : a
      )
    );
    setSelectedTimesheets([]);
  };

  const toggleSelectTimesheet = (id) => {
    setSelectedTimesheets((prev) =>
      prev.includes(id) ? prev.filter((tsId) => tsId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const pendingIds = filteredApprovals.filter((a) => a.status === 'pending').map((a) => a.id);
    if (selectedTimesheets.length === pendingIds.length) {
      setSelectedTimesheets([]);
    } else {
      setSelectedTimesheets(pendingIds);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      <div className="p-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl text-[#32363a] mb-2">Timesheet Approvals</h1>
            <p className="text-[#6a6d70]">Review and approve team member timesheets</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded shadow-sm p-5 border border-[#e0e0e0]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#6a6d70]">Pending Review</span>
                <Clock className="w-5 h-5 text-[#8b7a99]" />
              </div>
              <div className="text-3xl font-semibold text-[#32363a]">{pendingCount}</div>
              <div className="text-xs text-[#6a6d70] mt-1">Timesheets awaiting approval</div>
            </div>
            <div className="bg-white rounded shadow-sm p-5 border border-[#e0e0e0]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#6a6d70]">Approved</span>
                <CheckCircle className="w-5 h-5 text-[#4a7c59]" />
              </div>
              <div className="text-3xl font-semibold text-[#32363a]">{approvedCount}</div>
              <div className="text-xs text-[#6a6d70] mt-1">This period</div>
            </div>
            <div className="bg-white rounded shadow-sm p-5 border border-[#e0e0e0]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#6a6d70]">Total Team Members</span>
                <Users className="w-5 h-5 text-[#8b7a99]" />
              </div>
              <div className="text-3xl font-semibold text-[#32363a]">{approvals.length}</div>
              <div className="text-xs text-[#6a6d70] mt-1">In your team</div>
            </div>
            <div className="bg-white rounded shadow-sm p-5 border border-[#e0e0e0]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#6a6d70]">Hours Pending</span>
                <Clock className="w-5 h-5 text-[#8b7a99]" />
              </div>
              <div className="text-3xl font-semibold text-[#32363a]">{totalHoursPending}h</div>
              <div className="text-xs text-[#6a6d70] mt-1">Awaiting your approval</div>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="bg-white rounded shadow-sm p-4 mb-6 border border-[#e0e0e0]">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6d70]" />
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-[#d0d0d0] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c8bfd4] w-64"
                  />
                </div>
                <div className="relative inline-block">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none bg-white border border-[#d0d0d0] rounded px-4 py-2 pr-10 text-sm cursor-pointer hover:border-[#b0b0b0] focus:outline-none focus:ring-2 focus:ring-[#c8bfd4]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6d70] pointer-events-none" />
                </div>
              </div>
              {selectedTimesheets.length > 0 && (
                <button
                  onClick={handleBulkApprove}
                  className="flex items-center gap-2 px-4 py-2 bg-[#4a7c59] text-white rounded hover:bg-[#3d6a4a] transition-colors font-medium shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve Selected ({selectedTimesheets.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Pending Alert */}
          {pendingCount > 0 && statusFilter !== 'approved' && statusFilter !== 'rejected' && (
            <div className="mb-6 p-4 bg-[#f9f8fb] border border-[#c8bfd4] rounded flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#6b5b7a] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-[#6b5b7a] font-medium">
                  You have {pendingCount} timesheet{pendingCount !== 1 ? 's' : ''} pending approval
                </p>
                <p className="text-xs text-[#6a6d70] mt-1">
                  Please review and approve timesheets to ensure timely payroll processing
                </p>
              </div>
            </div>
          )}

          {/* Approvals Table */}
          <div className="bg-white rounded shadow-sm border border-[#e0e0e0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#fafafa] border-b border-[#e0e0e0]">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      {statusFilter === 'pending' && (
                        <input
                          type="checkbox"
                          checked={
                            selectedTimesheets.length > 0 &&
                            selectedTimesheets.length ===
                              filteredApprovals.filter((a) => a.status === 'pending').length
                          }
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-[#d0d0d0] text-[#6b5b7a] focus:ring-[#c8bfd4]"
                        />
                      )}
                    </th>
                    {['Employee', 'Period', 'Projects', 'Total Hours', 'Submitted', 'Status', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-sm font-semibold text-[#32363a] ${
                          h === 'Total Hours' ? 'text-right' : h === 'Status' || h === 'Actions' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredApprovals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-[#6a6d70]">
                        No timesheets found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredApprovals.map((approval, index) => (
                      <tr
                        key={approval.id}
                        className={`border-b border-[#f0f0f0] ${
                          index % 2 === 0 ? 'bg-white' : 'bg-[#fcfcfc]'
                        } hover:bg-[#fafafa] transition-colors`}
                      >
                        <td className="px-4 py-4">
                          {approval.status === 'pending' && (
                            <input
                              type="checkbox"
                              checked={selectedTimesheets.includes(approval.id)}
                              onChange={() => toggleSelectTimesheet(approval.id)}
                              className="w-4 h-4 rounded border-[#d0d0d0] text-[#6b5b7a] focus:ring-[#c8bfd4]"
                            />
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-[#32363a]">{approval.employeeName}</div>
                          <div className="text-xs text-[#6a6d70]">{approval.employeeId}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-[#32363a]">{approval.period}</div>
                          <div className="text-xs text-[#6a6d70]">
                            {format(new Date(approval.periodStart), 'MMM d')} -{' '}
                            {format(new Date(approval.periodEnd), 'MMM d, yyyy')}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            {approval.projects.slice(0, 2).map((project) => (
                              <span
                                key={project}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#f9f8fb] text-[#6b5b7a] border border-[#e0dae6]"
                              >
                                {project}
                              </span>
                            ))}
                            {approval.projects.length > 2 && (
                              <span className="text-xs text-[#6a6d70]">+{approval.projects.length - 2} more</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-sm font-medium text-[#32363a]">{approval.totalHours}h</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-sm text-[#6a6d70]">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(approval.submittedDate), 'MMM d, yyyy')}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {approval.status === 'pending' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f9f8fb] text-[#6b5b7a] border border-[#c8bfd4]">
                              Pending
                            </span>
                          )}
                          {approval.status === 'approved' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f0f7f0] text-[#4a7c59] border border-[#b8d4bc]">
                              Approved
                            </span>
                          )}
                          {approval.status === 'rejected' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fef3f3] text-[#c1666b] border border-[#e8c4c6]">
                              Rejected
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => alert(`View details for ${approval.employeeName}`)}
                              className="p-1.5 text-[#6a6d70] hover:text-[#6b5b7a] hover:bg-[#f5f5f5] rounded transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {approval.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(approval.id)}
                                  className="p-1.5 text-[#4a7c59] hover:bg-[#f0f7f0] rounded transition-colors"
                                  title="Approve"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleReject(approval.id)}
                                  className="p-1.5 text-[#c1666b] hover:bg-[#fef3f3] rounded transition-colors"
                                  title="Reject"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Approval Guidelines */}
          <div className="mt-6 p-4 bg-[#f9f8fb] border border-[#e0dae6] rounded">
            <h3 className="text-sm font-semibold text-[#6b5b7a] mb-2">Approval Guidelines:</h3>
            <ul className="text-sm text-[#6a6d70] space-y-1">
              <li>• Review each timesheet for accuracy and completeness</li>
              <li>• Click the eye icon to view detailed timesheet entries</li>
              <li>• Use bulk approve for multiple timesheets with the same period</li>
              <li>• Rejected timesheets will be returned to the employee for revision</li>
              <li>• Timesheets should be approved within 2 business days of submission</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// History Component
// ─────────────────────────────────────────────
function History() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [submissions] = useState(mockSubmissions);

  const totalSubmissions = submissions.length;
  const approvedSubmissions = submissions.filter((s) => s.status === 'approved');
  const rejectedSubmissions = submissions.filter((s) => s.status === 'rejected');
  const totalApprovedHours = approvedSubmissions.reduce((sum, s) => sum + s.totalHours, 0);
  const approvalRate = Math.round((approvedSubmissions.length / totalSubmissions) * 100);

  const filteredSubmissions = submissions.filter((submission) => {
    const matchesSearch =
      submission.period.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.projects.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      <div className="p-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="mb-8">
            <h1 className="text-[32px] font-semibold text-[#1a1a1a] mb-2">Timesheet History</h1>
            <p className="text-[#6a6d70] text-[15px]">View and download your past timesheet submissions</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="p-6 bg-white border border-[#e0e0e0] rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="text-[#6a6d70] text-[14px] font-medium">Total Submissions</div>
                <Calendar className="w-5 h-5 text-[#6a6d70]" />
              </div>
              <div className="text-[32px] font-semibold text-[#1a1a1a] mb-1">{totalSubmissions}</div>
              <div className="text-[#6a6d70] text-[13px]">All time</div>
            </div>
            <div className="p-6 bg-white border border-[#e0e0e0] rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="text-[#6a6d70] text-[14px] font-medium">Approved</div>
                <CheckCircle2 className="w-5 h-5 text-[#16a34a]" />
              </div>
              <div className="text-[32px] font-semibold text-[#16a34a] mb-1">{approvedSubmissions.length}</div>
              <div className="text-[#6a6d70] text-[13px]">{approvalRate}% approval rate</div>
            </div>
            <div className="p-6 bg-white border border-[#e0e0e0] rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="text-[#6a6d70] text-[14px] font-medium">Rejected</div>
                <XCircle className="w-5 h-5 text-[#dc2626]" />
              </div>
              <div className="text-[32px] font-semibold text-[#dc2626] mb-1">{rejectedSubmissions.length}</div>
              <div className="text-[#6a6d70] text-[13px]">Needs resubmission</div>
            </div>
            <div className="p-6 bg-white border border-[#e0e0e0] rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="text-[#6a6d70] text-[14px] font-medium">Total Hours</div>
                <Clock className="w-5 h-5 text-[#6a6d70]" />
              </div>
              <div className="text-[32px] font-semibold text-[#1a1a1a] mb-1">{totalApprovedHours}h</div>
              <div className="text-[#6a6d70] text-[13px]">Approved hours</div>
            </div>
          </div>

          {/* Filters and Table */}
          <div className="p-6 bg-white border border-[#e0e0e0] rounded-lg">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6a6d70]" />
                <input
                  placeholder="Search by period or project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 w-full border border-[#e0e0e0] rounded px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#c8bfd4]"
                />
              </div>
              <div className="flex gap-2">
                <div className="relative inline-block">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none bg-white border border-[#e0e0e0] rounded px-4 py-2 pr-10 text-[14px] cursor-pointer hover:border-[#b0b0b0] focus:outline-none focus:ring-2 focus:ring-[#c8bfd4] h-10 w-[180px]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6d70] pointer-events-none" />
                </div>
                <button className="h-10 border border-[#e0e0e0] rounded text-[14px] px-4 flex items-center gap-2 bg-white hover:bg-[#f5f5f5] transition-colors text-[#32363a]">
                  <Filter className="w-4 h-4" />
                  More Filters
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e0e0e0]">
                    {['Period', 'Date Range', 'Projects', 'Total Hours', 'Submitted', 'Status', 'Actions'].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left py-3 px-4 text-[13px] font-semibold text-[#6a6d70] uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((submission) => (
                    <tr
                      key={submission.id}
                      className="border-b border-[#e0e0e0] hover:bg-[#f8f8f8] transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="text-[14px] font-medium text-[#1a1a1a]">{submission.period}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-[14px] text-[#6a6d70]">{submission.dateRange}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {submission.projects.map((project) => (
                            <span
                              key={project}
                              className="bg-[#f3f4f6] text-[#4b5563] text-[12px] font-medium px-2 py-0.5 rounded"
                            >
                              {project}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-[14px] font-medium text-[#1a1a1a]">{submission.totalHours}h</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-[14px] text-[#6a6d70]">{submission.submittedDate}</div>
                      </td>
                      <td className="py-4 px-4">
                        {submission.status === 'approved' ? (
                          <span className="bg-[#dcfce7] text-[#16a34a] text-[13px] font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5 w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approved
                          </span>
                        ) : (
                          <span className="bg-[#fee2e2] text-[#dc2626] text-[13px] font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5 w-fit">
                            <XCircle className="w-3.5 h-3.5" />
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button className="h-8 px-3 text-[#6a6d70] hover:text-[#1a1a1a] hover:bg-[#f3f4f6] rounded flex items-center gap-1.5 text-[13px]">
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button className="h-8 w-8 p-0 text-[#6a6d70] hover:text-[#1a1a1a] hover:bg-[#f3f4f6] rounded flex items-center justify-center">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSubmissions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[#6a6d70] text-[15px]">No submissions found matching your criteria</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Internal Tab Bar (replaces react-router nav)
// ─────────────────────────────────────────────
function TimesheetTopBar({ activeTab, setActiveTab, user }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const userName = user?.name || 'John Doe';
  const userRole = user?.role || 'Employee';

  const notifications = [
    { id: 1, message: 'Your timesheet for Feb 1-14 has been approved', time: '2 hours ago', unread: true },
    { id: 2, message: 'Reminder: Submit your timesheet by end of day', time: '5 hours ago', unread: true },
    { id: 3, message: 'New project code PROJ-004 has been added', time: '1 day ago', unread: false },
  ];

  const helpTopics = [
    'How to submit timesheet',
    'Understanding charge codes',
    'Marking leave days',
    'Editing submitted timesheets',
    'Contact support',
  ];

  const tabs = [
    { key: 'timesheet', label: 'Timesheet' },
    { key: 'reports',   label: 'Reports' },
    { key: 'approvals', label: 'Approvals' },
    { key: 'history',   label: 'History' },
  ];

  return (
    <div className="bg-white text-[#32363a] shadow-md border-b border-[#e0e0e0]">
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#f3f0f7] rounded flex items-center justify-center border border-[#e0dae6]">
            <span className="text-[#6b5b7a] font-bold text-lg">TE</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#32363a]">Time Entry Portal</h1>
            <p className="text-xs text-[#6a6d70]">Workforce Management</p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowHelp(false); }}
              className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors relative"
            >
              <Bell className="w-5 h-5 text-[#6a6d70]" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#e9730c] rounded-full"></span>
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-[#e0e0e0] z-50">
                <div className="p-4 border-b border-[#e0e0e0]">
                  <h3 className="font-semibold text-[#32363a]">Notifications</h3>
                  <p className="text-xs text-[#6a6d70] mt-1">
                    {notifications.filter((n) => n.unread).length} unread
                  </p>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className={`p-4 border-b border-[#f0f0f0] hover:bg-[#fafafa] cursor-pointer ${n.unread ? 'bg-[#f9f8fb]' : ''}`}>
                      <p className="text-sm text-[#32363a]">{n.message}</p>
                      <p className="text-xs text-[#6a6d70] mt-1">{n.time}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 text-center border-t border-[#e0e0e0]">
                  <button className="text-sm text-[#6b5b7a] hover:underline">View all notifications</button>
                </div>
              </div>
            )}
          </div>

          {/* Help */}
          <div className="relative">
            <button
              onClick={() => { setShowHelp(!showHelp); setShowNotifications(false); }}
              className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors"
            >
              <HelpCircle className="w-5 h-5 text-[#6a6d70]" />
            </button>
            {showHelp && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-[#e0e0e0] z-50">
                <div className="p-4 border-b border-[#e0e0e0]">
                  <h3 className="font-semibold text-[#32363a]">Help & Support</h3>
                  <p className="text-xs text-[#6a6d70] mt-1">Quick access to resources</p>
                </div>
                <div className="p-2">
                  {helpTopics.map((topic, i) => (
                    <button
                      key={i}
                      className="block w-full text-left px-4 py-2.5 text-sm text-[#32363a] hover:bg-[#fafafa] rounded transition-colors"
                      onClick={() => alert(`Opening: ${topic}`)}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
                <div className="p-3 border-t border-[#e0e0e0] bg-[#f9f8fb]">
                  <p className="text-xs text-[#6a6d70]">
                    Need more help?{' '}
                    <button className="text-[#6b5b7a] hover:underline" onClick={() => alert('Contacting IT Support...')}>
                      Contact IT Support
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="h-8 w-px bg-[#e0e0e0]"></div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-[#32363a]">{userName}</div>
              <div className="text-xs text-[#6a6d70]">{userRole}</div>
            </div>
            <div className="w-10 h-10 bg-[#e8e4ee] rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-[#6b5b7a]" />
            </div>
          </div>
        </div>
      </div>

      {/* Internal Tab Navigation */}
      <div className="bg-[#fafafa] px-6 py-2 border-t border-[#e0e0e0]">
        <nav className="flex items-center gap-6 text-sm">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`pb-2 transition-colors border-b-2 ${
                activeTab === key
                  ? 'text-[#6b5b7a] font-medium border-[#6b5b7a]'
                  : 'text-[#6a6d70] hover:text-[#32363a] border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Export — self-contained, no BrowserRouter
// Receives `user` prop from App.js
// ─────────────────────────────────────────────
export default function Timesheets({ user }) {
  const [activeTab, setActiveTab] = useState('timesheet');

  const renderTab = () => {
    switch (activeTab) {
      case 'timesheet': return <TimesheetPage />;
      case 'reports':   return <Reports />;
      case 'approvals': return <Approvals />;
      case 'history':   return <History />;
      default:          return <TimesheetPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      <TimesheetTopBar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
      {renderTab()}
    </div>
  );
}