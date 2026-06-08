"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/axios";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { useToastStore } from "@/components/Toast";

interface Application {
  id: string;
  trackingId: string;
  status: string;
  applicantDetails: Record<string, unknown>;
  photoStoragePath: string;
  createdAt: string;
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

/**
 * HOD Dashboard — Pending Reviews
 *
 * Shows all applications pending HOD review for the HOD's department.
 * Supports single approve/reject with remarks, and bulk approve.
 */
export default function HodDashboard() {
  const { addToast } = useToastStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchQueue();
  }, []);

  async function fetchQueue() {
    setLoading(true);
    try {
      const { data } = await api.get("/applications/hod-queue");
      setApplications(data.success ? data.data : data);
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === applications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applications.map((a) => a.id)));
    }
  }

  async function handleAction() {
    if (!selectedApp || !actionType) return;
    if (actionType === "reject" && !remarks.trim()) {
      addToast({ message: "Remarks are mandatory for rejection.", variant: "warning" });
      return;
    }

    setActionLoading(true);
    try {
      const status = actionType === "approve" ? "APPROVED_HOD" : "REJECTED_HOD";
      await api.patch(`/applications/${selectedApp.id}/hod-status`, {
        status,
        remarks: remarks.trim() || undefined,
      });

      addToast({
        message: `Application ${selectedApp.trackingId} ${actionType === "approve" ? "approved" : "rejected"}.`,
        variant: actionType === "approve" ? "success" : "info",
      });

      setSelectedApp(null);
      setActionType(null);
      setRemarks("");
      fetchQueue();
    } catch (err: any) {
      addToast({
        message: err.response?.data?.message || "Action failed.",
        variant: "error",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return;
    setActionLoading(true);

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
    setActionLoading(false);
    fetchQueue();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton" />
        <div className="h-4 w-72 skeleton" />
        <div className="mt-8 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Pending Reviews
          </h1>
          <p className="text-sm text-outline mt-1">
            {applications.length} application{applications.length !== 1 ? "s" : ""}{" "}
            awaiting your review
          </p>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-primary">
              {selectedIds.size} selected
            </span>
            <Button
              icon="done_all"
              variant="tonal"
              size="sm"
              loading={actionLoading}
              onClick={handleBulkApprove}
            >
              Bulk Approve
            </Button>
          </div>
        )}
      </div>

      {/* Queue */}
      {applications.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-outline-variant p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-success-container flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-rounded text-[36px] text-success">
              task_alt
            </span>
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            All caught up!
          </h3>
          <p className="text-sm text-outline max-w-md mx-auto">
            There are no applications pending your review at the moment.
            You&apos;ll be notified when new applications arrive.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select All */}
          <div className="flex items-center gap-3 px-5 py-2">
            <input
              type="checkbox"
              checked={selectedIds.size === applications.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-2 border-outline-variant accent-primary cursor-pointer"
            />
            <span className="text-xs font-medium text-outline">
              Select All
            </span>
          </div>

          {applications.map((app) => (
            <div
              key={app.id}
              className="bg-surface rounded-xl border border-outline-variant hover:shadow-md hover:border-primary/20 transition-all duration-200"
            >
              <div className="flex items-center p-5 gap-4">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.has(app.id)}
                  onChange={() => toggleSelect(app.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded border-2 border-outline-variant accent-primary cursor-pointer shrink-0"
                />

                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center text-sm font-bold text-on-primary-container shrink-0">
                  {app.applicant?.firstName?.[0]}
                  {app.applicant?.lastName?.[0]}
                </div>

                {/* Info */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setSelectedApp(app)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-foreground text-sm truncate">
                      {app.applicant?.firstName} {app.applicant?.lastName}
                    </p>
                    <StatusBadge status={app.status} size="sm" />
                  </div>
                  <p className="text-xs text-outline truncate">
                    {app.trackingId} • {app.department?.name} •{" "}
                    {app.applicant?.alternateEmail}
                  </p>
                  <p className="text-[11px] text-outline/60 mt-0.5">
                    Submitted{" "}
                    {new Date(app.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setSelectedApp(app);
                      setActionType("approve");
                    }}
                    className="p-2 rounded-lg bg-success-container hover:bg-success/20 text-success transition-colors cursor-pointer"
                    title="Approve"
                  >
                    <span className="material-symbols-rounded text-[20px]">
                      check_circle
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedApp(app);
                      setActionType("reject");
                    }}
                    className="p-2 rounded-lg bg-error-container hover:bg-error/20 text-error transition-colors cursor-pointer"
                    title="Reject"
                  >
                    <span className="material-symbols-rounded text-[20px]">
                      cancel
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail / Action Modal */}
      <Modal
        isOpen={!!selectedApp}
        onClose={() => {
          setSelectedApp(null);
          setActionType(null);
          setRemarks("");
        }}
        title={
          actionType
            ? `${actionType === "approve" ? "Approve" : "Reject"} Application`
            : `Application ${selectedApp?.trackingId || ""}`
        }
        size="lg"
        footer={
          actionType ? (
            <>
              <Button
                variant="outlined"
                onClick={() => {
                  setActionType(null);
                  setRemarks("");
                }}
              >
                Cancel
              </Button>
              <Button
                icon={actionType === "approve" ? "check_circle" : "cancel"}
                loading={actionLoading}
                onClick={handleAction}
                className={
                  actionType === "reject"
                    ? "!bg-error hover:!bg-error/90"
                    : "!bg-success hover:!bg-success/90"
                }
              >
                {actionType === "approve" ? "Approve" : "Reject"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                onClick={() => setActionType("reject")}
                className="!border-error !text-error"
              >
                Reject
              </Button>
              <Button
                icon="check_circle"
                onClick={() => setActionType("approve")}
                className="!bg-success"
              >
                Approve
              </Button>
            </>
          )
        }
      >
        {selectedApp && (
          <div className="space-y-5">
            {/* Applicant info */}
            <div className="flex items-center gap-4 p-4 bg-surface-variant/30 rounded-xl">
              <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center text-lg font-bold text-on-primary-container">
                {selectedApp.applicant?.firstName?.[0]}
                {selectedApp.applicant?.lastName?.[0]}
              </div>
              <div>
                <p className="font-bold text-foreground">
                  {selectedApp.applicant?.firstName}{" "}
                  {selectedApp.applicant?.lastName}
                </p>
                <p className="text-sm text-outline">
                  {selectedApp.applicant?.alternateEmail}
                </p>
                <p className="text-xs text-outline/60">
                  {selectedApp.department?.name}
                </p>
              </div>
            </div>

            {/* Details grid */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">
                Application Details
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(selectedApp.applicantDetails || {}).map(
                  ([key, val]) => (
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
                  )
                )}
              </div>
            </div>

            {/* Action form */}
            {actionType && (
              <div
                className={`p-4 rounded-xl border ${
                  actionType === "approve"
                    ? "bg-success-container/20 border-success/20"
                    : "bg-error-container/20 border-error/20"
                }`}
              >
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Remarks{" "}
                  {actionType === "reject" && (
                    <span className="text-error">*</span>
                  )}
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={
                    actionType === "approve"
                      ? "Optional remarks for approval..."
                      : "Provide reason for rejection (mandatory)..."
                  }
                  rows={3}
                  className="w-full rounded-lg border-2 border-outline-variant bg-surface px-4 py-3 text-sm text-foreground placeholder-outline/50 focus:border-primary focus:outline-none transition-colors resize-none"
                  required={actionType === "reject"}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
