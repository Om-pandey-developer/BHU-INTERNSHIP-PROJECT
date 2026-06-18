"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Turnstile, TurnstileInstance } from "@marsidev/react-turnstile";
import api from "@/lib/axios";
import { useAuthStore } from "@/lib/store";
import Button from "@/components/Button";
import Input from "@/components/Input";
import PasswordStrength from "@/components/PasswordStrength";

// Login page for the BHU Email Portal.
const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
  "1x00000000000000000000AA"; // Cloudflare test key (always passes)

type Phase = "LOGIN" | "FORGOT_EMAIL" | "FORGOT_OTP" | "RESET_PASSWORD";

const PHASE_CONFIG: Record<Phase, { step: number; label: string; icon: string }> = {
  LOGIN: { step: 1, label: "Sign In", icon: "login" },
  FORGOT_EMAIL: { step: 2, label: "Enter Email", icon: "mail" },
  FORGOT_OTP: { step: 3, label: "Verify Code", icon: "pin" },
  RESET_PASSWORD: { step: 4, label: "New Password", icon: "lock_reset" },
};

/**
 * Login page for the BHU Email Portal — 4-phase UI:
 *
 * Phase 1 — LOGIN:          Email + password + Turnstile CAPTCHA
 * Phase 2 — FORGOT_EMAIL:   Enter email for password reset
 * Phase 3 — FORGOT_OTP:     6-digit OTP verification
 * Phase 4 — RESET_PASSWORD: Set new password
 */
