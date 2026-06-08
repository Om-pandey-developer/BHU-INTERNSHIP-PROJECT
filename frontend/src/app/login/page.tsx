"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/lib/store";
import Button from "@/components/Button";
import Input from "@/components/Input";

/**
 * Login page for the BHU Email Portal.
 *
 * Features:
 * - Email + password authentication
 * - Role-based redirect after login
 * - Animated heritage-themed layout
 * - Error handling with user-friendly messages
 */
export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user, hydrate } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      redirectByRole(user.role);
    }
  }, [isAuthenticated, user]);

  function redirectByRole(role: string) {
    switch (role) {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.success) {
        login(data.data.user, data.data.accessToken, data.data.refreshToken);
        redirectByRole(data.data.user.role);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel: Branding ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary-dark to-on-primary-container relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-white/8" />

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          {/* University Emblem placeholder */}
          <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-8 shadow-lg">
            <span className="material-symbols-rounded text-[40px]">school</span>
          </div>

          <h1
            className="text-4xl font-bold mb-3 leading-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Banaras Hindu
            <br />
            University
          </h1>
          <p className="text-lg text-white/70 mb-8">Capital of Knowledge</p>

          <div className="space-y-4 text-white/80">
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-[20px] text-white/50">
                mail
              </span>
              <span>Institutional Email Registration Portal</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-[20px] text-white/50">
                verified_user
              </span>
              <span>Automated @bhu.ac.in Provisioning</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-[20px] text-white/50">
                speed
              </span>
              <span>Fast, Paperless Digital Workflow</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Login Form ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <span className="material-symbols-rounded text-[24px] text-white">
                school
              </span>
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg">BHU Email Portal</h2>
              <p className="text-xs text-outline">Banaras Hindu University</p>
            </div>
          </div>

          <div className="mb-8">
            <h2
              className="text-2xl font-bold text-foreground mb-2"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Welcome back
            </h2>
            <p className="text-sm text-outline">
              Sign in with your alternate email to access the portal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email Address"
              icon="mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              icon="lock"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-error animate-fade-in">
                <span className="material-symbols-rounded text-[18px]">error</span>
                {error}
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              icon="login"
              className="w-full"
              size="lg"
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/register"
              className="text-sm text-primary hover:text-primary-dark transition-colors"
            >
              Don&apos;t have an account?{" "}
              <span className="font-semibold">Register here</span>
            </a>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-outline-variant text-center">
            <p className="text-xs text-outline">
              © {new Date().getFullYear()} Banaras Hindu University — Computer Centre
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
