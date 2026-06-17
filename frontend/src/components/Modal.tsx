"use client";

import React, { useEffect, useRef, useState } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
  mode?: "modal" | "drawer";
}

/**
 * Modal / Drawer — Multipurpose overlay component.
 *
 * mode="modal" (default): Centered dialog with backdrop blur
 * mode="drawer": Full-height panel sliding in from the right side
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  footer,
  mode = "modal",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Trigger enter animation after mount
      requestAnimationFrame(() => setAnimateIn(true));
    } else {
      document.body.style.overflow = "";
      setAnimateIn(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  const drawerWidthClasses = {
    sm: "w-full sm:w-80",
    md: "w-full sm:w-[28rem]",
    lg: "w-full sm:w-[36rem]",
    xl: "w-full sm:w-[48rem]",
  };

  // ═══ DRAWER MODE ═══
  if (mode === "drawer") {
    return (
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[90] flex justify-end"
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose();
        }}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
            animateIn ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
        />

        {/* Drawer Panel */}
        <div
          className={`relative ${drawerWidthClasses[size]} h-full bg-surface shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
            animateIn ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant shrink-0">
              <h3
                className="text-lg font-bold text-foreground"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-surface-variant transition-colors cursor-pointer"
              >
                <span className="material-symbols-rounded text-[20px] text-outline">
                  close
                </span>
              </button>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 px-6 py-5 overflow-y-auto">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-outline-variant bg-surface-variant/30 flex items-center justify-end gap-3 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══ MODAL MODE (default) ═══
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      {/* Content */}
      <div
        className={`relative w-full ${sizeClasses[size]} bg-surface rounded-2xl shadow-xl animate-fade-in overflow-hidden`}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
            <h3
              className="text-lg font-bold text-foreground"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-variant transition-colors cursor-pointer"
            >
              <span className="material-symbols-rounded text-[20px] text-outline">
                close
              </span>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-outline-variant bg-surface-variant/30 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
