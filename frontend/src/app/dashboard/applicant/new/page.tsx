"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/lib/store";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { useToastStore } from "@/components/Toast";

const categories = [
  {
    value: "GROUP_A_OFFICER",
    label: "Group A Officer",
    icon: "admin_panel_settings",
    desc: "IAS, IPS, Group A government officers",
    quota: "20 GB",
    fields: ["designation", "employeeId", "dateOfJoining"],
  },
  {
    value: "TEACHING_STAFF",
    label: "Teaching Staff",
    icon: "school",
    desc: "Professors, Associate & Assistant Professors",
    quota: "20 GB",
    fields: ["designation", "employeeId", "dateOfJoining", "specialization"],
  },
  {
    value: "NON_TEACHING_STAFF",
    label: "Non-Teaching Staff",
    icon: "badge",
    desc: "Administrative and support staff",
    quota: "5 GB",
    fields: ["designation", "employeeId", "dateOfJoining"],
  },
  {
    value: "RESEARCH_SCHOLAR",
    label: "Research Scholar",
    icon: "science",
    desc: "PhD and research students",
    quota: "10 GB",
    fields: ["enrollmentNo", "supervisor", "researchTopic", "yearOfAdmission"],
  },
  {
    value: "POST_GRADUATE_STUDENT",
    label: "Post Graduate Student",
    icon: "menu_book",
    desc: "MA, MSc, MCA, MBA and other PG students",
    quota: "5 GB",
    fields: ["enrollmentNo", "course", "yearOfAdmission"],
  },
];

const fieldLabels: Record<string, { label: string; icon: string; type?: string }> = {
  designation: { label: "Designation", icon: "work" },
  employeeId: { label: "Employee ID", icon: "badge" },
  dateOfJoining: { label: "Date of Joining", icon: "calendar_month", type: "date" },
  specialization: { label: "Specialization", icon: "psychology" },
  enrollmentNo: { label: "Enrollment Number", icon: "tag" },
  supervisor: { label: "Research Supervisor", icon: "person" },
  researchTopic: { label: "Research Topic", icon: "biotech" },
  yearOfAdmission: { label: "Year of Admission", icon: "event", type: "number" },
  course: { label: "Course / Programme", icon: "menu_book" },
};

const departments = [
  { id: "dept-cs", name: "Computer Science" },
  { id: "dept-phy", name: "Physics" },
  { id: "dept-chem", name: "Chemistry" },
  { id: "dept-math", name: "Mathematics" },
  { id: "dept-bio", name: "Biological Sciences" },
  { id: "dept-eng", name: "English" },
  { id: "dept-hist", name: "History" },
  { id: "dept-eco", name: "Economics" },
  { id: "dept-law", name: "Law" },
  { id: "dept-med", name: "Medical Sciences" },
  { id: "dept-edu", name: "Education" },
  { id: "dept-mech", name: "Mechanical Engineering" },
  { id: "dept-civil", name: "Civil Engineering" },
  { id: "dept-elec", name: "Electrical Engineering" },
];

/**
 * New Application Form — multi-step form for submitting a BHU email account application.
 *
 * Steps:
 * 1. Select category (determines form fields + storage quota)
 * 2. Fill category-specific details + upload photo
 * 3. Review & accept IT policy → submit
 */
