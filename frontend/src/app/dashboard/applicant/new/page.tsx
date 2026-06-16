"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/lib/store";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import { useToastStore } from "@/components/Toast";
import { generateApplicationPdf } from "@/lib/pdfGenerator";
import CountryCodeSelect from "@/components/CountryCodeSelect";
import DepartmentSelect from "@/components/DepartmentSelect";
import NationalitySelect from "@/components/NationalitySelect";

const categories = [
  {
    value: "GROUP_A_OFFICER",
    label: "Group A Officer",
    icon: "admin_panel_settings",
    desc: "IAS, IPS, Group A government officers",
    quota: "20 GB",
    fields: [
      "designation", "dateOfAppointment", "facultyInstituteCentre",
      "employeeId", "dateOfBirth", "typeOfEmployment",
      "nationality", "dateOfRetirement", "mobileNo", "emailChoice",
    ],
  },
  {
    value: "TEACHING_STAFF",
    label: "Teaching Staff",
    icon: "school",
    desc: "Professors, Associate & Assistant Professors",
    quota: "20 GB",
    fields: [
      "designation", "dateOfAppointment", "facultyInstituteCentre",
      "employeeId", "dateOfBirth", "typeOfEmployment",
      "nationality", "dateOfRetirement", "mobileNo", "emailChoice",
    ],
  },
  {
    value: "NON_TEACHING_STAFF",
    label: "Non-Teaching Staff",
    icon: "badge",
    desc: "Administrative and support staff",
    quota: "5 GB",
    fields: [
      "designation", "dateOfAppointment", "facultyInstituteCentre",
      "employeeId", "dateOfBirth", "typeOfEmployment",
      "nationality", "dateOfRetirement", "mobileNo", "emailChoice",
    ],
  },
  {
    value: "RESEARCH_SCHOLAR",
    label: "Research Scholar",
    icon: "science",
    desc: "PhD and research students",
    quota: "10 GB",
    fields: [
      "programEnrolled", "admissionAcademicYear", "facultyInstituteCentre",
      "enrollmentNo", "dateOfBirth", "courseCompletionYear",
      "nationality", "mobileNo", "emailChoice",
    ],
  },
  {
    value: "POST_GRADUATE_STUDENT",
    label: "Post Graduate Student",
    icon: "menu_book",
    desc: "MA, MSc, MCA, MBA and other PG students",
    quota: "5 GB",
    fields: [
      "programEnrolled", "admissionAcademicYear", "facultyInstituteCentre",
      "enrollmentNo", "dateOfBirth", "courseCompletionYear",
      "nationality", "mobileNo", "emailChoice",
    ],
  },
];

