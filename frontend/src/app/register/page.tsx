"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/lib/store";
import Button from "@/components/Button";
import Input from "@/components/Input";



/**
 * Registration page for new users to create an account on the portal.
 * After successful registration, user is redirected to login.
 */
export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, hydrate } = useAuthStore();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    alternateEmail: "",
    password: "",
    confirmPassword: "",
    departmentId: "",
  });
  const [departments] = useState<
    { id: string; name: string; code: string }[]
  >([
    { id: "dept-cs", name: "Computer Science", code: "COMP_SCI" },
    { id: "dept-phy", name: "Physics", code: "PHYSICS" },
    { id: "dept-chem", name: "Chemistry", code: "CHEMISTRY" },
    { id: "dept-math", name: "Mathematics", code: "MATHEMATICS" },
    { id: "dept-bio", name: "Biological Sciences", code: "BIO_SCI" },
    { id: "dept-eng", name: "English", code: "ENGLISH" },
    { id: "dept-hist", name: "History", code: "HISTORY" },
    { id: "dept-eco", name: "Economics", code: "ECONOMICS" },
    { id: "dept-law", name: "Law", code: "LAW" },
    { id: "dept-med", name: "Medical Sciences", code: "MEDICAL" },
    { id: "dept-edu", name: "Education", code: "EDUCATION" },
    { id: "dept-mech", name: "Mechanical Engineering", code: "MECH_ENG" },
    { id: "dept-civil", name: "Civil Engineering", code: "CIVIL_ENG" },
    { id: "dept-elec", name: "Electrical Engineering", code: "ELEC_ENG" },
  ]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard/applicant");
    }
  }, [isAuthenticated, router]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
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
      });

      if (data.success) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 2500);
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

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
    <div className="min-h-screen flex">
      {/* ── Left Panel: Branding ── */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-primary via-primary-dark to-on-primary-container relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute top-1/4 right-1/3 w-48 h-48 rounded-full bg-white/8" />

        <div className="relative z-10 flex flex-col justify-center px-14 text-white">
          <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-8 shadow-lg">
            <span className="material-symbols-rounded text-[40px]">
              school
            </span>
          </div>

          <h1
            className="text-4xl font-bold mb-3 leading-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Create Your
            <br />
            Account
          </h1>
          <p className="text-lg text-white/70 mb-8">
            Join the BHU Email Portal
          </p>

          <div className="space-y-4 text-white/80">
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-[20px] text-white/50">
                schedule
              </span>
              <span>Takes less than 2 minutes</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-[20px] text-white/50">
                lock
              </span>
              <span>Your data is secured with encryption</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-[20px] text-white/50">
                tracking_changes
              </span>
              <span>Track your application in real time</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Registration Form ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-lg animate-fade-in">
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <span className="material-symbols-rounded text-[24px] text-white">
                school
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

          <div className="mb-8">
            <h2
              className="text-2xl font-bold text-foreground mb-2"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Create an Account
            </h2>
            <p className="text-sm text-outline">
              Fill in your details to register on the portal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                icon="person"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                required
                autoComplete="given-name"
              />
              <Input
                label="Last Name"
                icon="person"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                required
                autoComplete="family-name"
              />
            </div>

            <Input
              label="Alternate Email"
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
                className="w-full rounded-lg border-2 border-outline-variant bg-surface px-4 py-3 text-sm text-foreground pl-11 appearance-none hover:border-outline focus:border-primary focus:outline-none transition-colors cursor-pointer"
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
                label="Password"
                icon="lock"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
              <Input
                label="Confirm Password"
                icon="lock"
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
            </div>

            {/* Password hint */}
            <p className="text-xs text-outline flex items-center gap-1.5">
              <span className="material-symbols-rounded text-[14px]">
                info
              </span>
              Password must be at least 8 characters long
            </p>

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
            >
              Create Account
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

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-outline-variant text-center">
            <p className="text-xs text-outline">
              © {new Date().getFullYear()} Banaras Hindu University — Computer
              Centre
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
