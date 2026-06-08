"use client";

import React from "react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const statusConfig: Record<string, { color: string; bg: string; icon: string }> = {
  DRAFT: { color: "text-outline", bg: "bg-surface-variant", icon: "edit_note" },
  PENDING_HOD: { color: "text-warning", bg: "bg-warning-container", icon: "hourglass_top" },
  APPROVED_HOD: { color: "text-primary", bg: "bg-primary-container", icon: "check_circle" },
  REJECTED_HOD: { color: "text-error", bg: "bg-error-container", icon: "cancel" },
  PENDING_CC: { color: "text-secondary", bg: "bg-secondary-container", icon: "pending" },
  PROVISIONED: { color: "text-success", bg: "bg-success-container", icon: "verified" },
  FAILED_PROVISIONING: { color: "text-error", bg: "bg-error-container", icon: "error" },
};

/**
 * Status badge component — renders application status
 * with color-coded icon and label matching the workflow state.
 */
export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    color: "text-outline",
    bg: "bg-surface-variant",
    icon: "help",
  };

  const label = status.replace(/_/g, " ");
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bg} ${config.color} ${sizeClasses}`}
    >
      <span className="material-symbols-rounded text-[14px]">{config.icon}</span>
      {label}
    </span>
  );
}
