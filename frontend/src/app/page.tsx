"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

/**
 * Landing page — redirects authenticated users to their dashboard,
 * unauthenticated users see an elegant hero section.
 */
export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user, hydrate, isLoading } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      switch (user.role) {
        case "HOD":
          router.push("/dashboard/hod");
          break;
        case "CC_ADMIN":
          router.push("/dashboard/admin");
          break;
        default:
          router.push("/dashboard/applicant");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="material-symbols-rounded text-[22px] text-white">
                school
              </span>
            </div>
            <div>
              <h1 className="font-bold text-sm text-foreground">
                BHU Email Portal
              </h1>
              <p className="text-[10px] text-outline">
                Banaras Hindu University
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="px-5 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
            >
              Sign In
            </a>
            <a
              href="/register"
              className="px-5 py-2 text-sm font-medium text-on-primary bg-primary hover:bg-primary-dark rounded-lg transition-colors shadow-sm"
            >
              Register
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="flex-1 flex items-center justify-center relative overflow-hidden pt-16">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/8 to-tertiary/5" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-secondary/8 to-primary/3" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-radial from-primary/3 to-transparent" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold mb-8 animate-fade-in">
            <span className="material-symbols-rounded text-[16px]">
              verified
            </span>
            Official University Portal
          </div>

          <h1
            className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight animate-fade-in"
            style={{
              fontFamily: "var(--font-serif)",
              animationDelay: "0.1s",
              animationFillMode: "backwards",
            }}
          >
            Institutional Email
            <br />
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              Registration Portal
            </span>
          </h1>

          <p
            className="text-lg text-outline max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in"
            style={{ animationDelay: "0.2s", animationFillMode: "backwards" }}
          >
            Apply for your official <strong>@bhu.ac.in</strong> email account.
            Fully digital, paperless workflow with automated provisioning via
            Google Workspace.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in"
            style={{ animationDelay: "0.3s", animationFillMode: "backwards" }}
          >
            <a
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-on-primary font-semibold rounded-xl hover:bg-primary-dark transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              <span className="material-symbols-rounded text-[20px]">
                person_add
              </span>
              Register Now
            </a>
            <a
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary/5 transition-all duration-200"
            >
              <span className="material-symbols-rounded text-[20px]">
                login
              </span>
              Sign In
            </a>
          </div>

          {/* Feature Cards */}
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-20 animate-fade-in"
            style={{ animationDelay: "0.4s", animationFillMode: "backwards" }}
          >
            {[
              {
                icon: "description",
                title: "Digital Application",
                desc: "Submit your application online with document upload and real-time tracking.",
                color: "primary",
              },
              {
                icon: "verified_user",
                title: "Multi-Level Approval",
                desc: "Department HOD and CC Admin review pipeline ensures proper verification.",
                color: "secondary",
              },
              {
                icon: "speed",
                title: "Auto Provisioning",
                desc: "Approved accounts are automatically provisioned on Google Workspace.",
                color: "tertiary",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-surface rounded-2xl border border-outline-variant p-6 text-left hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-${feature.color}-container flex items-center justify-center mb-4`}
                >
                  <span
                    className={`material-symbols-rounded text-[24px] text-${feature.color}`}
                  >
                    {feature.icon}
                  </span>
                </div>
                <h3 className="font-bold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-outline leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-outline-variant py-6 px-6 text-center">
        <p className="text-xs text-outline">
          © {new Date().getFullYear()} Banaras Hindu University — Computer
          Centre. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
