"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "filled" | "outlined" | "text" | "tonal";
  size?: "sm" | "md" | "lg";
  icon?: string;
  loading?: boolean;
}

/**
 * Design system button matching Varanasi Academic Heritage spec.
 * Supports filled, outlined, text, and tonal variants with Material Icons.
 */
export default function Button({
  variant = "filled",
  size = "md",
  icon,
  loading,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

  const variants = {
    filled:
      "bg-primary text-on-primary hover:bg-primary-dark active:scale-[0.98] shadow-sm hover:shadow-md",
    outlined:
      "border-2 border-primary text-primary hover:bg-primary/5 active:bg-primary/10",
    text: "text-primary hover:bg-primary/5 active:bg-primary/10",
    tonal:
      "bg-primary-container text-on-primary-container hover:bg-secondary-container active:scale-[0.98]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="material-symbols-rounded text-[18px] animate-spin">
          progress_activity
        </span>
      ) : icon ? (
        <span className="material-symbols-rounded text-[18px]">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
