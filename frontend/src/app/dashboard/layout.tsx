"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";

interface NavItem {
  label: string;
  icon: string;
  href: string;
}

const applicantNav: NavItem[] = [
  { label: "My Applications", icon: "description", href: "/dashboard/applicant" },
  { label: "New Application", icon: "add_circle", href: "/dashboard/applicant/new" },
  { label: "Settings", icon: "settings", href: "/dashboard/settings" },
];

const hodNav: NavItem[] = [
  { label: "Pending Reviews", icon: "pending_actions", href: "/dashboard/hod" },
  { label: "Reviewed", icon: "task_alt", href: "/dashboard/hod/reviewed" },
  { label: "Settings", icon: "settings", href: "/dashboard/settings" },
];

const adminNav: NavItem[] = [
  { label: "Provisioning Queue", icon: "queue", href: "/dashboard/admin" },
  { label: "Analytics", icon: "analytics", href: "/dashboard/admin/analytics" },
  { label: "Users", icon: "group", href: "/dashboard/admin/users" },
  { label: "Settings", icon: "settings", href: "/dashboard/settings" },
];

/**
 * Dashboard layout with:
 * - Collapsible sidebar with role-specific navigation
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

  const navItems =
    user.role === "CC_ADMIN"
      ? adminNav
      : user.role === "HOD"
        ? hodNav
        : applicantNav;

  const roleLabel =
    user.role === "CC_ADMIN"
      ? "CC Admin"
      : user.role === "HOD"
        ? "Head of Dept"
        : "Applicant";

  const roleBg =
    user.role === "CC_ADMIN"
      ? "bg-tertiary-container text-tertiary"
      : user.role === "HOD"
        ? "bg-secondary-container text-secondary"
        : "bg-primary-container text-on-primary-container";

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    // ── 1. PAGE CONTAINER ──
    // The 'page-dashboard' class links to globals.css for specific backgrounds/colors.
    // 'min-h-screen flex' provides the layout foundation for Sidebar + Main Content.
    <div className="page-dashboard min-h-screen flex bg-background">

      {/* ── 2. MOBILE SIDEBAR OVERLAY ──
          Darkens the background when the sidebar is open on mobile devices. */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── 3. RESPONSIVE SIDEBAR ──
          'fixed lg:sticky' makes it stick to the side on desktop but overlay on mobile.
          'w-72 bg-surface' sets the width and distinct surface color. */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-surface border-r border-outline-variant
          flex flex-col transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Sidebar header */}
        <div className="p-5 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-rounded text-[22px] text-white">
                school
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm text-foreground truncate">
                Banaras Hindu University
              </h2>
              <p className="text-xs text-outline">Email Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${active
                    ? "bg-primary-container text-on-primary-container"
                    : "text-foreground/70 hover:bg-surface-variant hover:text-foreground"
                  }
                `}
              >
                <span
                  className={`material-symbols-rounded text-[20px] ${active ? "text-primary" : ""
                    }`}
                >
                  {item.icon}
                </span>
                {item.label}
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </a>
            );
          })}
        </nav>

        {/* User card */}
        <div className="p-4 border-t border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-sm font-bold text-on-primary-container shrink-0">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {user.firstName} {user.lastName}
              </p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleBg}`}>
                {roleLabel}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-error-container text-outline hover:text-error transition-colors cursor-pointer"
              title="Logout"
            >
              <span className="material-symbols-rounded text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── 4. MAIN CONTENT AREA ──
          'flex-1' ensures this area takes the rest of the available screen space. */}
      <main className="flex-1 flex flex-col min-h-screen">

        {/* ── 5. TOP NAVIGATION BAR ── 
            'sticky top-0 z-30 bg-surface/80 backdrop-blur-md' creates a glass header. */}
        <header className="site-header sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-outline-variant px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-surface-variant transition-colors cursor-pointer"
          >
            <span className="material-symbols-rounded text-[24px]">menu</span>
          </button>

          <div className="flex-1" />

          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${roleBg}`}>
            {roleLabel}
          </span>
        </header>

        {/* ── 6. PAGE INJECTION POINT ── 
            This is where specific dashboard pages (Admin, HOD, Applicant) are rendered. */}
        <div className="flex-1 p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
