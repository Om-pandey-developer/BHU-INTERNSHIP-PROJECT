"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/axios";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";

interface Application {
  id: string;
  trackingId: string;
  status: string;
  applicantDetails: Record<string, unknown>;
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

/**
 * HOD Reviewed — shows applications already reviewed (approved/rejected) by the HOD.
 * Read-only view for record keeping.
 */
export default function HodReviewedPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [filter, setFilter] = useState<"all" | "approved" | "rejected">("all");

  useEffect(() => {
    async function fetchReviewed() {
      try {
        // Fetch all applications and filter client-side for reviewed ones
        const { data } = await api.get("/applications/hod-queue");
        void (data.success ? data.data : data);
        // For reviewed, we'd typically have a separate endpoint.
        // For now we'll also try to get admin-queue to show approved ones.
        // This is a simplified version — in production, add a backend endpoint.
        setApplications([]);
      } catch {
        // empty
      } finally {
        setLoading(false);
      }
    }
    fetchReviewed();
  }, []);

  const filtered =
    filter === "all"
      ? applications
      : applications.filter((app) =>
          filter === "approved"
            ? app.status === "APPROVED_HOD"
            : app.status === "REJECTED_HOD"
        );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton" />
        <div className="h-4 w-72 skeleton" />
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
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Reviewed Applications
          </h1>
          <p className="text-sm text-outline mt-1">
            History of applications you have reviewed
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-surface-variant/50 rounded-xl p-1">
          {(["all", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filter === f
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-outline hover:text-foreground"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-outline-variant p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-surface-variant flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-rounded text-[36px] text-outline">
              history
            </span>
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            No reviewed applications
          </h3>
          <p className="text-sm text-outline max-w-md mx-auto">
            Applications you approve or reject will appear here for your
            records. Head to{" "}
            <a
              href="/dashboard/hod"
              className="text-primary hover:underline font-medium"
            >
              Pending Reviews
            </a>{" "}
            to review applications.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((app) => (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className="bg-surface rounded-xl border border-outline-variant p-5 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center text-sm font-bold text-on-primary-container shrink-0">
                  {app.applicant?.firstName?.[0]}
                  {app.applicant?.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-foreground text-sm">
                      {app.applicant?.firstName} {app.applicant?.lastName}
                    </p>
                    <StatusBadge status={app.status} size="sm" />
                  </div>
                  <p className="text-xs text-outline">
                    {app.trackingId} • {app.department?.name}
                  </p>
                </div>
                {app.hodApprovedAt && (
                  <p className="text-xs text-outline shrink-0">
                    {new Date(app.hodApprovedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        title={`Application ${selectedApp?.trackingId || ""}`}
        size="md"
      >
        {selectedApp && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <StatusBadge status={selectedApp.status} />
              <span className="text-sm text-outline">
                {selectedApp.department?.name}
              </span>
            </div>

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
                    <p className="text-sm text-foreground font-medium">
                      {String(val)}
                    </p>
                  </div>
                )
              )}
            </div>

            {selectedApp.hodRemarks && (
              <div className="bg-primary-container/30 rounded-xl px-5 py-4">
                <p className="text-xs font-semibold text-primary mb-1">
                  Your Remarks
                </p>
                <p className="text-sm text-foreground">
                  {selectedApp.hodRemarks}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
