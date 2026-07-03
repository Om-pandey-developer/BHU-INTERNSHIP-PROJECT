import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ApplicationData {
  trackingId: string;
  status: string;
  createdAt: string;
  department?: { name: string; code?: string };
  applicantDetails: Record<string, any>;
  applicant?: { firstName: string; lastName: string; alternateEmail?: string; email?: string };
  quotaAssignedGB?: number;
}

const categoryConfig: Record<string, { quotaLabel: string; quotaValue: string }> = {
  'Teaching Staff': { quotaLabel: 'Faculty', quotaValue: '20GB' },
  'TEACHING_STAFF': { quotaLabel: 'Faculty', quotaValue: '20GB' },
  'Group-A Officer': { quotaLabel: 'Group-A Officer', quotaValue: '20GB' },
  'GROUP_A_OFFICER': { quotaLabel: 'Group-A Officer', quotaValue: '20GB' },
  'Non-Teaching Staff': { quotaLabel: 'Non-Teaching Staff', quotaValue: '5GB' },
  'NON_TEACHING_STAFF': { quotaLabel: 'Non-Teaching Staff', quotaValue: '5GB' },
  'PhD/PG Student': { quotaLabel: 'Research Scholar/PG Student', quotaValue: '10GB' },
  'RESEARCH_SCHOLAR': { quotaLabel: 'Research Scholar', quotaValue: '10GB' },
  'POST_GRADUATE_STUDENT': { quotaLabel: 'PG Student', quotaValue: '5GB' },
  'UNDER_GRADUATE_STUDENT': { quotaLabel: 'UG Student', quotaValue: '5GB' },
};

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const templateCSS = `
#pdf-template-wrapper {
    position: fixed;
    left: -9999px;
    top: 0;
    z-index: -1;
    opacity: 0;
}
#pdf-template {
    width: 210mm;
    min-height: 297mm;
    background: #FFFFFF;
    color: #000000;
    font-family: 'Times New Roman', Times, serif;
    font-size: 11px;
    line-height: 1.3;
    padding: 8mm;
    box-sizing: border-box;
}
.page-border {
    border: 2px double #444;
    padding: 12px 20px;
    min-height: calc(297mm - 20mm);
}
.pdf-header-table { width: 100%; border: none; border-collapse: collapse; margin-bottom: 0; }
.pdf-header-table td { vertical-align: middle; border: none; padding: 0; }
.pdf-logo-cell { width: 280px; padding-right: 0; vertical-align: bottom; }
.pdf-logo-img { width: 260px; height: auto; display: block; }
.pdf-title-cell { text-align: center; vertical-align: middle; }
.pdf-cc-title { font-size: 22px; font-weight: bold; letter-spacing: 1.5px; }
.pdf-photo-cell { width: 120px; vertical-align: top; }
.pdf-photo-box { width: 105px; height: 130px; border: 1.5px solid #000; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; margin-left: auto; position: relative; overflow: hidden; }
.pdf-photo-box img { width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; }
.pdf-photo-box img[src=""], .pdf-photo-box img:not([src]) { display: none !important; }
.pdf-photo-label { font-size: 12px; font-weight: bold; margin-bottom: 4px; }
.pdf-photo-hint { font-size: 8px; font-style: italic; color: #555; }
.pdf-sub-header { padding: 1px 0 2px 0; vertical-align: top; }
.pdf-institution-line { font-size: 8px; letter-spacing: 0.5px; color: #000; text-transform: uppercase; font-weight: normal; }
.pdf-form-title { text-align: center; font-size: 14px; font-weight: bold; margin: 10px 0 8px; padding: 2px 0; }
.pdf-data-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
.pdf-data-table td { border: 0.8px solid #000; padding: 8px 7px; vertical-align: middle; text-align: left; font-size: 12px; word-wrap: break-word; }
.td-label { font-weight: bold; width: 25%; }
.td-value { width: 25%; }
.pdf-email-inner { padding: 0 !important; }
.pdf-email-inner-table { width: 100%; border-collapse: collapse; }
.pdf-email-inner-table td { border: none; padding: 8px 6px 12px 6px; font-size: 11px; word-break: break-all; vertical-align: middle; }

.pdf-undertaking { margin: 8px 0 4px 0; }
.pdf-undertaking-title { font-size: 11px; font-weight: bold; margin-bottom: 2px; }
.pdf-undertaking-table { width: 100%; border: none; border-collapse: collapse; }
.pdf-undertaking-table td { border: none; padding: 2px 4px; font-size: 10px; vertical-align: top; text-align: left; line-height: 1.4; }
.ut-num { width: 25px; font-weight: bold; text-align: left; padding-right: 4px !important; }
.pdf-ut-list { margin: 2px 0 2px 20px; padding: 0; list-style-type: square; }
.pdf-ut-list li { margin-bottom: 2px; }

.sig-block { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 14px; padding: 0 4px; }
.sig-block-left p { font-size: 11px; margin-bottom: 3px; }
.sig-block-right { text-align: right; }
.sig-block-right p { font-size: 11px; margin-bottom: 3px; }
.sig-img-box { height: 40px; margin-bottom: 4px; display: flex; justify-content: flex-end; }
.sig-img-box img { max-height: 40px; max-width: 150px; object-fit: contain; }
.pdf-declaration { margin-top: 14px; padding: 0 4px; }
.pdf-declaration-title { text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 6px; }
.pdf-declaration-text { font-size: 11px; line-height: 1.8; text-align: justify; }
.fill-line { display: inline-block; min-width: 200px; border-bottom: 1px solid #000; padding: 0 8px 4px 8px; text-align: center; font-size: 12px; }
.fill-line-sm { display: inline-block; min-width: 120px; border-bottom: 1px solid #000; padding: 0 4px 4px 4px; font-size: 12px; }
.pdf-note { margin-top: 12px; padding: 0 4px; }
.pdf-note p { font-size: 9.5px; line-height: 1.5; }
`;

