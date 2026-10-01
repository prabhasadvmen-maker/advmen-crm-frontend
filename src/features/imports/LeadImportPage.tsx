import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Send,
  Upload,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Layers,
  Phone,
  MapPin,
  CheckSquare,
  Square,
  Info,
  Sliders,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { KPICard } from '@/components/patterns/KPICard';
import { apiClient } from '@/lib/apiClient';
import { usersApi, UserDto } from '@/features/admin/api/usersApi';
import { useUIStore } from '@/stores/uiStore';

type Row = {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  title?: string;
  city?: string;
  requirement?: string;
  budget?: number;
  rowNumber: number;
  customFields?: Record<string, unknown>;
  raw?: Record<string, unknown>;
};

type RejectedRow = {
  rowNumber: number;
  reason: string;
  raw?: Record<string, unknown>;
};

type Scan = {
  sheetName: string;
  totalRows: number;
  readyRows: Row[];
  rejectedRows: RejectedRow[];
  columns: string[];
};

export function LeadImportPage() {
  const { addToast } = useUIStore();
  const [scan, setScan] = useState<Scan | null>(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [distributing, setDistributing] = useState(false);

  // Employees State
  const [employees, setEmployees] = useState<UserDto[]>([]);
  const [activeTab, setActiveTab] = useState<'ready' | 'rejected'>('ready');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Distribution State
  const [importedIds, setImportedIds] = useState<string[]>([]);
  const [distributionMode, setDistributionMode] = useState<'equal' | 'custom' | 'single'>('equal');
  const [selectedSingleEmp, setSelectedSingleEmp] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [customAllocations, setCustomAllocations] = useState<Record<string, number>>({});
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');

  useEffect(() => {
    usersApi
      .getUsers()
      .then((data) => {
        setEmployees(data);
        const active = data.filter((e) => e.isActive && e.role !== 'SUPER_ADMIN');
        if (active.length > 0) {
          // Preselect all active sales/telecalling employees for easy distribution
          setSelectedEmpIds(active.map((e) => e.id));
          setSelectedSingleEmp(active[0].id);
        }
      })
      .catch(() => setEmployees([]));
  }, []);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.isActive && e.role !== 'SUPER_ADMIN'),
    [employees]
  );

  const departments = useMemo(() => {
    const set = new Set<string>();
    activeEmployees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [activeEmployees]);

  const filteredEmployeesByDept = useMemo(() => {
    if (departmentFilter === 'ALL') return activeEmployees;
    return activeEmployees.filter((e) => e.department === departmentFilter);
  }, [activeEmployees, departmentFilter]);

  // Scan file handler
  async function scanFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      addToast({
        type: 'danger',
        title: 'Unsupported file format',
        message: 'Please upload a valid .xlsx, .xls or .csv file.',
      });
      return;
    }

    setLoading(true);
    setImportedIds([]);
    setCurrentPage(1);
    const body = new FormData();
    body.append('file', file);

    try {
      const data = await apiClient.post<Scan>('/leads/import/preview', body);
      setScan(data);
      setFileName(file.name);
      addToast({
        type: 'success',
        title: 'Sheet Scanned Successfully',
        message: `Parsed ${data.readyRows.length} valid leads ready for import (${data.rejectedRows.length} duplicate/invalid rows excluded).`,
      });
    } catch (e: any) {
      addToast({
        type: 'danger',
        title: 'Could not scan file',
        message: e.message || 'Error parsing spreadsheet file.',
      });
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  }

  // Filtered rows for preview table
  const displayedReadyRows = useMemo(() => {
    if (!scan) return [];
    if (!searchQuery.trim()) return scan.readyRows;
    const q = searchQuery.toLowerCase().trim();
    return scan.readyRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.company && r.company.toLowerCase().includes(q)) ||
        (r.city && r.city.toLowerCase().includes(q)) ||
        (r.requirement && r.requirement.toLowerCase().includes(q))
    );
  }, [scan, searchQuery]);

  const displayedRejectedRows = useMemo(() => {
    if (!scan) return [];
    if (!searchQuery.trim()) return scan.rejectedRows;
    const q = searchQuery.toLowerCase().trim();
    return scan.rejectedRows.filter(
      (r) =>
        r.reason.toLowerCase().includes(q) ||
        String(r.rowNumber).includes(q)
    );
  }, [scan, searchQuery]);

  // Pagination calculations
  const currentItems = activeTab === 'ready' ? displayedReadyRows : displayedRejectedRows;
  const totalPages = Math.ceil(currentItems.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentItems.slice(start, start + pageSize);
  }, [currentItems, currentPage, pageSize]);

  // Import Leads into Database in robust batches of 1,000 (prevents payload limits)
  async function handleCommitImport() {
    if (!scan || !scan.readyRows.length) return;
    setImporting(true);
    setImportProgress({ current: 0, total: scan.readyRows.length });

    // Clean rows (strip raw object to minimize JSON size)
    const sanitizedRows = scan.readyRows.map((r) => ({
      name: r.name,
      phone: r.phone,
      email: r.email || undefined,
      company: r.company || undefined,
      title: r.title || undefined,
      city: r.city || undefined,
      source: 'CSV_IMPORT',
      requirement: r.requirement || undefined,
      budget: r.budget || undefined,
      rowNumber: r.rowNumber,
      customFields: r.customFields || {},
    }));

    const CHUNK_SIZE = 1000;
    const allLeadIds: string[] = [];
    let totalImported = 0;

    try {
      for (let i = 0; i < sanitizedRows.length; i += CHUNK_SIZE) {
        const chunk = sanitizedRows.slice(i, i + CHUNK_SIZE);
        const result = await apiClient.post<{ importedCount: number; leadIds: string[] }>(
          '/leads/import/commit',
          { rows: chunk }
        );
        totalImported += result.importedCount;
        if (Array.isArray(result.leadIds)) {
          allLeadIds.push(...result.leadIds);
        }
        setImportProgress({
          current: Math.min(i + CHUNK_SIZE, sanitizedRows.length),
          total: sanitizedRows.length,
        });
      }

      setImportedIds(allLeadIds);
      addToast({
        type: 'success',
        title: 'Leads Imported to CRM!',
        message: `${totalImported.toLocaleString()} leads saved successfully. Choose your employees below to distribute them immediately.`,
      });
    } catch (e: any) {
      if (allLeadIds.length > 0) {
        setImportedIds(allLeadIds);
      }
      addToast({
        type: 'danger',
        title: 'Import Failed',
        message: e.message || 'Failed to commit leads to CRM.',
      });
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  }

  // Distribution: Assign All to Single Employee
  async function handleAssignSingle() {
    if (!selectedSingleEmp || !importedIds.length) return;
    setDistributing(true);
    try {
      const emp = activeEmployees.find((e) => e.id === selectedSingleEmp);
      const result = await apiClient.post<{ assignedCount: number }>('/leads/assign-bulk', {
        leadIds: importedIds,
        employeeId: selectedSingleEmp,
      });
      addToast({
        type: 'success',
        title: 'Leads Assigned Successfully',
        message: `${result.assignedCount} leads assigned to ${emp?.name || 'employee'}.`,
      });
      setImportedIds([]);
    } catch (e: any) {
      addToast({ type: 'danger', title: 'Assignment Failed', message: e.message });
    } finally {
      setDistributing(false);
    }
  }

  // Distribution: Distribute Evenly (Round-Robin)
  async function handleDistributeEvenly() {
    if (!selectedEmpIds.length || !importedIds.length) return;
    setDistributing(true);
    try {
      const result = await apiClient.post<{
        assignedCount: number;
        distribution: { employee: { name: string }; count: number }[];
      }>('/leads/distribute-evenly', {
        leadIds: importedIds,
        employeeIds: selectedEmpIds,
      });

      const summary = result.distribution.map((d) => `${d.employee.name}: ${d.count}`).join(' • ');
      addToast({
        type: 'success',
        title: 'Equal Distribution Completed!',
        message: `${result.assignedCount} leads divided evenly (${summary}).`,
      });
      setImportedIds([]);
    } catch (e: any) {
      addToast({ type: 'danger', title: 'Distribution Failed', message: e.message });
    } finally {
      setDistributing(false);
    }
  }

  // Distribution: Custom Quotas
  async function handleDistributeCustom() {
    if (!importedIds.length) return;

    // Check sum
    const totalAllocated = Object.values(customAllocations).reduce((a, b) => a + (Number(b) || 0), 0);
    if (totalAllocated <= 0) {
      addToast({
        type: 'danger',
        title: 'Missing Quantities',
        message: 'Please allocate at least 1 lead to an employee.',
      });
      return;
    }

    setDistributing(true);
    try {
      // Chunk importedIds according to customAllocations
      let cursor = 0;
      const distributionPayload: Array<{ employeeId: string; leadIds: string[] }> = [];

      for (const [empId, qty] of Object.entries(customAllocations)) {
        const count = Number(qty) || 0;
        if (count > 0 && cursor < importedIds.length) {
          const chunk = importedIds.slice(cursor, cursor + count);
          distributionPayload.push({ employeeId: empId, leadIds: chunk });
          cursor += chunk.length;
        }
      }

      const result = await apiClient.post<{ assignedCount: number }>('/leads/distribute-custom', {
        distribution: distributionPayload,
      });

      addToast({
        type: 'success',
        title: 'Custom Lead Distribution Completed!',
        message: `${result.assignedCount} leads allocated according to your specified quotas.`,
      });
      setImportedIds([]);
      setCustomAllocations({});
    } catch (e: any) {
      addToast({ type: 'danger', title: 'Distribution Failed', message: e.message });
    } finally {
      setDistributing(false);
    }
  }

  // Toggle employee selection
  const toggleEmployeeSelection = (id: string) => {
    setSelectedEmpIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const ids = filteredEmployeesByDept.map((e) => e.id);
    setSelectedEmpIds(ids);
  };

  const deselectAll = () => {
    setSelectedEmpIds([]);
  };

  // Calculate quota remaining for custom distribution
  const totalCustomAllocated = Object.values(customAllocations).reduce((a, b) => a + (Number(b) || 0), 0);
  const remainingToAllocate = Math.max(0, importedIds.length - totalCustomAllocated);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            <span>High-Capacity Lead Engine • Up to 100,000 Rows</span>
          </div>
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
            Excel Lead Import & Multi-Employee Distribution
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Upload your Excel spreadsheet, review all lead details, and distribute them to sales employees equally or by custom quota.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Sheet Rows"
          value={scan ? scan.totalRows.toLocaleString() : '—'}
          icon={<FileSpreadsheet className="w-4 h-4 text-blue-500" />}
        />
        <KPICard
          label="Ready to Import"
          value={scan ? scan.readyRows.length.toLocaleString() : '—'}
          accent="green"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        />
        <KPICard
          label="Needs Review / Duplicate"
          value={scan ? scan.rejectedRows.length.toLocaleString() : '—'}
          accent="rose"
          icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
        />
        <KPICard
          label="Detected Columns"
          value={scan ? scan.columns.length : '—'}
          icon={<Layers className="w-4 h-4 text-indigo-500" />}
        />
      </div>

      {/* Upload Box */}
      <section className="rounded-2xl border-2 border-dashed border-blue-200 bg-white p-8 text-center shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600 shadow-sm group-hover:scale-105 transition-transform">
            <Upload className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-base font-bold text-neutral-900">
              Upload Lead Spreadsheet (.xlsx, .xls, .csv)
            </h2>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
              Accepts all formats: Name, Phone/Mobile, Email, Company, City, Requirement, Budget, plus custom columns. Streaming buffer handles up to 50MB & 100,000 rows.
            </p>
          </div>

          <div>
            <label className="inline-flex cursor-pointer">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-all">
                <Upload className="w-4 h-4" />
                {loading ? 'Streaming & Parsing Buffer…' : 'Choose Excel / CSV File'}
              </span>
              <input
                className="hidden"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={scanFile}
                disabled={loading}
              />
            </label>
          </div>

          {fileName && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{fileName}</span>
              <span className="text-neutral-400">•</span>
              <span className="text-neutral-600">Sheet: {scan?.sheetName}</span>
            </div>
          )}
        </div>
      </section>

      {/* FULL DATA PREVIEW SECTION (Comprehensive Lead Preview for Admin) */}
      {scan && (
        <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden space-y-4">
          {/* Header Controls */}
          <div className="p-4 sm:p-5 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-900">
                  Scanned Lead Data Preview
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {scan.readyRows.length} Valid Leads
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Columns Detected: {scan.columns.join(', ')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Ready vs Rejected Tab Pill */}
              <div className="inline-flex p-1 bg-neutral-100 rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('ready');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'ready'
                      ? 'bg-white text-emerald-700 font-bold shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Ready ({scan.readyRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('rejected');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'rejected'
                      ? 'bg-white text-rose-700 font-bold shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Rejected / Duplicate ({scan.rejectedRows.length})
                </button>
              </div>

              {/* Commit / Import Button */}
              <Button
                variant="primary"
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={handleCommitImport}
                isLoading={importing}
                disabled={!scan.readyRows.length || !!importedIds.length}
                className="bg-emerald-600 hover:bg-emerald-700 border-emerald-700 font-medium"
              >
                {importing && importProgress
                  ? `Importing ${importProgress.current.toLocaleString()} / ${importProgress.total.toLocaleString()}...`
                  : importedIds.length
                  ? `✓ ${importedIds.length.toLocaleString()} Leads Ready to Distribute`
                  : `Import ${scan.readyRows.length.toLocaleString()} Leads to CRM`}
              </Button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="px-4 sm:px-5 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={
                  activeTab === 'ready'
                    ? 'Search by Name, Phone, Company, City...'
                    : 'Search by reason or row number...'
                }
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-200 text-xs bg-neutral-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-all font-medium"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span>Show rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white font-medium focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto max-h-[440px] border-t border-neutral-100">
            {activeTab === 'ready' ? (
              <table className="w-full text-left text-xs text-neutral-700">
                <thead className="bg-neutral-50 sticky top-0 z-10 text-[11px] font-semibold text-neutral-500 uppercase border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3">Row #</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Mobile / Phone</th>
                    <th className="py-2.5 px-3">Company</th>
                    <th className="py-2.5 px-3">City / Location</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Requirement / Note</th>
                    <th className="py-2.5 px-3">Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-sans">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-neutral-400">
                        No rows matching your search filter.
                      </td>
                    </tr>
                  ) : (
                    (paginatedRows as Row[]).map((row) => (
                      <tr key={row.rowNumber} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-400">
                          #{row.rowNumber}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-neutral-900">
                          {row.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-emerald-700">
                          <span className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            {row.phone}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-neutral-800">
                          {row.company || <span className="text-neutral-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-neutral-600">
                          {row.city ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-neutral-400" />
                              {row.city}
                            </span>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-600">
                          {row.email || <span className="text-neutral-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-neutral-600 max-w-[200px] truncate" title={row.requirement}>
                          {row.requirement || <span className="text-neutral-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-neutral-900">
                          {row.budget ? `₹${row.budget.toLocaleString()}` : <span className="text-neutral-400">—</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs text-neutral-700">
                <thead className="bg-neutral-50 sticky top-0 z-10 text-[11px] font-semibold text-neutral-500 uppercase border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3">Row #</th>
                    <th className="py-2.5 px-3">Reason for Exclusion</th>
                    <th className="py-2.5 px-3">Raw Sheet Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-sans">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-neutral-400">
                        No rejected rows found.
                      </td>
                    </tr>
                  ) : (
                    (paginatedRows as RejectedRow[]).map((rej) => (
                      <tr key={rej.rowNumber} className="hover:bg-rose-50/50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-rose-700">
                          Row #{rej.rowNumber}
                        </td>
                        <td className="py-2.5 px-3 text-rose-800 font-semibold">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-50 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            {rej.reason}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-neutral-600 max-w-[400px] truncate">
                          {rej.raw ? JSON.stringify(rej.raw) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="p-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span>
              Showing {currentItems.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, currentItems.length)} of {currentItems.length} rows
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                icon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>
              <span className="px-2 font-mono font-bold text-neutral-800">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                icon={<ChevronRight className="w-3.5 h-3.5" />}
                iconPosition="right"
              >
                Next
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* MULTI-EMPLOYEE DISTRIBUTION SECTION */}
      {importedIds.length > 0 && (
        <section className="bg-white rounded-2xl border-2 border-emerald-400 p-6 shadow-xl space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
                <Users className="w-3.5 h-3.5 text-emerald-700" />
                <span>Step 2: Multi-Employee Lead Distribution</span>
              </div>
              <h2 className="text-lg font-bold text-neutral-900">
                Distribute {importedIds.length} Imported Leads
              </h2>
              <p className="text-xs text-neutral-600">
                Employees will only see leads assigned specifically to them upon login.
              </p>
            </div>

            {/* Distribution Mode Tabs */}
            <div className="inline-flex p-1 bg-neutral-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDistributionMode('equal')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  distributionMode === 'equal'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Equal Split
              </button>
              <button
                type="button"
                onClick={() => setDistributionMode('custom')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  distributionMode === 'custom'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Custom Quota
              </button>
              <button
                type="button"
                onClick={() => setDistributionMode('single')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  distributionMode === 'single'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Single Employee
              </button>
            </div>
          </div>

          {/* MODE 1: EQUAL SPLIT (Round Robin) */}
          {distributionMode === 'equal' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50 p-3.5 rounded-xl border border-blue-200 text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Dividing <strong>{importedIds.length} leads</strong> equally across{' '}
                    <strong>{selectedEmpIds.length} employees</strong>:{' '}
                    <strong>
                      {selectedEmpIds.length > 0
                        ? Math.floor(importedIds.length / selectedEmpIds.length)
                        : 0}{' '}
                      leads per employee
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllFiltered}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    Clear
                  </Button>
                </div>
              </div>

              {/* Department Filter Pills */}
              {departments.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-neutral-500 font-semibold">Filter Department:</span>
                  <button
                    type="button"
                    onClick={() => setDepartmentFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                      departmentFilter === 'ALL'
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    All Departments ({activeEmployees.length})
                  </button>
                  {departments.map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setDepartmentFilter(dept)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                        departmentFilter === dept
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              )}

              {/* Employee Selection Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredEmployeesByDept.map((emp) => {
                  const isSelected = selectedEmpIds.includes(emp.id);
                  const leadsPerEmp = selectedEmpIds.length > 0
                    ? Math.floor(importedIds.length / selectedEmpIds.length)
                    : 0;

                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleEmployeeSelection(emp.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/70 shadow-sm'
                          : 'border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 text-blue-600">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5 text-neutral-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-neutral-900 truncate">
                            {emp.name}
                          </p>
                          <p className="text-[11px] text-neutral-500 font-mono truncate">
                            {emp.phone || emp.email}
                          </p>
                          <span className="text-[10px] text-neutral-400 font-medium block truncate">
                            {emp.department || emp.role}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="shrink-0 text-xs font-bold font-mono px-2 py-0.5 rounded bg-blue-600 text-white">
                          +{leadsPerEmp}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Confirm Equal Distribution Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  icon={<Send className="w-4 h-4" />}
                  onClick={handleDistributeEvenly}
                  disabled={!selectedEmpIds.length}
                  isLoading={distributing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Confirm & Distribute {importedIds.length} Leads Equally
                </Button>
              </div>
            </div>
          )}

          {/* MODE 2: CUSTOM QUOTAS (Custom allocation per employee) */}
          {distributionMode === 'custom' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-violet-50 border border-violet-200 flex flex-wrap items-center justify-between gap-3 text-xs text-violet-900">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-violet-700 shrink-0" />
                  <span>
                    Enter the exact number of leads to assign next to each employee.
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono font-bold text-xs">
                  <span>Total: {importedIds.length}</span>
                  <span className="text-emerald-700">Allocated: {totalCustomAllocated}</span>
                  <span className={remainingToAllocate === 0 ? 'text-emerald-700' : 'text-amber-700'}>
                    Remaining: {remainingToAllocate}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {activeEmployees.map((emp) => {
                  const qty = customAllocations[emp.id] || 0;

                  return (
                    <div
                      key={emp.id}
                      className="p-3.5 rounded-xl border border-neutral-200 bg-white shadow-sm flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-neutral-900 truncate">{emp.name}</p>
                        <p className="text-[11px] text-neutral-500 font-mono truncate">{emp.phone || emp.email}</p>
                        <span className="text-[10px] text-neutral-400 font-medium block truncate">
                          {emp.department || emp.role}
                        </span>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        <label className="text-[11px] font-semibold text-neutral-600">Qty:</label>
                        <input
                          type="number"
                          min={0}
                          max={importedIds.length}
                          value={qty || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setCustomAllocations((prev) => ({ ...prev, [emp.id]: val }));
                          }}
                          placeholder="0"
                          className="w-16 px-2 py-1.5 rounded-lg border border-neutral-200 text-xs font-mono font-bold text-center focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Auto-fill equal split as baseline
                    const per = Math.floor(importedIds.length / activeEmployees.length);
                    const allocs: Record<string, number> = {};
                    activeEmployees.forEach((e) => {
                      allocs[e.id] = per;
                    });
                    setCustomAllocations(allocs);
                  }}
                >
                  Auto-fill Even Baseline
                </Button>

                <Button
                  variant="primary"
                  size="lg"
                  icon={<Send className="w-4 h-4" />}
                  onClick={handleDistributeCustom}
                  disabled={totalCustomAllocated === 0}
                  isLoading={distributing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Confirm Custom Distribution ({totalCustomAllocated} Leads)
                </Button>
              </div>
            </div>
          )}

          {/* MODE 3: SINGLE EMPLOYEE ASSIGNMENT */}
          {distributionMode === 'single' && (
            <div className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-700">
                  Select Employee (Assign all {importedIds.length} leads):
                </label>
                <select
                  value={selectedSingleEmp}
                  onChange={(e) => setSelectedSingleEmp(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs bg-white font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                >
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.department || emp.role} ({emp.phone || emp.email})
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="primary"
                size="lg"
                icon={<Send className="w-4 h-4" />}
                onClick={handleAssignSingle}
                disabled={!selectedSingleEmp}
                isLoading={distributing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Assign All {importedIds.length} Leads to Selected Employee
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
