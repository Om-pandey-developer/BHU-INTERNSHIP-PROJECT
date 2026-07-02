"use client";

import React, { useState, useEffect, useMemo } from "react";
import api from "@/lib/axios";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import SkeletonLoader from "@/components/SkeletonLoader";
import { useToastStore } from "@/components/Toast";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { generateApplicationPdf } from "@/lib/pdfGenerator";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface Application {
  id: string;
  trackingId: string;
  status: string;
  applicantDetails: Record<string, any>;
  photoStoragePath?: string;
  signatureStoragePath?: string;
  hodRemarks?: string;
  createdAt: string;
  hodApprovedAt?: string;
  applicant?: {
    id: string;
    alternateEmail: string;
    firstName: string;
    lastName: string;
  };
  department?: {
    id: string;
    name: string;
    code: string;
  };
}

interface ReapplyRequest {
  id: string;
  applicationId: string;
  reason: string;
  rollNumber: string;
  studentName: string;
  status: string;
  hodRemarks?: string;
  createdAt: string;
  applicant?: {
    id: string;
    firstName: string;
    lastName: string;
    alternateEmail: string;
  };
  application?: {
    trackingId: string;
    status: string;
    hodRemarks?: string;
    department?: { name: string };
  };
}

/* Authenticated image loader component */
function AuthImage({ itemId, type, storagePath, imageCache, loadAuthImage, setPreviewImage }: {
  itemId: string;
  type: "photo" | "signature";
  storagePath: string;
  imageCache: Record<string, string>;
  loadAuthImage: (key: string, apiPath: string) => void;
  setPreviewImage: (url: string) => void;
}) {
  const cacheKey = `${itemId}-${type}`;
  const isDummy = storagePath.startsWith('/dummy');
  const dummyUrl = type === "photo"
    ? 'https://ui-avatars.com/api/?name=Photo&background=random&size=200'
    : 'https://ui-avatars.com/api/?name=Sign&background=random&size=200';
  const imgSrc = isDummy ? dummyUrl : imageCache[cacheKey] || '';

  useEffect(() => {
    if (!isDummy && !imageCache[cacheKey]) {
      loadAuthImage(cacheKey, `/applications/${itemId}/${type}`);
    }
  }, [isDummy, cacheKey, itemId, type, imageCache, loadAuthImage]);

  if (type === "photo") {
    return (
      <div className="text-left">
        <p className="text-sm font-bold text-outline mb-2">PHOTO</p>
        <div className="w-48 h-48 bg-surface-variant rounded-lg border border-outline-variant overflow-hidden mb-2 shadow-sm">
          {imgSrc ? (
            <img src={imgSrc} alt="Photo" className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer" onClick={() => setPreviewImage(imgSrc)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-outline text-xs">Loading...</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="text-left">
      <p className="text-sm font-bold text-outline mb-2">SIGNATURE</p>
      <div className="w-56 h-28 bg-surface-variant rounded-lg border border-outline-variant overflow-hidden mb-2 flex items-center justify-center p-2 shadow-sm">
        {imgSrc ? (
          <img src={imgSrc} alt="Signature" className="max-w-full max-h-full object-contain cursor-pointer hover:scale-105 transition-transform" onClick={() => setPreviewImage(imgSrc)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-outline text-xs">Loading...</div>
        )}
      </div>
    </div>
  );
}

export default function HodDashboard() {
  const { addToast } = useToastStore();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();

  // Data states
  const [pendingApps, setPendingApps] = useState<Application[]>([]);
  const [reviewedApps, setReviewedApps] = useState<Application[]>([]);
  const [provisionedApps, setProvisionedApps] = useState<Application[]>([]);
  const [reapplyRequests, setReapplyRequests] = useState<ReapplyRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [hasSignature, setHasSignature] = useState<boolean | null>(null);

  // UI states
  const [activeTab, setActiveTab] = useState<"pending" | "reviewed" | "reapply" | "provisioned">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState<number | "">(1);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [zoomLevel, setZoomLevel] = useState<"sm" | "md" | "lg">("md");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [remarksInput, setRemarksInput] = useState<Record<string, string>>({});
  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  // Role guard
  useEffect(() => {
    if (!authLoading && user && user.role !== "HOD") {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  // Fetch all data
  useEffect(() => {
    fetchAllData();
    checkSignatureStatus();
  }, []);

  // Reset pagination on tab/filter change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
    setExpandedRows(new Set());
  }, [activeTab, searchQuery, categoryFilter, entriesPerPage]);

  async function checkSignatureStatus() {
    try {
      const { data } = await api.get("/users/me/signature");
      setHasSignature(data.success ? data.data.hasSignature : data.hasSignature);
    } catch {
      setHasSignature(false);
    }
  }

  // Helper to load authenticated images as blob URLs
  const loadAuthImage = React.useCallback(async (key: string, apiPath: string) => {
    if (imageCache[key]) return;
    try {
      const response = await api.get(apiPath, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(response.data);
      setImageCache(prev => ({ ...prev, [key]: blobUrl }));
    } catch {
      // Image not available
    }
  }, [imageCache]);

  async function fetchAllData() {
    setLoading(true);
    try {
      const [pendingRes, reviewedRes, provisionedRes, reapplyRes] = await Promise.allSettled([
        api.get("/applications/hod-queue"),
        api.get("/applications/hod-reviewed"),
        api.get("/applications/hod-provisioned"),
        api.get("/reapply/hod")
      ]);

      if (pendingRes.status === "fulfilled") setPendingApps(pendingRes.value.data.success ? pendingRes.value.data.data : pendingRes.value.data);
      if (reviewedRes.status === "fulfilled") setReviewedApps(reviewedRes.value.data.success ? reviewedRes.value.data.data : reviewedRes.value.data);
      if (provisionedRes.status === "fulfilled") setProvisionedApps(provisionedRes.value.data.success ? provisionedRes.value.data.data : provisionedRes.value.data);
      if (reapplyRes.status === "fulfilled") setReapplyRequests(reapplyRes.value.data.success ? reapplyRes.value.data.data : reapplyRes.value.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Active data selection
  const activeData = useMemo(() => {
    let data: any[] = [];
    if (activeTab === "pending") data = pendingApps;
    else if (activeTab === "reviewed") data = reviewedApps;
    else if (activeTab === "provisioned") data = provisionedApps;
    else if (activeTab === "reapply") data = reapplyRequests;

    // Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(item => {
        const name = activeTab === "reapply" ? item.studentName : `${item.applicant?.firstName} ${item.applicant?.lastName}`;
        const email = item.applicant?.alternateEmail || "";
        const id = activeTab === "reapply" ? item.application?.trackingId : item.trackingId;
        const roll = activeTab === "reapply" ? item.rollNumber : "";
        return name?.toLowerCase().includes(q) || email?.toLowerCase().includes(q) || id?.toLowerCase().includes(q) || roll?.toLowerCase().includes(q);
      });
    }

    if (categoryFilter !== "ALL" && activeTab !== "reapply") {
      data = data.filter(item => item.applicantDetails?.category === categoryFilter);
    }

    return data;
  }, [activeTab, pendingApps, reviewedApps, provisionedApps, reapplyRequests, searchQuery, categoryFilter]);

  // Pagination
  const totalPages = Math.ceil(activeData.length / entriesPerPage);
  const safePage = typeof currentPage === "number" ? currentPage : 1;
  const paginatedData = activeData.slice((safePage - 1) * entriesPerPage, safePage * entriesPerPage);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map(item => item.id)));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Actions
  async function handleApproveReject(id: string, action: "approve" | "reject") {
    if (action === "reject" && !remarksInput[id]?.trim()) {
      addToast({ message: "Remarks are mandatory for rejection.", variant: "warning" });
      return;
    }

    if (action === "approve" && !hasSignature) {
      addToast({ message: "Please upload your signature in Settings before approving.", variant: "warning" });
      return;
    }

    setActionLoading(id);
    try {
      const status = action === "approve" ? "APPROVED_HOD" : "REJECTED_HOD";
      await api.patch(`/applications/${id}/hod-status`, {
        status,
        remarks: remarksInput[id]?.trim() || undefined,
      });

      addToast({ message: `Application ${action === "approve" ? "approved & digitally signed" : "rejected"}.`, variant: action === "approve" ? "success" : "info" });
      setRemarksInput(prev => ({ ...prev, [id]: "" }));
      fetchAllData();
    } catch (err: any) {
      addToast({ message: err.response?.data?.message || "Action failed.", variant: "error" });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return;
    if (!hasSignature) {
      addToast({ message: "Please upload your signature in Settings before approving.", variant: "warning" });
      return;
    }

    setActionLoading("bulk");
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      try {
        await api.patch(`/applications/${id}/hod-status`, {
          status: "APPROVED_HOD",
          remarks: "Bulk approved by HOD",
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    addToast({
      message: `Bulk action: ${successCount} approved${failCount > 0 ? `, ${failCount} failed` : ""}.`,
      variant: failCount > 0 ? "warning" : "success",
    });

    setSelectedIds(new Set());
    setActionLoading(null);
    fetchAllData();
  }

  async function handleBulkReject() {
    if (selectedIds.size === 0) return;

    setActionLoading("bulk_reject");
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      try {
        await api.patch(`/applications/${id}/hod-status`, {
          status: "REJECTED_HOD",
          remarks: "Bulk rejected by HOD",
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    addToast({
      message: `Bulk action: ${successCount} rejected${failCount > 0 ? `, ${failCount} failed` : ""}.`,
      variant: failCount > 0 ? "warning" : "success",
    });

    setSelectedIds(new Set());
    setActionLoading(null);
    fetchAllData();
  }

  async function handleReapplyAction(requestId: string, action: "approve" | "reject") {
    setActionLoading(requestId);
    try {
      await api.patch(`/reapply/${requestId}/${action}`, {
        remarks: action === "approve" ? "Approved by HOD" : "Rejected by HOD",
      });
      addToast({ message: `Reapply request ${action === "approve" ? "approved" : "rejected"}.`, variant: action === "approve" ? "success" : "info" });
      fetchAllData();
    } catch (err: any) {
      addToast({ message: err.response?.data?.message || "Action failed.", variant: "error" });
    } finally {
      setActionLoading(null);
    }
  }

  // PDF Generation helpers
  async function fetchImageAsBase64(url: string | null): Promise<string | null> {
    if (!url) return null;
    try {
      const response = await api.get(url, { responseType: 'blob' });
      const blob = response.data;
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  async function handleDownloadPdf(app: Application) {
    if (app.status === "APPROVED_HOD" || app.status === "PROVISIONED") {
      try {
        addToast({ message: "Downloading signed PDF...", variant: "info" });
        const response = await api.get(`/applications/${app.id}/approved-pdf`, { responseType: "blob" });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${app.trackingId}_Approved.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      } catch {
        addToast({ message: "Failed to download signed PDF, generating locally...", variant: "warning" });
      }
    }

    try {
      addToast({ message: "Generating PDF...", variant: "info" });
      const photoUrl = `/applications/${app.id}/photo`;
      const signatureUrl = `/applications/${app.id}/signature`;
      const photoDataUrl = await fetchImageAsBase64(photoUrl);
      const signatureDataUrl = await fetchImageAsBase64(signatureUrl);
      await generateApplicationPdf(app as any, undefined, photoDataUrl, signatureDataUrl, false);
      addToast({ message: "PDF downloaded successfully", variant: "success" });
    } catch {
      addToast({ message: "Failed to generate PDF", variant: "error" });
    }
  }

  async function handleBulkZipDownload() {
    if (selectedIds.size === 0) return;
    setIsZipping(true);
    addToast({ message: `Preparing ZIP file for ${selectedIds.size} applications... Please wait.`, variant: "info" });

    try {
      const zip = new JSZip();
      const appsToZip = activeData.filter(a => selectedIds.has(a.id));

      for (const app of appsToZip) {
        let pdfBlob: Blob | null = null;

        if (app.status === "APPROVED_HOD" || app.status === "PROVISIONED") {
          try {
            const res = await api.get(`/applications/${app.id}/approved-pdf`, { responseType: "blob" });
            pdfBlob = res.data;
          } catch {
            // Fallback to local generation
          }
        }

        if (!pdfBlob) {
          const photoDataUrl = await fetchImageAsBase64(`/applications/${app.id}/photo`);
          const signatureDataUrl = await fetchImageAsBase64(`/applications/${app.id}/signature`);
          const generated = await generateApplicationPdf(app as any, undefined, photoDataUrl, signatureDataUrl, true);
          if (generated) pdfBlob = generated as Blob;
        }

        if (pdfBlob) {
          zip.file(`${app.trackingId}_${app.applicant?.firstName}.pdf`, pdfBlob);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "Applications_Bulk_Export.zip");
      addToast({ message: "ZIP downloaded successfully", variant: "success" });
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      addToast({ message: "Failed to generate ZIP", variant: "error" });
    } finally {
      setIsZipping(false);
    }
  }



  return (
    <main className="animate-fade-in p-6 max-w-[1600px] mx-auto min-h-screen space-y-6">
      {/* ── Signature warning banner ── */}
      {hasSignature === false && (
        <div className="flex items-start gap-4 rounded-xl border-2 border-error bg-error-container p-6 animate-fade-in shadow-sm">
          <span className="material-symbols-rounded text-[32px] text-error mt-1">warning</span>
          <div>
            <p className="text-xl font-bold text-error">Signature Required</p>
            <p className="text-base text-error/90 mt-2 font-medium">
              You must upload your digital signature before approving applications. Please visit{" "}
              <a href="/dashboard/settings" className="underline font-bold hover:text-error transition-colors">Settings → Digital Signature</a>{" "}
              to upload it.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "var(--font-serif)" }}>
          HOD Dashboard
        </h1>
        <p className="text-sm text-outline mt-1">Review applications, reapply requests, and provisioned accounts for your department.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-outline-variant">
        {[
          { id: "pending", label: "Pending Reviews", count: pendingApps.length },
          { id: "reviewed", label: "Reviewed", count: reviewedApps.length },
          { id: "reapply", label: "Reapply Requests", count: reapplyRequests.length },
          { id: "provisioned", label: "Provisioned", count: provisionedApps.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 rounded-t-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab.id
              ? "bg-surface border-t border-x border-outline-variant text-primary shadow-[0_-4px_6px_-2px_rgba(0,0,0,0.05)]"
              : "text-outline hover:bg-surface-variant hover:text-foreground border border-transparent"
              }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? "bg-primary-container text-primary" : "bg-surface-variant text-outline"
                }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Action Bar */}
      <div className="bg-surface border border-outline-variant rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          {/* Search */}
          <div className="relative w-full max-w-sm">
            <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              type="text"
              placeholder="Search by ID, Name, Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-variant/50 border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          {/* Filter */}
          {activeTab !== "reapply" && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-surface-variant/50 border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="TEACHING_STAFF">Teaching Staff</option>
              <option value="NON_TEACHING_STAFF">Non-Teaching Staff</option>
              <option value="GROUP_A_OFFICER">Group A Officer</option>
              <option value="RESEARCH_SCHOLAR">Research Scholar</option>
              <option value="POST_GRADUATE_STUDENT">PG Student</option>
            </select>
          )}

          {/* Entries per page & Go to page */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-outline">
              <span>Show</span>
              <select
                value={entriesPerPage}
                onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                className="px-2 py-1 bg-surface-variant/50 border border-outline-variant rounded-lg text-sm focus:outline-none cursor-pointer"
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
              <span>Go to</span>
              <input
                type="number"
                min={1}
                max={Math.max(1, totalPages)}
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
                className="w-16 px-2 py-1 bg-surface-variant/50 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary text-center"
              />
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-variant/50 p-1 rounded-xl border border-outline-variant">
            <button onClick={() => setZoomLevel("sm")} className={`p-1.5 rounded-lg ${zoomLevel === 'sm' ? 'bg-white shadow-sm text-primary' : 'text-outline hover:text-foreground'}`} title="Small text"><span className="material-symbols-rounded text-[18px]">format_size</span></button>
            <button onClick={() => setZoomLevel("md")} className={`p-1.5 rounded-lg ${zoomLevel === 'md' ? 'bg-white shadow-sm text-primary' : 'text-outline hover:text-foreground'}`} title="Medium text"><span className="material-symbols-rounded text-[20px]">format_size</span></button>
            <button onClick={() => setZoomLevel("lg")} className={`p-1.5 rounded-lg ${zoomLevel === 'lg' ? 'bg-white shadow-sm text-primary' : 'text-outline hover:text-foreground'}`} title="Large text"><span className="material-symbols-rounded text-[24px]">format_size</span></button>
          </div>

          {selectedIds.size > 0 && activeTab === "pending" && (
            <div className="flex items-center gap-2">
              <Button icon="cancel" variant="outlined" onClick={handleBulkReject} loading={actionLoading === "bulk_reject"} size="sm" className="!border-error !text-error hover:!bg-error/10">
                Bulk Reject ({selectedIds.size})
              </Button>
              <Button icon="done_all" onClick={handleBulkApprove} loading={actionLoading === "bulk"} disabled={!hasSignature} size="sm">
                Bulk Approve ({selectedIds.size})
              </Button>
            </div>
          )}

          {selectedIds.size > 0 && activeTab !== "reapply" && (
            <Button icon="folder_zip" variant="outlined" onClick={handleBulkZipDownload} loading={isZipping} size="sm">
              Download ZIP ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-primary/5 border border-primary/20 text-primary text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-3">
        <span className="material-symbols-rounded text-[20px]">info</span>
        <span><strong>Tip:</strong> Click anywhere on an applicant's row to view their full details, documents, and take actions.</span>
      </div>

      <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8"><SkeletonLoader variant="table-row" count={5} /></div>
        ) : paginatedData.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-rounded text-[32px] text-outline">search_off</span>
            </div>
            <h3 className="text-lg font-bold text-foreground">No records found</h3>
            <p className="text-sm text-outline mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full text-left border-collapse min-w-[2400px] ${zoomLevel === 'sm' ? '[&_span:not(.material-symbols-rounded)]:text-[11px] [&_th]:text-[10px] [&_td]:text-[11px]' :
                zoomLevel === 'lg' ? '[&_span:not(.material-symbols-rounded)]:text-[14px] [&_th]:text-[13px] [&_td]:text-[14px]' : ''
              }`}>
              <thead>
                <tr className="bg-surface-variant/50 text-outline text-left">
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider w-10 text-center">
                    <input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === paginatedData.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-2 border-outline-variant accent-primary cursor-pointer" />
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
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">{activeTab === "reapply" ? "Roll No." : "Designation"}</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">Requested Email</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">Date Applied</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">{activeTab === "reapply" ? "Reapply Reason" : "HOD Reviewed"}</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, idx) => {
                  const isExpanded = expandedRows.has(item.id);
                  const isReapply = activeTab === "reapply";
                  const name = isReapply ? item.studentName : `${item.applicant?.firstName} ${item.applicant?.lastName}`;
                  const email = isReapply ? item.applicant?.alternateEmail : item.applicant?.alternateEmail;
                  const trackId = isReapply ? item.application?.trackingId : item.trackingId;
                  const department = isReapply ? item.application?.department?.name : item.department?.name;
                  const category = !isReapply ? (item.applicantDetails?.category || "—") : "—";
                  const designation = !isReapply ? (item.applicantDetails?.designation || item.applicantDetails?.post || "—") : item.rollNumber || "—";
                  const mobileNo = !isReapply ? (item.applicantDetails?.mobileNo || "—") : "—";
                  const faculty = !isReapply ? (item.applicantDetails?.facultyInstituteCentre || "—") : "—";
                  const typeProgram = !isReapply ? (item.applicantDetails?.typeOfEmployment || item.applicantDetails?.programEnrolled || "—") : "—";
                  const rawEmailChoice = !isReapply ? (item.applicantDetails?.emailChoice1 || item.applicantDetails?.emailChoice || "—") : "—";
                  const requestedEmail = rawEmailChoice !== "—" && !rawEmailChoice.includes("@") ? `${rawEmailChoice}@bhu.ac.in` : rawEmailChoice;
                  const dateApplied = new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                  const hodReviewedDate = item.hodApprovedAt
                    ? new Date(item.hodApprovedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "—";
                  const reapplyReason = isReapply ? (item.reason?.length > 30 ? item.reason.substring(0, 30) + "…" : item.reason || "—") : hodReviewedDate;
                  const serialNo = (safePage - 1) * entriesPerPage + idx + 1;

                  return (
                    <React.Fragment key={item.id}>
                      <tr onClick={() => toggleExpand(item.id)} className={`border-t border-outline-variant hover:bg-surface-variant/20 transition-colors cursor-pointer ${isExpanded ? 'bg-primary/5' : ''}`}>
                        {/* 1. Checkbox */}
                        <td className="px-3 py-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="w-4 h-4 rounded border-2 border-outline-variant accent-primary cursor-pointer" />
                        </td>
                        {/* 2. S.No */}
                        <td className="px-3 py-3 text-sm text-outline font-mono align-middle">{serialNo}</td>
                        {/* 3. Tracking ID */}
                        <td className="px-3 py-3 align-middle">
                          <span className="text-sm font-semibold text-primary font-mono">{trackId || "—"}</span>
                        </td>
                        {/* 4. Name */}
                        <td className="px-3 py-3 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-xs font-bold text-on-primary-container shrink-0">
                              {name?.[0]?.toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-foreground whitespace-nowrap">{name}</span>
                          </div>
                        </td>
                        {/* 5. Email */}
                        <td className="px-3 py-3 align-middle">
                          <span className="text-xs text-outline truncate block max-w-[180px]">{email || "—"}</span>
                        </td>
                        {/* Mobile No */}
                        <td className="px-3 py-3 align-middle">
                          <span className="text-xs text-outline whitespace-nowrap">{mobileNo}</span>
                        </td>
                        {/* Faculty/Institute */}
                        <td className="px-3 py-3 align-middle">
                          <span className="text-xs text-outline truncate block max-w-[150px]">{faculty}</span>
                        </td>
                        {/* 6. Department */}
                        <td className="px-3 py-3 align-middle">
                          <span className="text-xs text-foreground font-medium">{department || "—"}</span>
                        </td>
                        {/* 7. Category */}
                        <td className="px-3 py-3 align-middle">
                          {category !== "—" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-variant text-[10px] font-semibold text-outline uppercase tracking-wide whitespace-nowrap">
                              {String(category).replace(/_/g, " ")}
                            </span>
                          ) : (
                            <span className="text-xs text-outline">—</span>
                          )}
                        </td>
                        {/* Type/Program */}
                        <td className="px-3 py-3 align-middle">
                          <span className="text-xs text-outline whitespace-nowrap">{typeProgram}</span>
                        </td>
                        {/* 8. Designation / Roll No */}
                        <td className="px-3 py-3 align-middle">
                          <span className="text-xs text-foreground">{String(designation)}</span>
                        </td>
                        {/* Requested Email */}
                        <td className="px-3 py-3 align-middle">
                          <span className="text-xs text-primary font-medium whitespace-nowrap">{requestedEmail}</span>
                        </td>
                        {/* 9. Date Applied */}
                        <td className="px-3 py-3 align-middle whitespace-nowrap">
                          <span className="text-xs text-foreground font-medium">{dateApplied}</span>
                        </td>
                        {/* 10. HOD Reviewed / Reapply Reason */}
                        <td className="px-3 py-3 align-middle">
                          <span className="text-xs text-outline">{reapplyReason}</span>
                        </td>
                        {/* 11. Status */}
                        <td className="px-3 py-3 align-middle">
                          <StatusBadge status={item.status} size="sm" />
                        </td>
                        {/* 12. Actions */}
                        <td className="px-3 py-3 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            {activeTab === "pending" && (
                              <Button
                                onClick={(e) => { e.stopPropagation(); handleApproveReject(item.id, "approve"); }}
                                loading={actionLoading === item.id}
                                disabled={!hasSignature}
                                size="sm"
                                className="!py-1 !px-3 !text-xs whitespace-nowrap"
                              >
                                Approve
                              </Button>
                            )}
                            {activeTab === "reapply" && item.status === "PENDING" && (
                              <Button
                                onClick={(e) => { e.stopPropagation(); handleReapplyAction(item.id, "approve"); }}
                                loading={actionLoading === item.id}
                                size="sm"
                                className="!py-1 !px-3 !text-xs whitespace-nowrap"
                              >
                                Approve
                              </Button>
                            )}
                            {activeTab !== "pending" && activeTab !== "reapply" && (
                              <button onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }} className="p-1.5 rounded-lg hover:bg-surface-variant text-outline transition-colors" title="View Details">
                                <span className="material-symbols-rounded text-[18px]">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                              </button>
                            )}
                            {!isReapply && (
                              <button onClick={(e) => { e.stopPropagation(); handleDownloadPdf(item); }} className="p-1.5 rounded-lg hover:bg-primary-container hover:text-primary text-outline transition-colors" title="Download PDF">
                                <span className="material-symbols-rounded text-[18px]">download</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Row Content */}
                      {isExpanded && (
                        <tr className="bg-surface-variant/10">
                          <td colSpan={16} className="p-0 border-b border-outline-variant">
                            <div className="p-6 border-l-4 border-primary m-2 bg-surface rounded-xl shadow-inner">

                              {/* Reapply Specific View */}
                              {isReapply ? (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-xs text-outline font-semibold uppercase tracking-wider mb-1">Reason for Re-applying</p>
                                      <div className="bg-surface-variant/30 p-3 rounded-lg text-sm text-foreground">{item.reason}</div>
                                    </div>
                                    {item.application?.hodRemarks && (
                                      <div>
                                        <p className="text-xs text-outline font-semibold uppercase tracking-wider mb-1">Previous Rejection Remarks</p>
                                        <div className="bg-error-container/30 border border-error/20 p-3 rounded-lg text-sm text-error">{item.application.hodRemarks}</div>
                                      </div>
                                    )}
                                  </div>

                                  {item.status === 'PENDING' && (
                                    <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
                                      <Button variant="outlined" onClick={() => handleReapplyAction(item.id, "reject")} loading={actionLoading === item.id} className="!border-error !text-error hover:!bg-error/10">Reject Request</Button>
                                      <Button onClick={() => handleReapplyAction(item.id, "approve")} loading={actionLoading === item.id}>Approve Request</Button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                /* Normal Application View */
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                  <div className="lg:col-span-2 space-y-4">
                                    <h4 className="text-base font-bold text-foreground border-b border-outline-variant pb-2">Application Details</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                      <div>
                                        <p className="text-xs uppercase tracking-wider text-outline font-bold mb-1">Alternate Email</p>
                                        <p className="text-base text-foreground font-semibold">{item.applicant?.alternateEmail || "-"}</p>
                                      </div>
                                      {Object.entries(item.applicantDetails || {}).map(([k, v]) => (
                                        <div key={k}>
                                          <p className="text-xs uppercase tracking-wider text-outline font-bold mb-1">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                                          <p className="text-base text-foreground font-semibold">{String(v || '-')}</p>
                                        </div>
                                      ))}
                                    </div>
                                    {item.hodRemarks && (
                                      <div className="mt-6 bg-primary-container/20 border border-primary/20 p-4 rounded-xl">
                                        <p className="text-sm text-primary font-bold uppercase mb-1">HOD Remarks</p>
                                        <p className="text-base text-foreground">{item.hodRemarks}</p>
                                      </div>
                                    )}

                                    {/* HOD Action moved to left side */}
                                    {activeTab === "pending" && (
                                      <div className="pt-6 mt-6 border-t border-outline-variant">
                                        <h4 className="text-base font-bold text-foreground mb-3">HOD Action</h4>
                                        <textarea
                                          placeholder="Add remarks (required for rejection)..."
                                          value={remarksInput[item.id] || ""}
                                          onChange={(e) => setRemarksInput(prev => ({ ...prev, [item.id]: e.target.value }))}
                                          className="w-full text-base p-4 border border-outline-variant rounded-xl bg-surface mb-4 focus:outline-none focus:border-primary resize-none"
                                          rows={2}
                                        />
                                        <div className="flex gap-4 justify-start">
                                          <Button variant="outlined" onClick={() => handleApproveReject(item.id, "reject")} loading={actionLoading === item.id} className="w-32 !border-error !text-error hover:!bg-error/10">Reject</Button>
                                          <Button onClick={() => handleApproveReject(item.id, "approve")} loading={actionLoading === item.id} disabled={!hasSignature} className="w-40">Approve</Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="space-y-4 border-l border-outline-variant pl-6">
                                    <h4 className="text-base font-bold text-foreground border-b border-outline-variant pb-2">Documents</h4>
                                    <div className="flex flex-row flex-wrap xl:flex-nowrap gap-6 items-start">
                                      {item.photoStoragePath && (
                                        <AuthImage
                                          itemId={item.id}
                                          type="photo"
                                          storagePath={item.photoStoragePath}
                                          imageCache={imageCache}
                                          loadAuthImage={loadAuthImage}
                                          setPreviewImage={setPreviewImage}
                                        />
                                      )}
                                      {item.signatureStoragePath && (
                                        <AuthImage
                                          itemId={item.id}
                                          type="signature"
                                          storagePath={item.signatureStoragePath}
                                          imageCache={imageCache}
                                          loadAuthImage={loadAuthImage}
                                          setPreviewImage={setPreviewImage}
                                        />
                                      )}
                                    </div>
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
              Showing <span className="font-bold text-foreground">{(safePage - 1) * entriesPerPage + 1}</span> to <span className="font-bold text-foreground">{Math.min(safePage * entriesPerPage, activeData.length)}</span> of <span className="font-bold text-foreground">{activeData.length}</span> entries
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(prev => Math.max(1, (Number(prev) || 1) - 1))} disabled={safePage === 1} className="p-1.5 rounded border border-outline-variant text-outline hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="material-symbols-rounded text-[18px]">chevron_left</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded text-sm font-semibold ${safePage === page ? 'bg-primary text-white border-transparent' : 'border border-outline-variant text-outline hover:bg-surface'}`}
                >
                  {page}
                </button>
              ))}

              <button onClick={() => setCurrentPage(prev => Math.min(totalPages, (Number(prev) || 1) + 1))} disabled={safePage === totalPages} className="p-1.5 rounded border border-outline-variant text-outline hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="material-symbols-rounded text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] w-auto h-auto rounded-2xl overflow-hidden shadow-2xl bg-surface">
            <button
              className="absolute top-4 right-4 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
            >
              <span className="material-symbols-rounded">close</span>
            </button>
            <img
              src={previewImage || ''}
              alt="Preview"
              className="max-w-[90vw] max-h-[90vh] object-contain block"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </main>
  );
}
