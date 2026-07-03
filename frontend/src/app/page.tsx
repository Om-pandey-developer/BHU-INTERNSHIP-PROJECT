"use client";

import React, { useEffect } from "react";
import Image from "next/image";
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
    // ── 1. PAGE CONTAINER ──
    // The 'page-home' class ties to globals.css for specific backgrounds/colors.
    // 'min-h-screen flex flex-col' makes it a full-height flex column.
    // 'bg-background' applies the CSS variable for the base color.
    <div className="home-page min-h-screen flex flex-col ">

      {/* ── 2. NAVIGATION BAR ── 
          'fixed z-50' keeps it on top. 'backdrop-blur-md' gives a glass effect. */}

      <nav className="site-header fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-amber-500/30">
        <div className="max-w-6xl mx-auto px-0 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/favicon.ico"
              alt="BHU Logo"
              width={40}
              height={40}
              className="rounded-xl w-auto h-auto"
              priority
            />
            {/* <div className="w-10\ h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <span className="material-symbols-rounded text-[204px] text-blue">
                school
              </span>
            </div> */}

            <div>
              <h1 className="font-bold text-[15px] text-amber-900">
                BHU Email Registration Portal
              </h1>
              <p className="text-[10px] text-amber-600">
                Banaras Hindu University
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2.5">
            <a
              href="/login"
              className="px-5 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors border border-amber-500/40"
            >
              Sign In
            </a>
            <a
              href="/register"
              className="px-5 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors shadow-sm"
            >
              Register
            </a>
          </div>
        </div>
      </nav>

      {/* ── 3. HERO SECTION ──
          'flex-1' makes it take the remaining height. 
          'relative overflow-hidden' contains the decorative background gradients. */}
      <section className="flex-1 flex items-center justify-center relative overflow-hidden pt-32 sm:pt-24 md:pt-20">

        {/* Background Video and decorative overlay */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover "
          >
            <source src="/BHUTour.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/40" />
          {/* <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/8 to-tertiary/5 mix-blend-overlay" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-secondary/8 to-primary/3 mix-blend-overlay" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-radial from-primary/3 to-transparent mix-blend-overlay" /> */}
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-6 pb-16 sm:py-20 text-center">
          {/* Badge */}
          {/* <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold mb-8 animate-fade-in">
            <span className="material-symbols-rounded text-[16px]">
              verified
            </span>
            Official University Portal
          </div> */}

          <h1
            className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight animate-fade-in drop-shadow-lg"
            style={{
              fontFamily: "var(--font-serif)",
              animationDelay: "0.1s",
              animationFillMode: "backwards",
            }}
          >
            Institutional Email
            <br />
            <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
              Registration Portal
            </span>
          </h1>

          <p
            className="text-lg text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in"
            style={{ animationDelay: "0.2s", animationFillMode: "backwards" }}
          >
            Apply for your official <a href="https://www.bhu.ac.in/Site/Home/1_2_16_Main-Site" target="_blank" rel="noopener noreferrer" className="text-amber-300 font-bold hover:underline">@bhu.ac.in</a> email account.
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
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-700 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              <span className="material-symbols-rounded text-[25px]">
                person_add
              </span>
              Register Now
            </a>
            <a
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border-2 border-white/80 text-white font-semibold rounded-xl hover:bg-white/40 transition-all duration-200"
            >
              <span className="material-symbols-rounded text-[25px]">
                login
              </span>
              Sign In
            </a>
          </div>



          {/* ── 4. FEATURE CARDS ── 
              'grid-cols-1 md:grid-cols-3' creates a responsive 3-column layout. */}
          <div
            className=" grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 animate-fade-in "
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
                className="bg-black/12 backdrop-blur-sm rounded-2xl border border-white/10 p-6 text-left hover:shadow-lg hover:-translate-y-1 transition-all duration-300 hover:border-amber-500/30"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4`}
                >
                  <span
                    className={`material-symbols-rounded text-[24px] text-amber-400`}
                  >
                    {feature.icon}
                  </span>
                </div>
                <h3 className="font-bold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. FOOTER ── */}
      <footer className="site-footer border-t border-white/20 bg-blue-900 backdrop-blur-sm py-2 px-6 text-center opacity-90 ">
        <p className="text-[8px] sm:text-[14px] text-amber-200">
          © {new Date().getFullYear()} Banaras Hindu University — Computer
          Centre. All rights reserved.
          <br></br>
          Developed by <b>Hari Prakash Sharma, Om Pandey, Avnish Srivastava </b>under the guidance of<b> Dr. Ramesh Singh Yadav</b>
        </p>
      </footer>
    </div>
  );
}
1
