"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/axios";
import StatsCard from "@/components/StatsCard";
import StatusBadge from "@/components/StatusBadge";

interface DashboardMetrics {
  totalApplications: number;
  statusBreakdown: { status: string; count: number }[];
  departmentBreakdown: {
    id: string;
    code: string;
    name: string;
    applicationCount: number;
  }[];
  recentApplications: {
    id: string;
    trackingId: string;
    status: string;
    createdAt: string;
    applicant?: { firstName: string; lastName: string; alternateEmail: string };
    department?: { name: string; code: string };
  }[];
  avgApprovalTime: { averageHours: number; sampleSize: number };
  quotaUtilization: {
    totalProvisionedAccounts: number;
    totalQuotaAllocatedGB: number;
  };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "#79747E" },
  PENDING_HOD: { label: "Pending HOD", color: "#E6A817" },
  APPROVED_HOD: { label: "Approved HOD", color: "#6750A4" },
  REJECTED_HOD: { label: "Rejected", color: "#B3261E" },
  PENDING_CC: { label: "Pending CC", color: "#625B71" },
  PROVISIONED: { label: "Provisioned", color: "#1B873E" },
  FAILED_PROVISIONING: { label: "Failed", color: "#B3261E" },
};

/**
 * CC Admin Analytics Dashboard
 *
 * Displays:
 * - Key stats cards (total apps, provisioned, avg approval time, quota)
 * - Status breakdown bar chart (CSS-based)
 * - Department-wise breakdown
 * - Recent applications activity feed
 */
