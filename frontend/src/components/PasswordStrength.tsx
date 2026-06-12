"use client";

import React from "react";

interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
}

const rules: PasswordRule[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "One number", test: (p) => /[0-9]/.test(p) },
  {
    label: "One special character",
    test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p),
  },
];

interface PasswordStrengthProps {
  password: string;
  onValidChange?: (isValid: boolean) => void;
}

/**
 * Interactive password strength checklist that shows live red → green
 * validation feedback as the user types. Exposes `isValid` via callback
 * so the parent form can disable submit until all rules pass.
 */
export default function PasswordStrength({
  password,
  onValidChange,
}: PasswordStrengthProps) {
  const results = rules.map((rule) => ({
    ...rule,
    passed: rule.test(password),
  }));

  const allPassed = results.every((r) => r.passed);

  // Notify parent of validity changes
  React.useEffect(() => {
    onValidChange?.(allPassed);
  }, [allPassed, onValidChange]);

  // Don't render if password is empty
  if (!password) return null;

  return (
    <div className="space-y-1.5 animate-fade-in">
      <p className="text-xs font-medium text-outline mb-2 flex items-center gap-1.5">
        <span className="material-symbols-rounded text-[14px]">
          shield
        </span>
        Password Requirements
      </p>
      {results.map((rule, i) => (
        <div
          key={i}
          className="flex items-center gap-2 text-xs transition-all duration-300"
          style={{
            color: rule.passed ? "var(--success)" : "var(--error)",
          }}
        >
          <span
            className="material-symbols-rounded text-[16px] transition-all duration-300"
            style={{
              transform: rule.passed ? "scale(1)" : "scale(0.9)",
            }}
          >
            {rule.passed ? "check_circle" : "cancel"}
          </span>
          <span
            style={{
              opacity: rule.passed ? 0.85 : 1,
              textDecoration: rule.passed ? "line-through" : "none",
              transition: "all 0.3s ease",
            }}
          >
            {rule.label}
          </span>
        </div>
      ))}

      {/* Strength bar */}
      <div className="mt-2 h-1.5 rounded-full bg-outline-variant overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${(results.filter((r) => r.passed).length / results.length) * 100}%`,
            background: allPassed
              ? "var(--success)"
              : results.filter((r) => r.passed).length >= 3
                ? "var(--warning)"
                : "var(--error)",
          }}
        />
      </div>
    </div>
  );
}
