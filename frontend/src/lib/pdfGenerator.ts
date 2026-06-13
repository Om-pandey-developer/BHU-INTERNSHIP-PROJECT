import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Field label mapping (same as form)
const fieldLabels: Record<string, string> = {
  designation: "Designation",
  dateOfAppointment: "Date of Appointment",
  employeeId: "Employee ID",
  typeOfEmployment: "Type of Employment",
  dateOfRetirement: "Date of Retirement",
  programEnrolled: "Program Enrolled",
  admissionAcademicYear: "Admission Academic Year",
  enrollmentNo: "Enrollment Number",
  courseCompletionYear: "Course Completion Year",
  facultyInstituteCentre: "Faculty / Institute / Centre",
  dateOfBirth: "Date of Birth",
  nationality: "Nationality",
  mobileNo: "Mobile Number",
  category: "Category",
};

const categoryLabels: Record<string, string> = {
  GROUP_A_OFFICER: "Group A Officer",
  TEACHING_STAFF: "Teaching Staff",
  NON_TEACHING_STAFF: "Non-Teaching Staff",
  RESEARCH_SCHOLAR: "Research Scholar",
  POST_GRADUATE_STUDENT: "Post Graduate Student",
};

interface ApplicationData {
  trackingId: string;
  status: string;
  createdAt: string;
  department?: { name: string };
  applicantDetails: Record<string, unknown>;
  applicant?: { firstName: string; lastName: string; alternateEmail: string };
}

/**
 * Generate a PDF preview of the application form.
 * Uses jsPDF and jspdf-autotable for structured output.
 */
export function generateApplicationPdf(
  app: ApplicationData,
  userName?: { firstName: string; lastName: string }
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Header ──
  doc.setFillColor(103, 80, 164); // Primary color
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("BANARAS HINDU UNIVERSITY", pageWidth / 2, 14, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("COMPUTER CENTRE", pageWidth / 2, 22, { align: "center" });

  doc.setFontSize(9);
  doc.text("Application Form of BHU Domain E-Mail ID", pageWidth / 2, 30, {
    align: "center",
  });

  // ── Tracking Info ──
  doc.setTextColor(33, 33, 33);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Reference No: ${app.trackingId}`, 14, 45);

  doc.setFont("helvetica", "normal");
  doc.text(
    `Date: ${new Date(app.createdAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`,
    pageWidth - 14,
    45,
    { align: "right" }
  );

  doc.text(
    `Status: ${app.status.replace(/_/g, " ")}`,
    pageWidth - 14,
    51,
    { align: "right" }
  );

  // ── Applicant Name ──
  const applicantName = app.applicant
    ? `${app.applicant.firstName} ${app.applicant.lastName}`
    : userName
    ? `${userName.firstName} ${userName.lastName}`
    : "—";

  const details = app.applicantDetails || {};
  const category =
    categoryLabels[(details.category as string) || ""] ||
    String(details.category || "—");

  // ── Build table data ──
  const tableData: [string, string][] = [];

  tableData.push(["Name of the Applicant", applicantName]);
  tableData.push(["Category", category]);
  tableData.push(["Department", app.department?.name || "—"]);

  // Add all detail fields
  for (const [key, value] of Object.entries(details)) {
    if (key === "category") continue; // Already shown
    if (key.startsWith("emailChoice")) {
      // Handle email choices separately below
      continue;
    }

    const label =
      fieldLabels[key] ||
      key
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .trim();
    tableData.push([label, String(value || "—")]);
  }

  // Email choices
  const emailChoices = [
    details.emailChoice1,
    details.emailChoice2,
    details.emailChoice3,
  ].filter(Boolean);
  if (emailChoices.length > 0) {
    tableData.push([
      "Choice of Email Id",
      emailChoices
        .map((c, i) => `${i + 1}${i === 0 ? "st" : i === 1 ? "nd" : "rd"}: ${c}`)
        .join(", "),
    ]);
  }

  // Alternate email
  if (app.applicant?.alternateEmail) {
    tableData.push(["Alternate E-mail Id", app.applicant.alternateEmail]);
  }

  // ── Render table ──
  autoTable(doc, {
    startY: 58,
    head: [["Field", "Details"]],
    body: tableData,
    styles: {
      fontSize: 10,
      cellPadding: 4,
      lineColor: [202, 196, 208],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [234, 221, 255],
      textColor: [33, 0, 93],
      fontStyle: "bold",
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [252, 249, 248],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 65 },
    },
    margin: { left: 14, right: 14 },
  });

  // ── Undertaking Section ──
  const finalY = (doc as any).lastAutoTable?.finalY || 180;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Undertaking:", 14, finalY + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const undertaking = [
    "i) The university email account is intended for official use related to University work.",
    "ii) All users must check their email accounts regularly for academic, administrative, and official communications.",
    "iii) Users are prohibited from sending harmful software, malware, or viruses.",
    "iv) Users must take all necessary steps to secure their email accounts.",
    "v) Users should regularly delete unnecessary emails and large attachments.",
    "vi) University email Policy must be applicable to all email users.",
  ];

  let yPos = finalY + 18;
  for (const line of undertaking) {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(line, 14, yPos);
    yPos += 5;
  }

  // ── Signature lines ──
  yPos += 10;
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(9);
  doc.text("Date: _______________", 14, yPos);
  doc.text("(Signature of the Applicant)", pageWidth - 14, yPos, {
    align: "right",
  });

  yPos += 15;
  doc.setFont("helvetica", "bold");
  doc.text("Declaration by the Head of the Department", pageWidth / 2, yPos, {
    align: "center",
  });

  yPos += 8;
  doc.setFont("helvetica", "normal");
  doc.text(
    `This is to certify that ${applicantName} is working in our Department.`,
    14,
    yPos
  );
  doc.text("Please issue him/her Email ID for his/her work.", 14, yPos + 5);

  yPos += 18;
  doc.text("Date: _______________", 14, yPos);
  doc.text(
    "(Signature of the Head of the Department with Seal)",
    pageWidth - 14,
    yPos,
    { align: "right" }
  );

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `© ${new Date().getFullYear()} Banaras Hindu University — Computer Centre | Generated on ${new Date().toLocaleDateString("en-IN")}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  // ── Save ──
  doc.save(`BHU-Application-${app.trackingId}.pdf`);
}