export async function generateApplicationPdf(
  app: ApplicationData,
  userName?: { firstName: string; lastName: string; email?: string },
  photoDataUrl?: string | null,
  signatureDataUrl?: string | null,
  returnAsBlob: boolean = false
) {
  // Dynamically import html2pdf to prevent SSR issues
  const html2pdf = (await import('html2pdf.js')).default;

  const details = app.applicantDetails || {};
  const firstName = app.applicant?.firstName || userName?.firstName || "";
  const lastName = app.applicant?.lastName || userName?.lastName || "";
  const applicantName = details.name || `${firstName} ${lastName}`.trim();

  const categoryRaw = details.category || "TEACHING_STAFF";
  const config = categoryConfig[categoryRaw] || { quotaLabel: 'Faculty', quotaValue: '20GB' };

  // Prepare fields
  const designation = details.designation || "";
  const department = app.department?.name || details.department || "";
  const dateOfAppointment = formatDate(details.dateOfAppointment);
  const faculty = details.facultyInstituteCentre || details.faculty || "";
  const employeeId = details.employeeId || "";
  const dob = formatDate(details.dateOfBirth || details.dob);
  const employmentType = details.typeOfEmployment || "";
  const nationality = details.nationality || "Indian";
  const retirement = formatDate(details.dateOfRetirement);

  const email1 = details.emailChoice1 ? `${details.emailChoice1}@bhu.ac.in` : "";
  const email2 = details.emailChoice2 ? `${details.emailChoice2}@bhu.ac.in` : "";
  const email3 = details.emailChoice3 ? `${details.emailChoice3}@bhu.ac.in` : "";

  const mobile = details.mobileNo || "";
  const alternateEmail = details.alternateEmail || app.applicant?.alternateEmail || app.applicant?.email || userName?.email || "";

  const isStudent = categoryRaw === "RESEARCH_SCHOLAR" || categoryRaw === "POST_GRADUATE_STUDENT" || categoryRaw === "UNDER_GRADUATE_STUDENT";
  const isUG = categoryRaw === "UNDER_GRADUATE_STUDENT";

  // Dynamic Label mapping
  const label2 = isStudent ? "2. Program Enrolled" : "2. Designation";
  const value2 = isStudent ? (details.programEnrolled || "") : designation;

  const label4 = isStudent ? "4. Admission Academic Year" : "4. Date of Appointment";
  const value4 = isStudent ? (details.admissionAcademicYear || "") : dateOfAppointment;

  const label6 = isStudent ? "6. Enrollment No" : "6. Employee ID";
  const value6 = isStudent ? (details.enrollmentNo || "") : employeeId;

  const label8 = isStudent ? "8. Course Completion Year" : "8. Type of Employment";
  const value8 = isStudent ? (details.courseCompletionYear || "") : employmentType;

  const label10 = isStudent ? "10. Mobile No" : "10. Date of Retirement";
  const value10 = isStudent ? mobile : retirement;

  const applicantPlace = details.applicantPlace || "______________________";
  const applicantDate = details.applicantDate ? formatDate(details.applicantDate) : (app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'));

  // Build the email choices + alternate email section based on category
  // For students: 11. Choice of Email Id | Choices | 12. Alternate E-mail Id
  // For staff:    11. Choice of Email Id | Choices | 12. Mobile No + 13. Alternate E-mail Id
  let emailSectionHTML = '';
  if (isStudent) {
    emailSectionHTML = `
      <tr>
        <td class="td-label" rowspan="4" style="vertical-align: top;">
          <b>11. Choice of Email Id</b><br>
          <b>[Default Email Id Name of the applicant (Full Name/Short form)]</b>
        </td>
        <td style="text-align: center;"><b>Choices</b></td>
        <td class="td-label" rowspan="4" style="vertical-align: top;">
          <b>12. Alternate E-mail Id :</b><br>
          <span style="font-size:8px; font-style:italic;">(Write in Capital letters only)</span>
        </td>
        <td class="td-value" rowspan="4" style="vertical-align: middle;">${alternateEmail}</td>
      </tr>
      <tr>
        <td class="pdf-email-inner">
          <table class="pdf-email-inner-table"><tr><td style="width:30px;"><b>1<sup>st</sup></b></td><td>${email1}</td></tr></table>
        </td>
      </tr>
      <tr>
        <td class="pdf-email-inner">
          <table class="pdf-email-inner-table"><tr><td style="width:30px;"><b>2<sup>nd</sup></b></td><td>${email2}</td></tr></table>
        </td>
      </tr>
      <tr>
        <td class="pdf-email-inner">
          <table class="pdf-email-inner-table"><tr><td style="width:30px;"><b>3<sup>rd</sup></b></td><td>${email3}</td></tr></table>
        </td>
      </tr>
    `;
  } else {
    emailSectionHTML = `
      <tr>
        <td class="td-label" rowspan="4" style="vertical-align: top;">
          <b>11. Choice of Email Id</b><br>
          <span style="font-size:9px;">[Default E-mail Id Name of the applicant (Full Name/Short form)]</span>
        </td>
        <td style="text-align: center;"><b>Choices</b></td>
        <td class="td-label" rowspan="2"><b>12. Mobile No</b></td>
        <td class="td-value" rowspan="2" style="vertical-align: middle;">${mobile}</td>
      </tr>
      <tr>
        <td class="pdf-email-inner">
          <table class="pdf-email-inner-table"><tr><td style="width:30px;"><b>1<sup>st</sup></b></td><td>${email1}</td></tr></table>
        </td>
      </tr>
      <tr>
        <td class="pdf-email-inner">
          <table class="pdf-email-inner-table"><tr><td style="width:30px;"><b>2<sup>nd</sup></b></td><td>${email2}</td></tr></table>
        </td>
        <td class="td-label" rowspan="2" style="vertical-align: top;">
          <b>13. Alternate E-mail Id :</b><br>
          <span style="font-size:8px; font-style:italic;">(Write in Capital letters only)</span>
        </td>
        <td class="td-value" rowspan="2" style="vertical-align: middle;">${alternateEmail}</td>
      </tr>
      <tr>
        <td class="pdf-email-inner">
          <table class="pdf-email-inner-table"><tr><td style="width:30px;"><b>3<sup>rd</sup></b></td><td>${email3}</td></tr></table>
        </td>
      </tr>
    `;
  }

  // Container
  const container = document.createElement('div');
  container.id = 'pdf-template-wrapper';

  const html = `
    <style>${templateCSS}</style>
    <div id="pdf-template">
      <div class="page-border">

        <!-- HEADER -->
        <table class="pdf-header-table">
            <tr>
                <td class="pdf-logo-cell">
                    <img src="${window.location.origin}/BHUpdfLOGO.png" alt="BHU Logo" class="pdf-logo-img" crossorigin="anonymous">
                </td>
                <td class="pdf-title-cell">
                    <span class="pdf-cc-title">COMPUTER CENTRE</span>
                </td>
                <td class="pdf-photo-cell">
                    <div class="pdf-photo-box">
                        <img id="pdfPhoto" src="${photoDataUrl || ''}" style="${photoDataUrl ? 'display:block;width:100%;height:100%;object-fit:cover;' : 'display:none;'}">
                        <span class="pdf-photo-label" style="${photoDataUrl ? 'display:none;' : 'display:block;'}">Applicant<br>Photograph</span>
                        <span class="pdf-photo-hint" style="${photoDataUrl ? 'display:none;' : 'display:block;'}">Photo must be<br>certified by ${isUG ? 'Dean' : 'Head'}<br>of ${isUG ? 'Faculty' : 'Department'}</span>
                    </div>
                </td>
            </tr>
        </table>

        <!-- FORM TITLE -->
        <p class="pdf-form-title">Application Form of BHU Domain E-Mail ID: <span>${categoryRaw.replace(/_/g, " ")}</span></p>

        <!-- DATA TABLE -->
        <table class="pdf-data-table">
            <tr>
                <td class="td-label"><b>1. Name of the Applicant</b></td>
                <td class="td-value">${applicantName}</td>
                <td class="td-label"><b>${label2}</b></td>
                <td class="td-value">${value2}</td>
            </tr>
            <tr>
                <td class="td-label"><b>3. Department</b></td>
                <td class="td-value">${department}</td>
                <td class="td-label"><b>${label4}</b></td>
                <td class="td-value">${value4}</td>
            </tr>
            <tr>
                <td class="td-label"><b>5. Faculty/Institute/Centre</b></td>
                <td class="td-value">${faculty}</td>
                <td class="td-label"><b>${label6}</b></td>
                <td class="td-value">${value6}</td>
            </tr>
            <tr>
                <td class="td-label"><b>7. Date of Birth</b></td>
                <td class="td-value">${dob}</td>
                <td class="td-label"><b>${label8}</b></td>
                <td class="td-value">${value8}</td>
            </tr>
            <tr>
                <td class="td-label"><b>9. Nationality</b></td>
                <td class="td-value">${nationality}</td>
                <td class="td-label"><b>${label10}</b></td>
                <td class="td-value">${value10}</td>
            </tr>
            ${emailSectionHTML}
        </table>

        <!-- UNDERTAKING -->
        <div class="pdf-undertaking">
            <p class="pdf-undertaking-title">Undertaking:</p>
            <table class="pdf-undertaking-table">
                <tr>
                    <td class="ut-num">i)</td>
                    <td>The university email account is intended for official use related to University work and it must be used for academic activities only.</td>
                </tr>
                <tr>
                    <td class="ut-num">ii)</td>
                    <td>All users must check their email accounts regularly for academic, administrative, and official communications. Failure to do so may result in missed important information. All official communication must be made using the (...@bhu.ac.in) E-mail id. Communications sent from any other email ID may not be considered official or valid.</td>
                </tr>
                <tr>
                    <td class="ut-num">iii)</td>
                    <td>
                        Users are prohibited from using their university email accounts to:
                        <ul class="pdf-ut-list">
                            <li>Send harmful software, malware, or viruses.</li>
                            <li>Misrepresent the identity of the sender.</li>
                            <li>Engage in the distribution of offensive, illegal, or inappropriate content.</li>
                        </ul>
                    </td>
                </tr>
                <tr>
                    <td class="ut-num">iv)</td>
                    <td>Users must take all necessary steps to secure their email accounts, including maintaining password confidentiality and regularly backing up important data. The Computer Centre (CC) is not responsible for restoring your lost data.</td>
                </tr>
                <tr>
                    <td class="ut-num">v)</td>
                    <td>Users should regularly delete unnecessary emails and large attachments to manage mailbox space effectively. Important emails should be archived, and users should take periodic backups.</td>
                </tr>
                <tr>
                    <td class="ut-num">vi)</td>
                    <td>The maximum E-mail size for ${config.quotaLabel} (${config.quotaValue}) respectively.</td>
                </tr>
                <tr>
                    <td class="ut-num">vii)</td>
                    <td>User email accounts will remain active for one year after ${isStudent ? 'course completion' : 'retirement'}, after that email account will be deactivated and it may be deleted.</td>
                </tr>
                <tr>
                    <td class="ut-num">viii)</td>
                    <td>University E-mail Policy must be applicable to all E-mail users.</td>
                </tr>
            </table>
        </div>

        <!-- DATE / PLACE / APPLICANT SIGNATURE -->
        <div class="sig-block">
            <div class="sig-block-left">
                <p><b>Date:</b> ${applicantDate}</p>
                <p><b>Place:</b> ${applicantPlace}</p>
            </div>
            <div class="sig-block-right">
                <div class="sig-img-box">
                    ${signatureDataUrl ? `<img src="${signatureDataUrl}">` : ''}
                </div>
                <p><b>(Signature of the Applicant)</b></p>
            </div>
        </div>

        <!-- DECLARATION BY HOD/DEAN -->
        <div class="pdf-declaration">
            <p class="pdf-declaration-title"><b>Declaration by the ${isUG ? 'Dean of the Faculty' : 'Head of the Department'}</b></p>
            <p class="pdf-declaration-text">
                This is to certify that ${isStudent ? 'Mr./Ms./Mrs./Dr.' : 'Prof./Dr./Mr.'} <span class="fill-line">${applicantName || '&nbsp;'}</span> is the ${isStudent ? 'Scholar of our Department/' : 'working in our'} Faculty/Institute/Centre/Section <span class="fill-line">${department || '&nbsp;'}</span> as <span class="fill-line">${isStudent ? value2 : designation || '&nbsp;'}</span>. Please issue him/her Email ID for his/her work.
            </p>
        </div>

        <!-- HOD/DEAN DATE / PLACE / SIGNATURE -->
        <div class="sig-block" style="margin-top: 16px;">
            <div class="sig-block-left">
                <p><b>Date:</b>______________________</p>
                <p><b>Place:</b>______________________</p>
            </div>
            <div class="sig-block-right">
                <p><b>(Signature of the ${isUG ? 'Dean of the Faculty' : 'Head of the Department'} with Seal)</b></p>
            </div>
        </div>

        <!-- NOTE -->
        <div class="pdf-note">
            <p><b>NOTE:-</b> 1. Kindly submit this form to the Computer Centre duly signed by the appropriate authority and your E-mail ID will be instantly created and will be send to your alternate Email-ID from <b>"GOOGLE WORKSPACE"</b>.</p>
            <p style="padding-left:38px;">2. After receiving your created Email ID of BHU Domain you have to create your own Password by clicking on <b>"Sign In"</b> Option.</p>
        </div>

      </div>
    </div>
  `;

  container.innerHTML = html;
  document.body.appendChild(container);

  const element = container.querySelector('#pdf-template') as HTMLElement;

  const fileName = `BHU_Email_Application_${app.trackingId || 'Draft'}.pdf`;

  const opt = {
    margin: 0,
    filename: fileName,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 3,
      useCORS: true,
      logging: false,
      letterRendering: true,
    },
    jsPDF: {
      unit: 'mm' as const,
      format: 'a4' as const,
      orientation: 'portrait' as const,
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  try {
    if (returnAsBlob) {
      return await html2pdf().set(opt).from(element).outputPdf('blob');
    } else {
      await html2pdf().set(opt).from(element).save();
    }
  } catch (err) {
    console.error('PDF generation error:', err);
    if (!returnAsBlob) {
      alert('Failed to generate PDF. Please try again.');
    }
    throw err;
  } finally {
    document.body.removeChild(container);
  }
}
