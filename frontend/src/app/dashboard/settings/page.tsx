"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/lib/store";
import Button from "@/components/Button";
import Input from "@/components/Input";
import PasswordStrength from "@/components/PasswordStrength";

export default function SettingsPage() {
  const router = useRouter();
  const { logout, user } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordValid, setPasswordValid] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordValidChange = useCallback((isValid: boolean) => {
    setPasswordValid(isValid);
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (!passwordValid) {
      setError("New password does not meet all requirements.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      if (data.success || data.message) {
        setSuccess(
          "Password changed successfully. You will be redirected to log in again."
        );
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordValid(false);

        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          logout();
          router.push("/login");
        }, 3000);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || "Failed to change password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-3xl font-bold text-foreground mb-2"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Settings
        </h1>
        <p className="text-outline">
          Manage your account settings and security preferences.
        </p>
      </div>

      <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-sm animate-fade-in">
        <div className="p-6 border-b border-outline-variant bg-surface-variant/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-rounded text-[22px] text-on-primary-container">
              password
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Change Password</h2>
            <p className="text-sm text-outline">Update your account password</p>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleChangePassword} className="space-y-6">
            <Input
              label="Current Password"
              icon="lock"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setError("");
                setSuccess("");
              }}
              required
            />

            <div className="pt-2 border-t border-outline-variant border-dashed" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <Input
                  label="New Password"
                  icon="lock_reset"
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  required
                />

                <Input
                  label="Confirm New Password"
                  icon="lock_reset"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  required
                />
              </div>

              <div>
                {/* Password strength checklist */}
                <div className="p-4 rounded-xl bg-surface-variant/30 border border-outline-variant">
                  <PasswordStrength
                    password={newPassword}
                    onValidChange={handlePasswordValidChange}
                  />
                </div>
              </div>
            </div>

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

            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-success-container px-4 py-3 text-sm text-success animate-fade-in">
                <span className="material-symbols-rounded text-[18px]">check_circle</span>
                {success}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                loading={loading}
                icon="save"
                disabled={
                  !currentPassword ||
                  !passwordValid ||
                  !confirmPassword ||
                  newPassword !== confirmPassword ||
                  !!success
                }
              >
                Update Password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
