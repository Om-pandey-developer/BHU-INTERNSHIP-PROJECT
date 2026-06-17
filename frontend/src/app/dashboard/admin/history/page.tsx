"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/axios";
import SkeletonLoader from "@/components/SkeletonLoader";

interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  ipAddress: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const actionConfig: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  APPLICATION_SUBMITTED: { icon: "description", color: "text-primary", bg: "bg-primary-container", label: "Application Submitted" },
  STATUS_CHANGED_TO_APPROVED_HOD: { icon: "check_circle", color: "text-success", bg: "bg-success-container", label: "HOD Approved" },
  STATUS_CHANGED_TO_REJECTED_HOD: { icon: "cancel", color: "text-error", bg: "bg-error-container", label: "HOD Rejected" },
  ACCOUNT_PROVISIONED: { icon: "verified", color: "text-success", bg: "bg-success-container", label: "Account Provisioned" },
  ACCOUNT_SUSPENDED: { icon: "pause_circle", color: "text-warning", bg: "bg-warning-container", label: "Account Suspended" },
  ACCOUNT_ARCHIVED: { icon: "archive", color: "text-outline", bg: "bg-surface-variant", label: "Account Archived" },
  ACCOUNT_REACTIVATED: { icon: "play_circle", color: "text-success", bg: "bg-success-container", label: "Account Reactivated" },
  PASSWORD_RESET: { icon: "lock_reset", color: "text-warning", bg: "bg-warning-container", label: "Password Reset" },
};

const defaultActionConfig = { icon: "info", color: "text-outline", bg: "bg-surface-variant", label: "Action" };

/**
 * Audit History — CC Admin History Tab
 * 
 * Shows a paginated, filterable timeline of all system audit logs
 * with color-coded action types and timestamps.
 */
export default function HistoryPage() {
  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState("ALL");
  const [searchId, setSearchId] = useState("");
  const limit = 25;

  useEffect(() => {
    fetchLogs();
  }, [page]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/applications/admin/audit-logs?page=${page}&limit=${limit}`);
      setData(res.success ? res.data : res);
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    } finally {
      setLoading(false);
    }
  }

  // Filter logs by action type and search
  const filteredLogs = (data?.logs || []).filter(log => {
    if (filterAction !== "ALL" && log.action !== filterAction) return false;
    if (searchId && !log.entityId.toLowerCase().includes(searchId.toLowerCase())) return false;
    return true;
  });

  const actionTypes = ["ALL", ...Object.keys(actionConfig)];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Audit History
        </h1>
        <p className="text-sm text-outline mt-1">
          Complete timeline of all actions performed in the system
        </p>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
              search
            </span>
            <input
              type="text"
              placeholder="Search by Entity ID..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface-variant/30 px-4 py-2.5 text-sm text-foreground pl-10 focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          {/* Action filter */}
          <div className="relative shrink-0">
            <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline z-10">
              filter_list
            </span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="rounded-lg border border-outline-variant bg-surface-variant/30 px-4 py-2.5 text-sm text-foreground pl-10 pr-8 appearance-none focus:border-primary focus:outline-none transition-colors cursor-pointer"
            >
              {actionTypes.map(action => (
                <option key={action} value={action}>
                  {action === "ALL" ? "All Actions" : (actionConfig[action]?.label || action)}
                </option>
              ))}
            </select>
            <span className="material-symbols-rounded absolute right-2 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none">
              expand_more
            </span>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <SkeletonLoader variant="table-row" count={8} />
      ) : filteredLogs.length === 0 ? (
        /* Empty state */
        <div className="bg-surface rounded-2xl border border-outline-variant p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-rounded text-[32px] text-outline">
              history
            </span>
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">No audit logs found</h3>
          <p className="text-sm text-outline">
            {searchId || filterAction !== "ALL"
              ? "Try adjusting your search or filter."
              : "System audit logs will appear here as actions are performed."}
          </p>
        </div>
      ) : (
        /* Timeline */
        <div className="space-y-2">
          {filteredLogs.map((log, idx) => {
            const config = actionConfig[log.action] || defaultActionConfig;
            const payload = log.payload as Record<string, unknown> | null;
            
            return (
              <div
                key={log.id}
                className="bg-surface rounded-xl border border-outline-variant p-4 hover:shadow-sm transition-shadow group"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                    <span className={`material-symbols-rounded text-[20px] ${config.color}`}>
                      {config.icon}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-[10px] text-outline bg-surface-variant px-2 py-0.5 rounded-full font-mono">
                        {log.entityType}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex items-center gap-3 mt-1 text-xs text-outline flex-wrap">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-rounded text-[14px]">person</span>
                        {log.performedBy.substring(0, 8)}...
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-rounded text-[14px]">schedule</span>
                        {new Date(log.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-rounded text-[14px]">language</span>
                        {log.ipAddress}
                      </span>
                    </div>

                    {/* Payload details (collapsed by default) */}
                    {payload && Object.keys(payload).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-primary cursor-pointer hover:underline font-medium">
                          View details
                        </summary>
                        <div className="mt-2 bg-surface-variant/30 rounded-lg p-3 text-xs font-mono text-outline overflow-x-auto">
                          {Object.entries(payload).map(([key, val]) => (
                            <div key={key} className="flex gap-2 py-0.5">
                              <span className="text-foreground font-semibold shrink-0">{key}:</span>
                              <span className="truncate">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>

                  {/* Timeline connector line */}
                  {idx < filteredLogs.length - 1 && (
                    <div className="absolute left-[2.75rem] top-[3.5rem] w-0.5 h-4 bg-outline-variant hidden" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 bg-surface rounded-xl border border-outline-variant p-4">
          <p className="text-xs text-outline">
            Page {data.page} of {data.totalPages} • {data.total} total entries
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-outline-variant hover:bg-surface-variant transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-rounded text-[16px]">chevron_left</span>
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-outline-variant hover:bg-surface-variant transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <span className="material-symbols-rounded text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
