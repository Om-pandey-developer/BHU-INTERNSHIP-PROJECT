"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import Image from "next/image";

interface NavItem {
  label: string;
  icon: string;
  href: string;
}

const hodNav: NavItem[] = [
  { label: "Pending Reviews", icon: "pending_actions", href: "/dashboard/hod" },
  { label: "Reviewed", icon: "task_alt", href: "/dashboard/hod/reviewed" },
  { label: "Settings", icon: "settings", href: "/dashboard/settings" },
];

const deanNav: NavItem[] = [
  { label: "Pending Reviews", icon: "pending_actions", href: "/dashboard/dean" },
  { label: "Reviewed", icon: "task_alt", href: "/dashboard/dean/reviewed" },
  { label: "Settings", icon: "settings", href: "/dashboard/settings" },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard/admin" },
  { label: "History", icon: "history", href: "/dashboard/admin/history" },
  { label: "Database", icon: "database", href: "/dashboard/admin/database" },
  { label: "Manage HODs", icon: "manage_accounts", href: "/dashboard/admin/manage-hods" },
  { label: "Departments", icon: "apartment", href: "/dashboard/admin/departments" },
  { label: "Settings", icon: "settings", href: "/dashboard/settings" },
];

/**
 * Dashboard layout with:
 * - Collapsible sidebar for HOD/Admin roles
 * - No sidebar for Applicant — Settings & Logout in navbar
 * - Top bar with user info and logout
 * - Auth hydration and guard
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, hydrate, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // ── Force password change on first login (admin-provisioned accounts) ──
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.requiresPasswordChange && pathname !== "/dashboard/settings") {
      router.replace("/dashboard/settings");
    }
  }, [isLoading, isAuthenticated, user?.requiresPasswordChange, pathname, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-rounded text-[48px] text-primary animate-spin">
            progress_activity
          </span>
          <p className="text-sm text-outline">Loading portal...</p>
        </div>
      </div>
    );
  }

  const isApplicant = user.role === "APPLICANT";

  const navItems =
    user.role === "CC_ADMIN"
      ? adminNav
      : user.role === "HOD"
        ? hodNav
        : user.role === "DEAN"
          ? deanNav
          : []; // Applicant has no sidebar nav

  const roleLabel =
    user.role === "CC_ADMIN"
      ? "CC Admin"
      : user.role === "HOD"
        ? "Head of Dept"
        : user.role === "DEAN"
          ? "Dean"
          : "Applicant";

  const roleBg =
    user.role === "CC_ADMIN"
      ? "bg-tertiary-container text-tertiary"
      : user.role === "HOD"
        ? "bg-secondary-container text-secondary"
        : user.role === "DEAN"
          ? "bg-amber-100 text-amber-800"
          : "bg-primary-container text-on-primary-container";

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    // ── 1. PAGE CONTAINER ──
    <div className="page-dashboard min-h-screen flex bg-olive-200">

      {/* ── 2. SIDEBAR (Removed as per CC Admin redesign) ── */}

      {/* ── 4. MAIN CONTENT AREA ── */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0">

        {/* ── 5. TOP NAVIGATION BAR ── */}
        <header className="site-header sticky top-0 z-20 bg-white backdrop-blur-md border-b border-black/30 px-3 sm:px-6 py-1.5 sm:py-3 flex items-center gap-2 sm:gap-4 shadow-[0_0_9px_rgba(0,0,0,0.3)]">


          <div className="flex-0">
            <span className={`w-10 h-10 flex items-center justify-center text-[20px] px-3 py-1 rounded-full text-xs shadow-[0_0_9px_rgba(0,0,0,0.3)] font-semibold ${roleBg}`}>
              {user.firstName[0]}
              {user.lastName[0]}
            </span>
          </div>
          <div className="flex items-center ml-1 sm:ml-2">
            <Image
              src="/BHUlogo.png"
              alt="BHU Logo"
              width={160}
              height={50}
              priority
              className="object-contain h-[4.5rem] sm:h-14 w-auto scale-110 sm:scale-100 origin-left"
            />
          </div>

          <div className="flex-1" />

          {/* ── Applicant & HOD navbar actions: Settings + Logout ── */}


          <div className="flex items-center gap-0 sm:gap-3">
            <button
              onClick={handleLogout}
              className="pl-5 sm:p-2 rounded-lg hover:bg-error-container text-outline hover:text-error transition-colors cursor-pointer flex items-center gap-1"
              title="Logout"
            >
              <span className="material-symbols-rounded text-[22px]">logout</span>
              <h2 className="text-sm font-medium hidden sm:block">Logout</h2>
            </button>

            <a
              href="/dashboard/settings"
              className={`pl-5 sm:p-2 rounded-lg hover:bg-error-container text-outline hover:text-error transition-colors cursor-pointer flex items-center gap-1}}`}
              title="Settings"
            >
              <span className="material-symbols-rounded text-[22px]">settings</span>
            </a>
          </div>

        </header>

        {/* ── 6. PAGE INJECTION POINT ── */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
