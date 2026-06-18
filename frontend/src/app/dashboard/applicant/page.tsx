"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/axios";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Timeline, { buildTimelineSteps } from "@/components/Timeline";
import { generateApplicationPdf } from "@/lib/pdfGenerator";
import { useAuthStore } from "@/lib/store";
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
  digitalSignatureHash?: string;
  approvedPdfPath?: string;
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
  application?: {
    trackingId: string;
    status: string;
    department?: { name: string };
  };
}

/**
 * Applicant Dashboard — My Applications
 *
 * Displays the list of email account applications submitted by the logged-in user.
 * Each row can be expanded to see full details and status timeline.
 * When HOD-approved, shows digital signature info and server-generated PDF download.
 * Includes Reapply Request system for rejected applications.
 */
export default function ApplicantDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  // Reapply request state
  const [reapplyRequests, setReapplyRequests] = useState<ReapplyRequest[]>([]);
  const [showReapplyModal, setShowReapplyModal] = useState(false);
  const [reapplyForm, setReapplyForm] = useState({ reason: "", rollNumber: "", studentName: "" });
  const [reapplySubmitting, setReapplySubmitting] = useState(false);
  const [selectedRejectedAppId, setSelectedRejectedAppId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [appsRes, reqsRes] = await Promise.all([
        api.get("/applications/my"),
        api.get("/reapply/my").catch(() => ({ data: [] })),
      ]);
      setApplications(appsRes.data.success ? appsRes.data.data : appsRes.data);
      const reqData = reqsRes.data.success ? reqsRes.data.data : reqsRes.data;
      setReapplyRequests(Array.isArray(reqData) ? reqData : []);
    } catch {
      // Will show empty state
    } finally {
      setLoading(false);
    }
  }

  // Derived state
  const latestApp = applications[0];
  const rejectedApps = applications.filter((a) => a.status === "REJECTED_HOD");
  const rejectedCount = rejectedApps.length;
  const hasActiveOrPending = applications.some((a) =>
    ["PENDING_HOD", "APPROVED_HOD", "PENDING_CC", "PROVISIONED"].includes(a.status)
  );
  const latestIsRejected = latestApp?.status === "REJECTED_HOD";
  const latestReapplyForRejected = latestIsRejected
    ? reapplyRequests.find((r) => r.applicationId === latestApp.id)
    : null;
  const canApply = !hasActiveOrPending && (!latestIsRejected || latestReapplyForRejected?.status === "APPROVED") && rejectedCount < 5;
  const maxLimitReached = rejectedCount >= 5;

  async function handleSubmitReapplyRequest() {
    if (!selectedRejectedAppId) return;
    if (!reapplyForm.reason.trim() || !reapplyForm.rollNumber.trim() || !reapplyForm.studentName.trim()) {
      addToast({ message: "Please fill in all fields.", variant: "warning" });
      return;
    }
    setReapplySubmitting(true);
    try {
      await api.post("/reapply", {
        applicationId: selectedRejectedAppId,
        reason: reapplyForm.reason.trim(),
        rollNumber: reapplyForm.rollNumber.trim(),
        studentName: reapplyForm.studentName.trim(),
      });
      addToast({ message: "Reapply request submitted successfully! Your HOD will review it.", variant: "success" });
      setShowReapplyModal(false);
      setSelectedRejectedAppId(null);
      setReapplyForm({ reason: "", rollNumber: "", studentName: "" });
      fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      addToast({ message: error.response?.data?.message || "Failed to submit request.", variant: "error" });
    } finally {
      setReapplySubmitting(false);
    }
  }

  /**
   * Download the approved PDF from the server (for APPROVED_HOD+ statuses)
   * or generate a client-side draft PDF (for PENDING_HOD).
   */
  async function handleDownloadPdf(app: Application) {
    setPdfLoading(true);

    try {
      // If approved → download server-generated PDF with both signatures
      if (
        app.approvedPdfPath &&
        (app.status === "APPROVED_HOD" ||
          app.status === "PENDING_CC" ||
          app.status === "PROVISIONED")
      ) {
        const response = await api.get(
          `/applications/${app.id}/approved-pdf`,
          { responseType: "blob" }
        );

        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${app.trackingId}_Approved.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Draft PDF — generate client-side (no HOD signature)
        let photoDataUrl = null;
        let signatureDataUrl = null;

        try {
          const res = await api.get(`/applications/${app.id}/photo`, {
            responseType: "blob",
          });
          photoDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(res.data);
          });
        } catch (e) {
          console.error("Failed to load photo", e);
        }

        try {
          const resSig = await api.get(`/applications/${app.id}/signature`, {
            responseType: "blob",
          });
          signatureDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(resSig.data);
          });
        } catch (e) {
          console.error("Failed to load signature", e);
        }

        generateApplicationPdf(
          app,
          {
            firstName: user?.firstName || "",
            lastName: user?.lastName || "",
            email: user?.email || "",
          },
          photoDataUrl,
          signatureDataUrl
        );
      }
    } catch (e) {
      console.error("PDF download failed", e);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton" />
        <div className="h-4 w-64 skeleton" />
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1
            className="text-2xl font-bold text-foreground text-[32px]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            My Applications
          </h1>
          <p className="text-sm-bold text-orange-900 mt-1">
            Track the status of your email account applications
          </p>
        </div>
      </div>

      {/* Steps to Follow */}
      <div className="bg-white rounded-xl border border-black/25 p-3 shadowp-5 mb-8 shadow-[0_0_9px_rgba(0,0,0,0.3)] hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer group">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-rounded text-[22px] text-primary">
              lightbulb
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-orange-700 mb-2 text-[20px]">Steps to Follow</h3>
            <ol className="text-xs space-y-1.5 list-decimal list-inside text-orange-500">
              <li>Fill and submit the application form with required documents.</li>
              <li>Your application will be forwarded to the Head of Department (HOD) for approval.</li>
              <li>After HOD approval, CC Admin will provision your email account.</li>
              <li className="text-primary font-medium">
                You will receive your @bhu.ac.in credentials via email from Google Workspace.
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* ── Reapply Request Status Banner ── */}
      {latestIsRejected && !maxLimitReached && (
        <div className="mb-6">
          {latestReapplyForRejected?.status === "PENDING" && (
            <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-container/20 px-5 py-4">
              <span className="material-symbols-rounded text-[22px] text-warning mt-0.5">hourglass_top</span>
              <div>
                <p className="text-sm font-bold text-warning">Reapply Request Pending</p>
                <p className="text-xs text-foreground/70 mt-1">Your request to re-apply has been sent to the HOD. You will be able to submit a new application once it is approved.</p>
              </div>
            </div>
          )}
          {latestReapplyForRejected?.status === "REJECTED" && (
            <div className="flex items-start gap-3 rounded-xl border border-error/30 bg-error-container/20 px-5 py-4">
              <span className="material-symbols-rounded text-[22px] text-error mt-0.5">block</span>
              <div>
                <p className="text-sm font-bold text-error">Reapply Request Denied by HOD</p>
                <p className="text-xs text-foreground/70 mt-1">{latestReapplyForRejected.hodRemarks || "Your HOD has denied your request to re-apply."}</p>
              </div>
            </div>
          )}
          {latestReapplyForRejected?.status === "APPROVED" && (
            <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success-container/20 px-5 py-4">
              <span className="material-symbols-rounded text-[22px] text-success mt-0.5">check_circle</span>
              <div>
                <p className="text-sm font-bold text-success">Reapply Request Approved!</p>
                <p className="text-xs text-foreground/70 mt-1">Your HOD has approved your request. You can now submit a new application.</p>
                <a href="/dashboard/applicant/new" className="inline-block mt-2">
                  <Button icon="add_circle" size="sm">Submit New Application</Button>
                </a>
              </div>
            </div>
          )}
          {!latestReapplyForRejected && (
            <div className="flex items-start gap-3 rounded-xl border border-error/30 bg-error-container/10 px-5 py-4">
              <span className="material-symbols-rounded text-[22px] text-error mt-0.5">error</span>
              <div>
                <p className="text-sm font-bold text-error">Application Rejected</p>
                <p className="text-xs text-foreground/70 mt-1 mb-3">Your last application was rejected by HOD{latestApp?.hodRemarks ? `: "${latestApp.hodRemarks}"` : "."} To re-apply, you must submit a request to your HOD for permission.</p>
                <Button icon="send" size="sm" onClick={() => setShowReapplyModal(true)}>Request Re-apply Permission</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {maxLimitReached && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-error/30 bg-error-container/20 px-5 py-4">
          <span className="material-symbols-rounded text-[22px] text-error mt-0.5">dangerous</span>
          <div>
            <p className="text-sm font-bold text-error">Maximum Re-apply Limit Reached</p>
            <p className="text-xs text-foreground/70 mt-1">You have reached the maximum limit of 5 rejected applications. You cannot submit any more applications.</p>
          </div>
        </div>
      )}

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-outline-variant p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-rounded text-[36px] text-primary">
              description
            </span>
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            No applications yet
          </h3>
          <p className="text-sm text-outline mb-6 max-w-md mx-auto">
            You haven&apos;t submitted any email account applications. Start by
            creating a new application to get your @bhu.ac.in email.
          </p>
          <a href="/dashboard/applicant/new">
            <Button icon="add_circle" size="lg">
              Submit Your First Application
            </Button>
          </a>
        </div>
      ) : (
        <>
          {/* New Application button — only if allowed */}
          {canApply && (
            <div className="mb-4">
              <a href="/dashboard/applicant/new">
                <Button icon="add_circle" size="md">Submit New Application</Button>
              </a>
            </div>
          )}
          <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className="bg-white rounded-xl border border-black/25 p-5 shadowp-5 mb-8 shadow-[0_0_9px_rgba(0,0,0,0.3)] hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-rounded text-[22px] text-primary">
                      mail
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 mb-.5">
                      <p className="font-semibold text-foreground text-md ">
                        Ref. No: {app.trackingId}
                      </p>
                      <StatusBadge status={app.status} size="sm" />
                    </div>
                    <p className="text-xs text-orange-800 ">
                      {app.department?.name || "—"} • Submitted{" "}
                      {new Date(app.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <span className="material-symbols-rounded text-[20px] text-outline group-hover:text-primary transition-colors">
                  chevron_right
                </span>
              </div>
            </div>
          ))}
          </div>
        </>
      )}

      {/* ── Reapply Requests Section ── */}
      {rejectedCount > 0 && (
        <div className="mt-8">
          <h2
            className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            <span className="material-symbols-rounded text-[22px] text-primary">replay</span>
            Reapply Requests
          </h2>

          {/* Rejected applications needing reapply */}
          <div className="space-y-3 mb-6">
            {rejectedApps.map((app) => {
              const existingReq = reapplyRequests.find((r) => r.applicationId === app.id);
              return (
                <div key={app.id} className="bg-white rounded-xl border border-error/20 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-error-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-rounded text-[20px] text-error">close</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">Ref: {app.trackingId}</p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-error-container text-error">REJECTED</span>
                          {existingReq && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              existingReq.status === "PENDING" ? "bg-warning-container text-warning"
                              : existingReq.status === "APPROVED" ? "bg-success-container text-success"
                              : "bg-error-container text-error"
                            }`}>Request: {existingReq.status}</span>
                          )}
                        </div>
                        <p className="text-xs text-outline">
                          {app.department?.name} • Submitted {new Date(app.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        {app.hodRemarks && (
                          <p className="text-xs text-error/80 mt-1"><span className="font-medium">HOD Remarks:</span> {app.hodRemarks}</p>
                        )}
                        {existingReq?.hodRemarks && existingReq.status !== "PENDING" && (
                          <p className="text-xs text-primary mt-1"><span className="font-medium">Request Response:</span> {existingReq.hodRemarks}</p>
                        )}
                      </div>
                    </div>
                    {!existingReq && !maxLimitReached && (
                      <Button
                        icon="send"
                        size="sm"
                        onClick={() => {
                          setSelectedRejectedAppId(app.id);
                          setShowReapplyModal(true);
                        }}
                      >
                        Request Re-apply
                      </Button>
                    )}
                    {existingReq && (
                      <span className={`material-symbols-rounded text-[22px] shrink-0 ${
                        existingReq.status === "PENDING" ? "text-warning"
                        : existingReq.status === "APPROVED" ? "text-success"
                        : "text-error"
                      }`}>
                        {existingReq.status === "PENDING" ? "hourglass_top"
                        : existingReq.status === "APPROVED" ? "check_circle"
                        : "cancel"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {maxLimitReached && (
            <div className="flex items-start gap-3 rounded-xl border border-error/30 bg-error-container/20 px-5 py-4">
              <span className="material-symbols-rounded text-[22px] text-error mt-0.5">dangerous</span>
              <div>
                <p className="text-sm font-bold text-error">Maximum Re-apply Limit Reached</p>
                <p className="text-xs text-foreground/70 mt-1">You have reached the maximum limit of 5 rejected applications.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Application Detail Modal */}
      <Modal
        isOpen={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        title={`Application ${selectedApp?.trackingId || ""}`}
        size="lg"
      >
        {selectedApp && (
          <div className="space-y-6">
            {/* Status + Department */}
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={selectedApp.status} />
              <span className="text-sm text-outline">
                {selectedApp.department?.name}
              </span>
            </div>

            {/* ── Digitally Signed & Approved Card ── */}
            {(selectedApp.status === "APPROVED_HOD" ||
              selectedApp.status === "PENDING_CC" ||
              selectedApp.status === "PROVISIONED") &&
              selectedApp.digitalSignatureHash && (
                <div className="bg-gradient-to-r from-success-container/40 to-primary-container/30 rounded-xl px-5 py-4 border border-success/25 animate-fade-in">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-rounded text-[22px] text-success">
                      verified
                    </span>
                    <p className="text-sm font-bold text-success">
                      Digitally Signed & Approved by HOD
                    </p>
                  </div>
                  {selectedApp.hodApprovedAt && (
                    <p className="text-xs text-foreground/70 mb-1">
                      <span className="font-medium">Approved on:</span>{" "}
                      {new Date(selectedApp.hodApprovedAt).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 bg-surface/60 rounded-lg px-3 py-2">
                    <span className="material-symbols-rounded text-[14px] text-outline">
                      fingerprint
                    </span>
                    <p className="text-[11px] font-mono text-outline tracking-wider">
                      Hash:{" "}
                      {selectedApp.digitalSignatureHash
                        .substring(0, 24)
                        .toUpperCase()}
                      …
                    </p>
                  </div>
                </div>
              )}

            {/* Timeline */}
            <div className="bg-blackrounded-xl p-5">
              <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="material-symbols-rounded text-[18px] text-primary">
                  timeline
                </span>
                Application Progress
              </h4>
              <Timeline
                steps={buildTimelineSteps(selectedApp.status, {
                  createdAt: selectedApp.createdAt,
                  hodApprovedAt: selectedApp.hodApprovedAt,
                  provisionedAt: selectedApp.provisionedAt,
                })}
              />
            </div>

            {/* Details Grid */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">
                Application Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(
                  selectedApp.applicantDetails || {}
                ).map(([key, val]) => (
                  <div
                    key={key}
                    className="bg-surface-variant/30 rounded-lg px-3 py-2"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-outline font-medium">
                      {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                    </p>
                    <p className="text-sm text-foreground font-medium truncate">
                      {String(val)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Remarks */}
            {selectedApp.hodRemarks && (
              <div className="bg-primary-container/30 rounded-xl px-5 py-4">
                <p className="text-xs font-semibold text-primary mb-1">
                  HOD Remarks
                </p>
                <p className="text-sm text-foreground">
                  {selectedApp.hodRemarks}
                </p>
              </div>
            )}

            {selectedApp.ccAdminRemarks && (
              <div className="bg-tertiary-container/30 rounded-xl px-5 py-4">
                <p className="text-xs font-semibold text-tertiary mb-1">
                  CC Admin Remarks
                </p>
                <p className="text-sm text-foreground">
                  {selectedApp.ccAdminRemarks}
                </p>
              </div>
            )}

            {/* Provisioned Info */}
            {selectedApp.status === "PROVISIONED" && (
              <div className="bg-success-container/30 rounded-xl px-5 py-4 border border-success/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-rounded text-[20px] text-success">
                    verified
                  </span>
                  <p className="text-sm font-bold text-success">
                    Account Provisioned
                  </p>
                </div>
                <p className="text-sm text-foreground">
                  Your BHU email account has been provisioned. Credentials have
                  been sent to your alternate email address.
                </p>
                {selectedApp.quotaAssignedGB && (
                  <p className="text-xs text-outline mt-2">
                    Storage Quota: {selectedApp.quotaAssignedGB} GB
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-end gap-3">
              <Button
                variant="outlined"
                onClick={() => setSelectedApp(null)}
              >
                Close
              </Button>
              <Button
                icon={selectedApp.approvedPdfPath ? "verified" : "download"}
                size="md"
                loading={pdfLoading}
                onClick={() => handleDownloadPdf(selectedApp)}
              >
                {selectedApp.approvedPdfPath
                  ? "Download Signed PDF"
                  : "Download Draft PDF"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════════════ REAPPLY REQUEST MODAL ═══════════════════ */}
      <Modal
        isOpen={showReapplyModal}
        onClose={() => setShowReapplyModal(false)}
        title="Request Re-apply Permission"
        size="md"
      >
        <div className="space-y-5">
          <div className="bg-primary-container/20 rounded-xl px-4 py-3">
            <p className="text-xs text-outline">
              This request will be sent to your department&apos;s HOD. Once approved, you can submit a new application.
            </p>
            <p className="text-[11px] text-outline/60 mt-1">
              Requests used: {reapplyRequests.length} / 5
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Student Name <span className="text-error">*</span></label>
            <input
              type="text"
              value={reapplyForm.studentName}
              onChange={(e) => setReapplyForm((f) => ({ ...f, studentName: e.target.value }))}
              placeholder="Enter your full name"
              className="w-full rounded-lg border-2 border-outline-variant bg-surface px-4 py-2.5 text-sm text-foreground placeholder-outline/50 focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Roll / Enrollment Number <span className="text-error">*</span></label>
            <input
              type="text"
              value={reapplyForm.rollNumber}
              onChange={(e) => setReapplyForm((f) => ({ ...f, rollNumber: e.target.value }))}
              placeholder="e.g., 21012345"
              className="w-full rounded-lg border-2 border-outline-variant bg-surface px-4 py-2.5 text-sm text-foreground placeholder-outline/50 focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Reason for Re-applying <span className="text-error">*</span></label>
            <textarea
              value={reapplyForm.reason}
              onChange={(e) => setReapplyForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Explain why you need to re-apply..."
              rows={4}
              className="w-full rounded-lg border-2 border-outline-variant bg-surface px-4 py-3 text-sm text-foreground placeholder-outline/50 focus:border-primary focus:outline-none transition-colors resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outlined" onClick={() => setShowReapplyModal(false)}>Cancel</Button>
            <Button icon="send" loading={reapplySubmitting} onClick={handleSubmitReapplyRequest}>Submit Request</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
