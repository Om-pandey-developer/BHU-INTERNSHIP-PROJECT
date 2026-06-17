"use client";

import React from "react";

interface SkeletonProps {
  variant?: "card" | "table-row" | "stats-card" | "text-line" | "application-card";
  count?: number;
  className?: string;
}

/**
 * SkeletonLoader — Premium loading placeholder component.
 * Uses the shimmer animation defined in globals.css.
 * 
 * Variants:
 * - card: Generic card placeholder
 * - table-row: Table row placeholder with columns
 * - stats-card: Stats/metric card placeholder
 * - text-line: Single line of text placeholder
 * - application-card: Application list item placeholder
 */
export default function SkeletonLoader({
  variant = "card",
  count = 1,
  className = "",
}: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === "stats-card") {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {items.map((i) => (
          <div
            key={i}
            className="bg-surface rounded-2xl border border-outline-variant p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl skeleton" />
              <div className="w-16 h-5 rounded-full skeleton" />
            </div>
            <div className="space-y-2">
              <div className="w-24 h-3 rounded skeleton" />
              <div className="w-16 h-7 rounded skeleton" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "table-row") {
    return (
      <div className={`space-y-3 ${className}`}>
        {items.map((i) => (
          <div
            key={i}
            className="bg-surface rounded-xl border border-outline-variant p-4 flex items-center gap-4"
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full skeleton shrink-0" />
            {/* Name + details */}
            <div className="flex-1 space-y-2">
              <div className="w-36 h-4 rounded skeleton" />
              <div className="w-52 h-3 rounded skeleton" />
            </div>
            {/* Status badge */}
            <div className="w-24 h-6 rounded-full skeleton shrink-0 hidden sm:block" />
            {/* Actions */}
            <div className="w-20 h-8 rounded-lg skeleton shrink-0 hidden sm:block" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "application-card") {
    return (
      <div className={`space-y-3 ${className}`}>
        {items.map((i) => (
          <div
            key={i}
            className="bg-surface rounded-xl border border-outline-variant p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl skeleton shrink-0" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-32 h-4 rounded skeleton" />
                  <div className="w-24 h-5 rounded-full skeleton" />
                </div>
                <div className="w-48 h-3 rounded skeleton" />
              </div>
            </div>
            <div className="w-5 h-5 rounded skeleton shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "text-line") {
    return (
      <div className={`space-y-3 ${className}`}>
        {items.map((i) => (
          <div
            key={i}
            className="h-4 rounded skeleton"
            style={{ width: `${60 + Math.random() * 30}%` }}
          />
        ))}
      </div>
    );
  }

  // Default "card" variant
  return (
    <div className={`space-y-4 ${className}`}>
      {items.map((i) => (
        <div
          key={i}
          className="bg-surface rounded-2xl border border-outline-variant p-6 space-y-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl skeleton shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="w-40 h-4 rounded skeleton" />
              <div className="w-28 h-3 rounded skeleton" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 rounded skeleton w-full" />
            <div className="h-3 rounded skeleton w-4/5" />
            <div className="h-3 rounded skeleton w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
