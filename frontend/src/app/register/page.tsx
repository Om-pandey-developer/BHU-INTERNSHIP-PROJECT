"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Turnstile } from "@marsidev/react-turnstile";
import api from "@/lib/axios";
import { useAuthStore } from "@/lib/store";
import Button from "@/components/Button";
import Input from "@/components/Input";
import PasswordStrength from "@/components/PasswordStrength";

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
  "1x00000000000000000000AA"; // Cloudflare test key (always passes)

/**
 * Registration page with 2-phase flow:
 *
 * Phase 1 (FORM): Fill details → password strength → honeypot → Turnstile → "Send OTP"
 * Phase 2 (OTP):  Enter 6-digit OTP → "Create Account" → redirect to login
 */
export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, hydrate } = useAuthStore();

  // ── Form state ──
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    alternateEmail: "",
    password: "",
    confirmPassword: "",
    departmentId: "",
  });
  const [departments, setDepartments] = useState<
    { id: string; name: string; code: string }[]
  >([]);

  // ── Phase & OTP state ──
  const [phase, setPhase] = useState<"FORM" | "OTP">("FORM");
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Validation state ──
  const [passwordValid, setPasswordValid] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

  // ── Loading & feedback state ──
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // ── Auth redirect ──
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard/applicant");
    }
  }, [isAuthenticated, router]);

  // ── Fetch departments ──
  useEffect(() => {
    async function fetchDepartments() {
      try {
        const { data } = await api.get("/departments");
        const deptList = data?.data ?? data;
        if (Array.isArray(deptList) && deptList.length > 0) {
          setDepartments(deptList);
        } else {
          throw new Error("Empty department list");
        }
      } catch {
        setDepartments([
          { id: "dept-cs", name: "Computer Science", code: "COMP_SCI" },
          { id: "dept-phy", name: "Physics", code: "PHYSICS" },
          { id: "dept-chem", name: "Chemistry", code: "CHEMISTRY" },
          { id: "dept-math", name: "Mathematics", code: "MATHEMATICS" },
          { id: "dept-bio", name: "Biological Sciences", code: "BIO_SCI" },
          { id: "dept-eng", name: "English", code: "ENGLISH" },
          { id: "dept-hist", name: "History", code: "HISTORY" },
          { id: "dept-eco", name: "Economics", code: "ECONOMICS" },
          { id: "dept-law", name: "Law", code: "LAW" },
          { id: "dept-med", name: "Medical Sciences", code: "MED_SCI" },
          { id: "dept-edu", name: "Education", code: "EDUCATION" },
          { id: "dept-mech", name: "Mechanical Engineering", code: "MECH_ENG" },
          { id: "dept-civil", name: "Civil Engineering", code: "CIVIL_ENG" },
          { id: "dept-elec", name: "Electrical Engineering", code: "ELEC_ENG" },
          { id: "dept-arts", name: "Faculty of Arts", code: "ARTS" },
          { id: "dept-soc", name: "Faculty of Social Sciences", code: "SOCIAL_SCIENCES" },
          { id: "dept-com", name: "Faculty of Commerce", code: "COMMERCE" },
          { id: "dept-agri", name: "Institute of Agricultural Sciences", code: "AGRI_SCI" },
          { id: "dept-env", name: "Institute of Environment & Sustainable Development", code: "IESD" },
        ]);
      }
    }
    fetchDepartments();
  }, []);

  // ── Countdown timer for OTP resend ──
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // ── Handlers ──
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    let value = e.target.value;
    if (e.target.name === "firstName" || e.target.name === "lastName") {
      value = value.replace(/[^a-zA-Z\s]/g, "");
    }
    setForm((prev) => ({ ...prev, [e.target.name]: value }));
    setError("");
  }

  const handlePasswordValidChange = useCallback((isValid: boolean) => {
    setPasswordValid(isValid);
  }, []);

  // Mask email for display: s****t@gmail.com
  function maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
  }

  // Check if form is complete enough to send OTP
  const canSendOtp =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.alternateEmail.trim() &&
    form.password &&
    form.confirmPassword &&
    form.password === form.confirmPassword &&
    passwordValid &&
    captchaToken &&
    !honeypot;

  // ── Phase 1: Send OTP ──
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Honeypot check (silent reject)
    if (honeypot) {
      setError("Registration failed. Please try again.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!passwordValid) {
      setError("Password does not meet all requirements.");
      return;
    }

    setOtpSending(true);
    try {
      await api.post("/auth/send-otp", {
        email: form.alternateEmail,
        captchaToken,
      });

      setPhase("OTP");
      setCountdown(60);
      // Focus first OTP input after transition
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        "Failed to send OTP. Please try again."
      );
    } finally {
      setOtpSending(false);
    }
  }

  // ── OTP input handling ──
  function handleOtpChange(index: number, value: string) {
    // Only accept digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newValues = [...otpValues];
    newValues[index] = digit;
    setOtpValues(newValues);
    setError("");

    // Auto-focus next input
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
    // Focus the last filled input or the first empty one
    const lastIdx = Math.min(pasted.length, 5);
    otpRefs.current[lastIdx]?.focus();
  }

  // ── Resend OTP ──
  async function handleResendOtp() {
    if (countdown > 0) return;
    setError("");
    setOtpSending(true);
    try {
      await api.post("/auth/send-otp", {
        email: form.alternateEmail,
        captchaToken,
      });
      setCountdown(60);
      setOtpValues(["", "", "", "", "", ""]);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        "Failed to resend OTP. Please try again."
      );
    } finally {
      setOtpSending(false);
    }
  }

  // ── Phase 2: Create Account ──
  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const otp = otpValues.join("");
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/users/register", {
        firstName: form.firstName,
        lastName: form.lastName,
        alternateEmail: form.alternateEmail,
        password: form.password,
        departmentId: form.departmentId || undefined,
        otp,
      });

      if (data.success) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 2500);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ──
  if (success) {
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
            Registration Successful!
          </h2>
          <p className="text-sm text-outline mb-6">
            Your account has been created. Redirecting you to the login
            page...
          </p>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    // ---PAGE CONTAINER---
    <div className="page-register min-h-screen flex">
      {/* ── Left Panel: Branding ── */}
      <div className="hidden lg:flex lg:w-5/11 relative overflow-hidden bg-black">
        {/* Background image */}
        <img
          src="/buldings.jpg"
          alt="BHU Campus Buildings"
          className="absolute inset-0 w-100% h-full object-cover "
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent pointer-events-none" />

        {/* Dark overlay for text readability */}
        <div className="relative z-10 flex flex-col justify-end px-14 pb-14 text-black">
          <p className="text-lg text- text-white/95 mb-8 text-[40px] ">
            Join the BHU Email Portal
          </p>
        </div>
      </div>

      {/* ── REGISTRATION FORM PANEL (Right side) ──*/}
      <div className="flex-1 flex items-center justify-center p-8 bg-background relative overflow-hidden">
        {/* BHU Logo Watermark */}
        <Image
          src="/BHUlogo.png"
          alt=""
          width={850}
          height={800}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[auto] h-[auto] object-contain opacity-[0.4] pointer-events-none select-none"
        />
        <div className="w-full max-w-lg animate-fade-in relative z-10">
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <span className="material-symbols-rounded text-[24px] text-white">
                <Image src="/favicon.ico" alt="BHU Logo" width={40} height={40} className="rounded-xl" />
              </span>
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg">
                BHU Email Portal
              </h2>
              <p className="text-xs text-outline">
                Banaras Hindu University
              </p>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              PHASE 1: Registration Form + Send OTP
             ══════════════════════════════════════════ */}
          {phase === "FORM" && (
            <div className="animate-fade-in">
              <div className="mb-8">
                <h2
                  className="text-2xl font-bold text-foreground mb-2 text-[40px]"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Create an Account
                </h2>
                <p className="text-sm text-outline text black">
                  Fill in your details to register on the portal
                </p>
              </div>

              {/* ── 4. REGISTRATION FORM ── */}
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name *"
                    icon="person"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    autoComplete="given-name"
                  />
                  <Input
                    label="Last Name *"
                    icon="person"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                    autoComplete="family-name"
                  />
                </div>

                <Input
                  label="Alternate Email *"
                  icon="mail"
                  type="email"
                  name="alternateEmail"
                  value={form.alternateEmail}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />

                {/* Department selector */}
                <div className="relative">
                  <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline z-10">
                    apartment
                  </span>
                  <select
                    name="departmentId"
                    value={form.departmentId}
                    onChange={handleChange}
                    className="w-full rounded-lg border-2 border-outline-variant bg-white/90 px-4 py-3 text-sm text-black/60 pl-11 appearance-none hover:border-outline focus:border-primary focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="">Select Department (Optional)</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-rounded absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-outline pointer-events-none">
                    expand_more
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Password *"
                    icon="lock"
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                  />
                  <Input
                    label="Confirm Password *"
                    icon="lock"
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                  />
                </div>

                {/* Password strength checklist */}
                <PasswordStrength
                  password={form.password}
                  onValidChange={handlePasswordValidChange}
                />

                {/* Honeypot field — hidden from real users */}
                <div
                  style={{
                    position: "absolute",
                    left: "-9999px",
                    opacity: 0,
                    height: 0,
                    overflow: "hidden",
                  }}
                  aria-hidden="true"
                >
                  <label htmlFor="website">Website</label>
                  <input
                    type="text"
                    id="website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                {/* Cloudflare Turnstile CAPTCHA */}
                <div className="flex justify-center opacity-[0.6]">
                  <Turnstile
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
                    <span className="material-symbols-rounded text-[18px]">
                      error
                    </span>
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  loading={otpSending}
                  icon="send"
                  className="w-full "
                  size="lg"
                  disabled={!canSendOtp}
                >
                  Send Verification Code
                </Button>
              </form>

              <div className="mt-6 text-center">
                <a
                  href="/login"
                  className="text-sm text-primary hover:text-primary-dark transition-colors"
                >
                  Already have an account?{" "}
                  <span className="font-semibold">Sign in</span>
                </a>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
              PHASE 2: OTP Verification
             ══════════════════════════════════════════ */}
          {phase === "OTP" && (
            <div className="animate-fade-in">
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
                  Verify Your Email
                </h2>
                <p className="text-sm text-outline">
                  We sent a 6-digit code to{" "}
                  <span className="font-semibold text-foreground">
                    {maskEmail(form.alternateEmail)}
                  </span>
                </p>
              </div>

              <form onSubmit={handleCreateAccount} className="space-y-6">
                {/* OTP input boxes */}
                <div className="flex justify-center gap-3">
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
                      className="w-12 h-14 text-center text-xl font-bold rounded-lg border-2 border-outline-variant bg-surface text-foreground
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
                      {otpSending ? "Sending..." : "Resend verification code"}
                    </button>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-error animate-fade-in">
                    <span className="material-symbols-rounded text-[18px]">
                      error
                    </span>
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  loading={loading}
                  icon="person_add"
                  className="w-full"
                  size="lg"
                  disabled={otpValues.join("").length !== 6}
                >
                  Create Account
                </Button>

                {/* Go back to edit details */}
                <button
                  type="button"
                  onClick={() => {
                    setPhase("FORM");
                    setOtpValues(["", "", "", "", "", ""]);
                    setError("");
                  }}
                  className="w-full text-sm text-outline hover:text-foreground transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-rounded text-[16px]">
                    arrow_back
                  </span>
                  Back to edit details
                </button>
              </form>
            </div>
          )}

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-outline-variant text-center ">
            <p className="text-xs text-black/50 text-[12px] ">
              © {new Date().getFullYear()} Banaras Hindu University — Computer
              Centre
            </p>
          </div>
        </div>
      </div>
    </div >
  );
}
