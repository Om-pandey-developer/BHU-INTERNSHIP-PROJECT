"use client";

import React, { useState } from "react";

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
  type,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");
  
  const isPasswordType = type === "password";
  const currentType = isPasswordType ? (showPassword ? "text" : "password") : type;

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
          type={currentType}
          className={`
            peer w-full rounded-lg border-2 bg-surface px-4 py-3 text-sm text-foreground
            placeholder-transparent transition-colors duration-200
            focus:border-primary focus:outline-none focus:ring-0
            ${icon ? "pl-11" : ""}
            ${suffix || isPasswordType ? "pr-12" : ""}
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
        {isPasswordType ? (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-foreground focus:outline-none z-10 flex items-center justify-center cursor-pointer"
            tabIndex={-1}
          >
            <span className="material-symbols-rounded text-[20px]">
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          </button>
        ) : suffix ? (
          <div className="absolute right-0 top-0 bottom-0 flex items-center pr-4 text-outline font-medium text-sm pointer-events-none z-10">
            {suffix}
          </div>
        ) : null}
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
