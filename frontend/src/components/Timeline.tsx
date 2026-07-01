"use client";

import React from "react";

interface TimelineStep {
  label: string;
  icon: string;
  status: "completed" | "active" | "pending" | "error";
  date?: string;
  description?: string;
}

interface TimelineProps {
  steps: TimelineStep[];
}

const statusStyles = {
  completed: {
    dot: "bg-success text-white",
    line: "bg-success",
    label: "text-foreground",
    desc: "text-outline",
  },
  active: {
    dot: "bg-primary text-white animate-pulse-dot",
    line: "bg-outline-variant",
    label: "text-primary font-semibold",
    desc: "text-primary/70",
  },
  pending: {
    dot: "bg-outline-variant text-outline",
    line: "bg-outline-variant",
    label: "text-outline",
    desc: "text-outline/50",
  },
  error: {
    dot: "bg-error text-white",
    line: "bg-error/30",
    label: "text-error font-semibold",
    desc: "text-error/70",
  },
};

export default function Timeline({ steps }: TimelineProps) {
  return (
    <div className="relative">
      {steps.map((step, i) => {
        const styles = statusStyles[step.status];
        const isLast = i === steps.length - 1;

        return (
          <div key={i} className="flex gap-4 pb-6 last:pb-0">
            {/* Dot + Line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${styles.dot}`}
              >
                <span className="material-symbols-rounded text-[18px]">
                  {step.status === "completed"
                    ? "check"
                    : step.status === "error"
                    ? "close"
                    : step.icon}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 mt-1 rounded-full ${styles.line}`}
                />
              )}
            </div>

            {/* Content */}
            <div className="pt-1.5 pb-2 min-w-0">
              <p className={`text-sm ${styles.label}`}>{step.label}</p>
              {step.description && (
                <p className={`text-xs mt-0.5 ${styles.desc}`}>
                  {step.description}
                </p>
              )}
              {step.date && (
                <p className="text-[11px] text-outline/60 mt-0.5">
                  {step.date}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Helper to build timeline steps from an application status string.
 */
export function buildTimelineSteps(
  status: string,
  dates?: {
    createdAt?: string;
    hodApprovedAt?: string;
    provisionedAt?: string;
  },
  category?: string
): TimelineStep[] {
  const isUG = category === "UNDER_GRADUATE_STUDENT";

  // For UG students, the approval authority is Dean, not HOD
  const approvalLabel = isUG ? "Dean Review" : "HOD Review";
  const rejectedStatus = isUG ? "REJECTED_DEAN" : "REJECTED_HOD";
  const approvedStatus = isUG ? "APPROVED_DEAN" : "APPROVED_HOD";
  const pendingStatus = isUG ? "PENDING_DEAN" : "PENDING_HOD";

  const allStatuses = isUG
    ? ["PENDING_DEAN", "APPROVED_DEAN", "REJECTED_DEAN", "PENDING_CC", "PROVISIONED", "FAILED_PROVISIONING"]
    : ["PENDING_HOD", "APPROVED_HOD", "REJECTED_HOD", "PENDING_CC", "PROVISIONED", "FAILED_PROVISIONING"];

  const stepDefs = [
    {
      label: "Application Submitted",
      icon: "description",
      matchStatuses: allStatuses,
    },
    {
      label: approvalLabel,
      icon: "rate_review",
      matchStatuses: [approvedStatus, rejectedStatus, "PENDING_CC", "PROVISIONED", "FAILED_PROVISIONING"],
    },
    {
      label: "CC Admin Processing",
      icon: "admin_panel_settings",
      matchStatuses: ["PROVISIONED", "FAILED_PROVISIONING"],
    },
    {
      label: "Account Provisioned",
      icon: "verified",
      matchStatuses: ["PROVISIONED"],
    },
  ];

  const isRejected = status === rejectedStatus;
  const isFailed = status === "FAILED_PROVISIONING";

  return stepDefs.map((def, i) => {
    const isCompleted = def.matchStatuses.includes(status);

    // Determine step status
    let stepStatus: TimelineStep["status"] = "pending";

    if (i === 0) {
      // Submitted is always completed if it exists
      stepStatus = "completed";
    } else if (i === 1 && isRejected) {
      stepStatus = "error";
    } else if (i === 2 && isFailed) {
      stepStatus = "error";
    } else if (isCompleted) {
      stepStatus = "completed";
    } else if (
      // Active = first uncompleted step after all completed ones
      i > 0 &&
      stepDefs[i - 1].matchStatuses.includes(status)
    ) {
      stepStatus = "active";
    }

    // Handle active state for current step
    if (status === pendingStatus && i === 1) stepStatus = "active";
    if ((status === approvedStatus || status === "PENDING_CC") && i === 2)
      stepStatus = "active";

    let date: string | undefined;
    if (i === 0 && dates?.createdAt) {
      date = new Date(dates.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (i === 1 && dates?.hodApprovedAt) {
      date = new Date(dates.hodApprovedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (i === 3 && dates?.provisionedAt) {
      date = new Date(dates.provisionedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return {
      ...def,
      status: stepStatus,
      date,
      description:
        i === 1 && isRejected
          ? `Application rejected by ${isUG ? "Dean" : "HOD"}`
          : i === 2 && isFailed
          ? "Provisioning failed"
          : undefined,
    };
  });
}

