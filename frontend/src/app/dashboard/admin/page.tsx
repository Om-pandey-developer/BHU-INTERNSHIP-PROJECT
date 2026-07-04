"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdminAnalyticsPage from "./analytics/page";
import DatabaseExplorerPage from "./database/page";

import api from "@/lib/axios";
import StatusBadge from "@/components/StatusBadge";
import StatsCard from "@/components/StatsCard";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import SkeletonLoader from "@/components/SkeletonLoader";
import { useToastStore } from "@/components/Toast";
import DepartmentSelect from "@/components/DepartmentSelect";
import { generateApplicationPdf } from "@/lib/pdfGenerator";

interface Application {
  id: string;
  trackingId: string;
  status: string;
  applicantDetails: Record<string, unknown>;
  photoStoragePath: string;
  hodRemarks?: string;
  deanRemarks?: string;
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
  dean?: {
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
  performerName?: string;
  performerDepartment?: string;
  entityTrackingId?: string;
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

type TabId = "pending" | "active" | "suspended" | "archived" | "quota" | "audit" | "analytics" | "database";

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: "pending", label: "Pending Queue", icon: "queue" },
  { id: "active", label: "Active Users", icon: "verified_user" },
  { id: "suspended", label: "Suspended", icon: "pause_circle" },
  { id: "archived", label: "Archived", icon: "inventory_2" },
  { id: "analytics", label: "Analytics", icon: "analytics" },
  { id: "database", label: "Database", icon: "database" },
  { id: "quota", label: "Quota & Usage", icon: "storage" },
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

// ── Mocked usage data (seeded by user ID for consistency) ──
function getMockUsage(id: string, allocated: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const pct = (Math.abs(hash) % 80 + 10) / 100; // 10% - 90% usage
  return Math.round(pct * allocated * 10) / 10;
}

const TOTAL_ORG_CAPACITY_GB = 5000; // Mocked total university workspace pool

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
  const [dbDepartments, setDbDepartments] = useState<{ id: string, name: string, code: string }[]>([]);

  // UI states
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [provisioning, setProvisioning] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [remarksModal, setRemarksModal] = useState<{ action: string; ids: string[] } | null>(null);
  const [remarks, setRemarks] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [zoomLevel, setZoomLevel] = useState<"sm" | "md" | "lg">("md");
  const [currentPage, setCurrentPage] = useState<number | "">(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [editModal, setEditModal] = useState<{ id: string; details: any } | null>(null);
  const [editFormFields, setEditFormFields] = useState<Record<string, string>>({});

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
        case "quota": {
          const [{ data: activeData }, { data: statsData }] = await Promise.all([
            api.get("/applications/admin/active"),
            api.get("/applications/admin/quota-stats"),
          ]);
          setActiveApps(activeData.success ? activeData.data : activeData);
          setQuotaStats(statsData.success ? statsData.data : statsData);
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
  }, [auditPage, addToast]);

