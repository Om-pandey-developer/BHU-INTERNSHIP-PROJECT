"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import api from "@/lib/axios";
import { useAuthStore, User } from "@/lib/store";
import Input from "@/components/Input";
import Button from "@/components/Button";

export default function HodLogin() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.success && data.data) {
        const user = data.data.user as User;

        // Strict role check for HOD
        if (user.role !== "HOD") {
          setError("Access Denied. This portal is strictly for Department Heads.");
          setLoading(false);
          return;
        }

        login(user, data.data.accessToken, data.data.refreshToken);
        router.push("/dashboard/hod");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message ||
        "Invalid credentials. Please try again."
      );
    } finally {
      if (error) { // only set to false if we're not redirecting
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface relative overflow-hidden">
      {/* Background styling for HOD specific branding */}
      <div className="absolute top-0 left-0 w-full h-[45vh] bg-gradient-to-b from-secondary-container/50 to-surface -z-10" />
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-tertiary/10 rounded-full blur-[80px] -z-10" />

      <div className="w-full max-w-[1000px] flex rounded-3xl overflow-hidden shadow-xl bg-surface border border-outline-variant m-4 animate-fade-in">

        {/* Left Side: Branding / Info */}
        <div className="hidden md:flex flex-col justify-between w-[45%] bg-secondary text-on-secondary p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent z-0" />
          <div className="relative z-10 space-y-6">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md mb-8">
              <Image
                src="/bhu-logo.png"
                alt="BHU Logo"
                width={45}
                height={45}
                className="object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold font-serif leading-tight">
              Department Head Portal
            </h1>
            <p className="text-on-secondary/80 text-sm leading-relaxed">
              Securely review, digitally sign, and approve email account
              applications for your department members.
            </p>
          </div>

          <div className="relative z-10 mt-auto pt-12">
            <div className="flex items-center gap-3 text-sm text-on-secondary/70">
              <span className="material-symbols-rounded text-lg">verified_user</span>
              Requires CC Admin provisioning
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-[55%] p-8 md:p-12 lg:p-16 flex flex-col justify-center">
          <div className="md:hidden flex items-center gap-3 mb-8">
            <Image
              src="/BHUlogo.png"
              alt="BHU Logo"
              width={40}
              height={40}
            />
            <h1 className="text-xl font-bold text-secondary font-serif">
              HOD Portal
            </h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              HOD Sign In
            </h2>
            <p className="text-outline text-sm">
              Enter your credentials to access the approval workflow.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              icon="mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your registered email"
            />
            <Input
              label="Password"
              type="password"
              icon="lock"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />

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
              size="lg"
              className="w-full !bg-secondary hover:!bg-secondary/90 !text-on-secondary mt-2"
              loading={loading}
              icon="login"
            >
              Sign In to HOD Dashboard
            </Button>

            <div className="pt-6 text-center text-sm text-outline">
              <Link href="/login" className="hover:text-primary transition-colors font-medium">
                ← Back to Standard Applicant Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
