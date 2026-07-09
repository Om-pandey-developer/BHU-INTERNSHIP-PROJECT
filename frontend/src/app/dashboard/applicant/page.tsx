"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { buildTimelineSteps } from "@/components/Timeline";
import { generateApplicationPdf } from "@/lib/pdfGenerator";
import { useAuthStore } from "@/lib/store";
import { useToastStore } from "@/components/Toast";
import Input from "@/components/Input";
import CountryCodeSelect from "@/components/CountryCodeSelect";
import DepartmentSelect from "@/components/DepartmentSelect";
import NationalitySelect from "@/components/NationalitySelect";
import ImageCropper from "@/components/ImageCropper";
import getCroppedImg from "@/lib/getCroppedImg";
import { countryCodes } from "@/lib/countryCodes";

/* ═══════════════════════════════════════════════════════════════════
   TYPES & CONFIG
   ═══════════════════════════════════════════════════════════════════ */

interface Application {
  id: string;
  trackingId: string;
  status: string;
  applicantDetails: Record<string, unknown>;
  photoStoragePath: string;
  hodRemarks?: string;
  deanRemarks?: string;
  ccAdminRemarks?: string;
  quotaAssignedGB?: number;
  createdAt: string;
  hodApprovedAt?: string;
  provisionedAt?: string;
  digitalSignatureHash?: string;
  approvedPdfPath?: string;
  department?: { id: string; name: string; code: string };
}

interface ReapplyRequest {
  id: string;
  applicationId: string;
  reason: string;
  rollEmployeeId: string;
  applicantName: string;
  status: string;
  hodRemarks?: string;
  deanRemarks?: string;
  createdAt: string;
  application?: {
    trackingId: string;
    status: string;
    department?: { name: string };
  };
}