export default function NewApplicationPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const categoryConfig = categories.find((c) => c.value === selectedCategory);

  function handleDetailChange(field: string, value: string) {
    setDetails((prev) => ({ ...prev, [field]: value }));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setError("Please upload a JPEG or PNG image.");
      return;
    }

    // Validate size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError("Photo must be under 2MB. Current: " + (file.size / (1024 * 1024)).toFixed(1) + "MB");
      return;
    }

    setError("");
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function canProceedStep2(): boolean {
    if (!categoryConfig) return false;
    if (!departmentId) return false;
    for (const field of categoryConfig.fields) {
      if (!details[field]?.trim()) return false;
    }
    if (!photo) return false;
    return true;
  }

  async function handleSubmit() {
    if (!categoryConfig || !photo) return;
    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("departmentId", departmentId);
      formData.append("category", selectedCategory);
      formData.append("details", JSON.stringify(details));
      formData.append("photo", photo);

      const { data } = await api.post("/applications", formData);

      const result = data.success ? data.data : data;
      addToast({
        message: `Application ${result.trackingId} submitted successfully!`,
        variant: "success",
      });
      router.push("/dashboard/applicant");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || "Failed to submit application. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <a
            href="/dashboard/applicant"
            className="p-1.5 rounded-lg hover:bg-surface-variant transition-colors"
          >
            <span className="material-symbols-rounded text-[20px] text-outline">
              arrow_back
            </span>
          </a>
          <div>
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              New Email Application
            </h1>
            <p className="text-sm text-outline">
              Apply for your @bhu.ac.in institutional email
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step >= s
                    ? "bg-primary text-white"
                    : "bg-surface-variant text-outline"
                }`}
              >
                {step > s ? (
                  <span className="material-symbols-rounded text-[16px]">
                    check
                  </span>
                ) : (
                  s
                )}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-0.5 rounded-full transition-colors ${
                    step > s ? "bg-primary" : "bg-outline-variant"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[11px] text-outline">Category</span>
          <span className="text-[11px] text-outline">Details</span>
          <span className="text-[11px] text-outline">Review</span>
        </div>
      </div>

      {/* ═══ STEP 1: Category Selection ═══ */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Select Your Category
          </h2>
          <p className="text-sm text-outline mb-4">
            Choose the category that best describes your role at BHU. This
            determines the form fields and storage quota.
          </p>

          <div className="grid grid-cols-1 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${
                  selectedCategory === cat.value
                    ? "border-primary bg-primary-container/30 shadow-sm"
                    : "border-outline-variant hover:border-primary/40 hover:bg-surface-variant/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      selectedCategory === cat.value
                        ? "bg-primary text-white"
                        : "bg-surface-variant text-outline group-hover:bg-primary-container group-hover:text-primary"
                    }`}
                  >
                    <span className="material-symbols-rounded text-[24px]">
                      {cat.icon}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">
                        {cat.label}
                      </p>
                      <span
                        className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                          selectedCategory === cat.value
                            ? "bg-primary text-white"
                            : "bg-surface-variant text-outline"
                        }`}
                      >
                        {cat.quota}
                      </span>
                    </div>
                    <p className="text-xs text-outline mt-1">{cat.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              icon="arrow_forward"
              disabled={!selectedCategory}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* ═══ STEP 2: Details + Photo Upload ═══ */}
      {step === 2 && categoryConfig && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Application Details
              </h2>
              <p className="text-sm text-outline">
                {categoryConfig.label} — {categoryConfig.quota} quota
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-sm text-primary hover:text-primary-dark font-medium transition-colors cursor-pointer"
            >
              Change category
            </button>
          </div>

          {/* Department */}
          <div className="relative">
            <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline z-10">
              apartment
            </span>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full rounded-lg border-2 border-outline-variant bg-surface px-4 py-3 text-sm text-foreground pl-11 appearance-none hover:border-outline focus:border-primary focus:outline-none transition-colors cursor-pointer"
              required
            >
              <option value="">Select Department *</option>
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

          {/* Dynamic Fields */}
          <div className="space-y-4">
            {categoryConfig.fields.map((field) => {
              const config = fieldLabels[field];
              return (
                <Input
                  key={field}
                  label={config.label + " *"}
                  icon={config.icon}
                  type={config.type || "text"}
                  value={details[field] || ""}
                  onChange={(e) => handleDetailChange(field, e.target.value)}
                  required
                />
              );
            })}
          </div>

          {/* Photo Upload */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">
              Certified Photograph *
            </p>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                photo
                  ? "border-success bg-success-container/10"
                  : "border-outline-variant hover:border-primary hover:bg-primary/3"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                className="hidden"
                onChange={handlePhotoChange}
              />

              {photoPreview ? (
                <div className="flex items-center gap-4">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-20 h-20 rounded-xl object-cover border border-outline-variant"
                  />
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {photo?.name}
                    </p>
                    <p className="text-xs text-outline mt-0.5">
                      {((photo?.size || 0) / 1024).toFixed(0)} KB •{" "}
                      {photo?.type}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhoto(null);
                        setPhotoPreview(null);
                      }}
                      className="text-xs text-error font-medium mt-1 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                  <span className="material-symbols-rounded text-[24px] text-success">
                    check_circle
                  </span>
                </div>
              ) : (
                <>
                  <span className="material-symbols-rounded text-[40px] text-outline/50 mb-2">
                    add_photo_alternate
                  </span>
                  <p className="text-sm text-outline">
                    Click to upload your photograph
                  </p>
                  <p className="text-xs text-outline/60 mt-1">
                    JPEG or PNG, max 2MB
                  </p>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-error animate-fade-in">
              <span className="material-symbols-rounded text-[18px]">
                error
              </span>
              {error}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outlined" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              icon="arrow_forward"
              disabled={!canProceedStep2()}
              onClick={() => {
                setError("");
                setStep(3);
              }}
            >
              Review Application
            </Button>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Review & Submit ═══ */}
      {step === 3 && categoryConfig && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">
            Review Your Application
          </h2>
          <p className="text-sm text-outline">
            Please verify all details before submitting.
          </p>

          {/* Summary card */}
          <div className="bg-surface rounded-2xl border border-outline-variant overflow-hidden">
            {/* Category banner */}
            <div className="bg-primary-container/40 px-5 py-3 flex items-center justify-between border-b border-outline-variant">
              <div className="flex items-center gap-3">
                <span className="material-symbols-rounded text-[22px] text-primary">
                  {categoryConfig.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {categoryConfig.label}
                  </p>
                  <p className="text-xs text-outline">
                    {departments.find((d) => d.id === departmentId)?.name}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold">
                {categoryConfig.quota}
              </span>
            </div>

            {/* Details grid */}
            <div className="p-5 grid grid-cols-2 gap-3">
              {categoryConfig.fields.map((field) => (
                <div key={field} className="bg-surface-variant/40 rounded-lg px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-outline font-medium">
                    {fieldLabels[field].label}
                  </p>
                  <p className="text-sm text-foreground font-medium">
                    {details[field]}
                  </p>
                </div>
              ))}
            </div>

            {/* Photo preview */}
            {photoPreview && (
              <div className="px-5 pb-5 flex items-center gap-3">
                <img
                  src={photoPreview}
                  alt="Photo"
                  className="w-14 h-14 rounded-xl object-cover border border-outline-variant"
                />
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {photo?.name}
                  </p>
                  <p className="text-[11px] text-outline">
                    {((photo?.size || 0) / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* IT Policy Agreement */}
          <div className="bg-surface-variant/30 rounded-xl p-5 border border-outline-variant">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="material-symbols-rounded text-[18px] text-warning">
                policy
              </span>
              IT Policy Agreement
            </h4>
            <div className="text-xs text-outline space-y-2 mb-4 max-h-32 overflow-y-auto pr-2">
              <p>
                By submitting this application, I confirm that all information
                provided is accurate and complete.
              </p>
              <p>
                I agree to abide by the BHU IT Usage Policy, including but not
                limited to: responsible use of institutional email, prohibition
                of sharing credentials, compliance with data protection
                guidelines, and acceptable use of Google Workspace services.
              </p>
              <p>
                I understand that misuse of the email account may result in
                suspension or termination of email services and may be subject
                to disciplinary action.
              </p>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={policyAccepted}
                onChange={(e) => setPolicyAccepted(e.target.checked)}
                className="w-4.5 h-4.5 rounded border-2 border-outline-variant text-primary focus:ring-primary accent-primary cursor-pointer"
              />
              <span className="text-sm text-foreground font-medium">
                I have read and accept the IT Usage Policy
              </span>
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-error animate-fade-in">
              <span className="material-symbols-rounded text-[18px]">
                error
              </span>
              {error}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outlined" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              icon="send"
              disabled={!policyAccepted || submitting}
              loading={submitting}
              onClick={handleSubmit}
              size="lg"
            >
              Submit Application
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
