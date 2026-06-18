"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/axios";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { useToastStore } from "@/components/Toast";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { generateApplicationPdf } from "@/lib/pdfGenerator";

interface Application {
  id: string;
  trackingId: string;
  status: string;
  applicantDetails: Record<string, unknown>;
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

/**
 * HOD Reviewed — shows applications already reviewed (approved/rejected) by the HOD.
 * Read-only view for record keeping.
 */
export default function HodReviewedPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [filter, setFilter] = useState<"all" | "approved" | "rejected">("all");
  const { addToast } = useToastStore();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();

  // Role guard
  useEffect(() => {
    if (!authLoading && user && user.role !== "HOD") {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchReviewed() {
      try {
        const { data } = await api.get("/applications/hod-reviewed");
        const apps = data.success ? data.data : data;
        setApplications(Array.isArray(apps) ? apps : []);
      } catch (err) {
        console.error("Failed to fetch reviewed applications", err);
        setApplications([]);
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
    } catch (err) {
      console.error("Failed to fetch image", err);
      return null;
    }
  }

  async function handleDownloadPdf(app: Application) {
    if (app.status === "APPROVED_HOD") {
      try {
        addToast({ message: "Downloading signed PDF...", variant: "info" });
        const response = await api.get(`/applications/${app.id}/approved-pdf`, {
          responseType: "blob",
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${app.trackingId}_Approved.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        addToast({ message: "Signed PDF downloaded successfully", variant: "success" });
        return;
      } catch (error) {
        addToast({ message: "Failed to download signed PDF", variant: "error" });
        return;
      }
    }

    // Fallback for rejected applications
    try {
      const photoUrl = `/applications/${app.id}/photo`;
      const signatureUrl = `/applications/${app.id}/signature`;

      addToast({ message: "Preparing PDF documents...", variant: "info" });

      const photoDataUrl = await fetchImageAsBase64(photoUrl);
      const signatureDataUrl = await fetchImageAsBase64(signatureUrl);

      addToast({ message: "Generating PDF...", variant: "info" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await generateApplicationPdf(app as any, undefined, photoDataUrl, signatureDataUrl);
      addToast({ message: "PDF downloaded successfully", variant: "success" });
    } catch (error) {
      addToast({ message: "Failed to generate PDF", variant: "error" });
    }
  }

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
            className="text-4xl font-bold text-amber-900"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Reviewed Applications
          </h1>
          <p className="text-sm text-amber-700 mt-1.5">
            History of applications you have reviewed
          </p>
        </div>

        {/* Filter tabs */}
        <div className="relative flex bg-gray-100 rounded-xl p-1 shadow-[0_0_9px_rgba(0,0,0,0.3)] w-[320px]">
          {/* Sliding Pill */}
          <div
            className="absolute top-1 bottom-1 bg-surface shadow-md rounded-lg transition-transform duration-100 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
              width: "calc((100% - 8px) / 3)",
              left: "4px",
              transform: `translateX(${filter === "all" ? "0%" : filter === "approved" ? "100%" : "200%"
                })`,
            }}
          />
          {(["all", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`relative z-10 flex-1 py-1.5 text-center text-sm font-medium transition-colors duration-100 cursor-pointer ${filter === f
                ? "text-foreground"
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

        <div className="bg-white rounded-2xl border border-black/25 p-12 text-center shadowp-5 mb-8 shadow-[0_0_9px_rgba(0,0,0,0.3)]">
          <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-5 shadowp-5 mb-8 shadow-[0_0_9px_rgba(0,0,0,0.3)]">
            <span className="material-symbols-rounded text-black hover:animate-spin hover:[animation-direction:reverse]">
              history
            </span>
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            No reviewed applications
          </h3>
          <p className="text-sm text-gray-400  max-w-md mx-auto">
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
            <div className="flex items-center justify-end w-full pt-4 border-t border-outline-variant mt-4">
              <Button
                variant="outlined"
                icon="download"
                onClick={() => handleDownloadPdf(selectedApp!)}
                className="!border-primary !text-primary hover:!bg-primary/10"
              >
                Download PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
