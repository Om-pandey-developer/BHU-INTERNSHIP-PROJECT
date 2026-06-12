"use client";

import React, { useState, useEffect } from "react";
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
  hod?: {
    firstName: string;
    lastName: string;
  };
}

const quotaMap: Record<string, number> = {
  GROUP_A_OFFICER: 20,
  TEACHING_STAFF: 20,
  RESEARCH_SCHOLAR: 10,
  POST_GRADUATE_STUDENT: 5,
  NON_TEACHING_STAFF: 5,
};

/**
 * CC Admin Dashboard — Provisioning Queue
 *
 * Shows HOD-approved applications ready for Google Workspace provisioning.
 * Admin can inspect details, then click to provision each account.
 */
export default function AdminDashboard() {
  const { addToast } = useToastStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [provisioning, setProvisioning] = useState<string | null>(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  async function fetchQueue() {
    setLoading(true);
    try {
      const { data } = await api.get("/applications/admin-queue");
      setApplications(data.success ? data.data : data);
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  }

  async function handleProvision(app: Application) {
    setProvisioning(app.id);
    try {
      const { data } = await api.post(`/workspace/provision/${app.id}`);
      const result = data.success ? data.data : data;

      addToast({
        message: `✅ Provisioned: ${result.bhuEmail} (${result.quotaAssignedGB}GB)`,
        variant: "success",
        duration: 6000,
      });

      setSelectedApp(null);
      fetchQueue();
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      addToast({
        message: error.response?.data?.message || "Provisioning failed.",
        variant: "error",
        duration: 6000,
      });
    } finally {
      setProvisioning(null);
    }
  }

  function getExpectedEmail(app: Application): string {
    const first = (app.applicant?.firstName || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
    const last = (app.applicant?.lastName || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
    return `${first}.${last}@bhu.ac.in`;
  }

  function getExpectedQuota(app: Application): number {
    const category = (app.applicantDetails as Record<string, unknown>)
      ?.category as string;
    return quotaMap[category] || 5;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton" />
        <div className="h-4 w-72 skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 skeleton rounded-2xl" />
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Provisioning Queue
        </h1>
        <p className="text-sm text-outline mt-1">
          HOD-approved applications ready for Google Workspace provisioning
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatsCard
          icon="queue"
          label="In Queue"
          value={applications.length}
          variant="warning"
          subtitle="Ready for provisioning"
        />
        <StatsCard
          icon="storage"
          label="Total Quota"
          value={`${applications.reduce(
            (sum, app) => sum + getExpectedQuota(app),
            0
          )} GB`}
          variant="primary"
          subtitle="Will be allocated"
        />
        <StatsCard
          icon="speed"
          label="Avg Wait"
          value={
            applications.length > 0
              ? `${Math.round(
                  applications.reduce((sum, app) => {
                    const wait =
                      Date.now() -
                      new Date(app.hodApprovedAt || app.createdAt).getTime();
                    return sum + wait / (1000 * 60 * 60);
                  }, 0) / applications.length
                )}h`
              : "—"
          }
          variant="default"
          subtitle="Since HOD approval"
        />
      </div>

      {/* Queue List */}
      {applications.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-outline-variant p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-success-container flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-rounded text-[36px] text-success">
              verified
            </span>
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            Queue is empty
          </h3>
          <p className="text-sm text-outline max-w-md mx-auto">
            All approved applications have been provisioned. New applications
            will appear here after HOD approval.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.id}
              className="bg-surface rounded-xl border border-outline-variant hover:shadow-md hover:border-primary/20 transition-all duration-200"
            >
              <div className="flex items-center p-5 gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-sm font-bold text-on-primary-container shrink-0">
                  {app.applicant?.firstName?.[0]}
                  {app.applicant?.lastName?.[0]}
                </div>

                {/* Info */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setSelectedApp(app)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-foreground text-sm">
                      {app.applicant?.firstName} {app.applicant?.lastName}
                    </p>
                    <StatusBadge status={app.status} size="sm" />
                  </div>
                  <p className="text-xs text-outline truncate">
                    {app.trackingId} • {app.department?.name} •{" "}
                    {getExpectedEmail(app)}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] text-outline/60">
                      HOD: {app.hod?.firstName} {app.hod?.lastName}
                    </span>
                    <span className="text-[11px] text-outline/60">
                      Quota: {getExpectedQuota(app)}GB
                    </span>
                  </div>
                </div>

                {/* Provision Button */}
                <Button
                  icon="rocket_launch"
                  variant="filled"
                  size="sm"
                  loading={provisioning === app.id}
                  onClick={() => handleProvision(app)}
                >
                  Provision
                </Button>
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
        size="lg"
        footer={
          selectedApp && (
            <>
              <Button variant="outlined" onClick={() => setSelectedApp(null)}>
                Close
              </Button>
              <Button
                icon="rocket_launch"
                loading={provisioning === selectedApp.id}
                onClick={() => handleProvision(selectedApp)}
              >
                Provision Account
              </Button>
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
              <StatusBadge status={selectedApp.status} />
            </div>

            {/* Provisioning Preview */}
            <div className="bg-primary-container/20 rounded-xl p-5 border border-primary/15">
              <h4 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                <span className="material-symbols-rounded text-[18px]">
                  preview
                </span>
                Provisioning Preview
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface rounded-lg px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-outline font-medium">
                    BHU Email
                  </p>
                  <p className="text-sm text-primary font-bold">
                    {getExpectedEmail(selectedApp)}
                  </p>
                </div>
                <div className="bg-surface rounded-lg px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-outline font-medium">
                    Storage Quota
                  </p>
                  <p className="text-sm text-foreground font-bold">
                    {getExpectedQuota(selectedApp)} GB
                  </p>
                </div>
              </div>
            </div>

            {/* Application Details */}
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

            {/* HOD Info */}
            {selectedApp.hodRemarks && (
              <div className="bg-secondary-container/30 rounded-xl px-5 py-4">
                <p className="text-xs font-semibold text-secondary mb-1">
                  HOD Remarks — {selectedApp.hod?.firstName}{" "}
                  {selectedApp.hod?.lastName}
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