const fieldLabels: Record<string, { label: string; icon: string; type?: string }> = {
  // ── Staff fields ──
  designation:            { label: "Designation", icon: "work" },
  dateOfAppointment:      { label: "Date of Appointment", icon: "calendar_month", type: "date" },
  employeeId:             { label: "Employee ID", icon: "badge" },
  typeOfEmployment:       { label: "Type of Employment", icon: "work_history" },
  dateOfRetirement:       { label: "Date of Retirement", icon: "event_busy", type: "date" },
  // ── Student fields ──
  programEnrolled:        { label: "Program Enrolled", icon: "menu_book" },
  admissionAcademicYear:  { label: "Admission Academic Year", icon: "event", type: "number" },
  enrollmentNo:           { label: "Enrollment Number", icon: "tag" },
  courseCompletionYear:   { label: "Course Completion Year", icon: "school", type: "number" },
  // ── Common fields ──
  facultyInstituteCentre: { label: "Faculty / Institute / Centre", icon: "domain" },
  dateOfBirth:            { label: "Date of Birth", icon: "cake", type: "date" },
  nationality:            { label: "Nationality", icon: "public" },
  mobileNo:               { label: "Mobile Number", icon: "phone", type: "tel" },
  emailChoice:            { label: "Choice of Email Id", icon: "alternate_email", type: "custom" },
};



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
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [signature, setSignature] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [isOtherEmployment, setIsOtherEmployment] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [submittedApp, setSubmittedApp] = useState<any>(null);
  const [dbDepartments, setDbDepartments] = useState<{id: string, name: string, code: string}[]>([]);

  useEffect(() => {
    api.get("/departments")
      .then(res => {
        const payload = res.data;
        if (Array.isArray(payload)) {
          setDbDepartments(payload);
        } else if (payload && payload.data && Array.isArray(payload.data)) {
          setDbDepartments(payload.data);
        } else {
          setDbDepartments([]);
        }
      })
      .catch(err => console.error("Failed to fetch departments", err));
  }, []);

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
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSignatureChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/(jpeg|jpg|png)$/i)) {
      setError("Signature must be a JPEG or PNG image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Signature size must be less than 2MB.");
      return;
    }

    setError("");
    setSignature(file);
    const reader = new FileReader();
    reader.onloadend = () => setSignaturePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function canProceedStep2(): boolean {
    if (!categoryConfig) return false;
    if (!departmentId) return false;
    for (const field of categoryConfig.fields) {
      if (field === "emailChoice") {
        // emailChoice needs at least the 1st preference filled
        if (!details["emailChoice1"]?.trim()) return false;
      } else {
        if (!details[field]?.trim()) return false;
      }
    }
    if (!photo) return false;
    if (!signature) return false;
    return true;
  }

  async function handleSubmit() {
    if (!categoryConfig || !photo || !signature) return;
    setSubmitting(true);
    setError("");

    try {
      const payloadDetails = { ...details };
      if (payloadDetails.mobileNo) {
        const code = payloadDetails.countryCode || "+91";
        payloadDetails.mobileNo = `${code}-${payloadDetails.mobileNo}`;
        delete payloadDetails.countryCode;
      }

      const formData = new FormData();
      formData.append("departmentId", departmentId);
      formData.append("category", selectedCategory);
      formData.append("details", JSON.stringify(payloadDetails));
      formData.append("photo", photo);
      formData.append("signature", signature);

      const { data } = await api.post("/applications", formData);

      const result = data.success ? data.data : data;
      addToast({
        message: `Application ${result.trackingId} submitted successfully!`,
        variant: "success",
      });
      setSubmittedApp(result);
      setStep(4);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || "Failed to submit application. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const maxDOB = new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0];

  return (
    <>
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      {step < 4 && (
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
      )}

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
          <DepartmentSelect
            departments={dbDepartments}
            value={departmentId}
            onChange={(val) => setDepartmentId(val)}
          />

          {/* Dynamic Fields */}
          <div className="space-y-4">
            {categoryConfig.fields.map((field) => {
              const config = fieldLabels[field];

              // Special rendering for Email Choice (3 preferences)
              if (field === "emailChoice") {
                return (
                  <div key={field} className="bg-surface-variant/30 rounded-xl p-5 border border-outline-variant">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="material-symbols-rounded text-[20px] text-primary">
                        alternate_email
                      </span>
                      <p className="text-sm font-semibold text-foreground">
                        Choice of Email Id *
                      </p>
                    </div>
                    <p className="text-xs text-outline mb-4">
                      Enter your preferred email handles (e.g., firstname.lastname). Default is your full name.
                    </p>
                    <div className="space-y-3">
                      {["1st", "2nd", "3rd"].map((label, idx) => (
                        <div key={label} className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-outline w-8 shrink-0">
                            {label}
                          </span>
                            <Input
                              label={`${label} Choice`}
                              icon="mail"
                              value={details[`emailChoice${idx + 1}`] || ""}
                              onChange={(e) =>
                                handleDetailChange(`emailChoice${idx + 1}`, e.target.value.replace(/@.*/, ""))
                              }
                              suffix="@bhu.ac.in"
                              required={idx === 0}
                            />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              if (field === "typeOfEmployment") {
                const standardOptions = ["Permanent", "Contractual", "Guest Faculty"];
                return (
                  <div key={field} className="space-y-3">
                    <div className="relative">
                      <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline z-10">
                        {config.icon}
                      </span>
                      <select
                        value={isOtherEmployment ? "Other" : (details[field] || "")}
                        onChange={(e) => {
                          if (e.target.value === "Other") {
                            setIsOtherEmployment(true);
                            handleDetailChange(field, "");
                          } else {
                            setIsOtherEmployment(false);
                            handleDetailChange(field, e.target.value);
                          }
                        }}
                        className="w-full rounded-lg border-2 border-outline-variant bg-surface px-4 py-3 text-sm text-foreground pl-11 appearance-none hover:border-outline focus:border-primary focus:outline-none transition-colors cursor-pointer"
                        required
                      >
                        <option value="">Select Employment Type *</option>
                        {standardOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        <option value="Other">Other</option>
                      </select>
                      <span className="material-symbols-rounded absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-outline pointer-events-none">
                        expand_more
                      </span>
                    </div>
                    {isOtherEmployment && (
                      <Input
                        label="Specify Employment Type *"
                        icon="edit"
                        value={details[field] || ""}
                        onChange={(e) => handleDetailChange(field, e.target.value)}
                        required
                      />
                    )}
                  </div>
                );
              }

              if (field === "admissionAcademicYear" || field === "courseCompletionYear") {
                const currentYear = new Date().getFullYear();
                const years = Array.from({ length: 50 }, (_, i) => currentYear - 30 + i);
                return (
                  <div key={field} className="relative">
                    <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline z-10">
                      {config.icon}
                    </span>
                    <select
                      value={details[field] || ""}
                      onChange={(e) => handleDetailChange(field, e.target.value)}
                      className="w-full rounded-lg border-2 border-outline-variant bg-surface px-4 py-3 text-sm text-foreground pl-11 appearance-none hover:border-outline focus:border-primary focus:outline-none transition-colors cursor-pointer"
                      required
                    >
                      <option value="">{config.label} *</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span className="material-symbols-rounded absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-outline pointer-events-none">
                      expand_more
                    </span>
                  </div>
                );
              }

              if (field === "mobileNo") {
                return (
                  <div key={field} className="flex gap-2">
                    <CountryCodeSelect
                      value={details['countryCode'] || "+91"}
                      onChange={(val) => handleDetailChange('countryCode', val)}
                    />
                    <div className="flex-1">
                      <Input
                        label={config.label + " *"}
                        icon={config.icon}
                        type="tel"
                        value={details[field] || ""}
                        onChange={(e) => handleDetailChange(field, e.target.value.replace(/\D/g, ""))}
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>
                );
              }

              if (field === "nationality") {
                return (
                  <NationalitySelect
                    key={field}
                    value={details[field] || ""}
                    onChange={(val) => handleDetailChange(field, val)}
                  />
                );
              }

              let onChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => handleDetailChange(field, e.target.value);
              if (field === "facultyInstituteCentre") {
                onChangeHandler = (e) => handleDetailChange(field, e.target.value.replace(/[0-9]/g, ""));
              } else if (field === "employeeId") {
                onChangeHandler = (e) => handleDetailChange(field, e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase());
              } else if (field === "enrollmentNo") {
                onChangeHandler = (e) => handleDetailChange(field, e.target.value.toUpperCase());
              } else if (field === "designation") {
                onChangeHandler = (e) => handleDetailChange(field, e.target.value.replace(/[0-9]/g, ""));
              } else if (field === "programEnrolled") {
                onChangeHandler = (e) => handleDetailChange(field, e.target.value.replace(/[^a-zA-Z\s.]/g, ""));
              } else if (field === "dateOfBirth") {
                onChangeHandler = (e) => {
                  const val = e.target.value;
                  if (val && val > maxDOB) {
                    addToast({ message: "Age must be older than 18 years", variant: "warning" });
                    handleDetailChange(field, "");
                  } else {
                    handleDetailChange(field, val);
                  }
                };
              }

              return (
                <Input
                  key={field}
                  label={config.label + " *"}
                  icon={config.icon}
                  type={config.type || "text"}
                  value={details[field] || ""}
                  onChange={onChangeHandler}
                  max={field === "dateOfBirth" ? maxDOB : undefined}
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoModalOpen(true);
                      }}
                      className="text-xs text-primary font-medium mt-1 hover:underline cursor-pointer ml-3"
                    >
                      View Full Size
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

          {/* Signature Upload */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">
              Certified Signature *
            </p>
            <div
              onClick={() => signatureInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                signature
                  ? "border-success bg-success-container/10"
                  : "border-outline-variant hover:border-primary hover:bg-primary/3"
              }`}
            >
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                className="hidden"
                onChange={handleSignatureChange}
              />

              {signaturePreview ? (
                <div className="flex items-center gap-4">
                  <img
                    src={signaturePreview}
                    alt="Signature Preview"
                    className="w-20 h-20 rounded-xl object-contain border border-outline-variant bg-white"
                  />
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {signature?.name}
                    </p>
                    <p className="text-xs text-outline mt-0.5">
                      {((signature?.size || 0) / 1024).toFixed(0)} KB •{" "}
                      {signature?.type}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSignature(null);
                        setSignaturePreview(null);
                      }}
                      className="text-xs text-error font-medium mt-1 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSignatureModalOpen(true);
                      }}
                      className="text-xs text-primary font-medium mt-1 hover:underline cursor-pointer ml-3"
                    >
                      View Full Size
                    </button>
                  </div>
                  <span className="material-symbols-rounded text-[24px] text-success">
                    check_circle
                  </span>
                </div>
              ) : (
                <>
                  <span className="material-symbols-rounded text-[40px] text-outline/50 mb-2">
                    draw
                  </span>
                  <p className="text-sm text-outline">
                    Click to upload your signature
                  </p>
                  <p className="text-xs text-outline/60 mt-1">
                    JPEG or PNG, max 2MB
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <Input
              label="Place *"
              icon="location_on"
              value={details.applicantPlace || ""}
              onChange={(e) => handleDetailChange("applicantPlace", e.target.value.replace(/[^a-zA-Z\s]/g, "").toUpperCase())}
              required
              placeholder="e.g. Varanasi"
            />
            <Input
              label="Date *"
              icon="calendar_today"
              type="date"
              value={details.applicantDate || new Date().toISOString().split("T")[0]}
              onChange={(e) => handleDetailChange("applicantDate", e.target.value)}
              required
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
                    {dbDepartments.find((d) => d.id === departmentId)?.name}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold">
                {categoryConfig.quota}
              </span>
            </div>

            {/* Details grid */}
            <div className="p-5 grid grid-cols-2 gap-3">
              {categoryConfig.fields.map((field) => {
                if (field === "emailChoice") {
                  return (
                    <div key={field} className="col-span-2 bg-surface-variant/40 rounded-lg px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-outline font-medium mb-1">
                        Choice of Email Id
                      </p>
                      <div className="space-y-0.5">
                        {[1, 2, 3].map((n) => (
                          details[`emailChoice${n}`] && (
                            <p key={n} className="text-sm text-foreground font-medium">
                              {n === 1 ? "1st" : n === 2 ? "2nd" : "3rd"}: {details[`emailChoice${n}`]}
                            </p>
                          )
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={field} className="bg-surface-variant/40 rounded-lg px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-outline font-medium">
                      {fieldLabels[field].label}
                    </p>
                    <p className="text-sm text-foreground font-medium">
                      {details[field]}
                    </p>
                  </div>
                );
              })}
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

          <div className="flex items-center justify-between pt-2">
            <Button variant="outlined" onClick={() => setStep(2)}>
              Back
            </Button>
            <div className="flex items-center gap-3">
              <Button
                variant="outlined"
                icon="download"
                onClick={() => {
                  const previewData = {
                    trackingId: "PREVIEW",
                    status: "DRAFT",
                    createdAt: new Date().toISOString(),
                    department: departments.find((d) => d.id === departmentId),
                    applicantDetails: { ...details, category: selectedCategory },
                  };
                  generateApplicationPdf(previewData, {
                    firstName: user?.firstName || "",
                    lastName: user?.lastName || "",
                    email: user?.email || "",
                  }, photoPreview);
                }}
              >
                Download Preview
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
        </div>
      )}

      {/* ═══ STEP 4: Success ═══ */}
      {step === 4 && submittedApp && (
        <div className="space-y-6 text-center py-10 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-success-container flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-rounded text-[40px] text-success">
              check_circle
            </span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Application Submitted
          </h2>
          <p className="text-sm text-outline max-w-md mx-auto mb-8">
            Your application for BHU institutional email has been successfully submitted.
            Your Reference ID is <strong className="text-foreground">{submittedApp.trackingId}</strong>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              variant="outlined"
              icon="download"
              size="lg"
              onClick={() => {
                const fullAppForPdf = {
                  ...submittedApp,
                  department: dbDepartments.find((d) => d.id === departmentId),
                  applicantDetails: { ...details, category: selectedCategory },
                  createdAt: new Date().toISOString(),
                };
                generateApplicationPdf(fullAppForPdf, {
                  firstName: user?.firstName || "",
                  lastName: user?.lastName || "",
                  email: user?.email || "",
                }, photoPreview, signaturePreview);
              }}
            >
              Download Form
            </Button>
            <Button
              icon="arrow_forward"
              size="lg"
              onClick={() => router.push("/dashboard/applicant")}
            >
              Go to My Applications
            </Button>
          </div>
        </div>
      )}
    </div>

    {/* Photo Preview Modal */}
    <Modal
      isOpen={photoModalOpen}
      onClose={() => setPhotoModalOpen(false)}
      title="Photo Preview"
      size="md"
    >
      {photoPreview && (
        <div className="flex justify-center p-4">
          <img
            src={photoPreview}
            alt="Full Size Preview"
            className="max-w-full max-h-[60vh] rounded-xl object-contain border border-outline-variant"
          />
        </div>
      )}
    </Modal>

    {/* Signature Preview Modal */}
    <Modal
      isOpen={signatureModalOpen}
      onClose={() => setSignatureModalOpen(false)}
      title="Signature Preview"
      size="md"
    >
      {signaturePreview && (
        <div className="flex justify-center p-4">
          <img
            src={signaturePreview}
            alt="Full Size Signature"
            className="max-w-full max-h-[60vh] rounded-xl object-contain border border-outline-variant bg-white"
          />
        </div>
      )}
    </Modal>
    </>
  );
}
