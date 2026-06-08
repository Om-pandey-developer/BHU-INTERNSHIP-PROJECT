"use client";

import React from "react";

interface StatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "primary" | "success" | "warning" | "error";
}

const variantStyles = {
  default: {
    iconBg: "bg-surface-variant",
    iconColor: "text-foreground",
  },
  primary: {
    iconBg: "bg-primary-container",
    iconColor: "text-primary",
  },
  success: {
    iconBg: "bg-success-container",
    iconColor: "text-success",
  },
  warning: {
    iconBg: "bg-warning-container",
    iconColor: "text-warning",
  },
  error: {
    iconBg: "bg-error-container",
    iconColor: "text-error",
  },
};

export default function StatsCard({
  icon,
  label,
  value,
  subtitle,
  trend,
  trendValue,
  variant = "default",
}: StatsCardProps) {
  const styles = variantStyles[variant];
  const trendConfig = {
    up: { icon: "trending_up", color: "text-success" },
    down: { icon: "trending_down", color: "text-error" },
    neutral: { icon: "trending_flat", color: "text-outline" },
  };

  return (
    <div className="bg-surface rounded-2xl border border-outline-variant p-5 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-11 h-11 rounded-xl ${styles.iconBg} flex items-center justify-center`}
        >
          <span
            className={`material-symbols-rounded text-[22px] ${styles.iconColor}`}
          >
            {icon}
          </span>
        </div>
        {trend && trendValue && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${trendConfig[trend].color}`}
          >
            <span className="material-symbols-rounded text-[16px]">
              {trendConfig[trend].icon}
            </span>
            {trendValue}
          </div>
        )}
      </div>
      <p className="text-xs font-medium text-outline uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {subtitle && (
        <p className="text-xs text-outline mt-1">{subtitle}</p>
      )}
    </div>
  );
}