export default function AdminAnalyticsPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<"sm" | "md" | "lg">("md");

  useEffect(() => {
    fetchMetrics();
  }, []);

  async function fetchMetrics() {
    setLoading(true);
    try {
      const { data } = await api.get("/analytics/dashboard");
      setMetrics(data.success ? data.data : data);
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 skeleton rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 skeleton rounded-2xl" />
          <div className="h-72 skeleton rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-20">
        <span className="material-symbols-rounded text-[48px] text-outline mb-4">
          error
        </span>
        <p className="text-outline">Failed to load analytics data.</p>
      </div>
    );
  }

  const maxStatusCount = Math.max(
    ...metrics.statusBreakdown.map((s) => s.count),
    1
  );
  const maxDeptCount = Math.max(
    ...metrics.departmentBreakdown.map((d) => d.applicationCount),
    1
  );

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Analytics Dashboard
          </h1>
          <p className="text-sm text-outline mt-1">
            System-wide metrics and insights
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          className="p-2 rounded-lg hover:bg-surface-variant transition-colors cursor-pointer"
          title="Refresh"
        >
          <span className="material-symbols-rounded text-[22px] text-outline">
            refresh
          </span>
        </button>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon="description"
          label="Total Applications"
          value={metrics.totalApplications}
          variant="primary"
        />
        <StatsCard
          icon="verified"
          label="Provisioned"
          value={metrics.quotaUtilization.totalProvisionedAccounts}
          variant="success"
          subtitle={`${metrics.quotaUtilization.totalQuotaAllocatedGB} GB allocated`}
        />
        <StatsCard
          icon="schedule"
          label="Avg Approval Time"
          value={`${metrics.avgApprovalTime.averageHours}h`}
          variant="warning"
          subtitle={`Based on ${metrics.avgApprovalTime.sampleSize} applications`}
        />
        <StatsCard
          icon="storage"
          label="Total Quota"
          value={`${metrics.quotaUtilization.totalQuotaAllocatedGB} GB`}
          variant="default"
          subtitle={`${metrics.quotaUtilization.totalProvisionedAccounts} accounts`}
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="bg-surface rounded-2xl border border-outline-variant p-6">
          <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
            <span className="material-symbols-rounded text-[18px] text-primary">
              pie_chart
            </span>
            Status Breakdown
          </h3>
          <p className="text-xs text-outline mb-5">
            Applications by current status
          </p>

          <div className="space-y-3">
            {metrics.statusBreakdown
              .filter((s) => s.count > 0)
              .sort((a, b) => b.count - a.count)
              .map((item) => {
                const config = statusLabels[item.status] || {
                  label: item.status,
                  color: "#79747E",
                };
                const pct = (item.count / maxStatusCount) * 100;

                return (
                  <div key={item.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">
                        {config.label}
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {item.count}
                      </span>
                    </div>
                    <div className="h-2.5 bg-surface-variant rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: config.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}

            {metrics.statusBreakdown.every((s) => s.count === 0) && (
              <p className="text-sm text-outline text-center py-4">
                No data available
              </p>
            )}
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="bg-surface rounded-2xl border border-outline-variant p-6">
          <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
            <span className="material-symbols-rounded text-[18px] text-primary">
              apartment
            </span>
            Department Volume
          </h3>
          <p className="text-xs text-outline mb-5">
            Applications by department
          </p>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {metrics.departmentBreakdown
              .filter((d) => d.applicationCount > 0)
              .sort((a, b) => b.applicationCount - a.applicationCount)
              .map((dept) => {
                const pct = (dept.applicationCount / maxDeptCount) * 100;

                return (
                  <div key={dept.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground truncate">
                        {dept.name}
                      </span>
                      <span className="text-xs font-bold text-foreground shrink-0 ml-2">
                        {dept.applicationCount}
                      </span>
                    </div>
                    <div className="h-2.5 bg-surface-variant rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-tertiary transition-all duration-700 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

            {metrics.departmentBreakdown.every(
              (d) => d.applicationCount === 0
            ) && (
                <p className="text-sm text-outline text-center py-4">
                  No data available
                </p>
              )}
          </div>
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-6">
        <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
          <span className="material-symbols-rounded text-[18px] text-primary">
            history
          </span>
          Recent Applications
        </h3>
        <p className="text-xs text-outline mb-5">Last 10 submissions</p>

        {metrics.recentApplications.length > 0 ? (
          <div className="overflow-x-auto border border-outline-variant rounded-xl p-2 bg-surface">
            <div className="flex justify-start items-center p-2 mb-2 border-b border-outline-variant/50">
              <div className="flex items-center gap-2 bg-surface-variant/30 p-1.5 rounded-xl border border-outline-variant shadow-sm">
                <span className="text-xs font-bold text-outline uppercase tracking-wider ml-2 mr-1">Zoom:</span>
                <button onClick={() => setZoomLevel("sm")} className={`p-1.5 rounded-lg ${zoomLevel === 'sm' ? 'bg-white shadow-sm text-primary' : 'text-outline hover:text-foreground'}`} title="Small text"><span className="material-symbols-rounded text-[18px]">format_size</span></button>
                <button onClick={() => setZoomLevel("md")} className={`p-1.5 rounded-lg ${zoomLevel === 'md' ? 'bg-white shadow-sm text-primary' : 'text-outline hover:text-foreground'}`} title="Medium text"><span className="material-symbols-rounded text-[20px]">format_size</span></button>
                <button onClick={() => setZoomLevel("lg")} className={`p-1.5 rounded-lg ${zoomLevel === 'lg' ? 'bg-white shadow-sm text-primary' : 'text-outline hover:text-foreground'}`} title="Large text"><span className="material-symbols-rounded text-[24px]">format_size</span></button>
              </div>
            </div>
            <table className={`w-full text-left border-collapse min-w-[600px] ${
              zoomLevel === 'sm' ? '[&_span:not(.material-symbols-rounded)]:text-[11px] [&_th]:text-[10px] [&_td]:text-[11px]' :
              zoomLevel === 'lg' ? '[&_span:not(.material-symbols-rounded)]:text-[14px] [&_th]:text-[13px] [&_td]:text-[14px]' : 'text-sm'
            }`}>
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="text-left text-[11px] uppercase tracking-wider font-semibold text-outline py-2 px-3">
                    Tracking ID
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-wider font-semibold text-outline py-2 px-3">
                    Applicant
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-wider font-semibold text-outline py-2 px-3">
                    Department
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-wider font-semibold text-outline py-2 px-3">
                    Status
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-wider font-semibold text-outline py-2 px-3">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentApplications.map((app) => (
                  <tr
                    key={app.id}
                    className="border-b border-outline-variant/50 hover:bg-surface-variant/30 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <span className="text-sm font-medium text-primary">
                        {app.trackingId}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-sm text-foreground">
                        {app.applicant?.firstName} {app.applicant?.lastName}
                      </p>
                      <p className="text-xs text-outline lowercase truncate max-w-[150px]">
                        {app.applicant?.alternateEmail}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-sm text-outline">
                      {app.department?.name || "—"}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={app.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-xs text-outline whitespace-nowrap">
                      {new Date(app.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-outline text-center py-8">
            No recent applications
          </p>
        )}
      </div>
    </div>
  );
}
