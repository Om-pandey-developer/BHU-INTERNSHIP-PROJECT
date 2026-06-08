"use client";

import React, { useEffect } from "react";
import { create } from "zustand";

interface ToastData {
  id: string;
  message: string;
  variant: "success" | "error" | "warning" | "info";
  duration?: number;
}

interface ToastStore {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

const variantConfig = {
  success: {
    bg: "bg-success-container",
    text: "text-success",
    icon: "check_circle",
    border: "border-success/20",
  },
  error: {
    bg: "bg-error-container",
    text: "text-error",
    icon: "error",
    border: "border-error/20",
  },
  warning: {
    bg: "bg-warning-container",
    text: "text-warning",
    icon: "warning",
    border: "border-warning/20",
  },
  info: {
    bg: "bg-primary-container",
    text: "text-primary",
    icon: "info",
    border: "border-primary/20",
  },
};

function ToastItem({ toast }: { toast: ToastData }) {
  const { removeToast } = useToastStore();
  const config = variantConfig[toast.variant];

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm animate-slide-in ${config.bg} ${config.border}`}
    >
      <span className={`material-symbols-rounded text-[20px] ${config.text}`}>
        {config.icon}
      </span>
      <p className={`flex-1 text-sm font-medium ${config.text}`}>
        {toast.message}
      </p>
      <button
        onClick={() => removeToast(toast.id)}
        className={`p-0.5 rounded-md hover:bg-black/5 transition-colors cursor-pointer ${config.text}`}
      >
        <span className="material-symbols-rounded text-[16px]">close</span>
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