export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user, hydrate } = useAuthStore();

  // ── Phase state ──
  const [phase, setPhase] = useState<Phase>("LOGIN");

  // ── Login form state ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Forgot password state ──
  const [resetEmail, setResetEmail] = useState("");
  const [resetCaptchaToken, setResetCaptchaToken] = useState<string | null>(null);

  // ── OTP state ──
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [otpSending, setOtpSending] = useState(false);

  // ── Reset password state ──
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordValid, setPasswordValid] = useState(false);

  // ── Common state ──
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // ── Auth redirect ──
  useEffect(() => {
    hydrate();
  }, [hydrate]);

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

  useEffect(() => {
    if (isAuthenticated && user) {
      redirectByRole(user.role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  // ── Countdown timer for OTP resend ──
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // ── Mask email for display ──
  function maskEmail(emailAddr: string): string {
    const [local, domain] = emailAddr.split("@");
    if (!domain) return emailAddr;
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
  }

  const handlePasswordValidChange = useCallback((isValid: boolean) => {
    setPasswordValid(isValid);
  }, []);

  // ══════════════════════════════════════
  //  Phase 1: LOGIN
  // ══════════════════════════════════════
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }

    try {
      const { data } = await api.post("/auth/login", {
        email,
        password,
        captchaToken: captchaToken || undefined,
      });
      if (data.success) {
        login(data.data.user, data.data.accessToken, data.data.refreshToken);
        redirectByRole(data.data.user.role);
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || "Login failed. Please check your credentials."
      );

      // Auto-reset form after 5 seconds to improve UX
      errorTimeoutRef.current = setTimeout(() => {
        setError("");
        setEmail("");
        setPassword("");
        setCaptchaToken(null);
        turnstileRef.current?.reset();
      }, 5000);
    } finally {
      setLoading(false);
    }
  }

  // ══════════════════════════════════════
  //  Phase 2: FORGOT_EMAIL → send OTP
  // ══════════════════════════════════════
  async function handleSendResetOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOtpSending(true);

    try {
      await api.post("/auth/forgot-password", {
        email: resetEmail,
        captchaToken: resetCaptchaToken || undefined,
      });
      setPhase("FORGOT_OTP");
      setCountdown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || "Failed to send reset code. Please try again."
      );
    } finally {
      setOtpSending(false);
    }
  }

  // ── OTP input handling (same pattern as register page) ──
  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newValues = [...otpValues];
    newValues[index] = digit;
    setOtpValues(newValues);
    setError("");
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newValues = [...otpValues];
    for (let i = 0; i < 6; i++) {
      newValues[i] = pasted[i] || "";
    }
    setOtpValues(newValues);
    const lastIdx = Math.min(pasted.length, 5);
    otpRefs.current[lastIdx]?.focus();
  }

  // Auto-advance to Phase 4 when OTP is complete
  const otpFull = otpValues.join("").length === 6;
  useEffect(() => {
    if (phase === "FORGOT_OTP" && otpFull) {
      // Small delay so user sees the last digit fill in
      const timer = setTimeout(() => {
        setPhase("RESET_PASSWORD");
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [phase, otpFull]);

  // ── Resend OTP ──
  async function handleResendOtp() {
    if (countdown > 0) return;
    setError("");
    setOtpSending(true);
    try {
      await api.post("/auth/forgot-password", {
        email: resetEmail,
        captchaToken: resetCaptchaToken || undefined,
      });
      setCountdown(60);
      setOtpValues(["", "", "", "", "", ""]);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || "Failed to resend code. Please try again."
      );
    } finally {
      setOtpSending(false);
    }
  }

  // ══════════════════════════════════════
  //  Phase 4: RESET_PASSWORD
  // ══════════════════════════════════════
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!passwordValid) {
      setError("Password does not meet all requirements.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", {
        email: resetEmail,
        otp: otpValues.join(""),
        newPassword,
      });

      if (data.success || data.data?.message) {
        setResetSuccess(true);
        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          setResetSuccess(false);
          setPhase("LOGIN");
          // Reset all forgot password state
          setResetEmail("");
          setResetCaptchaToken(null);
          setOtpValues(["", "", "", "", "", ""]);
          setNewPassword("");
          setConfirmPassword("");
          setPasswordValid(false);
          setError("");
        }, 3000);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || "Password reset failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Navigate between phases ──
  function goToForgotPassword() {
    setError("");
    setPhase("FORGOT_EMAIL");
  }

  function goBackToLogin() {
    setError("");
    setPhase("LOGIN");
    setResetEmail("");
    setResetCaptchaToken(null);
    setOtpValues(["", "", "", "", "", ""]);
    setNewPassword("");
    setConfirmPassword("");
  }

  function goBackToEmail() {
    setError("");
    setPhase("FORGOT_EMAIL");
    setOtpValues(["", "", "", "", "", ""]);
  }

  // ── Reset success screen ──
  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="max-w-md w-full text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-success-container flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-rounded text-[40px] text-success">
              check_circle
            </span>
          </div>
          <h2
            className="text-2xl font-bold text-foreground mb-3"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Password Reset Successful!
          </h2>
          <p className="text-sm text-outline mb-6">
            Your password has been updated. Redirecting you to the login page...
          </p>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // ── Current phase config for step indicator ──
  const currentPhaseConfig = PHASE_CONFIG[phase];

  return (
    // ---PAGE CONTAINER---
    <div className="min-h-screen flex">
      {/* ── Left Panel: Branding ── */}
      <div className="hidden lg:flex lg:w-5/11  relative overflow-hidden">
        {/* Background image*/}
        <Image
          src="/BHU PTMADAN.jpg"
          alt="BHU Campus Buildings"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-end px-14 pb-15 text-white">
          {/* University Emblem */}
          <h1
            className="text-4xl font-bold mb-3 leading-tight text-[50px]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Banaras Hindu
            <br />
            University
          </h1>
          <p className="text-lg text-white/90 mb-8 text-[20px]">Capital of Knowledge</p>

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

          {/* Step indicator — shows current phase for forgot password flow */}
          {phase !== "LOGIN" && (
            <div className="mt-10 flex items-center gap-2 animate-fade-in">
              {(["FORGOT_EMAIL", "FORGOT_OTP", "RESET_PASSWORD"] as Phase[]).map(
                (p, i) => {
                  const stepNum = i + 1;
                  const isActive = currentPhaseConfig.step - 1 >= stepNum;
                  const isCurrent = currentPhaseConfig.step - 1 === stepNum;
                  return (
                    <React.Fragment key={p}>
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${isCurrent
                          ? "bg-white text-primary scale-110"
                          : isActive
                            ? "bg-white/40 text-white"
                            : "bg-white/15 text-white/40"
                          }`}
                      >
                        {isActive && !isCurrent ? (
                          <span className="material-symbols-rounded text-[16px]">check</span>
                        ) : (
                          stepNum
                        )}
                      </div>
                      {i < 2 && (
                        <div
                          className={`h-0.5 w-8 rounded transition-all duration-300 ${isActive ? "bg-white/60" : "bg-white/15"
                            }`}
                        />
                      )}
                    </React.Fragment>
                  );
                }
              )}
              <span className="text-sm text-white/60 ml-2">
                {PHASE_CONFIG[phase].label}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Panel: Forms ── */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 bg-white relative overflow-hidden overflow-y-auto min-h-screen">
        {/* logo watermark */}
        <Image
          src="/BHUlogo.png"
          alt=""
          width={850}
          height={800}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[full] h-[full] object-contain opacity-[0.4] pointer-events-none select-none"
        />
        <div className="w-full max-w-md animate-fade-in">

          {/* Mobile branding */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center overflow-hidden">
              <Image src="/favicon.ico" alt="BHU Logo" width={40} height={40} className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg">BHU Email Portal</h2>
              <p className="text-xs text-outline">Banaras Hindu University</p>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              PHASE 1: LOGIN — Email + Password + CAPTCHA
             ══════════════════════════════════════════ */}
          {phase === "LOGIN" && (
            <div className="animate-fade-in" key="login">
              <div className="mb-8">
                <h2
                  className="text-3xl sm:text-4xl font-bold text-foreground mb-2"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Welcome back
                </h2>
                <p className="text-sm sm:text-base text-outline">
                  Sign in with your alternate email to access the portal
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
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

                {/* Cloudflare Turnstile CAPTCHA */}
                <div className="flex justify-center opacity-[0.6]">
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={(token) => setCaptchaToken(token)}
                    onError={() => setCaptchaToken(null)}
                    onExpire={() => setCaptchaToken(null)}
                    options={{
                      theme: "light",
                      size: "normal",
                    }}
                  />
                </div>

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
                  disabled={!captchaToken}
                >
                  Sign In
                </Button>
              </form>

              {/* Forgot Password link */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={goToForgotPassword}
                  className="text-sm text-primary hover:text-primary-dark transition-colors cursor-pointer font-medium"
                >
                  Forgot your password?
                </button>
              </div>

              <div className="mt-4 text-center">
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
          )}

          {/* ══════════════════════════════════════════
              PHASE 2: FORGOT_EMAIL — Enter email for reset
             ══════════════════════════════════════════ */}
          {phase === "FORGOT_EMAIL" && (
            <div className="animate-fade-in" key="forgot-email">
              <div className="mb-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-rounded text-[32px] text-on-primary-container">
                    lock_reset
                  </span>
                </div>
                <h2
                  className="text-2xl font-bold text-foreground mb-2"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Forgot Password?
                </h2>
                <p className="text-sm text-outline">
                  Enter your registered alternate email and we&apos;ll send you a
                  verification code to reset your password.
                </p>
              </div>

              <form onSubmit={handleSendResetOtp} className="space-y-5">
                <Input
                  label="Registered Email Address"
                  icon="mail"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => {
                    setResetEmail(e.target.value);
                    setError("");
                  }}
                  required
                  autoComplete="email"
                />

                {/* Turnstile CAPTCHA */}
                <div className="flex justify-center">
                  <Turnstile
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={(token) => setResetCaptchaToken(token)}
                    onError={() => setResetCaptchaToken(null)}
                    onExpire={() => setResetCaptchaToken(null)}
                    options={{
                      theme: "light",
                      size: "normal",
                    }}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-error animate-fade-in">
                    <span className="material-symbols-rounded text-[18px]">error</span>
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  loading={otpSending}
                  icon="send"
                  className="w-full"
                  size="lg"
                  disabled={!resetEmail.trim() || !resetCaptchaToken}
                >
                  Send Reset Code
                </Button>
              </form>

              <button
                type="button"
                onClick={goBackToLogin}
                className="w-full mt-4 text-sm text-outline hover:text-foreground transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-rounded text-[16px]">
                  arrow_back
                </span>
                Back to Sign In
              </button>

              {/* Footer */}
              <div className="mt-10 pt-6 border-t border-outline-variant text-center">
                <p className="text-xs text-outline">
                  © {new Date().getFullYear()} Banaras Hindu University — Computer Centre
                </p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
              PHASE 3: FORGOT_OTP — 6-digit OTP verification
             ══════════════════════════════════════════ */}
          {phase === "FORGOT_OTP" && (
            <div className="animate-fade-in" key="forgot-otp">
              <div className="mb-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-rounded text-[32px] text-on-primary-container">
                    mark_email_read
                  </span>
                </div>
                <h2
                  className="text-2xl font-bold text-foreground mb-2"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Enter Reset Code
                </h2>
                <p className="text-sm text-outline">
                  We sent a 6-digit code to{" "}
                  <span className="font-semibold text-foreground">
                    {maskEmail(resetEmail)}
                  </span>
                </p>
              </div>

              <div className="space-y-6">
                {/* OTP input boxes */}
                <div className="flex justify-center gap-2 sm:gap-3">
                  {otpValues.map((val, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-lg border-2 border-outline-variant bg-surface text-foreground
                        focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                        transition-all duration-200 hover:border-outline"
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>

                {/* Resend countdown */}
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-outline">
                      Resend code in{" "}
                      <span className="font-semibold text-primary">
                        {countdown}s
                      </span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={otpSending}
                      className="text-sm text-primary hover:text-primary-dark font-medium transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {otpSending ? "Sending..." : "Resend reset code"}
                    </button>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-error animate-fade-in">
                    <span className="material-symbols-rounded text-[18px]">error</span>
                    {error}
                  </div>
                )}

                {/* Progress indicator while auto-advancing */}
                {otpFull && (
                  <div className="flex justify-center animate-fade-in">
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <span className="material-symbols-rounded text-[18px] animate-spin">
                        progress_activity
                      </span>
                      Verifying...
                    </div>
                  </div>
                )}

                {/* Back to email entry */}
                <button
                  type="button"
                  onClick={goBackToEmail}
                  className="w-full text-sm text-outline hover:text-foreground transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-rounded text-[16px]">
                    arrow_back
                  </span>
                  Back to edit email
                </button>
              </div>

              {/* Footer */}
              <div className="mt-10 pt-6 border-t border-outline-variant text-center">
                <p className="text-xs text-outline">
                  © {new Date().getFullYear()} Banaras Hindu University — Computer Centre
                </p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
              PHASE 4: RESET_PASSWORD — New password form
             ══════════════════════════════════════════ */}
          {phase === "RESET_PASSWORD" && (
            <div className="animate-fade-in" key="reset-password">
              <div className="mb-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-rounded text-[32px] text-on-primary-container">
                    lock_reset
                  </span>
                </div>
                <h2
                  className="text-2xl font-bold text-foreground mb-2"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Set New Password
                </h2>
                <p className="text-sm text-outline">
                  Choose a strong password for your account
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-5">
                <Input
                  label="New Password"
                  icon="lock"
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError("");
                  }}
                  required
                  autoComplete="new-password"
                />

                <Input
                  label="Confirm New Password"
                  icon="lock"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  required
                  autoComplete="new-password"
                />

                {/* Password strength checklist */}
                <PasswordStrength
                  password={newPassword}
                  onValidChange={handlePasswordValidChange}
                />

                {/* Passwords mismatch warning */}
                {confirmPassword && newPassword !== confirmPassword && (
                  <div className="flex items-center gap-2 text-sm text-error animate-fade-in">
                    <span className="material-symbols-rounded text-[16px]">warning</span>
                    Passwords do not match
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-error animate-fade-in">
                    <span className="material-symbols-rounded text-[18px]">error</span>
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  loading={loading}
                  icon="lock_reset"
                  className="w-full"
                  size="lg"
                  disabled={
                    !passwordValid ||
                    !confirmPassword ||
                    newPassword !== confirmPassword
                  }
                >
                  Reset Password
                </Button>
              </form>

              <button
                type="button"
                onClick={goBackToLogin}
                className="w-full mt-4 text-sm text-outline hover:text-foreground transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-rounded text-[16px]">
                  arrow_back
                </span>
                Back to Sign In
              </button>

              {/* Footer */}
              <div className="mt-10 pt-6 border-t border-outline-variant text-center">
                <p className="text-xs text-outline">
                  © {new Date().getFullYear()} Banaras Hindu University — Computer Centre
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
