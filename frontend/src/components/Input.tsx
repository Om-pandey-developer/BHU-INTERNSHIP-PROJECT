"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: string;
  suffix?: React.ReactNode;
}

/**
 * Design system input field with floating label effect,
 * Material icon prefix, optional suffix, and error state.
 */
export default function Input({
  label,
  error,
  icon,
  suffix,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        {icon && (
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline z-10">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`
            peer w-full rounded-lg border-2 bg-surface px-4 py-3 text-sm text-foreground
            placeholder-transparent transition-colors duration-200
            focus:border-primary focus:outline-none focus:ring-0
            ${icon ? "pl-11" : ""}
            ${suffix ? "pr-24" : ""}
            ${error ? "border-error" : "border-outline-variant hover:border-outline"}
          `}
          placeholder={label}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={`
            absolute top-1/2 -translate-y-1/2 text-sm text-outline transition-all duration-200
            pointer-events-none z-10
            peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm
            peer-focus:top-0 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-surface peer-focus:px-1
            peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:text-xs peer-not-placeholder-shown:bg-surface peer-not-placeholder-shown:px-1
            ${icon ? "left-11" : "left-3"}
          `}
        >
          {label}
        </label>
        {suffix && (
          <div className="absolute right-0 top-0 bottom-0 flex items-center pr-4 text-outline font-medium text-sm pointer-events-none">
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-error">
          <span className="material-symbols-rounded text-[14px]">error</span>
          {error}
        </p>
      )}
    </div>
  );
}
