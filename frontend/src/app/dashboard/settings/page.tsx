"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/lib/store";
import Button from "@/components/Button";
import Input from "@/components/Input";
import PasswordStrength from "@/components/PasswordStrength";

export default function SettingsPage() {
  const router = useRouter();
  const { logout, user } = useAuthStore();

  // ── Change Password state ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordValid, setPasswordValid] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // ── HOD Signature state ──
  const [hasSignature, setHasSignature] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [sigFile, setSigFile] = useState<File | null>(null);
  const [sigLoading, setSigLoading] = useState(false);
  const [sigError, setSigError] = useState("");
  const [sigSuccess, setSigSuccess] = useState("");
  const [sigDragOver, setSigDragOver] = useState(false);

  const handlePasswordValidChange = useCallback((isValid: boolean) => {
    setPasswordValid(isValid);
  }, []);

  // ── Fetch HOD signature status on mount ──
  useEffect(() => {
    if (user?.role === "HOD") {
      fetchSignatureStatus();
    }
  }, [user?.role]);

  async function fetchSignatureStatus() {
    try {
      const { data } = await api.get("/users/me/signature");
      const status = data.success ? data.data : data;
      setHasSignature(status.hasSignature);

      if (status.hasSignature) {
        // Load signature image preview
        try {
          const res = await api.get("/users/me/signature/image", {
            responseType: "blob",
          });
          const url = URL.createObjectURL(res.data);
          setSignaturePreview(url);
        } catch {
          // Signature exists but image can't be fetched
        }
      }
    } catch {
      // Ignore errors
    }
  }

  // ── Handle file selection for signature ──
  function handleSigFileSelect(file: File) {
    setSigError("");
    setSigSuccess("");

    // Validate
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/i)) {
      setSigError("Only JPEG and PNG files are allowed.");
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      setSigError("File size must be under 1MB.");
      return;
    }

    setSigFile(file);
    // Preview
    const reader = new FileReader();
    reader.onloadend = () => setSignaturePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSigUpload() {
    if (!sigFile) return;
    setSigLoading(true);
    setSigError("");
    setSigSuccess("");

    try {
      const formData = new FormData();
      formData.append("signature", sigFile);
      const { data } = await api.post("/users/me/signature", formData);
      const result = data.success ? data.data : data;
      setHasSignature(true);
      setSigSuccess(result.message || "Signature uploaded successfully!");
      setSigFile(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setSigError(
        error.response?.data?.message || "Failed to upload signature."
      );
    } finally {
      setSigLoading(false);
    }
  }

  // ── Change Password handler ──
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

        setTimeout(() => {
          logout();
          router.push("/login");
        }, 3000);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message ||
          "Failed to change password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
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

      {/* ══════════════════════════════════════
          HOD SIGNATURE UPLOAD CARD
         ══════════════════════════════════════ */}
      {user?.role === "HOD" && (
        <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-sm animate-fade-in">
          <div className="p-6 border-b border-outline-variant bg-surface-variant/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-rounded text-[22px] text-secondary">
                draw
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Digital Signature
              </h2>
              <p className="text-sm text-outline">
                Upload your signature for digitally signing applications
              </p>
            </div>
            {hasSignature && (
              <div className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-container text-success text-xs font-semibold">
                <span className="material-symbols-rounded text-[14px]">
                  check_circle
                </span>
                Uploaded
              </div>
            )}
          </div>

          <div className="p-6 space-y-5">
            {/* Current signature preview */}
            {signaturePreview && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs font-medium text-outline uppercase tracking-wider">
                  Current Signature
                </p>
                <div className="bg-white border-2 border-dashed border-outline-variant rounded-xl p-4 inline-block">
                  <img
                    src={signaturePreview}
                    alt="Your signature"
                    className="max-h-20 max-w-[250px] object-contain"
                  />
                </div>
              </div>
            )}

            {/* Upload area */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
                sigDragOver
                  ? "border-primary bg-primary-container/20"
                  : "border-outline-variant hover:border-primary/40 hover:bg-surface-variant/30"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setSigDragOver(true);
              }}
              onDragLeave={() => setSigDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setSigDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleSigFileSelect(file);
              }}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/jpeg,image/png";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleSigFileSelect(file);
                };
                input.click();
              }}
            >
              <span className="material-symbols-rounded text-[36px] text-outline/40 mb-2 block">
                upload_file
              </span>
              <p className="text-sm font-medium text-foreground">
                {sigFile
                  ? sigFile.name
                  : hasSignature
                    ? "Click or drag to replace signature"
                    : "Click or drag to upload your signature"}
              </p>
              <p className="text-xs text-outline mt-1">
                JPEG or PNG • Max 1MB
              </p>
            </div>

            {/* Selected file + upload button */}
            {sigFile && (
              <div className="flex items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <span className="material-symbols-rounded text-[18px] text-primary">
                    image
                  </span>
                  {sigFile.name}{" "}
                  <span className="text-outline">
                    ({(sigFile.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
                <Button
                  icon="cloud_upload"
                  loading={sigLoading}
                  onClick={handleSigUpload}
                  size="sm"
                >
                  Upload Signature
                </Button>
              </div>
            )}

            {sigError && (
              <div className="flex items-center gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-error animate-fade-in">
                <span className="material-symbols-rounded text-[18px]">
                  error
                </span>
                {sigError}
              </div>
            )}

            {sigSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-success-container px-4 py-3 text-sm text-success animate-fade-in">
                <span className="material-symbols-rounded text-[18px]">
                  check_circle
                </span>
                {sigSuccess}
              </div>
            )}

            {!hasSignature && (
              <div className="flex items-start gap-2 rounded-lg bg-primary-container/30 px-4 py-3 text-sm text-primary">
                <span className="material-symbols-rounded text-[18px] mt-0.5">
                  info
                </span>
                <span>
                  You must upload your signature before you can approve
                  applications. Your signature will be digitally embedded in
                  approved documents.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          CHANGE PASSWORD CARD
         ══════════════════════════════════════ */}
      <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-sm animate-fade-in">
        <div className="p-6 border-b border-outline-variant bg-surface-variant/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-rounded text-[22px] text-on-primary-container">
              password
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Change Password
            </h2>
            <p className="text-sm text-outline">
              Update your account password
            </p>
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
                <span className="material-symbols-rounded text-[16px]">
                  warning
                </span>
                Passwords do not match
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-error animate-fade-in">
                <span className="material-symbols-rounded text-[18px]">
                  error
                </span>
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-success-container px-4 py-3 text-sm text-success animate-fade-in">
                <span className="material-symbols-rounded text-[18px]">
                  check_circle
                </span>
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
