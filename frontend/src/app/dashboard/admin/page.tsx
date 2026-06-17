"use client";

import React, { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import StatusBadge from "@/components/StatusBadge";
import StatsCard from "@/components/StatsCard";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { useToastStore } from "@/components/Toast";

interface Application {
  id: string;
  trackingId: string;
  status: string;
  applicantDetails: Record<string, unknown>;
  photoStoragePath: string;
  hodRemarks?: string;
  ccAdminRemarks?: string;
  quotaAssignedGB?: number;
  createdAt: string;
  hodApprovedAt?: string;
  provisionedAt?: string;
  updatedAt?: string;
  applicant?: {
    id: string;
    alternateEmail: string;
    bhuEmail?: string;
    firstName: string;
    lastName: string;
  };
  department?: {
    id: string;
    name: string;
    code: string;
  };
  hod?: {
    firstName: string;
    lastName: string;
  };
}

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  ipAddress: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

interface QuotaStats {
  totalAccounts: number;
  totalQuotaGB: number;
  categoryBreakdown: Record<string, { count: number; totalGB: number }>;
}

const quotaMap: Record<string, number> = {
  GROUP_A_OFFICER: 20,
  TEACHING_STAFF: 20,
  RESEARCH_SCHOLAR: 10,
  POST_GRADUATE_STUDENT: 5,
  NON_TEACHING_STAFF: 5,
};

type TabId = "pending" | "active" | "suspended" | "archived" | "audit";

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: "pending", label: "Pending Queue", icon: "queue" },
  { id: "active", label: "Active Users", icon: "verified_user" },
  { id: "suspended", label: "Suspended", icon: "pause_circle" },
  { id: "archived", label: "Archived", icon: "inventory_2" },
  { id: "audit", label: "Audit Logs", icon: "history" },
];

const categoryLabels: Record<string, string> = {
  GROUP_A_OFFICER: "Group-A Officer",
  TEACHING_STAFF: "Teaching Staff",
  RESEARCH_SCHOLAR: "Research Scholar",
  POST_GRADUATE_STUDENT: "PG Student",
  NON_TEACHING_STAFF: "Non-Teaching Staff",
  UNKNOWN: "Unknown",
};

/**
 * CC Admin Dashboard — Full User Lifecycle Management
 *
 * Tabs: Pending Queue (Flag 0), Active Users (Flag 1), Suspended, Archived, Audit Logs.
 * Features: Provisioning, Suspend, Archive, Reactivate, Bulk Actions, Password Reset, Quota Stats.
 */