  useEffect(() => {
    api.get("/departments")
      .then(res => {
        const payload = res.data;
        if (Array.isArray(payload)) setDbDepartments(payload);
        else if (payload?.data && Array.isArray(payload.data)) setDbDepartments(payload.data);
      })
      .catch(err => console.error("Failed to load departments", err));
  }, []);

  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab, fetchTabData]);

  // ── Action Handlers ──

  async function handleEditSubmit() {
    if (!editModal) return;
    setActionLoading("edit-" + editModal.id);
    try {
      // Reconstruct the details object from form fields, preserving original types where possible
      const originalDetails = editModal.details || {};
      const updatedDetails: Record<string, any> = {};
      for (const [key, val] of Object.entries(editFormFields)) {
        const originalVal = originalDetails[key];
        // Try to preserve number type
        if (typeof originalVal === 'number') {
          const num = Number(val);
          updatedDetails[key] = isNaN(num) ? val : num;
        } else if (typeof originalVal === 'boolean') {
          updatedDetails[key] = val === 'true';
        } else {
          updatedDetails[key] = val;
        }
      }
      await api.patch(`/applications/${editModal.id}/cc-edit`, { applicantDetails: updatedDetails });
      addToast({ message: `✅ Application details updated successfully.`, variant: "success" });
      setEditModal(null);
      setEditFormFields({});
      fetchTabData(activeTab);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      addToast({ message: error.response?.data?.message || "Failed to edit application.", variant: "error" });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBulkPdfDownload() {
    setActionLoading("bulk_pdf");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const ids = Array.from(selectedIds);
      let successCount = 0;
      let failCount = 0;

      for (const id of ids) {
        const app = pendingApps.find(a => a.id === id) || activeApps.find(a => a.id === id) || suspendedApps.find(a => a.id === id) || archivedApps.find(a => a.id === id);
        if (!app) { failCount++; continue; }

        try {
          // Try server-generated approved PDF first
          const response = await api.get(`/applications/${app.id}/approved-pdf`, { responseType: "blob" });
          zip.file(`${app.trackingId}_Approved.pdf`, response.data);
          successCount++;
        } catch {
          // Fallback: generate PDF on frontend (without HOD/Dean signature)
          try {
            const blob = await generateApplicationPdf(app as any, app.applicant, null, null, true);
            if (blob) {
              zip.file(`${app.trackingId}_Draft.pdf`, blob as Blob);
              successCount++;
            } else { failCount++; }
          } catch { failCount++; }
        }
      }

      if (successCount > 0) {
        const content = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(content);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Bulk_Applications_${ids.length}.zip`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      if (failCount > 0 && successCount > 0) {
        addToast({ message: `⚠️ Downloaded ${successCount} PDFs. ${failCount} failed to generate.`, variant: "warning" });
      } else if (failCount > 0 && successCount === 0) {
        addToast({ message: `❌ All ${failCount} PDF downloads failed.`, variant: "error" });
      } else {
        addToast({ message: `✅ Downloaded ${successCount} PDFs as ZIP.`, variant: "success" });
      }
    } catch (err) {
      console.error("Bulk PDF download error:", err);
      addToast({ message: "Failed to create bulk PDF download.", variant: "error" });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBulkProvision() {
    setActionLoading("bulk_provision");
    let successCount = 0;
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        await api.post(`/workspace/provision/${id}`);
        successCount++;
      } catch (err) {
        console.error("Failed to provision", id, err);
      }
    }
    
    if (successCount === ids.length) {
      addToast({ message: `✅ Bulk Provision completed for ${successCount} accounts.`, variant: "success", duration: 6000 });
    } else {
      addToast({ message: `⚠️ Provisioned ${successCount} out of ${ids.length} accounts.`, variant: "warning", duration: 6000 });
    }
    
    setSelectedIds(new Set());
    fetchTabData("pending");
    setActionLoading(null);
  }

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
      window.URL.revokeObjectURL(url);
      addToast({ message: "Signed PDF downloaded.", variant: "success" });
    } catch {
      // Fallback: generate PDF on frontend (without HOD/Dean signature)
      try {
        await generateApplicationPdf(app as any, app.applicant, null, null, false);
        addToast({ message: "Approved PDF not available. Draft PDF downloaded instead.", variant: "warning" });
      } catch {
        addToast({ message: "Failed to download PDF.", variant: "error" });
      }
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

  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  function filterApps(apps: Application[]): Application[] {
    let result = apps;

    if (categoryFilter !== "ALL") {
      result = result.filter(a => (a.applicantDetails as Record<string, unknown>)?.category === categoryFilter);
    }

    if (departmentFilter !== "ALL") {
      result = result.filter(a => a.department?.id === departmentFilter);
    }

    if (!searchQuery.trim()) return result;
    
    const q = searchQuery.toLowerCase();
    return result.filter(
      (a) =>
        a.trackingId.toLowerCase().includes(q) ||
        a.applicant?.firstName.toLowerCase().includes(q) ||
        a.applicant?.lastName.toLowerCase().includes(q) ||
        (a.applicant as any)?.bhuEmail?.toLowerCase().includes(q) ||
        a.applicant?.alternateEmail.toLowerCase().includes(q) ||
        a.department?.name.toLowerCase().includes(q)
    );
  }

  const currentActiveData = filterApps(activeTab === "pending" ? pendingApps : activeTab === "active" ? activeApps : activeTab === "suspended" ? suspendedApps : activeTab === "archived" ? archivedApps : []);
  const totalPages = Math.max(1, Math.ceil(currentActiveData.length / entriesPerPage));
  const safePage = typeof currentPage === "number" ? currentPage : 1;
  const paginatedData = currentActiveData.slice((safePage - 1) * entriesPerPage, safePage * entriesPerPage);

  function formatDate(d: string | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }



  // ── Application Table (reusable) ──
  const renderApplicationTable = (apps: Application[], renderActions: (app: Application) => React.ReactNode) => {
    function toggleExpand(id: string) {
      setExpandedRows(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }

    // Empty state will be rendered below the toolbar
    return (
      <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-sm mt-4">
        <div className="flex flex-col gap-3 p-3 border-b border-outline-variant/50 bg-surface">
          {/* Top Row: Search and Pagination controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full max-w-xl">
              <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[20px]">search</span>
              <input
                type="text"
                placeholder="Search by name, tracking ID, email, or department..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full bg-white border border-black/10 rounded-xl pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-stone focus:outline-none focus:border-black-800 focus:ring-1 focus:ring-primary/30 transition-colors shadow-sm"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <div className="flex items-center gap-2 text-sm text-outline">
                <span>Show</span>
                <select
                  value={entriesPerPage}
                  onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="px-2 py-1.5 bg-surface-variant/50 border border-outline-variant rounded-lg text-sm focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={1000000}>All</option>
                </select>
                <span>entries</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-outline">
                <span>Page</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    if (e.target.value === "") {
                      setCurrentPage("");
                      return;
                    }
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1) {
                      setCurrentPage(val);
                    }
                  }}
                  className="w-16 px-2 py-1.5 bg-surface-variant/50 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary text-center"
                />
                <span>of {totalPages}</span>
              </div>
            </div>
          </div>

          {/* Bottom Row: Filters, Zoom, and Actions */}
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-surface-variant/30 p-1.5 rounded-xl border border-outline-variant shadow-sm">
                <span className="text-xs font-bold text-outline uppercase tracking-wider ml-2 mr-1">Zoom:</span>
                <button onClick={(e) => { e.stopPropagation(); setZoomLevel("sm"); }} className={`p-1.5 rounded-lg ${zoomLevel === 'sm' ? 'bg-white shadow-sm text-primary' : 'text-outline hover:text-foreground'}`} title="Small text"><span className="material-symbols-rounded text-[18px]">format_size</span></button>
                <button onClick={(e) => { e.stopPropagation(); setZoomLevel("md"); }} className={`p-1.5 rounded-lg ${zoomLevel === 'md' ? 'bg-white shadow-sm text-primary' : 'text-outline hover:text-foreground'}`} title="Medium text"><span className="material-symbols-rounded text-[20px]">format_size</span></button>
                <button onClick={(e) => { e.stopPropagation(); setZoomLevel("lg"); }} className={`p-1.5 rounded-lg ${zoomLevel === 'lg' ? 'bg-white shadow-sm text-primary' : 'text-outline hover:text-foreground'}`} title="Large text"><span className="material-symbols-rounded text-[24px]">format_size</span></button>
              </div>
              
              <div className="relative shadow-sm rounded-xl">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 bg-white border border-outline-variant rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all appearance-none cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="TEACHING_STAFF">Teaching Staff</option>
                  <option value="NON_TEACHING_STAFF">Non-Teaching Staff</option>
                  <option value="GROUP_A_OFFICER">Group A Officer</option>
                  <option value="RESEARCH_SCHOLAR">Research Scholar</option>
                  <option value="POST_GRADUATE_STUDENT">PG Student</option>
                  <option value="UNDER_GRADUATE_STUDENT">UG Student</option>
                </select>
                <span className="material-symbols-rounded absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">expand_more</span>
              </div>

              <div className="relative shadow-sm rounded-xl min-w-[280px]">
                <DepartmentSelect
                  departments={[{ id: "ALL", name: "All Departments", code: "ALL" }, ...dbDepartments]}
                  value={departmentFilter}
                  onChange={(val) => setDepartmentFilter(val)}
                  placeholder="All Departments"
                  small={true}
                />
              </div>
            </div>

          {selectedIds.size > 0 && (activeTab === "active" || activeTab === "suspended" || activeTab === "pending") && (
            <div className="flex items-center gap-2 bg-primary-container/20 border border-primary/20 rounded-xl px-3 py-1.5 shadow-sm mr-2 animate-fade-in">
              <span className="text-sm font-semibold text-primary mr-2 bg-primary-container px-2 py-0.5 rounded-md">{selectedIds.size} selected</span>
              
              {activeTab === "pending" && (
                <>
                  <Button icon="download" variant="outlined" size="sm" loading={actionLoading === "bulk_pdf"} onClick={handleBulkPdfDownload}>Bulk PDF</Button>
                  <Button icon="cancel" variant="outlined" size="sm" className="!border-error !text-error hover:!bg-error/10" onClick={() => setRemarksModal({ action: "reject", ids: Array.from(selectedIds) })}>Bulk Reject</Button>
                  <Button icon="rocket_launch" variant="filled" size="sm" loading={actionLoading === "bulk_provision"} onClick={handleBulkProvision}>Bulk Provision</Button>
                </>
              )}
              {activeTab === "active" && (
                <Button icon="pause_circle" variant="outlined" size="sm" onClick={() => setRemarksModal({ action: "suspend", ids: Array.from(selectedIds) })}>Bulk Suspend</Button>
              )}
              {activeTab === "suspended" && (
                <>
                  <Button icon="play_circle" variant="outlined" size="sm" onClick={() => handleAction("reactivate", Array.from(selectedIds), "Bulk reactivated")}>Bulk Reactivate</Button>
                  <Button icon="inventory_2" variant="outlined" size="sm" onClick={() => setRemarksModal({ action: "archive", ids: Array.from(selectedIds) })}>Bulk Archive</Button>
                </>
              )}
              
              <Button variant="text" size="sm" onClick={() => setSelectedIds(new Set())} className="ml-1 !text-outline hover:!text-foreground">Clear</Button>
            </div>
          )}
        </div>
      </div>
        
      {apps.length === 0 ? (
          <div className="bg-surface p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-rounded text-[32px] text-outline">search_off</span>
            </div>
            <h3 className="text-lg font-bold text-foreground">No records found</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full text-left border-collapse min-w-[2400px] ${
              zoomLevel === 'sm' ? '[&_span:not(.material-symbols-rounded)]:text-[11px] [&_th]:text-[10px] [&_td]:text-[11px]' :
              zoomLevel === 'lg' ? '[&_span:not(.material-symbols-rounded)]:text-[14px] [&_th]:text-[13px] [&_td]:text-[14px]' : 'text-sm'
            }`}>
              <thead>
                <tr className="bg-surface-variant/50 text-outline text-left">
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-10 text-center">
                    {(activeTab === "active" || activeTab === "suspended" || activeTab === "pending") && (
                    <input 
                      type="checkbox" 
                      checked={selectedIds.size > 0 && selectedIds.size === apps.length} 
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(new Set(apps.map(a => a.id)));
                        else setSelectedIds(new Set());
                      }} 
                      className="w-4 h-4 rounded border-2 border-outline-variant accent-primary cursor-pointer" 
                    />
                    )}
                  </th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-12">S.No</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">Tracking ID</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">Applicant Name</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">Alternate Email</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">Mobile No</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">Faculty/Institute</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">Department</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">Category</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">Type/Program</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">Designation</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((item, idx) => {
                  const isExpanded = expandedRows.has(item.id);
                  const name = `${item.applicant?.firstName || ''} ${item.applicant?.lastName || ''}`;
                  const email = (item.applicant?.alternateEmail || String(item.applicantDetails?.alternateEmail || "") || "").toLowerCase() || "—";
                  const trackId = item.trackingId;
                  const department = item.department?.name || "—";
                  const category = String(item.applicantDetails?.category || "—");
                  const mobileNo = String(item.applicantDetails?.mobileNo || "—");
                  const faculty = String(item.applicantDetails?.facultyInstituteCentre || "—");
                  const typeProgram = String((item.applicantDetails as any)?.programEnrolled || (item.applicantDetails as any)?.staffType || "—");
                  const designation = String((item.applicantDetails as any)?.designation || (item.applicantDetails as any)?.courseName || "—");
                  const serialNo = (safePage - 1) * entriesPerPage + idx + 1;
                  
                  // Storage info
                  const allocatedGB = item.quotaAssignedGB || getExpectedQuota(item);
                  const usedGB = getMockUsage(item.id, allocatedGB);
                  const remainingGB = Math.round((allocatedGB - usedGB) * 10) / 10;
                  const usagePct = allocatedGB > 0 ? Math.min((usedGB / allocatedGB) * 100, 100) : 0;
                  
                  return (
                    <React.Fragment key={item.id}>
                      <tr onClick={() => toggleExpand(item.id)} className={`border-t border-outline-variant hover:bg-surface-variant/20 transition-colors cursor-pointer ${isExpanded ? 'bg-primary/5' : ''}`}>
                        <td className="px-3 py-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                          {(activeTab === "active" || activeTab === "suspended" || activeTab === "pending") && (
                          <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="w-4 h-4 rounded border-2 border-outline-variant accent-primary cursor-pointer" />
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-outline font-mono align-middle">{serialNo}</td>
                        <td className="px-3 py-3 align-middle"><span className="text-primary font-medium tracking-wide">{trackId}</span></td>
                        <td className="px-3 py-3 font-semibold text-foreground align-middle"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-primary-container text-primary flex items-center justify-center text-xs font-bold shrink-0">{name.charAt(0)}</div><span className="truncate">{name}</span></div></td>
                        <td className="px-3 py-3 text-outline align-middle">{email}</td>
                        <td className="px-3 py-3 text-outline align-middle">{mobileNo}</td>
                        <td className="px-3 py-3 text-outline align-middle truncate max-w-[150px]">{faculty}</td>
                        <td className="px-3 py-3 text-outline align-middle truncate max-w-[150px]">{department}</td>
                        <td className="px-3 py-3 text-outline align-middle"><span className="px-2 py-0.5 bg-surface-variant rounded-full text-[10px] font-semibold whitespace-nowrap">{category.replace(/_/g, " ")}</span></td>
                        <td className="px-3 py-3 text-outline align-middle whitespace-nowrap">{typeProgram.replace(/_/g, " ")}</td>
                        <td className="px-3 py-3 text-outline align-middle whitespace-nowrap">{designation}</td>
                        <td className="px-3 py-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            {renderActions(item)}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                      <tr className="bg-primary/5 border-t-0">
                        <td colSpan={12} className="px-4 py-4">
                          <div className="bg-surface rounded-xl p-4 border border-primary/10 shadow-inner max-w-4xl">
                            <h4 className="text-sm font-bold text-foreground mb-3 border-b border-outline-variant pb-2">Expanded Details</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div><span className="text-outline text-xs block mb-0.5">Applied On</span><span className="font-medium">{new Date(item.createdAt).toLocaleDateString()}</span></div>
                              <div><span className="text-outline text-xs block mb-0.5">Current Status</span><StatusBadge status={item.status} size="sm" /></div>
                              <div><span className="text-outline text-xs block mb-0.5">BHU Email</span><span className="font-medium">{item.applicant?.bhuEmail || "—"}</span></div>
                              <div><span className="text-outline text-xs block mb-0.5">Employee ID</span><span className="font-medium">{String(item.applicantDetails?.employeeId || "—")}</span></div>
                            </div>
                            
                            {activeTab === "active" && item.status === "PROVISIONED" && (
                              <div className="mt-4 p-3 bg-surface-variant/30 rounded-lg max-w-sm">
                                <h5 className="text-xs font-bold text-outline uppercase mb-2">Storage Quota</h5>
                                <div className="flex justify-between text-[10px] text-outline mb-1">
                                  <span>{usedGB} / {allocatedGB} GB Used</span>
                                  <span className={usagePct > 80 ? "text-error font-semibold" : "text-success font-semibold"}>{remainingGB} GB free</span>
                                </div>
                                <div className="w-full bg-surface-variant rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${usagePct > 80 ? "bg-error" : usagePct > 50 ? "bg-warning" : "bg-success"}`}
                                    style={{ width: `${Math.max(usagePct, 3)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 0 && (
            <div className="p-4 border-t border-outline-variant flex flex-wrap items-center justify-between gap-4 bg-surface-variant/10">
              <p className="text-sm text-outline">
                Showing <span className="font-bold text-foreground">{(safePage - 1) * entriesPerPage + 1}</span> to <span className="font-bold text-foreground">{Math.min(safePage * entriesPerPage, currentActiveData.length)}</span> of <span className="font-bold text-foreground">{currentActiveData.length}</span> entries
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(prev => Math.max(1, (Number(prev) || 1) - 1))} disabled={safePage === 1} className="p-1.5 rounded border border-outline-variant text-outline hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                  <span className="material-symbols-rounded text-[18px]">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded text-sm font-semibold cursor-pointer ${safePage === page ? 'bg-primary text-white border-transparent' : 'border border-outline-variant text-outline hover:bg-surface'}`}
                  >
                    {page}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, (Number(prev) || 1) + 1))} disabled={safePage === totalPages} className="p-1.5 rounded border border-outline-variant text-outline hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                  <span className="material-symbols-rounded text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      );
    };

  // ── Render ──
  if (loading && pendingApps.length === 0 && activeApps.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <div className="h-8 w-48 skeleton rounded-lg" />
          <div className="h-4 w-72 skeleton rounded" />
        </div>
        <SkeletonLoader variant="stats-card" count={3} />
        <SkeletonLoader variant="table-row" count={4} />
      </div>
    );
  }

  return (
    <div className="">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-[32px] font-bold text-amber-800" style={{ fontFamily: "var(--font-serif)" }}>
            Computer Center Admin Dashboard
          </h1>
          <p className="text-xs sm:text-[13px] text-amber-600 mt-1">User Lifecycle Management — Provisioning, Monitoring & Administration</p>
        </div>
        <a href="/dashboard/admin/manage-hods" className="flex items-center gap-2 bg-amber-800 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:bg-amber-900 transition shrink-0">
          <span className="material-symbols-rounded text-[20px]">admin_panel_settings</span>
          Manage HODs & Deans
        </a>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-surface-variant/90 rounded-xl p-1 mb-4 sm:mb-6 overflow-x-auto shadow-[0_0_9px_rgba(0,0,0,0.3)] scrollbar-none" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedIds(new Set()); setSearchQuery(""); setCurrentPage(1); }}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${activeTab === tab.id
              ? "bg-gray-800 text-on-primary shadow-[0_0_9px_rgba(0,0,0,0.3)]"
              : "text-gray-500 hover:text-foreground hover:bg-surface "
              }`}
            title={tab.label}
          >
            <span className="material-symbols-rounded text-[16px] sm:text-[18px]">{tab.icon}</span>
            <span className="hidden xs:inline sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>      {/* ═══════════════════ TAB: PENDING QUEUE ═══════════════════ */}
      {activeTab === "pending" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <StatsCard icon="queue" label="In Queue" value={pendingApps.length} variant="warning" subtitle="Awaiting provisioning" />
            <StatsCard
              icon="storage"
              label="Pending Quota"
              value={`${pendingApps.reduce((s, a) => s + getExpectedQuota(a), 0)} GB`}
              variant="primary"
              subtitle="Will be allocated"
            />
            <StatsCard icon="speed" label="Avg Wait" value={pendingApps.length > 0 ? `${Math.round(pendingApps.reduce((s, a) => s + (new Date().getTime() - new Date(a.hodApprovedAt || a.createdAt).getTime()) / 3600000, 0) / pendingApps.length)}h` : "—"} variant="default" subtitle="Since HOD approval" />
          </div>
          {renderApplicationTable(paginatedData, (app) => (
            <>
              <Button icon="edit" variant="outlined" size="sm" onClick={() => { const details = app.applicantDetails || {}; setEditModal({ id: app.id, details }); const fields: Record<string, string> = {}; Object.entries(details).forEach(([k, v]) => { fields[k] = String(v ?? ''); }); setEditFormFields(fields); }}>
                Edit
              </Button>
              <Button icon="cancel" variant="outlined" size="sm" onClick={() => setRemarksModal({ action: "cc-reject", ids: [app.id] })}>
                Reject
              </Button>
              <Button icon="download" variant="text" size="sm" loading={downloadingPdf === app.id} onClick={() => handleDownloadSignedPdf(app)}>
                PDF
              </Button>
              <Button icon="rocket_launch" variant="filled" size="sm" loading={provisioning === app.id} onClick={() => handleProvision(app)}>
                Provision
              </Button>
            </>
          ))}
        </>
      )}

      {/* ═══════════════════ TAB: ACTIVE USERS ═══════════════════ */}
      {activeTab === "active" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <StatsCard icon="verified_user" label="Active" value={activeApps.length} variant="success" subtitle="Flag 1 — ID Created" />
            <StatsCard icon="storage" label="Total Quota" value={`${quotaStats?.totalQuotaGB || 0} GB`} variant="primary" subtitle="Allocated" />
            <StatsCard icon="pause_circle" label="Suspended" value={suspendedApps.length} variant="warning" subtitle="Temporarily blocked" />
            <StatsCard icon="inventory_2" label="Archived" value={archivedApps.length} variant="default" subtitle="Retired/Left" />
          </div>
          {filterApps(activeApps).length === 0 ? (
            <div className="bg-surface rounded-2xl border border-gray-200 p-6 sm:p-12 text-center shadow-[0_0_9px_rgba(0,0,0,0.3)] hover:shadow-md hover:border-primary/20 transition-all duration-200">
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
              {renderApplicationTable(paginatedData, (app) => (
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
              ))}
            </>
          )}
        </>
      )}

      {/* ═══════════════════ TAB: SUSPENDED ═══════════════════ */}
      {activeTab === "suspended" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <StatsCard icon="pause_circle" label="Suspended" value={suspendedApps.length} variant="warning" subtitle="Temporarily blocked" />
            <StatsCard icon="info" label="Note" value="Data Retained" variant="default" subtitle="Per IT rules, no deletion until tenure ends" />
          </div>
          {filterApps(suspendedApps).length === 0 ? (
            <div className="bg-surface rounded-2xl border border-gray-200 p-6 sm:p-12 text-center shadow-[0_0_9px_rgba(0,0,0,0.3)] hover:shadow-md hover:border-primary/20 transition-all duration-200">
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
              {renderApplicationTable(paginatedData, (app) => (
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
              ))}
            </>
          )}
        </>
      )}

      {/* ═══════════════════ TAB: ARCHIVED ═══════════════════ */}
      {activeTab === "archived" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <StatsCard icon="inventory_2" label="Archived" value={archivedApps.length} variant="default" subtitle="Retired / Left" />
            <StatsCard icon="shield" label="Policy" value="IT Compliant" variant="success" subtitle="Data retained per BHU IT rules" />
          </div>
          {paginatedData.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-gray-200 p-6 sm:p-12 text-center shadow-[0_0_9px_rgba(0,0,0,0.3)] hover:shadow-md hover:border-primary/20 transition-all duration-200">
              <div className="w-20 h-20 rounded-full bg-surface-variant flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-rounded text-[36px] text-outline">inventory_2</span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">No archived accounts</h3>
            </div>
          ) : (
            renderApplicationTable(paginatedData, (app) => (
              <>
                <Button icon="download" variant="text" size="sm" loading={downloadingPdf === app.id} onClick={() => handleDownloadSignedPdf(app)}>
                  PDF
                </Button>
              </>
            ))
          )}
        </>
      )}

      {/* ═══════════════════ TAB: QUOTA & USAGE ═══════════════════ */}
      {activeTab === "quota" && (
        <div className="space-y-6">
          {/* Organization Capacity Overview */}
          {(() => {
            const totalAllocated = quotaStats?.totalQuotaGB || 0;
            const orgUsagePct = Math.min((totalAllocated / TOTAL_ORG_CAPACITY_GB) * 100, 100);
            // Mock total used across org
            const totalUsedMock = Math.round(totalAllocated * 0.58);
            const totalFreeMock = totalAllocated - totalUsedMock;
            return (
              <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-[0_0_9px_rgba(0,0,0,0.3)] hover:shadow-md hover:border-primary/20 transition-all duration-200">
                <div className="flex items-center gap-2 mb-5">
                  <span className="material-symbols-rounded text-[22px] text-primary">cloud</span>
                  <h3 className="text-base font-bold text-foreground">Organization Storage Capacity</h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
                  <div className="bg-gray-100 rounded-xl px-4 py-3 text-center border border-gray-300 hover:shadow-[0_0_9px_rgba(0,0,0,0.3)]">
                    <p className="text-[12px] font-bold uppercase tracking-wider text-black font-medium">Pool Size</p>
                    <p className="text-xl font-bold text-foreground">{TOTAL_ORG_CAPACITY_GB.toLocaleString()} GB</p>
                  </div>
                  <div className="bg-blue-100/80 rounded-xl px-4 py-3 text-center border border-blue-300 hover:shadow-[0_0_9px_rgba(0,0,0,0.3)]">
                    <p className="text-[12px] font-bold uppercase tracking-wider text-black font-medium">Allocated</p>
                    <p className="text-xl font-bold text-primary">{totalAllocated} GB</p>
                  </div>
                  <div className="bg-orange-100/80 rounded-xl px-4 py-3 text-center border border-orange-500/30 hover:shadow-[0_0_9px_rgba(0,0,0,0.3)]">
                    <p className="text-[12px] font-bold uppercase tracking-wider text-black font-medium">Used (Est.)</p>
                    <p className="text-xl font-bold text-warning">{totalUsedMock} GB</p>
                  </div>
                  <div className="bg-green-100 rounded-xl px-4 py-3 text-center border border-green-500/30 hover:shadow-[0_0_9px_rgba(0,0,0,0.3)]">
                    <p className="text-[12px] font-bold uppercase tracking-wider text-black  font-medium">Free</p>
                    <p className="text-xl font-bold text-success">{TOTAL_ORG_CAPACITY_GB - totalAllocated} GB</p>
                  </div>
                </div>
                {/* Large progress bar */}
                <div>
                  <div className="flex flex-col sm:flex-row justify-between text-xs sm:text-sm font-medium text-black mb-1.5 gap-0.5">
                    <span>Allocated: {totalAllocated} GB / {TOTAL_ORG_CAPACITY_GB.toLocaleString()} GB</span>
                    <span className="font-semibold">{orgUsagePct.toFixed(1)}% allocated</span>
                  </div>
                  {/* <div className="w-full bg-surface-variant rounded-full h-4 overflow-hidden">
                    Used portion
                    <div className="h-full rounded-full flex overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-700"
                        style={{ width: `${(totalUsedMock / TOTAL_ORG_CAPACITY_GB) * 100}%` }}
                        title={`Used: ${totalUsedMock} GB`}
                      />
                      <div
                        className="h-full bg-primary/30 transition-all duration-700"
                        style={{ width: `${(totalFreeMock / TOTAL_ORG_CAPACITY_GB) * 100}%` }}
                        title={`Allocated but unused: ${totalFreeMock} GB`}
                      />
                    </div>
                  </div> */}
                  <div className="flex flex-wrap gap-3 sm:gap-4 mt-2">
                    <span className="flex items-center gap-1.5 text-[10px] text-on-primary-container">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> Used (Est.)
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-on-primary-container">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary/30 inline-block" /> Allocated (Unused)
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-on-primary-container">
                      <span className="w-2.5 h-2.5 rounded-full bg-surface-variant inline-block" /> Unallocated
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Category Policy Limits Reference */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-[0_0_9px_rgba(0,0,0,0.3)] hover:shadow-md hover:border-primary/20 transition-all duration-200">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-rounded text-[22px] text-secondary">policy</span>
              <h3 className="text-sm sm:text-base font-bold text-foreground">Category Policy Limits (BHU IT Rules)</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(quotaMap).map(([cat, gb]) => {
                const catData = quotaStats?.categoryBreakdown?.[cat];
                return (
                  <div key={cat} className="bg-gray-50 rounded-xl px-4 py-3 text-center border border-gray-500 hover:shadow-[0_0_5px_rgba(0,0,0,0.3)]">
                    <p className="text-[11px] uppercase tracking-wider text-outline font-medium mb-1">{categoryLabels[cat] || cat}</p>
                    <p className="text-2xl font-bold text-foreground">{gb} <span className="text-xs font-normal text-outline">GB</span></p>
                    <p className="text-[11px] text-outline mt-1">{catData?.count || 0} users active</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stacked Category Chart — Used vs Unused Allocation */}
          {quotaStats && (() => {
            const entries = Object.entries(quotaStats.categoryBreakdown);
            const maxGB = Math.max(...entries.map(([, v]) => v.totalGB), 1);
            const colors = [
              { used: "#6366f1", unused: "#6366f133" },
              { used: "#22c55e", unused: "#22c55e33" },
              { used: "#f59e0b", unused: "#f59e0b33" },
              { used: "#ef4444", unused: "#ef444433" },
              { used: "#06b6d4", unused: "#06b6d433" },
              { used: "#8b5cf6", unused: "#8b5cf633" },
            ];

            return (
              <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-[0_0_9px_rgba(0,0,0,0.3)] hover:shadow-md hover:border-primary/20 transition-all duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-rounded text-[22px] text-primary">bar_chart</span>
                    <h3 className="text-sm sm:text-base font-bold text-foreground">Category-wise Allocation & Usage</h3>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1.5 text-[10px] text-outline">
                      <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" /> Used (Est.)
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-outline">
                      <span className="w-2.5 h-2.5 rounded-sm bg-primary/20 inline-block" /> Allocated (Unused)
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  {entries.map(([cat, val], i) => {
                    const mockUsedGB = Math.round(val.totalGB * (0.4 + (i * 0.1) % 0.5));
                    const unusedGB = val.totalGB - mockUsedGB;
                    const colorSet = colors[i % colors.length];
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-xs text-outline mb-1.5">
                          <span className="font-medium text-foreground">{categoryLabels[cat] || cat}</span>
                          <span>
                            <span className="font-semibold text-foreground">{mockUsedGB} GB</span>
                            <span className="text-outline"> used of </span>
                            <span className="font-semibold text-foreground">{val.totalGB} GB</span>
                            <span className="text-outline"> allocated · </span>
                            <span className="font-medium">{val.count} users</span>
                          </span>
                        </div>
                        <div className="w-full bg-surface-variant rounded-full h-4 overflow-hidden flex">
                          <div
                            className="h-full rounded-l-full transition-all duration-500"
                            style={{
                              width: `${Math.max((mockUsedGB / maxGB) * 100, 2)}%`,
                              backgroundColor: colorSet.used,
                            }}
                          />
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${Math.max((unusedGB / maxGB) * 100, 1)}%`,
                              backgroundColor: colorSet.unused,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Total Accounts Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <StatsCard icon="group" label="Total Accounts" value={quotaStats?.totalAccounts || 0} variant="primary" subtitle="Provisioned accounts" />
            <StatsCard icon="storage" label="Total Allocated" value={`${quotaStats?.totalQuotaGB || 0} GB`} variant="success" subtitle="Across all categories" />
            <StatsCard icon="cloud_off" label="Unallocated Pool" value={`${TOTAL_ORG_CAPACITY_GB - (quotaStats?.totalQuotaGB || 0)} GB`} variant="warning" subtitle={`of ${TOTAL_ORG_CAPACITY_GB.toLocaleString()} GB total`} />
          </div>
        </div>
      )}


      {/* ═══════════════════ TAB: ANALYTICS ═══════════════════ */}
      {activeTab === "analytics" && (
        <div className="bg-surface rounded-2xl overflow-hidden min-h-[500px]">
          <AdminAnalyticsPage />
        </div>
      )}

      {/* ═══════════════════ TAB: DATABASE ═══════════════════ */}
      {activeTab === "database" && (
        <div className="bg-surface rounded-2xl overflow-hidden min-h-[500px]">
          <DatabaseExplorerPage />
        </div>
      )}
      {/* ═══════════════════ TAB: AUDIT LOGS ═══════════════════ */}
      {activeTab === "audit" && (
        <div className="bg-surface rounded-2xl border border-amber-900 overflow-hidden">
          <div className="flex justify-start items-center p-4 border-b border-amber-700/50">
            <div className="flex items-center gap-2 bg-surface-variant/30 p-1.5 rounded-xl border border-outline-variant shadow-sm">
              <span className="text-xs font-bold text-outline uppercase tracking-wider ml-2 mr-1">Zoom:</span>
              <button onClick={() => setZoomLevel("sm")} className={`p-1.5 rounded-lg ${zoomLevel === 'sm' ? 'bg-white shadow-sm text-primary' : 'text-outline hover:text-foreground'}`} title="Small text"><span className="material-symbols-rounded text-[18px]">format_size</span></button>
              <button onClick={() => setZoomLevel("md")} className={`p-1.5 rounded-lg ${zoomLevel === 'md' ? 'bg-white shadow-sm text-primary' : 'text-outline hover:text-foreground'}`} title="Medium text"><span className="material-symbols-rounded text-[20px]">format_size</span></button>
              <button onClick={() => setZoomLevel("lg")} className={`p-1.5 rounded-lg ${zoomLevel === 'lg' ? 'bg-white shadow-sm text-primary' : 'text-outline hover:text-foreground'}`} title="Large text"><span className="material-symbols-rounded text-[24px]">format_size</span></button>
            </div>
          </div>
          {/* Desktop table view */}
          <div className="hidden sm:block overflow-x-auto">
            <table className={`w-full text-left border-collapse min-w-[800px] ${
              zoomLevel === 'sm' ? '[&_span:not(.material-symbols-rounded)]:text-[11px] [&_th]:text-[10px] [&_td]:text-[11px]' :
              zoomLevel === 'lg' ? '[&_span:not(.material-symbols-rounded)]:text-[14px] [&_th]:text-[13px] [&_td]:text-[14px]' : 'text-sm'
            }`}>
              <thead>
                <tr className="bg-surface-variant/50 text-amber-800 text-left">
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Performed By</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-t border-amber-700 hover:bg-surface-variant/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-amber-700 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-container text-primary text-xs font-medium">
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground font-mono">
                      {log.entityType === "APPLICATION" && log.entityTrackingId
                        ? log.entityTrackingId
                        : `${log.entityType}: ${log.entityId.slice(0, 8)}…`}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-foreground font-semibold">{log.performerName || log.performedBy.slice(0, 8)}</p>
                      <p className="text-[10px] text-outline truncate max-w-[150px]">{log.performerDepartment}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile card view */}
          <div className="sm:hidden divide-y divide-amber-700">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-container text-primary text-[11px] font-medium">
                    {log.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-[11px] text-amber-700">{formatDate(log.createdAt)}</span>
                </div>
                <p className="text-[11px] text-foreground font-mono">
                  {log.entityType === "APPLICATION" && log.entityTrackingId
                    ? log.entityTrackingId
                    : `${log.entityType}: ${log.entityId.slice(0, 8)}…`}
                </p>
                <p className="text-[11px] text-outline">
                  <span className="font-semibold text-foreground">{log.performerName || log.performedBy.slice(0, 8)}</span>
                  {log.performerDepartment && <span> · {log.performerDepartment}</span>}
                </p>
              </div>
            ))}
          </div>
          {auditLogs.length === 0 && (
            <div className="p-8 sm:p-12 text-center text-sm text-outline">No audit logs found.</div>
          )}
          {auditTotalPages > 1 && (
            <div className="flex items-center justify-center gap-3 p-3 sm:p-4 border-t border-outline-variant/50">
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
        mode="drawer"
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
                <p className="text-sm text-outline lowercase">{selectedApp.applicant?.alternateEmail}</p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-surface-variant/30 rounded-lg px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-outline font-medium">Alternate Email</p>
                  <p className="text-sm text-foreground font-medium truncate lowercase">{selectedApp.applicant?.alternateEmail}</p>
                </div>
                {Object.entries(selectedApp.applicantDetails || {}).map(([key, val]) => {
                  let displayVal = String(val);
                  if (key.startsWith("emailChoice") && displayVal && !displayVal.includes("@")) {
                    displayVal = `${displayVal}@bhu.ac.in`;
                  }
                  return (
                    <div key={key} className="bg-surface-variant/30 rounded-lg px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-outline font-medium">
                        {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                      </p>
                      <p className="text-sm text-foreground font-medium truncate">{displayVal}</p>
                    </div>
                  );
                })}
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
        title={`Confirm ${remarksModal?.action === "suspend" ? "Suspension" : remarksModal?.action === "archive" ? "Archive" : "Rejection"}`}
        size="sm"
        footer={
          <>
            <Button variant="outlined" onClick={() => { setRemarksModal(null); setRemarks(""); }}>
              Cancel
            </Button>
            <Button
              icon={remarksModal?.action === "suspend" ? "pause_circle" : remarksModal?.action === "archive" ? "inventory_2" : "cancel"}
              variant="filled"
              className={remarksModal?.action?.includes("reject") ? "!bg-error hover:!bg-error/90" : ""}
              loading={!!actionLoading}
              onClick={() => remarksModal && handleAction(remarksModal.action, remarksModal.ids, remarks)}
            >
              {remarksModal?.action === "suspend" ? "Suspend" : remarksModal?.action === "archive" ? "Archive" : "Reject"} ({remarksModal?.ids.length})
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-outline">
            {remarksModal?.action === "suspend"
              ? "Suspended accounts will be temporarily blocked. Data will be retained per IT policy."
              : remarksModal?.action === "archive" 
              ? "Archived accounts are for retired/left users. Data is retained — no deletion until tenure is complete." 
              : "Rejected applications will be returned to the applicant with your remarks."}
          </p>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Remarks (mandatory for rejection)
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

      {/* ═══════════════════ EDIT MODAL ═══════════════════ */}
      <Modal
        isOpen={!!editModal}
        onClose={() => { setEditModal(null); setEditFormFields({}); }}
        title="Edit Application Details"
        size="lg"
        footer={
          <>
            <Button variant="outlined" onClick={() => { setEditModal(null); setEditFormFields({}); }}>Cancel</Button>
            <Button variant="filled" loading={!!actionLoading} onClick={handleEditSubmit}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-outline">
            Edit the applicant details below. Changes will be saved to the database.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
            {Object.entries(editFormFields).map(([key, value]) => {
              const label = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/_/g, ' ')
                .replace(/^./, (s) => s.toUpperCase())
                .trim();
              return (
                <div key={key} className="space-y-1">
                  <label className="block text-xs font-semibold text-outline uppercase tracking-wider">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setEditFormFields(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full bg-surface-variant/30 border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-outline/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
