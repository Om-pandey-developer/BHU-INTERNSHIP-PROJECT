"use client";

import React, { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import StatsCard from "@/components/StatsCard";
import Modal from "@/components/Modal";

/* ─── Types ─── */
interface TableInfo {
  name: string;
  icon: string;
  description: string;
  count: number;
  columns: string[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface TableData {
  tableName: string;
  records: Record<string, unknown>[];
  pagination: PaginationInfo;
}

/* ─── Variant mapping for table stats ─── */
const tableVariants: Record<string, "primary" | "success" | "warning" | "error" | "default"> = {
  User: "primary",
  Application: "success",
  Department: "warning",
  AuditLog: "error",
  OtpVerification: "default",
  ReapplyRequest: "primary",
};

/* ─── Convert camelCase/PascalCase keys to spaced Title Case ─── */
function formatColumnLabel(key: string): string {
  // Insert space before uppercase letters (camelCase → camel Case)
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  // Capitalize first letter of each word
  return spaced
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Renders nested objects / arrays as structured key-value cards
 * instead of raw JSON strings in the preview drawer.
 */
function RenderNestedData({ data }: { data: unknown }) {
  if (data === null || data === undefined) {
    return <span className="text-outline italic">—</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-outline italic">Empty list</span>;
    return (
      <div className="space-y-2">
        {data.map((item, idx) => (
          <div key={idx} className="bg-surface-variant/40 rounded-lg px-3 py-2 border border-outline-variant/20">
            <p className="text-[9px] uppercase tracking-wider text-outline/70 font-semibold mb-1">Item {idx + 1}</p>
            <RenderNestedData data={item} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-outline italic">Empty object</span>;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="bg-surface-variant/40 rounded-lg px-3 py-2.5 border border-outline-variant/20">
            <p className="text-[9px] uppercase tracking-wider text-outline/70 font-semibold mb-0.5">
              {formatColumnLabel(key)}
            </p>
            <div className="text-sm text-foreground break-words">
              {typeof value === "object" && value !== null ? (
                <RenderNestedData data={value} />
              ) : value === null || value === undefined ? (
                <span className="text-outline italic">—</span>
              ) : (
                <span>{String(value)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-sm text-foreground">{String(data)}</span>;
}

/**
 * CC Admin — Database Explorer
 *
 * Read-only view of all database tables with:
 * - Table overview with row counts
 * - Table selector tabs
 * - Paginated data table with search
 * - Row detail drawer
 */
export default function DatabaseExplorerPage() {
  /* ─── State ─── */
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState<number | "">(1);
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);
  const [zoomLevel, setZoomLevel] = useState<"sm" | "md" | "lg">("md");
  const [limit, setLimit] = useState(15);

  /* ─── Fetch tables overview ─── */
  useEffect(() => {
    async function fetchTables() {
      setLoading(true);
      try {
        const { data } = await api.get("/admin/database/tables");
        const list: TableInfo[] = data.success ? data.data : data;
        setTables(list);
        if (list.length > 0) setSelectedTable(list[0].name);
      } catch {
        // empty
      } finally {
        setLoading(false);
      }
    }
    fetchTables();
  }, []);

  /* ─── Fetch records for selected table ─── */
  const fetchRecords = useCallback(async () => {
    if (!selectedTable) return;
    setTableLoading(true);
    try {
      const safePage = typeof page === "number" ? page : 1;
      const params = new URLSearchParams({
        page: String(safePage),
        limit: String(limit),
      });
      if (search) params.set("search", search);

      const { data } = await api.get(
        `/admin/database/tables/${selectedTable}?${params.toString()}`
      );
      setTableData(data.success ? data.data : data);
    } catch {
      setTableData(null);
    } finally {
      setTableLoading(false);
    }
  }, [selectedTable, page, search, limit]);

  /* ─── Reset page when table or search changes ─── */
  useEffect(() => {
    setPage(1);
  }, [selectedTable, search]);

  /* ─── Search debounce ─── */
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Re-fetch when table, page, search, or limit changes
  useEffect(() => {
    if (selectedTable) fetchRecords();
  }, [selectedTable, page, search, limit, fetchRecords]);

  /* ─── Get visible columns ─── */
  const currentTableInfo = tables.find((t) => t.name === selectedTable);
  const columns = currentTableInfo?.columns || [];

  /* ─── Format cell value for display (NO truncation) ─── */
  function formatCell(value: unknown): string {
    if (value === null || value === undefined) return "—";
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    const str = String(value);
    // Format ISO date strings
    if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
      return new Date(str).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return str;
  }

  /* ─── Status-like badge for known enum values ─── */
  function renderCellValue(key: string, value: unknown) {
    let str = String(value ?? "");
    if (key.toLowerCase().includes("email")) {
      str = str.toLowerCase();
    }

    // Role badges
    if (key === "role" && ["APPLICANT", "HOD", "CC_ADMIN"].includes(str)) {
      const colors: Record<string, string> = {
        APPLICANT: "bg-primary-container text-on-primary-container",
        HOD: "bg-secondary-container text-secondary",
        CC_ADMIN: "bg-tertiary-container text-tertiary",
      };
      return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors[str]}`}>
          {str}
        </span>
      );
    }

    // Status badges
    if (key === "status") {
      const statusColors: Record<string, string> = {
        PENDING_HOD: "bg-amber-100 text-amber-700",
        APPROVED_HOD: "bg-blue-100 text-blue-700",
        REJECTED_HOD: "bg-red-100 text-red-700",
        PENDING_CC: "bg-orange-100 text-orange-700",
        PROVISIONED: "bg-emerald-100 text-emerald-700",
        FAILED_PROVISIONING: "bg-red-100 text-red-700",
        SUSPENDED: "bg-gray-100 text-gray-700",
        ARCHIVED: "bg-slate-100 text-slate-600",
        PENDING: "bg-amber-100 text-amber-700",
        APPROVED: "bg-emerald-100 text-emerald-700",
        REJECTED: "bg-red-100 text-red-700",
        DRAFT: "bg-gray-100 text-gray-500",
      };
      const color = statusColors[str] || "bg-gray-100 text-gray-600";
      return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${color}`}>
          {str}
        </span>
      );
    }

    // IDs — unified consistent styling (same font, same color)
    if (key === "id" || key.endsWith("Id") || key === "trackingId") {
      return (
        <span className="font-mono text-[11px] text-indigo-600" title={str}>
          {str}
        </span>
      );
    }

    return <span className="text-sm text-foreground">{formatCell(value)}</span>;
  }

  /* ─── Loading skeleton ─── */
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-56 skeleton" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 skeleton rounded-2xl" />
          ))}
        </div>
        <div className="h-12 skeleton rounded-xl" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const totalRecords = tables.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="animate-fade-in space-y-8">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-4 pt-5 pl-8 pr-5">
        <div>
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Database Explorer
          </h1>
          <p className="text-sm text-outline mt-1">
            {tables.length} tables · {totalRecords.toLocaleString()} total records
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            api.get("/admin/database/tables").then(({ data }) => {
              const list = data.success ? data.data : data;
              setTables(list);
              setLoading(false);
              fetchRecords();
            }).catch(() => setLoading(false));
          }}
          className="p-2 rounded-lg hover:bg-surface-variant transition-colors cursor-pointer"
          title="Refresh"
        >
          <span className="material-symbols-rounded text-outline"
            style={{ fontSize: "30px" }}
          >
            refresh
          </span>
        </button>
      </div>

      {/* ─── Stats Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pl-5 pr-5">
        {tables.map((table) => (
          <div
            key={table.name}
            onClick={() => setSelectedTable(table.name)}
            className={`cursor-pointer transition-all duration-200 rounded-2xl ${selectedTable === table.name
              ? "ring-2 ring-primary ring-offset-2"
              : ""
              }`}
          >
            <StatsCard
              icon={table.icon}
              label={table.name}
              value={table.count}
              variant={tableVariants[table.name] || "default"}
            />
          </div>
        ))}
      </div>

      {/* ─── Table Selector Tabs + Search (Vertical / Full Width) ─── */}
      <div className="flex flex-col gap-4 w-full pr-5 pb-3 pl-5 bg-white">
        {/* Table tabs — full width */}
        <div className="flex items-center gap-1 bg-surface-variant/50 rounded-xl p-1 overflow-x-auto w-full">
          {tables.map((table) => (
            <button
              key={table.name}
              onClick={() => setSelectedTable(table.name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${selectedTable === table.name
                ? "bg-surface text-foreground shadow-sm"
                : "text-outline hover:text-foreground"
                }`}
            >
              <span className="material-symbols-rounded text-[14px] mr-1 align-middle">
                {table.icon}
              </span>
              {formatColumnLabel(table.name)}
              <span className="ml-1 text-outline/60">({table.count})</span>
            </button>
          ))}
        </div>

        {/* Search & Pagination Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
          <div className="relative flex-1 w-full">
            <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`Search in ${formatColumnLabel(selectedTable)}...`}
              className="w-full rounded-xl border-2 border-outline-variant bg-surface pl-11 pr-4 py-2.5 text-sm text-foreground placeholder-outline/50 focus:border-primary focus:outline-none transition-colors"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setSearch(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-surface-variant cursor-pointer"
              >
                <span className="material-symbols-rounded text-[16px] text-outline">
                  close
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 text-sm text-outline">
              <span>Show</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 bg-surface-variant/50 border border-outline-variant rounded-lg text-sm focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-outline">
              <span>Go to</span>
              <input
                type="number"
                min={1}
                max={tableData?.pagination.totalPages || 1}
                value={page}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setPage("");
                    return;
                  }
                  const num = parseInt(val);
                  if (!isNaN(num) && num >= 1) {
                    setPage(num);
                  }
                }}
                className="w-16 px-2 py-1 bg-surface-variant/50 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary text-center"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Table Description ─── */}
      {currentTableInfo && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-variant/30 rounded-xl border border-outline-variant/50">
          <span className="material-symbols-rounded text-[18px] text-primary">
            info
          </span>
          <p className="text-xs text-outline">
            <span className="font-semibold text-foreground">{currentTableInfo.name}</span> — {currentTableInfo.description}
          </p>
        </div>
      )}

      {/* ─── Data Table ─── */}
      {tableLoading ? (
        <div className="bg-surface rounded-2xl border border-outline-variant p-8">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-rounded text-[36px] text-primary animate-spin">
              progress_activity
            </span>
            <p className="text-sm text-outline">Loading {selectedTable} records...</p>
          </div>
        </div>
      ) : tableData && tableData.records.length > 0 ? (
        <div className="bg-surface rounded-2xl border border-outline-variant overflow-hidden">
          <div className="flex justify-start items-center p-2 mb-2 border-b border-outline-variant/50">
            <div className="flex items-center gap-2 bg-surface-variant/30 p-1.5 rounded-xl border border-outline-variant shadow-sm">
              <span className="text-xs font-bold text-outline uppercase tracking-wider ml-2 mr-1">Zoom:</span>
              <button onClick={() => setZoomLevel("sm")} className={`p-1.5 rounded-lg ${zoomLevel === 'sm' ? 'bg-white shadow-sm text-primary' : 'text-outline hover:text-foreground'}`} title="Small text"><span className="material-symbols-rounded text-[18px]">format_size</span></button>
              <button onClick={() => setZoomLevel("md")} className={`p-1.5 rounded-lg ${zoomLevel === 'md' ? 'bg-white shadow-sm text-primary' : 'text-outline hover:text-foreground'}`} title="Medium text"><span className="material-symbols-rounded text-[20px]">format_size</span></button>
              <button onClick={() => setZoomLevel("lg")} className={`p-1.5 rounded-lg ${zoomLevel === 'lg' ? 'bg-white shadow-sm text-primary' : 'text-outline hover:text-foreground'}`} title="Large text"><span className="material-symbols-rounded text-[24px]">format_size</span></button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className={`w-full text-left border-collapse min-w-[800px] ${zoomLevel === 'sm' ? '[&_span:not(.material-symbols-rounded)]:text-[11px] [&_th]:text-[10px] [&_td]:text-[11px]' :
              zoomLevel === 'lg' ? '[&_span:not(.material-symbols-rounded)]:text-[14px] [&_th]:text-[13px] [&_td]:text-[14px]' : 'text-sm'
              }`}>
              <thead>
                <tr className="bg-surface-variant/30 border-b border-outline-variant">
                  <th className="text-left text-[10px] uppercase tracking-wider font-semibold text-outline py-3 px-4">
                    #
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="text-left text-[10px] uppercase tracking-wider font-semibold text-outline py-3 px-4 whitespace-nowrap"
                    >
                      {formatColumnLabel(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.records.map((record, idx) => (
                  <tr
                    key={String(record.id || idx)}
                    onClick={() => setSelectedRow(record)}
                    className="border-b border-outline-variant/50 hover:bg-surface-variant/20 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-4 text-xs text-outline font-mono">
                      {((typeof page === "number" ? page : 1) - 1) * limit + idx + 1}
                    </td>
                    {columns.map((col) => (
                      <td key={col} className="py-3 px-4 min-w-[120px] whitespace-normal break-words">
                        {renderCellValue(col, record[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ─── Pagination ─── */}
          {tableData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant bg-surface-variant/20">
              <p className="text-xs text-outline">
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {((typeof page === "number" ? page : 1) - 1) * limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-foreground">
                  {Math.min((typeof page === "number" ? page : 1) * limit, tableData.pagination.totalCount)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">
                  {tableData.pagination.totalCount.toLocaleString()}
                </span>{" "}
                records
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, (typeof p === "number" ? p : 1) - 1))}
                  disabled={!tableData.pagination.hasPrev}
                  className="p-1.5 rounded-lg hover:bg-surface-variant transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-rounded text-[20px]">
                    chevron_left
                  </span>
                </button>
                <div className="flex items-center gap-1">
                  {Array.from(
                    { length: Math.min(5, tableData.pagination.totalPages) },
                    (_, i) => {
                      // Show pages around current page
                      let pageNum: number;
                      const total = tableData.pagination.totalPages;
                      const current = tableData.pagination.page;
                      if (total <= 5) {
                        pageNum = i + 1;
                      } else if (current <= 3) {
                        pageNum = i + 1;
                      } else if (current >= total - 2) {
                        pageNum = total - 4 + i;
                      } else {
                        pageNum = current - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium transition-all cursor-pointer ${pageNum === current
                            ? "bg-primary text-white shadow-sm"
                            : "text-outline hover:bg-surface-variant"
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(tableData.pagination.totalPages, (Number(p) || 1) + 1))}
                  disabled={!tableData.pagination.hasNext}
                  className="p-1.5 rounded-lg hover:bg-surface-variant transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-rounded text-[20px]">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-outline-variant p-12 text-center">
          <span className="material-symbols-rounded text-[48px] text-outline/40 mb-3">
            table_rows
          </span>
          <p className="text-sm text-outline">
            {search
              ? `No records found matching "${search}" in ${selectedTable}.`
              : `No records in ${selectedTable}.`}
          </p>
        </div>
      )}

      {/* ─── Row Detail Drawer ─── */}
      <Modal
        isOpen={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        title={`${formatColumnLabel(selectedTable)} Record`}
        size="lg"
        mode="drawer"
      >
        {selectedRow && (
          <div className="space-y-3">
            {Object.entries(selectedRow).map(([key, value]) => (
              <div
                key={key}
                className="bg-surface-variant/30 rounded-xl px-5 py-4 border border-outline-variant/30"
              >
                <p className="text-[10px] uppercase tracking-wider text-outline font-semibold mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-rounded text-[14px] text-primary/60">label</span>
                  {formatColumnLabel(key)}
                </p>
                <div className="text-sm text-foreground font-medium break-words">
                  {typeof value === "object" && value !== null ? (
                    <RenderNestedData data={value} />
                  ) : (
                    renderCellValue(key, value)
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