const categories = [
  {
    value: "GROUP_A_OFFICER",
    label: "Group A Officer",
    icon: "admin_panel_settings",
    desc: "senior administrative, academic, Group A government officers",
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
  {
    value: "UNDER_GRADUATE_STUDENT",
    label: "Under Graduate Student",
    icon: "local_library",
    desc: "BA, BSc, BCom, BTech and other UG students",
    quota: "5 GB",
    fields: [
      "programEnrolled", "admissionAcademicYear", "facultyInstituteCentre",
      "enrollmentNo", "dateOfBirth", "courseCompletionYear",
      "nationality", "mobileNo", "emailChoice",
    ],
  },
];

const fieldLabels: Record<string, { label: string; icon: string; type?: string }> = {
  designation: { label: "Designation", icon: "work" },
  dateOfAppointment: { label: "Date of Appointment", icon: "calendar_month", type: "date" },
  employeeId: { label: "Employee ID", icon: "badge" },
  typeOfEmployment: { label: "Type of Employment", icon: "work_history" },
  dateOfRetirement: { label: "Date of Retirement", icon: "event_busy", type: "date" },
  programEnrolled: { label: "Program Enrolled", icon: "menu_book" },
  admissionAcademicYear: { label: "Admission Academic Year", icon: "event", type: "number" },
  enrollmentNo: { label: "Enrollment Number", icon: "tag" },
  courseCompletionYear: { label: "Course Completion Year", icon: "school", type: "number" },
  facultyInstituteCentre: { label: "Faculty / Institute / Centre", icon: "domain" },
  dateOfBirth: { label: "Date of Birth", icon: "cake", type: "date" },
  nationality: { label: "Nationality", icon: "public" },
  mobileNo: { label: "Mobile Number", icon: "phone", type: "tel" },
  emailChoice: { label: "Choice of Email Id", icon: "alternate_email", type: "custom" },
};

/* ═══════════════════════════════════════════════════════════════════
   HORIZONTAL PROGRESS BAR COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

function HorizontalProgressBar({ status, category }: { status: string; category?: string }) {
  const steps = buildTimelineSteps(status, undefined, category);
  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const dotColor =
          step.status === "completed" ? "bg-success text-white" :
            step.status === "active" ? "bg-primary text-white animate-pulse" :
              step.status === "error" ? "bg-error text-white" :
                "bg-outline-variant text-outline";
        const lineColor =
          step.status === "completed" ? "bg-success" :
            step.status === "error" ? "bg-error/30" :
              "bg-outline-variant";
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${dotColor}`}>
                <span className="material-symbols-rounded text-[16px]">
                  {step.status === "completed" ? "check" : step.status === "error" ? "close" : step.icon}
                </span>
              </div>
              <p className={`text-[10px] mt-1 text-center leading-tight max-w-[80px] ${step.status === "completed" ? "text-foreground font-medium" :
                step.status === "active" ? "text-primary font-semibold" :
                  step.status === "error" ? "text-error font-semibold" :
                    "text-outline"
                }`}>
                {step.label}
              </p>
              {step.date && (
                <p className="text-[9px] text-outline/60 mt-0.5">{step.date}</p>
              )}
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 rounded-full mx-1 mt-[-16px] ${lineColor}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default function ApplicantDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // ── Application list state ──
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // ── Reapply state ──
  const [reapplyRequests, setReapplyRequests] = useState<ReapplyRequest[]>([]);
  const [showReapplyModal, setShowReapplyModal] = useState(false);
  const [reapplyForm, setReapplyForm] = useState({ reason: "", rollEmployeeId: "", applicantName: "" });
  const [reapplySubmitting, setReapplySubmitting] = useState(false);
  const [selectedRejectedAppId, setSelectedRejectedAppId] = useState<string | null>(null);

  // ── Form state (merged from new/page.tsx) ──
  const [formStep, setFormStep] = useState(0); // 0=no form, 1=category, 2=details, 3=review, 4=success
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
  const [tempPhotoUrl, setTempPhotoUrl] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [photoDimensions, setPhotoDimensions] = useState<{ width: number, height: number } | null>(null);
  const [tempSigUrl, setTempSigUrl] = useState<string | null>(null);
  const [sigCropModalOpen, setSigCropModalOpen] = useState(false);
  const [sigDimensions, setSigDimensions] = useState<{ width: number, height: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [submittedApp, setSubmittedApp] = useState<any>(null);
  const [dbDepartments, setDbDepartments] = useState<{ id: string, name: string, code: string }[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Double-click tracking for desktop ──
  const [lastClickedCategory, setLastClickedCategory] = useState<string | null>(null);
  const lastClickTimeRef = useRef<number>(0);

  // ── Derived state ──
  const latestApp = applications[0];
  const rejectedApps = applications.filter((a) => a.status === "REJECTED_HOD" || a.status === "REJECTED_DEAN");
  const rejectedCount = rejectedApps.length;
  const hasActiveOrPending = applications.some((a) =>
    ["PENDING_HOD", "APPROVED_HOD", "PENDING_DEAN", "APPROVED_DEAN", "PENDING_CC", "PROVISIONED"].includes(a.status)
  );
  const latestIsRejected = latestApp?.status === "REJECTED_HOD" || latestApp?.status === "REJECTED_DEAN";
  const latestReapplyForRejected = latestIsRejected
    ? reapplyRequests.find((r) => r.applicationId === latestApp.id)
    : null;
  const canApply = !hasActiveOrPending && (!latestIsRejected || latestReapplyForRejected?.status === "APPROVED") && rejectedCount < 5;
  const maxLimitReached = rejectedCount >= 5;

  // Show form section when canApply and not in step 4 (just submitted)
  const showFormSection = canApply || formStep === 4;

  /* ── Data fetching ── */
  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    api.get("/departments")
      .then(res => {
        const payload = res.data;
        if (Array.isArray(payload)) setDbDepartments(payload);
        else if (payload?.data && Array.isArray(payload.data)) setDbDepartments(payload.data);
        else setDbDepartments([]);
      })
      .catch(err => console.error("Failed to fetch departments", err));
  }, []);

  // Auto-fill department from user profile
  useEffect(() => {
    if (user?.departmentId && !departmentId) {
      setDepartmentId(user.departmentId);
    }
  }, [user?.departmentId, departmentId]);

  // When canApply becomes true and no applications exist, auto-show category selection
  useEffect(() => {
    if (!loading && canApply && applications.length === 0 && formStep === 0) {
      setFormStep(1);
    }
  }, [loading, canApply, applications.length, formStep]);

  // Scroll to top when form step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [formStep]);

  async function fetchData() {
    try {
      const [appsRes, reqsRes] = await Promise.all([
        api.get("/applications/my"),
        api.get("/reapply/my").catch(() => ({ data: [] })),
      ]);
      setApplications(appsRes.data.success ? appsRes.data.data : appsRes.data);
      const reqData = reqsRes.data.success ? reqsRes.data.data : reqsRes.data;
      setReapplyRequests(Array.isArray(reqData) ? reqData : []);
    } catch {
      // Will show empty state
    } finally {
      setLoading(false);
    }
  }

  /* ── Category double-click handler (desktop only) ── */
  const handleCategoryClick = useCallback((catValue: string) => {
    const now = Date.now();
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice) {
      // Mobile: select and advance immediately on tap
      setSelectedCategory(catValue);
      setFormStep(2);
      return;
    }

    // Desktop: double-click detection
    if (lastClickedCategory === catValue && now - lastClickTimeRef.current < 400) {
      // Double-click detected → go directly to form
      setSelectedCategory(catValue);
      setFormStep(2);
      setLastClickedCategory(null);
      lastClickTimeRef.current = 0;
    } else {
      // First click → select
      setSelectedCategory(catValue);
      setLastClickedCategory(catValue);
      lastClickTimeRef.current = now;
    }
  }, [lastClickedCategory]);

  /* ── Phone length helper ── */
  function getPhoneLength(countryCode: string): number {
    const country = countryCodes.find(c => c.code === countryCode);
    return country?.phoneLength || 10;
  }

  /* ── Form helpers ── */
  const categoryConfig = categories.find((c) => c.value === selectedCategory);

  function handleDetailChange(field: string, value: string) {
    setDetails((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user types
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setError("Please upload a JPEG or PNG image.");
      return;
    }
    const url = URL.createObjectURL(file);
    setTempPhotoUrl(url);
    setCropModalOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleCropComplete = async (croppedAreaPixels: { width: number, height: number, x: number, y: number }) => {
    try {
      if (!tempPhotoUrl) return;
      const croppedFile = await getCroppedImg(tempPhotoUrl, croppedAreaPixels, "photo.jpg");
      if (!croppedFile) return;
      if (croppedFile.size > 2 * 1024 * 1024) {
        setError("Cropped photo must be under 2MB.");
        setCropModalOpen(false);
        return;
      }
      setError("");
      setPhoto(croppedFile);
      setPhotoDimensions({ width: Math.round(croppedAreaPixels.width), height: Math.round(croppedAreaPixels.height) });
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(croppedFile);
      setCropModalOpen(false);
    } catch (e) {
      console.error(e);
      setError("Failed to crop image.");
    }
  };

  function handleSignatureChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/(jpeg|jpg|png)$/i)) {
      setError("Signature must be a JPEG or PNG image.");
      return;
    }
    const url = URL.createObjectURL(file);
    setTempSigUrl(url);
    setSigCropModalOpen(true);
    if (signatureInputRef.current) signatureInputRef.current.value = "";
  }

  const handleSigCropComplete = async (croppedAreaPixels: { width: number, height: number, x: number, y: number }) => {
    try {
      if (!tempSigUrl) return;
      const croppedFile = await getCroppedImg(tempSigUrl, croppedAreaPixels, "signature.png");
      if (!croppedFile) return;
      if (croppedFile.size > 2 * 1024 * 1024) {
        setError("Cropped signature must be under 2MB.");
        setSigCropModalOpen(false);
        return;
      }
      setError("");
      setSignature(croppedFile);
      setSigDimensions({ width: Math.round(croppedAreaPixels.width), height: Math.round(croppedAreaPixels.height) });
      const reader = new FileReader();
      reader.onloadend = () => setSignaturePreview(reader.result as string);
      reader.readAsDataURL(croppedFile);
      setSigCropModalOpen(false);
    } catch (e) {
      console.error(e);
      setError("Failed to crop signature.");
    }
  };

  /* ── Validation with red error highlighting ── */
  function validateAndProceedToReview(): boolean {
    if (!categoryConfig) return false;
    const errors: Record<string, string> = {};

    if (!departmentId) errors["departmentId"] = "Department is required";

    for (const field of categoryConfig.fields) {
      if (field === "emailChoice") {
        if (!details["emailChoice1"]?.trim()) errors["emailChoice1"] = "At least 1st preference is required";
      } else if (field === "mobileNo") {
        const phoneLen = getPhoneLength(details['countryCode'] || "+91");
        if (!details[field]?.trim()) {
          errors[field] = "Mobile number is required";
        } else if (details[field].length !== phoneLen) {
          errors[field] = `Mobile number must be ${phoneLen} digits for selected country`;
        }
      } else {
        if (!details[field]?.trim()) {
          errors[field] = `${fieldLabels[field]?.label || field} is required`;
        }
      }
    }

    if (!photo) errors["photo"] = "Photograph is required";
    if (!signature) errors["signature"] = "Signature is required";
    if (!details.applicantPlace?.trim()) errors["applicantPlace"] = "Place is required";

    // ── Cross-field validations ──
    const isStudentCategory = ["RESEARCH_SCHOLAR", "POST_GRADUATE_STUDENT", "UNDER_GRADUATE_STUDENT"].includes(categoryConfig.value);
    const dobStr = details["dateOfBirth"];

    if (dobStr) {
      const dob = new Date(dobStr);
      if (!isNaN(dob.getTime())) {
        const birthYear = dob.getFullYear();
        const currentYear = new Date().getFullYear();
        if (currentYear - birthYear < 16) {
          errors["dateOfBirth"] = "Applicant must be at least 16 years old";
        }
      }
    }

    if (isStudentCategory) {
      const admissionYear = parseInt(details["admissionAcademicYear"] || "", 10);
      const completionYear = parseInt(details["courseCompletionYear"] || "", 10);

      if (!isNaN(admissionYear) && !isNaN(completionYear)) {
        if (completionYear <= admissionYear) {
          errors["courseCompletionYear"] = "Completion year must be greater than admission year";
        } else if (completionYear - admissionYear < 1) {
          errors["courseCompletionYear"] = "Minimum 1 year gap required between admission and completion year";
        }
      }

      if (dobStr && !isNaN(admissionYear)) {
        const dob = new Date(dobStr);
        if (!isNaN(dob.getTime())) {
          const birthYear = dob.getFullYear();
          if (admissionYear - birthYear < 16) {
            errors["dateOfBirth"] = "Date of birth must be at least 16 years before admission year";
          }
          if (birthYear >= admissionYear) {
            errors["dateOfBirth"] = "Date of birth cannot be on or after the admission year";
          }
        }
      }

      if (dobStr && !isNaN(completionYear)) {
        const dob = new Date(dobStr);
        if (!isNaN(dob.getTime())) {
          const birthYear = dob.getFullYear();
          if (birthYear >= completionYear) {
            errors["dateOfBirth"] = "Date of birth cannot be on or after the completion year";
          }
        }
      }
    } else {
      // Validation for staff
      const appointmentDateStr = details["dateOfAppointment"];
      const retirementDateStr = details["dateOfRetirement"];
      
      if (appointmentDateStr && retirementDateStr) {
        const apptDate = new Date(appointmentDateStr);
        const retDate = new Date(retirementDateStr);
        if (!isNaN(apptDate.getTime()) && !isNaN(retDate.getTime())) {
          if (retDate <= apptDate) {
            errors["dateOfRetirement"] = "Date of retirement must be after the date of appointment";
          }
        }
      }

      if (dobStr && appointmentDateStr) {
        const dob = new Date(dobStr);
        const apptDate = new Date(appointmentDateStr);
        if (!isNaN(dob.getTime()) && !isNaN(apptDate.getTime())) {
          const birthYear = dob.getFullYear();
          const apptYear = apptDate.getFullYear();
          if (apptYear - birthYear < 16) {
            errors["dateOfBirth"] = "Date of birth must be at least 16 years before date of appointment";
          }
          if (birthYear >= apptYear) {
            errors["dateOfBirth"] = "Date of birth cannot be on or after the date of appointment";
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Scroll to first error
      const firstErrorKey = Object.keys(errors)[0];
      const el = document.getElementById(`field-${firstErrorKey}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }

    setFieldErrors({});
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
      addToast({ message: `Application ${result.trackingId} submitted successfully!`, variant: "success" });
      setSubmittedApp(result);
      setFormStep(4);
      // Refresh application list
      fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── PDF download ── */
  async function handleDownloadPdf(app: Application) {
    setPdfLoading(true);
    try {
      if (app.approvedPdfPath && (app.status === "APPROVED_HOD" || app.status === "APPROVED_DEAN" || app.status === "PENDING_CC" || app.status === "PROVISIONED")) {
        const response = await api.get(`/applications/${app.id}/approved-pdf`, { responseType: "blob" });
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${app.trackingId}_Approved.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        let photoDataUrl = null;
        let signatureDataUrl = null;
        try {
          const res = await api.get(`/applications/${app.id}/photo`, { responseType: "blob" });
          photoDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(res.data);
          });
        } catch (e) { console.error("Failed to load photo", e); }
        try {
          const resSig = await api.get(`/applications/${app.id}/signature`, { responseType: "blob" });
          signatureDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(resSig.data);
          });
        } catch (e) { console.error("Failed to load signature", e); }
        generateApplicationPdf(app, {
          firstName: user?.firstName || "",
          lastName: user?.lastName || "",
          email: user?.email || "",
        }, photoDataUrl, signatureDataUrl);
      }
    } catch (e) {
      console.error("PDF download failed", e);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  }

  /* ── Reapply handler ── */
  async function handleSubmitReapplyRequest() {
    if (!selectedRejectedAppId) return;
    if (!reapplyForm.reason.trim() || !reapplyForm.rollEmployeeId.trim() || !reapplyForm.applicantName.trim()) {
      addToast({ message: "Please fill in all fields.", variant: "warning" });
      return;
    }
    setReapplySubmitting(true);
    try {
      await api.post("/reapply", {
        applicationId: selectedRejectedAppId,
        reason: reapplyForm.reason.trim(),
        rollEmployeeId: reapplyForm.rollEmployeeId.trim(),
        applicantName: reapplyForm.applicantName.trim(),
      });
      addToast({ message: "Reapply request submitted successfully! Your HOD will review it.", variant: "success" });
      setShowReapplyModal(false);
      setSelectedRejectedAppId(null);
      setReapplyForm({ reason: "", rollEmployeeId: "", applicantName: "" });
      fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      addToast({ message: error.response?.data?.message || "Failed to submit request.", variant: "error" });
    } finally {
      setReapplySubmitting(false);
    }
  }

  const maxDOB = new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0];

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton" />
        <div className="h-4 w-64 skeleton" />
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* ════════════════ HEADER ════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-[32px]" style={{ fontFamily: "var(--font-serif)" }}>
            My Applications
          </h1>
          <p className="text-sm-bold text-orange-900 mt-1">
            Track the status of your email account applications
          </p>
        </div>
      </div>

      {/* ════════════════ STEPS TO FOLLOW ════════════════ */}
      <div className="bg-white rounded-xl border border-black/25 p-3 shadowp-5 mb-8 shadow-[0_0_9px_rgba(0,0,0,0.3)] hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer group">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-rounded text-[22px] text-primary">lightbulb</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-orange-700 mb-2 text-[22px]">Steps to Follow</h3>
            <ol className="text-md space-y-1.5 list-decimal list-inside text-orange-500">
              <li>Fill and submit the application form with required documents.</li>
              <li>Your application will be forwarded to the Dean(for Under-Graduate Students)/ Head of Department (HOD) for other categories for approval.</li>
              <li>After HOD/Dean approval, CC Admin will provision your email account.</li>
              <li className="text-primary font-medium">
                You will receive your @bhu.ac.in credentials via email from Google Workspace.
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* ════════════════ REAPPLY STATUS BANNERS ════════════════ */}
      {latestIsRejected && !maxLimitReached && (
        <div className="mb-6">
          {latestReapplyForRejected?.status === "PENDING" && (
            <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-container/20 px-5 py-4">
              <span className="material-symbols-rounded text-[22px] text-warning mt-0.5">hourglass_top</span>
              <div>
                <p className="text-sm font-bold text-warning">Reapply Request Pending</p>
                <p className="text-xs text-foreground/70 mt-1">Your request to re-apply has been sent to the HOD. You will be able to submit a new application once it is approved.</p>
              </div>
            </div>
          )}
          {latestReapplyForRejected?.status === "REJECTED" && (
            <div className="flex items-start gap-3 rounded-xl border border-error/30 bg-error-container/20 px-5 py-4">
              <span className="material-symbols-rounded text-[22px] text-error mt-0.5">block</span>
              <div>
                <p className="text-sm font-bold text-error">Reapply Request Denied by HOD</p>
                <p className="text-xs text-foreground/70 mt-1">{(latestApp.applicantDetails as any)?.category === "UNDER_GRADUATE_STUDENT" ? (latestReapplyForRejected.deanRemarks || "Your Dean has denied your request to re-apply.") : (latestReapplyForRejected.hodRemarks || "Your HOD has denied your request to re-apply.")}</p>
              </div>
            </div>
          )}
          {latestReapplyForRejected?.status === "APPROVED" && (
            <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success-container/20 px-5 py-4">
              <span className="material-symbols-rounded text-[22px] text-success mt-0.5">check_circle</span>
              <div>
                <p className="text-sm font-bold text-success">Reapply Request Approved!</p>
                <p className="text-xs text-foreground/70 mt-1">Your HOD has approved your request. You can now submit a new application below.</p>
              </div>
            </div>
          )}
          {!latestReapplyForRejected && (
            <div className="flex items-start gap-3 rounded-xl border border-error/30 bg-error-container/10 px-5 py-4">
              <span className="material-symbols-rounded text-[22px] text-error mt-0.5">error</span>
              <div>
                <p className="text-sm font-bold text-error">Application Rejected</p>
                <p className="text-xs text-foreground/70 mt-1 mb-3">Your last application was rejected by {(latestApp.applicantDetails as any)?.category === "UNDER_GRADUATE_STUDENT" ? "Dean" : "HOD"}{(latestApp.applicantDetails as any)?.category === "UNDER_GRADUATE_STUDENT" ? (latestApp?.deanRemarks ? `: "${latestApp.deanRemarks}"` : ".") : (latestApp?.hodRemarks ? `: "${latestApp.hodRemarks}"` : ".")} To re-apply, you must submit a request to your {(latestApp.applicantDetails as any)?.category === "UNDER_GRADUATE_STUDENT" ? "Dean" : "HOD"} for permission.</p>
                <Button icon="send" size="sm" onClick={() => { setSelectedRejectedAppId(latestApp.id); setShowReapplyModal(true); }}>Request Re-apply Permission</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {maxLimitReached && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-error/30 bg-error-container/20 px-5 py-4">
          <span className="material-symbols-rounded text-[22px] text-error mt-0.5">dangerous</span>
          <div>
            <p className="text-sm font-bold text-error">Maximum Re-apply Limit Reached</p>
            <p className="text-xs text-foreground/70 mt-1">You have reached the maximum limit of 5 rejected applications. You cannot submit any more applications.</p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          INLINE APPLICATION FORM (merged from new/page.tsx)
          ════════════════════════════════════════════════════════ */}
      {showFormSection && (
        <div className="mb-8">
          {/* ═══ STEP 1: Category Selection ═══ */}
          {(formStep === 0 || formStep === 1) && (
            <div className="bg-white rounded-2xl border border-black/25 p-6 shadow-[0_0_9px_rgba(0,0,0,0.3)]">
              <div className="mb-4">
                <h2 className="text-[22px] font-semibold text-foreground flex items-center gap-2">
                  <span className="material-symbols-rounded text-[24px] text-primary">add_circle</span>
                  New Email Application
                </h2>
                <p className="text-xs text-outline mt-1">
                  Choose the category that best describes your role at BHU. <span className="hidden sm:inline text-primary font-medium">Double-click a category to continue directly.</span>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => handleCategoryClick(cat.value)}
                    className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${selectedCategory === cat.value
                      ? "border-primary bg-primary-container/30 shadow-sm"
                      : "border-outline-variant hover:border-primary/40 hover:bg-primary-container/80"
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center gap-2 shrink-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${selectedCategory === cat.value
                          ? "bg-primary text-white"
                          : "bg-surface-variant text-outline group-hover:bg-primary-container group-hover:text-primary"
                          }`}>
                          <span className="material-symbols-rounded text-[24px]">{cat.icon}</span>
                        </div>
                        <span className={`sm:hidden text-[10px] font-medium px-2 py-0.5 rounded-full text-center ${selectedCategory === cat.value ? "bg-primary text-white" : "bg-surface-variant text-outline"
                          }`}>{cat.quota}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-foreground">{cat.label}</p>
                          <span className={`hidden sm:inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${selectedCategory === cat.value ? "bg-primary text-white" : "bg-surface-variant text-outline"
                            }`}>{cat.quota}</span>
                        </div>
                        <p className="text-xs text-outline mt-1">{cat.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                <Button icon="arrow_forward" disabled={!selectedCategory} onClick={() => setFormStep(2)}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Application Details Form ═══ */}
          {formStep === 2 && categoryConfig && (
            <div className="bg-white rounded-2xl border border-black/25 p-6 shadow-[0_0_9px_rgba(0,0,0,0.3)]">
              {/* Step indicator */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={() => setFormStep(1)} className="p-1.5 rounded-lg hover:bg-surface-variant transition-colors cursor-pointer">
                    <span className="material-symbols-rounded text-[20px] text-outline">arrow_back</span>
                  </button>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Application Details</h2>
                    <p className="text-xs text-outline">{categoryConfig.label} — {categoryConfig.quota} quota</p>
                  </div>
                  <div className="ml-auto">
                    <button onClick={() => setFormStep(1)} className="text-sm text-primary hover:text-primary-dark font-medium transition-colors cursor-pointer">
                      Change category
                    </button>
                  </div>
                </div>

                {/* Step dots */}
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((s) => (
                    <React.Fragment key={s}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${(formStep - 1) >= s ? "bg-primary text-white" : "bg-surface-variant text-outline"
                        }`}>
                        {(formStep - 1) > s ? <span className="material-symbols-rounded text-[16px]">check</span> : s}
                      </div>
                      {s < 3 && <div className={`flex-1 h-0.5 rounded-full transition-colors ${(formStep - 1) > s ? "bg-primary" : "bg-outline-variant"}`} />}
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[11px] text-outline">Category</span>
                  <span className="text-[11px] text-outline">Details</span>
                  <span className="text-[11px] text-outline">Review</span>
                </div>
              </div>

              <div className="space-y-4">
                {/* Department */}
                <div id="field-departmentId">
                  <DepartmentSelect
                    departments={dbDepartments}
                    value={departmentId}
                    onChange={(val) => {
                      setDepartmentId(val);
                      if (fieldErrors["departmentId"]) {
                        setFieldErrors(prev => { const n = { ...prev }; delete n["departmentId"]; return n; });
                      }
                    }}
                    disabled={!!user?.departmentId}
                  />
                  {fieldErrors["departmentId"] && (
                    <p className="text-xs text-error mt-1 font-medium animate-fade-in">{fieldErrors["departmentId"]}</p>
                  )}
                </div>

                {/* Dynamic Fields */}
                {categoryConfig.fields.map((field) => {
                  const config = fieldLabels[field];

                  if (field === "emailChoice") {
                    return (
                      <div key={field} id="field-emailChoice1" className="bg-surface-variant/30 rounded-xl p-5 border border-outline-variant">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="material-symbols-rounded text-[20px] text-primary">alternate_email</span>
                          <p className="text-sm font-semibold text-foreground">Choice of Email Id *</p>
                        </div>
                        <p className="text-xs text-outline mb-4">
                          Enter your preferred email handles (e.g., firstname.lastname). Default is your full name.
                        </p>
                        <div className="space-y-3">
                          {["1st", "2nd", "3rd"].map((label, idx) => (
                            <div key={label} className="flex items-center gap-0 sm:gap-3">
                              <span className="text-xs font-semibold text-outline w-8 shrink-0">{label}</span>
                              <Input
                                label={`${label} Choice`}
                                icon="mail"
                                value={details[`emailChoice${idx + 1}`] || ""}
                                onChange={(e) => handleDetailChange(`emailChoice${idx + 1}`, e.target.value.replace(/@.*/, ""))}
                                suffix="@bhu.ac.in"
                                required={idx === 0}
                              />
                            </div>
                          ))}
                        </div>
                        {fieldErrors["emailChoice1"] && (
                          <p className="text-xs text-error mt-2 font-medium animate-fade-in">{fieldErrors["emailChoice1"]}</p>
                        )}
                      </div>
                    );
                  }

                  if (field === "typeOfEmployment") {
                    const standardOptions = ["Permanent", "Contractual", "Guest Faculty"];
                    return (
                      <div key={field} id={`field-${field}`} className="space-y-3">
                        <div className="relative">
                          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline z-10">{config.icon}</span>
                          <select
                            value={isOtherEmployment ? "Other" : (details[field] || "")}
                            onChange={(e) => {
                              if (e.target.value === "Other") { setIsOtherEmployment(true); handleDetailChange(field, ""); }
                              else { setIsOtherEmployment(false); handleDetailChange(field, e.target.value); }
                            }}
                            className={`w-full rounded-lg border-2 ${fieldErrors[field] ? "border-error" : "border-outline-variant"} bg-surface px-4 py-3 text-sm text-foreground pl-11 appearance-none hover:border-outline focus:border-primary focus:outline-none transition-colors cursor-pointer`}
                            required
                          >
                            <option value="">Select Employment Type *</option>
                            {standardOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            <option value="Other">Other</option>
                          </select>
                          <span className="material-symbols-rounded absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-outline pointer-events-none">expand_more</span>
                        </div>
                        {isOtherEmployment && (
                          <Input label="Specify Employment Type *" icon="edit" value={details[field] || ""} onChange={(e) => handleDetailChange(field, e.target.value)} required />
                        )}
                        {fieldErrors[field] && <p className="text-xs text-error mt-1 font-medium animate-fade-in">{fieldErrors[field]}</p>}
                      </div>
                    );
                  }

                  if (field === "admissionAcademicYear" || field === "courseCompletionYear") {
                    const currentYear = new Date().getFullYear();
                    const years = Array.from({ length: 50 }, (_, i) => currentYear - 30 + i);
                    return (
                      <div key={field} id={`field-${field}`}>
                        <div className="relative">
                          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline z-10">{config.icon}</span>
                          <select
                            value={details[field] || ""}
                            onChange={(e) => handleDetailChange(field, e.target.value)}
                            className={`w-full rounded-lg border-2 ${fieldErrors[field] ? "border-error" : "border-outline-variant"} bg-surface px-4 py-3 text-sm text-foreground pl-11 appearance-none hover:border-outline focus:border-primary focus:outline-none transition-colors cursor-pointer`}
                            required
                          >
                            <option value="">{config.label} *</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <span className="material-symbols-rounded absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-outline pointer-events-none">expand_more</span>
                        </div>
                        {fieldErrors[field] && <p className="text-xs text-error mt-1 font-medium animate-fade-in">{fieldErrors[field]}</p>}
                      </div>
                    );
                  }

                  if (field === "mobileNo") {
                    const phoneLen = getPhoneLength(details['countryCode'] || "+91");
                    return (
                      <div key={field} id={`field-${field}`}>
                        <div className="flex gap-2">
                          <CountryCodeSelect
                            value={details['countryCode'] || "+91"}
                            onChange={(val) => handleDetailChange('countryCode', val)}
                          />
                          <div className="flex-1">
                            <Input
                              label={`${config.label} * (${phoneLen} digits)`}
                              icon={config.icon}
                              type="tel"
                              value={details[field] || ""}
                              onChange={(e) => handleDetailChange(field, e.target.value.replace(/\D/g, ""))}
                              maxLength={phoneLen}
                              required
                            />
                          </div>
                        </div>
                        {fieldErrors[field] && <p className="text-xs text-error mt-1 font-medium animate-fade-in">{fieldErrors[field]}</p>}
                      </div>
                    );
                  }

                  if (field === "nationality") {
                    return (
                      <div key={field} id={`field-${field}`}>
                        <NationalitySelect
                          value={details[field] || ""}
                          onChange={(val) => handleDetailChange(field, val)}
                        />
                        {fieldErrors[field] && <p className="text-xs text-error mt-1 font-medium animate-fade-in">{fieldErrors[field]}</p>}
                      </div>
                    );
                  }

                  // Default input field
                  let onChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => handleDetailChange(field, e.target.value);
                  if (field === "facultyInstituteCentre") onChangeHandler = (e) => handleDetailChange(field, e.target.value.replace(/[0-9]/g, ""));
                  else if (field === "employeeId") onChangeHandler = (e) => handleDetailChange(field, e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase());
                  else if (field === "enrollmentNo") onChangeHandler = (e) => handleDetailChange(field, e.target.value.toUpperCase());
                  else if (field === "designation") onChangeHandler = (e) => handleDetailChange(field, e.target.value.replace(/[0-9]/g, ""));
                  else if (field === "programEnrolled") onChangeHandler = (e) => handleDetailChange(field, e.target.value.replace(/[^a-zA-Z\s.]/g, ""));
                  else if (field === "dateOfBirth") onChangeHandler = (e) => {
                    const val = e.target.value;
                    if (val && val > maxDOB) { addToast({ message: "Age must be at least 16 years", variant: "warning" }); handleDetailChange(field, ""); }
                    else handleDetailChange(field, val);
                  };

                  return (
                    <div key={field} id={`field-${field}`}>
                      <Input
                        label={config.label + " *"}
                        icon={config.icon}
                        type={config.type || "text"}
                        value={details[field] || ""}
                        onChange={onChangeHandler}
                        max={field === "dateOfBirth" ? maxDOB : undefined}
                        required
                      />
                      {fieldErrors[field] && <p className="text-xs text-error mt-1 font-medium animate-fade-in">{fieldErrors[field]}</p>}
                    </div>
                  );
                })}

                {/* Photo Upload */}
                <div id="field-photo">
                  <p className="text-sm font-semibold text-foreground mb-2">Certified Photograph *</p>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${fieldErrors["photo"] ? "border-error bg-error-container/5" :
                      photo ? "border-success bg-success-container/10" : "border-outline-variant hover:border-primary hover:bg-primary/3"
                      }`}
                  >
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png" className="hidden" onChange={handlePhotoChange} />
                    {photoPreview ? (
                      <div className="flex items-center gap-4">
                        <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-xl object-cover border border-outline-variant" />
                        <div className="text-left flex-1">
                          <p className="text-sm font-medium text-foreground">{photo?.name}</p>
                          <p className="text-xs text-outline mt-0.5">
                            {((photo?.size || 0) / 1024).toFixed(0)} KB • {photo?.type}
                            {photoDimensions && ` • ${photoDimensions.width}x${photoDimensions.height} px`}
                          </p>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setPhoto(null); setPhotoPreview(null); }} className="text-xs text-error font-medium mt-1 hover:underline cursor-pointer">Remove</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setPhotoModalOpen(true); }} className="text-xs text-primary font-medium mt-1 hover:underline cursor-pointer ml-3">View Full Size</button>
                        </div>
                        <span className="material-symbols-rounded text-[24px] text-success">check_circle</span>
                      </div>
                    ) : (
                      <>
                        <span className="material-symbols-rounded text-[40px] text-outline/50 mb-2">add_photo_alternate</span>
                        <p className="text-sm text-outline">Click to upload your photograph</p>
                        <p className="text-xs text-outline/60 mt-1">JPEG or PNG, max 2MB. Aspect Ratio: 3:4 (e.g. 300x400 pixels)</p>
                      </>
                    )}
                  </div>
                  {fieldErrors["photo"] && <p className="text-xs text-error mt-1 font-medium animate-fade-in">{fieldErrors["photo"]}</p>}
                </div>

                {/* Signature Upload */}
                <div id="field-signature">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-foreground">Certified Signature *</p>
                  </div>

                    <div
                      onClick={() => signatureInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${fieldErrors["signature"] ? "border-error bg-error-container/5" :
                        signature ? "border-success bg-success-container/10" : "border-outline-variant hover:border-primary hover:bg-primary/3"
                        }`}
                    >
                      <input ref={signatureInputRef} type="file" accept="image/jpeg,image/jpg,image/png" className="hidden" onChange={handleSignatureChange} />
                      {signaturePreview ? (
                        <div className="flex items-center gap-4">
                          <img src={signaturePreview} alt="Signature Preview" className="w-20 h-20 rounded-xl object-contain border border-outline-variant bg-white" />
                          <div className="text-left flex-1">
                            <p className="text-sm font-medium text-foreground">{signature?.name}</p>
                            <p className="text-xs text-outline mt-0.5">
                              {((signature?.size || 0) / 1024).toFixed(0)} KB • {signature?.type}
                              {sigDimensions && ` • ${sigDimensions.width}x${sigDimensions.height} px`}
                            </p>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setSignature(null); setSignaturePreview(null); }} className="text-xs text-error font-medium mt-1 hover:underline cursor-pointer">Remove</button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setSignatureModalOpen(true); }} className="text-xs text-primary font-medium mt-1 hover:underline cursor-pointer ml-3">View Full Size</button>
                          </div>
                          <span className="material-symbols-rounded text-[24px] text-success">check_circle</span>
                        </div>
                      ) : (
                        <>
                          <span className="material-symbols-rounded text-[40px] text-outline/50 mb-2">upload_file</span>
                          <p className="text-sm text-outline">Click to upload your signature</p>
                          <p className="text-xs text-outline/60 mt-1">JPEG or PNG, max 2MB. Aspect Ratio: 3:1 (e.g. 300x100 pixels)</p>
                        </>
                      )}
                    </div>
                  {fieldErrors["signature"] && <p className="text-xs text-error mt-1 font-medium animate-fade-in">{fieldErrors["signature"]}</p>}
                </div>

                {/* Place & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <div id="field-applicantPlace">
                    <Input
                      label="Place *"
                      icon="location_on"
                      value={details.applicantPlace || ""}
                      onChange={(e) => handleDetailChange("applicantPlace", e.target.value.replace(/[^a-zA-Z\s]/g, "").toUpperCase())}
                      required
                      placeholder="e.g. Varanasi"
                    />
                    {fieldErrors["applicantPlace"] && <p className="text-xs text-error mt-1 font-medium animate-fade-in">{fieldErrors["applicantPlace"]}</p>}
                  </div>
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
                    <span className="material-symbols-rounded text-[18px]">error</span>
                    {error}
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <Button variant="outlined" onClick={() => setFormStep(1)}>Back</Button>
                  <Button
                    icon="arrow_forward"
                    onClick={() => {
                      setError("");
                      if (validateAndProceedToReview()) setFormStep(3);
                    }}
                  >
                    Review Application
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Review & Submit ═══ */}
          {formStep === 3 && categoryConfig && (
            <div className="bg-white rounded-2xl border border-black/25 p-6 shadow-[0_0_9px_rgba(0,0,0,0.3)] space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Review Your Application</h2>
                <p className="text-sm text-outline">Please verify all details before submitting.</p>
              </div>

              {/* ⚠️ Warning banner */}
              <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-container/20 px-5 py-4">
                <span className="material-symbols-rounded text-[22px] text-warning mt-0.5">warning</span>
                <div>
                  <p className="text-sm font-bold text-warning">Important Notice</p>
                  <p className="text-xs text-foreground/70 mt-1">
                    Once submitted, you <strong>cannot edit</strong> any details. Please review all information carefully.
                    To make changes after submission, you will need to contact CC Admin.
                  </p>
                  <p className="text-xs text-foreground/70 mt-1">
                    <strong>Save your Reference ID</strong> and <strong>download the preview form</strong> for your records.
                  </p>
                </div>
              </div>

              {/* Summary card */}
              <div className="bg-surface rounded-2xl border border-outline-variant overflow-hidden">
                <div className="bg-primary-container/40 px-5 py-3 flex items-center justify-between border-b border-outline-variant">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-rounded text-[22px] text-primary">{categoryConfig.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{categoryConfig.label}</p>
                      <p className="text-xs text-outline">{dbDepartments.find((d) => d.id === departmentId)?.name}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold">{categoryConfig.quota}</span>
                </div>

                <div className="p-5 grid grid-cols-2 gap-3">
                  <div className="bg-surface-variant/40 rounded-lg px-3 py-2 col-span-2 sm:col-span-1">
                    <p className="text-[10px] uppercase tracking-wider text-outline font-medium">Name</p>
                    <p className="text-sm text-foreground font-medium">{user?.firstName} {user?.lastName}</p>
                  </div>
                  <div className="bg-surface-variant/40 rounded-lg px-3 py-2 col-span-2 sm:col-span-1">
                    <p className="text-[10px] uppercase tracking-wider text-outline font-medium">Alternate Email</p>
                    <p className="text-sm text-foreground font-medium lowercase">{user?.email}</p>
                  </div>
                  {categoryConfig.fields.map((field) => {
                    if (field === "emailChoice") {
                      return (
                        <div key={field} className="col-span-2 bg-surface-variant/40 rounded-lg px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wider text-outline font-medium mb-1">Choice of Email Id</p>
                          <div className="space-y-0.5">
                            {[1, 2, 3].map((n) => {
                              const choiceVal = details[`emailChoice${n}`];
                              const displayVal = choiceVal && !choiceVal.includes('@') ? `${choiceVal}@bhu.ac.in` : choiceVal;
                              return displayVal && (
                                <p key={n} className="text-sm text-foreground font-medium">
                                  {n === 1 ? "1st" : n === 2 ? "2nd" : "3rd"}: {displayVal}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={field} className="bg-surface-variant/40 rounded-lg px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-outline font-medium">{fieldLabels[field].label}</p>
                        <p className="text-sm text-foreground font-medium">{details[field]}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="px-5 pb-5 flex flex-wrap items-center gap-6">
                  {photoPreview && (
                    <div className="flex items-center gap-3">
                      <img src={photoPreview} alt="Photo" className="w-14 h-14 rounded-xl object-cover border border-outline-variant" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-outline font-medium mb-0.5">Photo</p>
                        <p className="text-xs font-medium text-foreground">{photo?.name || "Uploaded"}</p>
                        <p className="text-[11px] text-outline">{((photo?.size || 0) / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                  )}
                  {signaturePreview && (
                    <div className="flex items-center gap-3">
                      <img src={signaturePreview} alt="Signature" className="w-20 h-10 rounded-lg object-contain border border-outline-variant bg-white" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-outline font-medium mb-0.5">Signature</p>
                        <p className="text-xs font-medium text-foreground">{signature?.name || "Captured"}</p>
                        <p className="text-[11px] text-outline">{((signature?.size || 0) / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Undertaking & IT Policy Agreement */}
              <div className="bg-surface-variant/30 rounded-xl p-5 border border-outline-variant">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="material-symbols-rounded text-[18px] text-warning">policy</span>
                  Undertaking & IT Policy Agreement
                </h4>
                <p className="text-xs text-error font-semibold mb-3 flex items-center gap-1">
                  <span className="material-symbols-rounded text-[14px]">info</span>
                  Please read the following undertaking carefully before proceeding.
                </p>
                <div className="text-xs text-outline space-y-3 mb-4 max-h-52 overflow-y-auto pr-2 border border-outline-variant/50 rounded-lg p-4 bg-surface">
                  <p className="font-semibold text-foreground text-sm mb-2">Undertaking:</p>
                  <div className="space-y-2">
                    <p><span className="font-bold text-foreground">i)</span> The university email account is intended for official use related to University work and it must be used for academic activities only.</p>
                    <p><span className="font-bold text-foreground">ii)</span> All users must check their email accounts regularly for academic, administrative, and official communications. Failure to do so may result in missed important information. All official communication must be made using the (…@bhu.ac.in) E-mail id. Communications sent from any other E-mail ID may not be considered official or valid.</p>
                    <p><span className="font-bold text-foreground">iii)</span> Users are prohibited from using their university email accounts to:</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Send harmful software, malware, or viruses.</li>
                      <li>Misrepresent the identity of the sender.</li>
                      <li>Engage in the distribution of offensive, illegal, or inappropriate content.</li>
                    </ul>
                    <p><span className="font-bold text-foreground">iv)</span> Users must take all necessary steps to secure their email accounts, including maintaining password confidentiality and regularly backing up important data. The Computer Centre (CC) is not responsible for restoring lost data.</p>
                    <p><span className="font-bold text-foreground">v)</span> Users should regularly delete unnecessary emails and large attachments to manage mailbox space effectively. Important emails should be archived, and users should take periodic backups.</p>
                    <p><span className="font-bold text-foreground">vi)</span> The maximum E-mail size for <span className="font-bold text-foreground">{categoryConfig?.label || "your category"}</span> will be <span className="font-bold text-primary">{categoryConfig?.quota || "5 GB"}</span>.</p>
                    <p><span className="font-bold text-foreground">vii)</span> User email accounts will remain active for one year after retirement, after that email account will be deactivated and it may be deleted.</p>
                    <p><span className="font-bold text-foreground">viii)</span> University email Policy must be applicable to all E-mail users.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={policyAccepted}
                      onChange={(e) => setPolicyAccepted(e.target.checked)}
                      className="w-4 h-4 shrink-0 mt-0.5 rounded border-2 border-outline-variant text-primary focus:ring-primary accent-primary cursor-pointer"
                    />
                    <span className="text-sm text-foreground font-medium">I have read and understood the above undertaking and I agree to abide by the BHU IT Usage Policy, including responsible use of institutional email, prohibition of sharing credentials, compliance with data protection guidelines, and acceptable use of Google Workspace services.</span>
                  </label>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-error-container px-4 py-3 text-sm text-error animate-fade-in">
                  <span className="material-symbols-rounded text-[18px]">error</span>
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4">
                <Button variant="outlined" onClick={() => setFormStep(2)} className="w-full sm:w-auto">Back</Button>
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  <Button
                    variant="outlined"
                    icon="download"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      const previewData = {
                        trackingId: "PREVIEW",
                        status: "DRAFT",
                        createdAt: new Date().toISOString(),
                        department: dbDepartments.find((d) => d.id === departmentId),
                        applicantDetails: { ...details, category: selectedCategory },
                      };
                      generateApplicationPdf(previewData, {
                        firstName: user?.firstName || "",
                        lastName: user?.lastName || "",
                        email: user?.email || "",
                      }, photoPreview, signaturePreview);
                    }}
                  >
                    Download Preview
                  </Button>
                  <Button icon="send" disabled={!policyAccepted || submitting} loading={submitting} onClick={handleSubmit} size="lg" className="w-full sm:w-auto">
                    Submit Application
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 4: Success ═══ */}
          {formStep === 4 && submittedApp && (
            <div className="bg-white rounded-2xl border border-black/25 p-6 shadow-[0_0_9px_rgba(0,0,0,0.3)] space-y-6 text-center py-10 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-success-container flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-rounded text-[40px] text-success">check_circle</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Application Submitted</h2>
              <p className="text-sm text-outline max-w-md mx-auto">
                Your application for BHU institutional email has been successfully submitted.
              </p>
              <div className="bg-primary-container/30 rounded-xl px-5 py-4 max-w-sm mx-auto">
                <p className="text-xs text-outline font-medium uppercase tracking-wider mb-1">Your Reference ID</p>
                <p className="text-xl font-bold text-primary">{submittedApp.trackingId}</p>
                <p className="text-xs text-foreground/70 mt-2">
                  Save your Reference ID and download the preview form for your records.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
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
                <Button icon="visibility" size="lg" onClick={() => { setFormStep(0); setExpandedAppId(submittedApp.id); }}>
                  View My Applications
                </Button>
              </div>
            </div>
          )}
        </div>
      )}


      {/* ════════════════════════════════════════════════════════
          APPLICATIONS LIST — INLINE ACCORDION
          ════════════════════════════════════════════════════════ */}
      {applications.length > 0 && (
        <div className="space-y-3">
          {applications.map((app) => {
            const isExpanded = expandedAppId === app.id;
            return (
              <div key={app.id} className="bg-white rounded-xl border border-black/25 shadow-[0_0_9px_rgba(0,0,0,0.3)] hover:shadow-md hover:border-primary/20 transition-all duration-200 overflow-hidden">
                {/* Row header — click to expand/collapse */}
                <div
                  onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                  className="p-5 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-rounded text-[22px] text-primary">mail</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 mb-.5">
                          <p className="font-semibold text-foreground text-md">Ref. No: {app.trackingId}</p>
                          <StatusBadge status={app.status} size="sm" />
                        </div>
                        <p className="text-xs text-orange-800">
                          {app.department?.name || "—"} • Submitted{" "}
                          {new Date(app.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <span className={`material-symbols-rounded text-[20px] text-outline group-hover:text-primary transition-all duration-200 ${isExpanded ? "rotate-90" : ""}`}>
                      chevron_right
                    </span>
                  </div>
                </div>

                {/* Expanded details — slide down */}
                {isExpanded && (
                  <div className="border-t border-outline-variant px-5 pb-5 pt-4 space-y-5 animate-fade-in">
                    {/* Horizontal Progress Bar */}
                    <div className="bg-surface-variant/30 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                        <span className="material-symbols-rounded text-[18px] text-primary">timeline</span>
                        Application Progress
                      </h4>
                      <HorizontalProgressBar status={app.status} category={(app.applicantDetails as any)?.category} />
                    </div>

                    {/* Digitally Signed Card */}
                    {(app.status === "APPROVED_HOD" || app.status === "APPROVED_DEAN" || app.status === "PENDING_CC" || app.status === "PROVISIONED") && app.digitalSignatureHash && (
                      <div className="bg-gradient-to-r from-success-container/40 to-primary-container/30 rounded-xl px-5 py-4 border border-success/25">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="material-symbols-rounded text-[22px] text-success">verified</span>
                          <p className="text-sm font-bold text-success">Digitally Signed & Approved by {app.applicantDetails?.category === "UNDER_GRADUATE_STUDENT" ? "Dean" : "HOD"}</p>
                        </div>
                        {app.hodApprovedAt && (
                          <p className="text-xs text-foreground/70 mb-1">
                            <span className="font-medium">Approved on:</span>{" "}
                            {new Date(app.hodApprovedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 bg-surface/60 rounded-lg px-3 py-2">
                          <span className="material-symbols-rounded text-[14px] text-outline">fingerprint</span>
                          <p className="text-[11px] font-mono text-outline tracking-wider">
                            Hash: {app.digitalSignatureHash.substring(0, 24).toUpperCase()}…
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Details Grid */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Application Details</h4>

                      {(app.deanRemarks || app.hodRemarks) && (
                        <div className="mb-4 bg-surface p-3 rounded-lg border border-outline-variant/30">
                          <p className="text-xs text-outline font-semibold uppercase tracking-wider mb-1">{(app.applicantDetails as any)?.category === "UNDER_GRADUATE_STUDENT" ? "Dean" : "HOD"} Remarks</p>
                          <p className="text-sm text-foreground">{app.deanRemarks || app.hodRemarks}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-surface-variant/30 rounded-lg px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wider text-outline font-medium">Name</p>
                          <p className="text-sm text-foreground font-medium truncate">{user?.firstName} {user?.lastName}</p>
                        </div>
                        <div className="bg-surface-variant/30 rounded-lg px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wider text-outline font-medium">Alternate Email</p>
                          <p className="text-sm text-foreground font-medium truncate lowercase">{user?.email}</p>
                        </div>
                        {Object.entries(app.applicantDetails || {}).map(([key, val]) => {
                          let displayVal = String(val);
                          if (key.startsWith("emailChoice") && displayVal && !displayVal.includes("@")) {
                            displayVal = `${displayVal}@bhu.ac.in`;
                          }
                          return (
                            <div key={key} className="bg-surface-variant/30 rounded-lg px-3 py-2">
                              <p className="text-[10px] uppercase tracking-wider text-outline font-medium">
                                {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                              </p>
                              <p className="text-sm text-foreground font-medium truncate">{displayVal}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Remarks */}
                    {app.hodRemarks && (
                      <div className="bg-primary-container/30 rounded-xl px-5 py-4">
                        <p className="text-xs font-semibold text-primary mb-1">{(app.applicantDetails as any)?.category === "UNDER_GRADUATE_STUDENT" ? "Dean Remarks" : "HOD Remarks"}</p>
                        <p className="text-sm text-foreground">{app.hodRemarks}</p>
                      </div>
                    )}
                    {app.ccAdminRemarks && (
                      <div className="bg-tertiary-container/30 rounded-xl px-5 py-4">
                        <p className="text-xs font-semibold text-tertiary mb-1">CC Admin Remarks</p>
                        <p className="text-sm text-foreground">{app.ccAdminRemarks}</p>
                      </div>
                    )}

                    {/* Provisioned Info */}
                    {app.status === "PROVISIONED" && (
                      <div className="bg-success-container/30 rounded-xl px-5 py-4 border border-success/20">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-rounded text-[20px] text-success">verified</span>
                          <p className="text-sm font-bold text-success">Account Provisioned</p>
                        </div>
                        <p className="text-sm text-foreground">Your BHU email account has been provisioned. Credentials have been sent to your alternate email address.</p>
                        {app.quotaAssignedGB && <p className="text-xs text-outline mt-2">Storage Quota: {app.quotaAssignedGB} GB</p>}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-4 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-end gap-3">
                      <Button
                        icon={app.approvedPdfPath ? "verified" : "download"}
                        size="md"
                        loading={pdfLoading}
                        onClick={() => handleDownloadPdf(app)}
                      >
                        {app.approvedPdfPath ? "Download Signed PDF" : "Download Draft PDF"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════ REAPPLY REQUESTS SECTION ════════════════ */}
      {rejectedCount > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-serif)" }}>
            <span className="material-symbols-rounded text-[22px] text-primary">replay</span>
            Reapply Requests
          </h2>

          <div className="space-y-3 mb-6">
            {rejectedApps.map((app) => {
              const existingReq = reapplyRequests.find((r) => r.applicationId === app.id);
              return (
                <div key={app.id} className="bg-white rounded-xl border border-error/20 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-error-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-rounded text-[20px] text-error">close</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">Ref: {app.trackingId}</p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-error-container text-error">REJECTED</span>
                          {existingReq && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${existingReq.status === "PENDING" ? "bg-warning-container text-warning"
                              : existingReq.status === "APPROVED" ? "bg-success-container text-success"
                                : "bg-error-container text-error"
                              }`}>Request: {existingReq.status}</span>
                          )}
                        </div>
                        <p className="text-xs text-outline">
                          {app.department?.name} • Submitted {new Date(app.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        {(app.deanRemarks || app.hodRemarks) && <p className="text-xs text-error/80 mt-1"><span className="font-medium">{(app.applicantDetails as any)?.category === "UNDER_GRADUATE_STUDENT" ? "Dean Remarks:" : "HOD Remarks:"}</span> {app.deanRemarks || app.hodRemarks}</p>}
                        {(existingReq?.deanRemarks || existingReq?.hodRemarks) && existingReq.status !== "PENDING" && (
                          <p className="text-xs text-primary mt-1"><span className="font-medium">Request Response:</span> {existingReq.deanRemarks || existingReq.hodRemarks}</p>
                        )}
                      </div>
                    </div>
                    {!existingReq && !maxLimitReached && (
                      <Button icon="send" size="sm" onClick={() => { setSelectedRejectedAppId(app.id); setShowReapplyModal(true); }}>
                        Request Re-apply
                      </Button>
                    )}
                    {existingReq && (
                      <span className={`material-symbols-rounded text-[22px] shrink-0 ${existingReq.status === "PENDING" ? "text-warning"
                        : existingReq.status === "APPROVED" ? "text-success"
                          : "text-error"
                        }`}>
                        {existingReq.status === "PENDING" ? "hourglass_top" : existingReq.status === "APPROVED" ? "check_circle" : "cancel"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {maxLimitReached && (
            <div className="flex items-start gap-3 rounded-xl border border-error/30 bg-error-container/20 px-5 py-4">
              <span className="material-symbols-rounded text-[22px] text-error mt-0.5">dangerous</span>
              <div>
                <p className="text-sm font-bold text-error">Maximum Re-apply Limit Reached</p>
                <p className="text-xs text-foreground/70 mt-1">You have reached the maximum limit of 5 rejected applications.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════ MODALS ════════════════ */}

      {/* Photo Preview Modal */}
      <Modal isOpen={photoModalOpen} onClose={() => setPhotoModalOpen(false)} title="Photo Preview" size="md">
        {photoPreview && (
          <div className="flex justify-center p-4">
            <img src={photoPreview} alt="Full Size Preview" className="max-w-full max-h-[60vh] rounded-xl object-contain border border-outline-variant" />
          </div>
        )}
      </Modal>

      {/* Signature Preview Modal */}
      <Modal isOpen={signatureModalOpen} onClose={() => setSignatureModalOpen(false)} title="Signature Preview" size="md">
        {signaturePreview && (
          <div className="flex justify-center p-4">
            <img src={signaturePreview} alt="Full Size Signature" className="max-w-full max-h-[60vh] rounded-xl object-contain border border-outline-variant bg-white" />
          </div>
        )}
      </Modal>

      {/* Image Croppers */}
      {cropModalOpen && tempPhotoUrl && (
        <ImageCropper imageSrc={tempPhotoUrl} onCropComplete={handleCropComplete} onCancel={() => setCropModalOpen(false)} aspectRatio={3 / 4} title="Crop Photo (3:4 Ratio)" />
      )}
      {sigCropModalOpen && tempSigUrl && (
        <ImageCropper imageSrc={tempSigUrl} onCropComplete={handleSigCropComplete} onCancel={() => setSigCropModalOpen(false)} aspectRatio={3 / 1} title="Crop Signature (3:1 Ratio)" />
      )}

      {/* Reapply Request Modal */}
      <Modal isOpen={showReapplyModal} onClose={() => setShowReapplyModal(false)} title="Request Re-apply Permission" size="md">
        {(() => {
          const rejectedApp = applications.find(a => a.id === selectedRejectedAppId);
          const rejectedCategory = (rejectedApp?.applicantDetails as any)?.category || "";
          const isStudent = ["PHD_PG_STUDENT", "UNDER_GRADUATE_STUDENT"].includes(rejectedCategory);
          const idLabel = isStudent ? "Roll / Enrollment Number" : "Employee ID";
          const idPlaceholder = isStudent ? "e.g., 21012345" : "e.g., EMP-12345";
          return (
        <div className="space-y-5">
          <div className="bg-primary-container/20 rounded-xl px-4 py-3">
            <p className="text-xs text-outline">This request will be sent to your department's HOD or Dean. Once approved, you can submit a new application.</p>
            <p className="text-[11px] text-outline/60 mt-1">Requests used: {reapplyRequests.length} / 5</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Full Name <span className="text-error">*</span></label>
            <input
              type="text"
              value={reapplyForm.applicantName}
              onChange={(e) => setReapplyForm((f) => ({ ...f, applicantName: e.target.value }))}
              placeholder="Enter your full name"
              className="w-full rounded-lg border-2 border-outline-variant bg-surface px-4 py-2.5 text-sm text-foreground placeholder-outline/50 focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">{idLabel} <span className="text-error">*</span></label>
            <input
              type="text"
              value={reapplyForm.rollEmployeeId}
              onChange={(e) => setReapplyForm((f) => ({ ...f, rollEmployeeId: e.target.value }))}
              placeholder={idPlaceholder}
              className="w-full rounded-lg border-2 border-outline-variant bg-surface px-4 py-2.5 text-sm text-foreground placeholder-outline/50 focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Reason for Re-applying <span className="text-error">*</span></label>
            <textarea
              value={reapplyForm.reason}
              onChange={(e) => setReapplyForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Explain why you need to re-apply..."
              rows={4}
              className="w-full rounded-lg border-2 border-outline-variant bg-surface px-4 py-3 text-sm text-foreground placeholder-outline/50 focus:border-primary focus:outline-none transition-colors resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outlined" onClick={() => setShowReapplyModal(false)}>Cancel</Button>
            <Button icon="send" loading={reapplySubmitting} onClick={handleSubmitReapplyRequest}>Submit Request</Button>
          </div>
        </div>
          );
        })()}
      </Modal>
    </div>
  );
}
