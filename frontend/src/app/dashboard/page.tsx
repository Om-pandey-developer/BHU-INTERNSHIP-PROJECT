"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

/**
 * /dashboard index page — redirects to the role-specific dashboard.
 *
 * - CC_ADMIN  → /dashboard/admin
 * - HOD       → /dashboard/hod
 * - APPLICANT → /dashboard/applicant
 */
export default function DashboardIndexPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }

    switch (user.role) {
      case "CC_ADMIN":
        router.replace("/dashboard/admin");
        break;
      case "HOD":
        router.replace("/dashboard/hod");
        break;
      default:
        router.replace("/dashboard/applicant");
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show a brief loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <span className="material-symbols-rounded text-[48px] text-primary animate-spin">
          progress_activity
        </span>
        <p className="text-sm text-outline">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
