import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PdfService — Server-side PDF generation for approved applications.
 *
 * Uses Puppeteer (headless Chrome) to render an HTML template into a
 * pixel-perfect A4 PDF, embedding:
 * - Applicant photo + signature
 * - HOD signature
 * - Cryptographic hologram stamp with SHA-256 hash
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly outputDir = process.env.APPROVED_PDF_DIR || './uploads/approved-pdfs';

  constructor(private readonly prisma: PrismaService) {
    // Ensure the output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Convert an image file to a base64 data URL.
   */
  private fileToBase64(filePath: string): string | null {
    try {
      if (!filePath || !fs.existsSync(filePath)) return null;
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase().replace('.', '');
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch {
      this.logger.warn(`Failed to read image file: ${filePath}`);
      return null;
    }
  }

  /**
   * Format a date string to DD/MM/YYYY.
   */
  private formatDate(dateStr: string | Date | null | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  /**
   * Generate an approved PDF for an application.
   *
   * @param applicationId - The application UUID
   * @param hodSignaturePath - Path to the HOD's signature image
   * @param hodName - Full name of the HOD
   * @param digitalHash - The SHA-256 hash for the hologram
   * @param approvalTimestamp - The approval datetime
   * @returns The saved PDF file path
   */
  async generateApprovedPdf(
    applicationId: string,
    hodSignaturePath: string,
    hodName: string,
    digitalHash: string,
    approvalTimestamp: Date,
  ): Promise<string> {
    // Fetch the full application with relations
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        applicant: true,
        department: true,
        hod: true,
      },
    });

    if (!application) {
      throw new Error(`Application ${applicationId} not found`);
    }

    const details = (application.applicantDetails as Record<string, any>) || {};

    // Prepare image data URLs
    const logoPath = path.join(process.cwd(), '..', 'frontend', 'public', 'BHUlogo.png');
    const logoBase64 = this.fileToBase64(logoPath) || '';
    const photoDataUrl = this.fileToBase64(application.photoStoragePath);
    const applicantSigDataUrl = this.fileToBase64(application.signatureStoragePath || '');
    const hodSigDataUrl = this.fileToBase64(hodSignaturePath);

    // Extract fields
    const applicantName = details.name || `${application.applicant.firstName} ${application.applicant.lastName}`.trim() || '';
    const department = application.department?.name || details.department || '';
    const designation = details.designation || '';
    const categoryRaw = details.category || 'TEACHING_STAFF';

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
    const config = categoryConfig[categoryRaw] || { quotaLabel: 'Faculty', quotaValue: '20GB' };

    const isStudent = categoryRaw === 'RESEARCH_SCHOLAR' || categoryRaw === 'POST_GRADUATE_STUDENT' || categoryRaw === 'UNDER_GRADUATE_STUDENT';
    const label2 = isStudent ? '2. Program Enrolled' : '2. Designation';
    const value2 = isStudent ? (details.programEnrolled || '') : (designation || '');
    const label4 = isStudent ? '4. Admission Academic Year' : '4. Date of Appointment';
    const value4 = isStudent ? (details.admissionAcademicYear || '') : (this.formatDate(details.dateOfAppointment) || '');
    const label6 = isStudent ? '6. Enrollment No' : '6. Employee ID';
    const value6 = isStudent ? (details.enrollmentNo || '') : (details.employeeId || '');
    const label8 = isStudent ? '8. Course Completion Year' : '8. Type of Employment';
    const value8 = isStudent ? (details.courseCompletionYear || '') : (details.typeOfEmployment || '');
    const label10 = isStudent ? '10. ' : '10. Date of Retirement';
    const value10 = isStudent ? '' : (this.formatDate(details.dateOfRetirement) || '');

    const dob = this.formatDate(details.dateOfBirth || details.dob) || '';
    const faculty = details.facultyInstituteCentre || details.faculty || '';
    const nationality = details.nationality || 'Indian';
    const email1 = details.emailChoice1 ? `${details.emailChoice1}@bhu.ac.in` : '';
    const email2 = details.emailChoice2 ? `${details.emailChoice2}@bhu.ac.in` : '';
    const email3 = details.emailChoice3 ? `${details.emailChoice3}@bhu.ac.in` : '';
    const mobile = details.mobileNo || '';
    const alternateEmail = details.alternateEmail || application.applicant.alternateEmail || '';
    const applicantDate = application.createdAt ? this.formatDate(application.createdAt) : (this.formatDate(new Date()) || '');
    const applicantPlace = details.applicantPlace || '';
    const approvalDate = this.formatDate(approvalTimestamp) || '';
    const hashDisplay = digitalHash.substring(0, 16).toUpperCase();

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 210mm;
    min-height: 297mm;
    background: #FFFFFF;
    color: #000000;
    font-family: 'Times New Roman', Times, serif;
    font-size: 11px;
    padding: 8mm; /* Less padding to allow double border */
  }
  .page-wrapper {
    border: 4px double #555;
    padding: 15px 25px;
    min-height: calc(100% - 10px);
    display: flex;
    flex-direction: column;
  }
  .pdf-header-table { width: 100%; border: none; border-collapse: collapse; margin-bottom: 12px; }
  .pdf-header-table td { vertical-align: middle; border: none; padding: 0; }
  .pdf-logo-cell { width: 300px; padding-right: 0; text-align: left; }
  .pdf-logo-img { width: 280px; height: auto; }
  .pdf-title-cell { text-align: center; vertical-align: middle; }
  .pdf-cc-title { font-size: 20px; font-weight: bold; letter-spacing: 1px; }
  .pdf-photo-cell { width: 130px; vertical-align: top; text-align: right; }
  .pdf-photo-box { width: 110px; height: 135px; border: 1.5px solid #000; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; margin-left: auto; position: relative; overflow: hidden; padding: 4px; }
  .pdf-photo-box img { width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; }
  .pdf-photo-label { font-size: 11px; margin-bottom: 10px; }
  .pdf-photo-hint { font-size: 9px; }
  .pdf-form-title { text-align: center; font-size: 14px; font-weight: bold; margin: 0 0 10px 0; }
  .pdf-data-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed; }
  .pdf-data-table td { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; text-align: left; font-size: 11px; overflow: hidden; word-wrap: break-word; }
  .td-bold { font-weight: bold; }
  .w-25 { width: 25%; }
  .w-50 { width: 50%; }
  .pdf-email-choices-container { padding: 0 !important; }
  .pdf-inner-table { width: 100%; border-collapse: collapse; height: 100%; }
  .pdf-inner-table td { border: none; border-bottom: 1px solid #000; padding: 4px 6px; border-right: 1px solid #000; }
  .pdf-inner-table tr:last-child td { border-bottom: none; }
  .pdf-inner-table td:last-child { border-right: none; }
  .pdf-undertaking { margin: 8px 0; }
  .pdf-undertaking-title { font-size: 11px; font-weight: bold; margin-bottom: 2px; }
  .pdf-undertaking-table { width: 100%; border: none; border-collapse: collapse; }
  .pdf-undertaking-table td { border: none; padding: 2px 4px; font-size: 10px; vertical-align: top; text-align: left; line-height: 1.4; }
  .ut-num { width: 25px; text-align: left; padding-right: 4px !important; }
  .pdf-ut-list { margin: 2px 0 2px 20px; padding: 0; list-style-type: square; }
  .pdf-ut-list li { margin-bottom: 2px; }
  
  .signature-container { margin-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 20px; }
  .sig-left, .sig-right { display: flex; flex-direction: column; justify-content: flex-end; }
  .sig-right { align-items: center; }
  .sig-left p { margin: 4px 0; font-size: 12px; font-weight: bold; }
  .sig-image-container { height: 50px; min-width: 150px; display: flex; justify-content: center; align-items: flex-end; margin-bottom: 5px; }
  .sig-image-container img { max-height: 50px; max-width: 150px; object-fit: contain; }
  .sig-label { font-size: 12px; font-weight: bold; text-align: center; }

  .declaration-section { margin-top: 15px; text-align: center; }
  .declaration-title { font-size: 12px; font-weight: bold; margin-bottom: 10px; }
  .declaration-text { font-size: 12px; text-align: justify; line-height: 1.8; margin-bottom: 15px; }
  .fill-blank { display: inline-block; min-width: 250px; border-bottom: 1px solid #000; font-weight: normal; text-align: center; padding: 0 5px; }
  .fill-blank-small { display: inline-block; min-width: 150px; border-bottom: 1px solid #000; font-weight: normal; text-align: center; padding: 0 5px; }

  .pdf-note { margin-top: 15px; }
  .pdf-note p { font-size: 10px; line-height: 1.4; text-align: left; }
  
  /* Digital Verified Stamp */
  .digital-stamp { margin-top: 5px; font-size: 10px; color: #196f3d; font-weight: bold; text-align: center; }
  .digital-stamp .tick { font-size: 12px; margin-right: 3px; }
  .digital-stamp .hash-text { font-size: 7px; color: #777; font-weight: normal; font-family: monospace; margin-top: 2px; }
</style>
</head>
<body>
  <div class="page-wrapper">
  <!-- HEADER -->
  <table class="pdf-header-table">
    <tr>
      <td class="pdf-logo-cell">
        <img src="${logoBase64}" alt="BHU Logo" class="pdf-logo-img" crossorigin="anonymous">
      </td>
      <td class="pdf-title-cell">
        <span class="pdf-cc-title">COMPUTER CENTRE</span>
      </td>
      <td class="pdf-photo-cell">
        <div class="pdf-photo-box">
          ${photoDataUrl ? `<img src="${photoDataUrl}">` : `<span class="pdf-photo-label">Applicant<br>Photograph</span><span class="pdf-photo-hint">Photo must be<br>certified by Head<br>of Department</span>`}
        </div>
      </td>
    </tr>
  </table>

  <!-- FORM TITLE -->
  <p class="pdf-form-title">Application Form of BHU Domain E-Mail ID: ${categoryRaw.replace(/_/g, ' ')}</p>

  <!-- DATA TABLE -->
  <table class="pdf-data-table">
    <tr>
      <td class="td-bold w-25">1. Name of the Applicant</td>
      <td class="w-25">${applicantName}</td>
      <td class="td-bold w-25">${label2}</td>
      <td class="w-25">${value2}</td>
    </tr>
    <tr>
      <td class="td-bold">3. Department</td>
      <td>${department}</td>
      <td class="td-bold">${label4}</td>
      <td>${value4}</td>
    </tr>
    <tr>
      <td class="td-bold">5. Faculty/Institute/Centre</td>
      <td>${faculty}</td>
      <td class="td-bold">${label6}</td>
      <td>${value6}</td>
    </tr>
    <tr>
      <td class="td-bold">7. Date of Birth</td>
      <td>${dob}</td>
      <td class="td-bold">${label8}</td>
      <td>${value8}</td>
    </tr>
    <tr>
      <td class="td-bold">9. Nationality</td>
      <td>${nationality}</td>
      <td class="td-bold">${label10}</td>
      <td>${value10}</td>
    </tr>
    <tr>
      <td class="td-bold" rowspan="4" style="vertical-align: top;">11. Choice of Email Id<br><span style="font-size:9px; font-weight: normal;">[Default Email Id Name of the applicant (Full Name/Short form)]</span></td>
      <td class="td-bold" style="text-align: center;">Choices</td>
      <td class="td-bold" colspan="2" style="vertical-align: top;">12. Alternate E-mail Id :<br><span style="font-size:9px; font-weight: normal; font-style: italic;">(Write in Capital letters only)</span></td>
    </tr>
    <tr>
      <td class="pdf-email-choices-container">
        <table class="pdf-inner-table">
          <tr><td style="width: 25px;">1<sup>st</sup></td><td>${email1}</td></tr>
        </table>
      </td>
      <td colspan="2" rowspan="3" style="vertical-align: middle;">${alternateEmail}</td>
    </tr>
    <tr>
      <td class="pdf-email-choices-container">
        <table class="pdf-inner-table">
          <tr><td style="width: 25px;">2<sup>nd</sup></td><td>${email2}</td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td class="pdf-email-choices-container">
        <table class="pdf-inner-table">
          <tr><td style="width: 25px;">3<sup>rd</sup></td><td>${email3}</td></tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- UNDERTAKING -->
  <div class="pdf-undertaking">
    <p class="pdf-undertaking-title">Undertaking:</p>
    <table class="pdf-undertaking-table">
      <tr><td class="ut-num">i)</td><td>The university email account is intended for official use related to University work and it must be used for academic activities only.</td></tr>
      <tr><td class="ut-num">ii)</td><td>All users must check their email accounts regularly for academic, administrative, and official communications. Failure to do so may result in missed important information. All official communication must be made using the( …@bhu.ac.in) E-mail id. Communications sent from any other email ID may not be considered official or valid.</td></tr>
      <tr><td class="ut-num">iii)</td><td>Users are prohibited from using their university email accounts to:<ul class="pdf-ut-list"><li>Send harmful software, malware, or viruses.</li><li>Misrepresent the identity of the sender.</li><li>Engage in the distribution of offensive, illegal, or inappropriate content.</li></ul></td></tr>
      <tr><td class="ut-num">iv)</td><td>Users must take all necessary steps to secure their email accounts, including maintaining password confidentiality and regularly backing up important data. The Computer Centre (CC) is not responsible for restoring your lost data.</td></tr>
      <tr><td class="ut-num">v)</td><td>Users should regularly delete unnecessary emails and large attachments to manage mailbox space effectively. Important emails should be archived, and users should take periodic backups.</td></tr>
      <tr><td class="ut-num">vi)</td><td>The maximum E-mail size for ${config.quotaLabel} (${config.quotaValue}) respectively.</td></tr>
      <tr><td class="ut-num">vii)</td><td>User email accounts will remain active for one year after course completion, after that email account will be deactivated and it may be deleted.</td></tr>
      <tr><td class="ut-num">viii)</td><td>University E-mail Policy must be applicable to all E-mail users.</td></tr>
    </table>
  </div>

  <!-- APPLICANT SIGNATURE -->
  <div class="signature-container">
    <div class="sig-left">
      <p>Date: <span class="fill-blank-small">${applicantDate}</span></p>
      <p>Place: <span class="fill-blank-small">${applicantPlace}</span></p>
    </div>
    <div class="sig-right">
      <div class="sig-image-container">
        ${applicantSigDataUrl ? `<img src="${applicantSigDataUrl}">` : ''}
      </div>
      <div class="sig-label">(Signature of the Applicant)</div>
    </div>
  </div>

  <!-- HOD DECLARATION -->
  <div class="declaration-section">
    <div class="declaration-title">Declaration by the Head of the Department</div>
    <div class="declaration-text">
      This is to certify that ${isStudent ? 'Mr./Ms./Mrs./Dr.' : 'Prof./Dr./Mr.'} <span class="fill-blank">${applicantName || '&nbsp;'}</span> is the ${isStudent ? 'Scholar of our Department/' : 'working in our'} Faculty/Institute/Centre/Section <span class="fill-blank">${department || '&nbsp;'}</span> as <span class="fill-blank">${isStudent ? value2 : designation || '&nbsp;'}</span>. Please issue him/her Email ID for his/her work.
    </div>
  </div>

  <!-- HOD SIGNATURE -->
  <div class="signature-container">
    <div class="sig-left">
      <p>Date: <span class="fill-blank-small">${approvalDate}</span></p>
      <p>Place: <span class="fill-blank-small">&nbsp;</span></p>
    </div>
    <div class="sig-right">
      <div class="sig-image-container">
        ${hodSigDataUrl ? `<img src="${hodSigDataUrl}">` : ''}
      </div>
      <div class="sig-label">(Signature of the Head of the Department with Seal)</div>
      <div style="font-size:10px; margin-top:2px;">${hodName}</div>
      <div class="digital-stamp">
        <span class="tick">✓</span> Digitally signed and verified by ${categoryRaw === 'UNDER_GRADUATE_STUDENT' ? 'Dean' : 'HOD'}
        <div class="hash-text">Hash: ${hashDisplay}…</div>
      </div>
    </div>
  </div>

  <!-- NOTE -->
  <div class="pdf-note">
    <p>NOTE:- 1. Kindly submit this form to the Computer Centre duly signed by the appropriate authority and your E-mail ID will be instantly created and will be send to your alternate Email-ID from “GOOGLE WORKSPACE”.</p>
    <p style="padding-left:45px;">2. After receiving your created Email ID of BHU Domain you have to create your own Password by clicking on “Sign In” option.</p>
  </div>

  </div> <!-- end page-wrapper -->
</body>
</html>`;

    // Launch Puppeteer and generate PDF
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });

      const pdfFileName = `${application.trackingId}_Approved.pdf`;
      const pdfPath = path.join(this.outputDir, pdfFileName);

      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        scale: 0.95,
      });

      this.logger.log(`Generated approved PDF: ${pdfPath}`);
      return pdfPath;
    } finally {
      await browser.close();
    }
  }
}