export default function AdminDashboard() {
  const { addToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<TabId>("pending");
  const [loading, setLoading] = useState(true);

  // Data states
  const [pendingApps, setPendingApps] = useState<Application[]>([]);
  const [activeApps, setActiveApps] = useState<Application[]>([]);
  const [suspendedApps, setSuspendedApps] = useState<Application[]>([]);
  const [archivedApps, setArchivedApps] = useState<Application[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [quotaStats, setQuotaStats] = useState<QuotaStats | null>(null);

  // UI states
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [provisioning, setProvisioning] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [remarksModal, setRemarksModal] = useState<{ action: string; ids: string[] } | null>(null);
  const [remarks, setRemarks] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Data Fetching ──
  const fetchTabData = useCallback(async (tab: TabId) => {
    setLoading(true);
    try {
      switch (tab) {
        case "pending": {
          const { data } = await api.get("/applications/admin-queue");
          setPendingApps(data.success ? data.data : data);
          break;
        }
        case "active": {
          const [{ data: activeData }, { data: statsData }] = await Promise.all([
            api.get("/applications/admin/active"),
            api.get("/applications/admin/quota-stats"),
          ]);
          setActiveApps(activeData.success ? activeData.data : activeData);
          setQuotaStats(statsData.success ? statsData.data : statsData);
          break;
        }
        case "suspended": {
          const { data } = await api.get("/applications/admin/suspended");
          setSuspendedApps(data.success ? data.data : data);
          break;
        }
        case "archived": {
          const { data } = await api.get("/applications/admin/archived");
          setArchivedApps(data.success ? data.data : data);
          break;
        }
        case "audit": {
          const { data } = await api.get(`/applications/admin/audit-logs?page=${auditPage}&limit=30`);
          const result = data.success ? data.data : data;
          setAuditLogs(result.logs || []);
          setAuditTotalPages(result.totalPages || 1);
          break;
        }
      }
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  }, [auditPage]);

  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab, fetchTabData]);

  // ── Action Handlers ──
  async function handleProvision(app: Application) {
    setProvisioning(app.id);
    try {
      const { data } = await api.post(`/workspace/provision/${app.id}`);
      const result = data.success ? data.data : data;
      addToast({ message: `✅ Provisioned: ${result.bhuEmail} (${result.quotaAssignedGB}GB)`, variant: "success", duration: 6000 });
      setSelectedApp(null);
      fetchTabData("pending");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      addToast({ message: error.response?.data?.message || "Provisioning failed.", variant: "error", duration: 6000 });
    } finally {
      setProvisioning(null);
    }
  }

  async function handleAction(action: string, ids: string[], actionRemarks: string) {
    setActionLoading(action);
    try {
      if (ids.length === 1) {
        await api.patch(`/applications/${ids[0]}/${action}`, { remarks: actionRemarks });
        addToast({ message: `✅ Action "${action}" successful.`, variant: "success" });
      } else {
        await api.post(`/applications/admin/bulk-${action}`, { applicationIds: ids, remarks: actionRemarks });
        addToast({ message: `✅ Bulk "${action}" completed for ${ids.length} accounts.`, variant: "success" });
      }
      setSelectedIds(new Set());
      setRemarksModal(null);
      setRemarks("");
      fetchTabData(activeTab);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      addToast({ message: error.response?.data?.message || `Action "${action}" failed.`, variant: "error" });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResetPassword(app: Application) {
    setActionLoading("reset-" + app.id);
    try {
      const { data } = await api.post(`/applications/${app.id}/reset-password`);
      const result = data.success ? data.data : data;
      addToast({
        message: `✅ Password reset! New credentials sent to ${result.alternateEmail}. Temp: ${result.tempPassword}`,
        variant: "success",
        duration: 10000,
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      addToast({ message: error.response?.data?.message || "Password reset failed.", variant: "error" });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDownloadSignedPdf(app: Application) {
    setDownloadingPdf(app.id);
    try {
      const response = await api.get(`/applications/${app.id}/approved-pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${app.trackingId}_Approved.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      addToast({ message: "Signed PDF downloaded.", variant: "success" });
    } catch {
      addToast({ message: "Failed to download signed PDF.", variant: "error" });
    } finally {
      setDownloadingPdf(null);
    }
  }

  // ── Helpers ──
  function getExpectedEmail(app: Application): string {
    const first = (app.applicant?.firstName || "").toLowerCase().replace(/[^a-z]/g, "");
    const last = (app.applicant?.lastName || "").toLowerCase().replace(/[^a-z]/g, "");
    return `${first}.${last}@bhu.ac.in`;
  }

  function getExpectedQuota(app: Application): number {
    const category = (app.applicantDetails as Record<string, unknown>)?.category as string;
    return quotaMap[category] || 5;
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(apps: Application[]) {
    if (selectedIds.size === apps.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(apps.map((a) => a.id)));
    }
  }

  function filterApps(apps: Application[]): Application[] {
    if (!searchQuery.trim()) return apps;
    const q = searchQuery.toLowerCase();
    return apps.filter(
      (a) =>
        a.trackingId.toLowerCase().includes(q) ||
        a.applicant?.firstName.toLowerCase().includes(q) ||
        a.applicant?.lastName.toLowerCase().includes(q) ||
        a.applicant?.bhuEmail?.toLowerCase().includes(q) ||
        a.applicant?.alternateEmail.toLowerCase().includes(q) ||
        a.department?.name.toLowerCase().includes(q)
    );
  }

  function formatDate(d: string | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  // ── Quota Stats Bar Chart ──
  function QuotaChart() {
    if (!quotaStats) return null;
    const entries = Object.entries(quotaStats.categoryBreakdown);
    const maxGB = Math.max(...entries.map(([, v]) => v.totalGB), 1);
    const colors = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"];

    return (
      <div className="bg-surface rounded-2xl border border-outline-variant p-5 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="material-symbols-rounded text-[18px] text-primary">storage</span>
          Storage Quota Allocation — {quotaStats.totalAccounts} accounts, {quotaStats.totalQuotaGB} GB total
        </h3>
        <div className="space-y-3">
          {entries.map(([cat, val], i) => (
            <div key={cat}>
              <div className="flex justify-between text-xs text-outline mb-1">
                <span>{categoryLabels[cat] || cat}</span>
                <span className="font-semibold text-foreground">{val.count} users · {val.totalGB} GB</span>
              </div>
              <div className="w-full bg-surface-variant rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max((val.totalGB / maxGB) * 100, 4)}%`,
                    backgroundColor: colors[i % colors.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Application Row (reusable) ──
  function AppRow({ app, actions }: { app: Application; actions: React.ReactNode }) {
    return (
      <div className="bg-surface rounded-xl border border-outline-variant hover:shadow-md hover:border-primary/20 transition-all duration-200">
        <div className="flex items-center p-4 gap-3">
          {/* Checkbox for bulk */}
          {(activeTab === "active" || activeTab === "suspended") && (
            <input
              type="checkbox"
              checked={selectedIds.has(app.id)}
              onChange={() => toggleSelect(app.id)}
              className="w-4 h-4 accent-primary cursor-pointer shrink-0"
            />
          )}
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-sm font-bold text-on-primary-container shrink-0">
            {app.applicant?.firstName?.[0]}
            {app.applicant?.lastName?.[0]}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedApp(app)}>
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-semibold text-foreground text-sm">
                {app.applicant?.firstName} {app.applicant?.lastName}
              </p>
              <StatusBadge status={app.status} size="sm" />
            </div>
            <p className="text-xs text-outline truncate">
              {app.trackingId} · {app.department?.name}
              {app.applicant?.bhuEmail && ` · ${app.applicant.bhuEmail}`}
            </p>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        </div>
      </div>
    );
  }

  // ── Render ──
  if (loading && pendingApps.length === 0 && activeApps.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 w-48 skeleton" />
        <div className="h-4 w-72 skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 skeleton rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-serif)" }}>
          CC Admin Dashboard
        </h1>
        <p className="text-sm text-outline mt-1">User Lifecycle Management — Provisioning, Monitoring & Administration</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-surface-variant/50 rounded-xl p-1 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedIds(new Set()); setSearchQuery(""); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-primary text-on-primary shadow-sm"
                : "text-outline hover:text-foreground hover:bg-surface"
            }`}
          >
            <span className="material-symbols-rounded text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Bar (for list tabs) */}
      {activeTab !== "audit" && (
        <div className="relative mb-4">
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
          <input
            type="text"
            placeholder="Search by name, tracking ID, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-outline/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
          />
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (activeTab === "active" || activeTab === "suspended") && (
        <div className="flex items-center gap-3 bg-primary-container/30 border border-primary/20 rounded-xl px-5 py-3 mb-4">
          <span className="text-sm font-semibold text-primary">{selectedIds.size} selected</span>
          <div className="flex-1" />
          {activeTab === "active" && (
            <Button
              icon="pause_circle"
              variant="outlined"
              size="sm"
              onClick={() => setRemarksModal({ action: "suspend", ids: Array.from(selectedIds) })}
            >
              Bulk Suspend
            </Button>
          )}
          {activeTab === "suspended" && (
            <>
              <Button
                icon="play_circle"
                variant="outlined"
                size="sm"
                onClick={() => {
                  handleAction("reactivate", Array.from(selectedIds), "Bulk reactivated");
                }}
              >
                Bulk Reactivate
              </Button>
              <Button
                icon="inventory_2"
                variant="outlined"
                size="sm"
                onClick={() => setRemarksModal({ action: "archive", ids: Array.from(selectedIds) })}
              >
                Bulk Archive
              </Button>
            </>
          )}
          <Button variant="text" size="sm" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* ═══════════════════ TAB: PENDING QUEUE ═══════════════════ */}
      {activeTab === "pending" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatsCard icon="queue" label="In Queue" value={pendingApps.length} variant="warning" subtitle="Awaiting provisioning" />
            <StatsCard
              icon="storage"
              label="Pending Quota"
              value={`${pendingApps.reduce((s, a) => s + getExpectedQuota(a), 0)} GB`}
              variant="primary"
              subtitle="Will be allocated"
            />
            <StatsCard icon="speed" label="Avg Wait" value={pendingApps.length > 0 ? `${Math.round(pendingApps.reduce((s, a) => s + (Date.now() - new Date(a.hodApprovedAt || a.createdAt).getTime()) / 3600000, 0) / pendingApps.length)}h` : "—"} variant="default" subtitle="Since HOD approval" />
          </div>
          {filterApps(pendingApps).length === 0 ? (
            <div className="bg-surface rounded-2xl border border-outline-variant p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-success-container flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-rounded text-[36px] text-success">verified</span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Queue is empty</h3>
              <p className="text-sm text-outline max-w-md mx-auto">All approved applications have been provisioned.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filterApps(pendingApps).map((app) => (
                <AppRow
                  key={app.id}
                  app={app}
                  actions={
                    <>
                      <Button icon="download" variant="text" size="sm" loading={downloadingPdf === app.id} onClick={() => handleDownloadSignedPdf(app)}>
                        PDF
                      </Button>
                      <Button icon="rocket_launch" variant="filled" size="sm" loading={provisioning === app.id} onClick={() => handleProvision(app)}>
                        Provision
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════ TAB: ACTIVE USERS ═══════════════════ */}
      {activeTab === "active" && (
        <>
          <QuotaChart />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <StatsCard icon="verified_user" label="Active" value={activeApps.length} variant="success" subtitle="Flag 1 — ID Created" />
            <StatsCard icon="storage" label="Total Quota" value={`${quotaStats?.totalQuotaGB || 0} GB`} variant="primary" subtitle="Allocated" />
            <StatsCard icon="pause_circle" label="Suspended" value={suspendedApps.length} variant="warning" subtitle="Temporarily blocked" />
            <StatsCard icon="inventory_2" label="Archived" value={archivedApps.length} variant="default" subtitle="Retired/Left" />
          </div>
          {filterApps(activeApps).length === 0 ? (
            <div className="bg-surface rounded-2xl border border-outline-variant p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-rounded text-[36px] text-primary">group</span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">No active users</h3>
              <p className="text-sm text-outline max-w-md mx-auto">Provision applications from the Pending Queue tab.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center mb-3 gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filterApps(activeApps).length && filterApps(activeApps).length > 0}
                  onChange={() => toggleSelectAll(filterApps(activeApps))}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
                <span className="text-xs text-outline">Select All</span>
              </div>
              <div className="space-y-3">
                {filterApps(activeApps).map((app) => (
                  <AppRow
                    key={app.id}
                    app={app}
                    actions={
                      <>
                        <Button icon="download" variant="text" size="sm" loading={downloadingPdf === app.id} onClick={() => handleDownloadSignedPdf(app)}>
                          PDF
                        </Button>
                        <Button icon="lock_reset" variant="text" size="sm" loading={actionLoading === "reset-" + app.id} onClick={() => handleResetPassword(app)}>
                          Reset
                        </Button>
                        <Button
                          icon="pause_circle"
                          variant="outlined"
                          size="sm"
                          onClick={() => setRemarksModal({ action: "suspend", ids: [app.id] })}
                        >
                          Suspend
                        </Button>
                      </>
                    }
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ═══════════════════ TAB: SUSPENDED ═══════════════════ */}
      {activeTab === "suspended" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <StatsCard icon="pause_circle" label="Suspended" value={suspendedApps.length} variant="warning" subtitle="Temporarily blocked" />
            <StatsCard icon="info" label="Note" value="Data Retained" variant="default" subtitle="Per IT rules, no deletion until tenure ends" />
          </div>
          {filterApps(suspendedApps).length === 0 ? (
            <div className="bg-surface rounded-2xl border border-outline-variant p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-success-container flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-rounded text-[36px] text-success">check_circle</span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">No suspended accounts</h3>
            </div>
          ) : (
            <>
              <div className="flex items-center mb-3 gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filterApps(suspendedApps).length && filterApps(suspendedApps).length > 0}
                  onChange={() => toggleSelectAll(filterApps(suspendedApps))}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
                <span className="text-xs text-outline">Select All</span>
              </div>
              <div className="space-y-3">
                {filterApps(suspendedApps).map((app) => (
                  <AppRow
                    key={app.id}
                    app={app}
                    actions={
                      <>
                        <Button icon="play_circle" variant="filled" size="sm" loading={actionLoading === "reactivate"} onClick={() => handleAction("reactivate", [app.id], "Reactivated by admin")}>
                          Reactivate
                        </Button>
                        <Button
                          icon="inventory_2"
                          variant="outlined"
                          size="sm"
                          onClick={() => setRemarksModal({ action: "archive", ids: [app.id] })}
                        >
                          Archive
                        </Button>
                      </>
                    }
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ═══════════════════ TAB: ARCHIVED ═══════════════════ */}
      {activeTab === "archived" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <StatsCard icon="inventory_2" label="Archived" value={archivedApps.length} variant="default" subtitle="Retired / Left" />
            <StatsCard icon="shield" label="Policy" value="IT Compliant" variant="success" subtitle="Data retained per BHU IT rules" />
          </div>
          {filterApps(archivedApps).length === 0 ? (
            <div className="bg-surface rounded-2xl border border-outline-variant p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-surface-variant flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-rounded text-[36px] text-outline">inventory_2</span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">No archived accounts</h3>
            </div>
          ) : (
            <div className="space-y-3">
              {filterApps(archivedApps).map((app) => (
                <AppRow
                  key={app.id}
                  app={app}
                  actions={
                    <Button icon="download" variant="text" size="sm" loading={downloadingPdf === app.id} onClick={() => handleDownloadSignedPdf(app)}>
                      PDF
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════ TAB: AUDIT LOGS ═══════════════════ */}
      {activeTab === "audit" && (
        <div className="bg-surface rounded-2xl border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-variant/50 text-outline text-left">
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-t border-outline-variant/50 hover:bg-surface-variant/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-outline whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-container text-primary text-xs font-medium">
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground">{log.entityType}: {log.entityId.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-xs text-outline font-mono">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {auditLogs.length === 0 && (
            <div className="p-12 text-center text-sm text-outline">No audit logs found.</div>
          )}
          {auditTotalPages > 1 && (
            <div className="flex items-center justify-center gap-3 p-4 border-t border-outline-variant/50">
              <Button variant="text" size="sm" onClick={() => { setAuditPage((p) => Math.max(1, p - 1)); }} disabled={auditPage <= 1}>
                Previous
              </Button>
              <span className="text-xs text-outline">Page {auditPage} of {auditTotalPages}</span>
              <Button variant="text" size="sm" onClick={() => { setAuditPage((p) => Math.min(auditTotalPages, p + 1)); }} disabled={auditPage >= auditTotalPages}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ DETAIL MODAL ═══════════════════ */}
      <Modal
        isOpen={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        title={`Application ${selectedApp?.trackingId || ""}`}
        size="lg"
        footer={
          selectedApp && (
            <>
              <Button variant="outlined" onClick={() => setSelectedApp(null)}>
                Close
              </Button>
              <Button icon="download" variant="outlined" loading={downloadingPdf === selectedApp?.id} onClick={() => selectedApp && handleDownloadSignedPdf(selectedApp)}>
                Signed Document
              </Button>
              {selectedApp.status === "APPROVED_HOD" && (
                <Button icon="rocket_launch" loading={provisioning === selectedApp.id} onClick={() => handleProvision(selectedApp)}>
                  Provision Account
                </Button>
              )}
            </>
          )
        }
      >
        {selectedApp && (
          <div className="space-y-5">
            {/* Applicant Card */}
            <div className="flex items-center gap-4 p-4 bg-surface-variant/30 rounded-xl">
              <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center text-lg font-bold text-on-primary-container">
                {selectedApp.applicant?.firstName?.[0]}
                {selectedApp.applicant?.lastName?.[0]}
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground">
                  {selectedApp.applicant?.firstName} {selectedApp.applicant?.lastName}
                </p>
                <p className="text-sm text-outline">{selectedApp.applicant?.alternateEmail}</p>
                {selectedApp.applicant?.bhuEmail && (
                  <p className="text-sm text-primary font-semibold">{selectedApp.applicant.bhuEmail}</p>
                )}
                <p className="text-xs text-outline/60">{selectedApp.department?.name}</p>
              </div>
              <StatusBadge status={selectedApp.status} />
            </div>

            {/* Provisioning Preview */}
            {selectedApp.status === "APPROVED_HOD" && (
              <div className="bg-primary-container/20 rounded-xl p-5 border border-primary/15">
                <h4 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                  <span className="material-symbols-rounded text-[18px]">preview</span>
                  Provisioning Preview
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface rounded-lg px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-outline font-medium">BHU Email</p>
                    <p className="text-sm text-primary font-bold">{getExpectedEmail(selectedApp)}</p>
                  </div>
                  <div className="bg-surface rounded-lg px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-outline font-medium">Storage Quota</p>
                    <p className="text-sm text-foreground font-bold">{getExpectedQuota(selectedApp)} GB</p>
                  </div>
                </div>
              </div>
            )}

            {/* Application Details */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Application Details</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(selectedApp.applicantDetails || {}).map(([key, val]) => (
                  <div key={key} className="bg-surface-variant/30 rounded-lg px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-outline font-medium">
                      {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                    </p>
                    <p className="text-sm text-foreground font-medium truncate">{String(val)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Remarks */}
            {selectedApp.ccAdminRemarks && (
              <div className="bg-warning-container/30 rounded-xl px-5 py-4">
                <p className="text-xs font-semibold text-warning mb-1">CC Admin Remarks</p>
                <p className="text-sm text-foreground">{selectedApp.ccAdminRemarks}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ═══════════════════ REMARKS MODAL ═══════════════════ */}
      <Modal
        isOpen={!!remarksModal}
        onClose={() => { setRemarksModal(null); setRemarks(""); }}
        title={`Confirm ${remarksModal?.action === "suspend" ? "Suspension" : "Archive"}`}
        size="sm"
        footer={
          <> 
            <Button variant="outlined" onClick={() => { setRemarksModal(null); setRemarks(""); }}>
              Cancel
            </Button>
            <Button
              icon={remarksModal?.action === "suspend" ? "pause_circle" : "inventory_2"}
              variant="filled"
              loading={!!actionLoading}
              onClick={() => remarksModal && handleAction(remarksModal.action, remarksModal.ids, remarks)}
            >
              {remarksModal?.action === "suspend" ? "Suspend" : "Archive"} ({remarksModal?.ids.length})
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-outline">
            {remarksModal?.action === "suspend"
              ? "Suspended accounts will be temporarily blocked. Data will be retained per IT policy."
              : "Archived accounts are for retired/left users. Data is retained — no deletion until tenure is complete."}
          </p>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Remarks (optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter reason..."
              rows={3}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-outline/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
