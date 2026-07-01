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
    const email1 = details.emailChoice1 || '';
    const email2 = details.emailChoice2 || '';
    const email3 = details.emailChoice3 || '';
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
    font-size: 12px;
    line-height: 1.4;
    padding: 5mm 10mm;
  }
  .pdf-header-table { width: 100%; border: none; border-collapse: collapse; margin-bottom: 6px; }
  .pdf-header-table td { vertical-align: middle; border: none; padding: 0; }
  .pdf-logo-cell { width: 260px; padding-right: 0; }
  .pdf-logo-img { width: 250px; height: auto; }
  .pdf-title-cell { text-align: center; vertical-align: middle; }
  .pdf-cc-title { font-size: 22px; font-weight: bold; letter-spacing: 1.5px; }
  .pdf-photo-cell { width: 120px; vertical-align: top; }
  .pdf-photo-box { width: 105px; height: 130px; border: 1.5px solid #000; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; margin-left: auto; position: relative; overflow: hidden; }
  .pdf-photo-box img { width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; }
  .pdf-photo-label { font-size: 12px; font-weight: bold; margin-bottom: 4px; }
  .pdf-photo-hint { font-size: 8px; font-style: italic; color: #555; }
  .pdf-sub-header { padding-top: 2px; }
  .pdf-institution-line { font-size: 8px; letter-spacing: 0.5px; color: #333; text-transform: uppercase; }
  .pdf-form-title { text-align: center; font-size: 15px; font-weight: bold; margin: 12px 0 10px; padding: 4px 0; }
  .pdf-data-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .pdf-data-table td { border: 1px solid #000; padding: 6px 8px; vertical-align: middle; font-size: 12px; }
  .pdf-field-label { width: 25%; font-size: 12px; }
  .pdf-field-value { width: 25%; font-size: 12px; min-height: 22px; font-weight: bold; }
  .pdf-email-choice { display: table-cell; vertical-align: middle; padding: 4px 8px; }
  .pdf-choice-num { font-size: 12px; font-weight: bold; min-width: 24px; display: inline-block; }
  .pdf-choice-val { font-size: 12px; font-weight: bold; margin-left: 8px; }
  .pdf-undertaking { margin: 12px 0; }
  .pdf-undertaking-title { font-size: 13px; margin-bottom: 6px; }
  .pdf-undertaking-table { width: 100%; border: none; border-collapse: collapse; }
  .pdf-undertaking-table td { border: none; padding: 4px 4px; font-size: 11px; vertical-align: top; line-height: 1.5; }
  .ut-num { width: 30px; font-weight: bold; text-align: right; padding-right: 8px !important; }
  .pdf-ut-list { margin: 4px 0 4px 20px; padding: 0; list-style-type: square; }
  .pdf-ut-list li { margin-bottom: 3px; }
  .pdf-signature-block { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 16px; padding: 0 4px; }
  .pdf-sig-left p, .pdf-sig-right p { font-size: 11px; margin-bottom: 4px; }
  .pdf-sig-right { text-align: right; }
  .pdf-declaration { margin-top: 20px; padding: 0 4px; }
  .pdf-declaration-title { text-align: center; font-size: 13px; margin-bottom: 8px; }
  .pdf-declaration-text { font-size: 12px; line-height: 2; text-align: left; }
  .pdf-note { margin-top: 18px; padding: 0 4px; }
  .pdf-note p { font-size: 9.5px; line-height: 1.5; }

  /* Hologram Stamp */
  .hologram-stamp {
    margin-top: 20px;
    border: 3px double #1a5276;
    border-radius: 8px;
    padding: 12px 16px;
    background: linear-gradient(135deg, #eaf2f8 0%, #d4efdf 50%, #eaf2f8 100%);
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .hologram-stamp::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(26, 82, 118, 0.03) 10px,
      rgba(26, 82, 118, 0.03) 20px
    );
  }
  .hologram-title {
    font-size: 14px;
    font-weight: bold;
    color: #1a5276;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .hologram-check {
    font-size: 11px;
    color: #196f3d;
    font-weight: bold;
    margin-bottom: 4px;
  }
  .hologram-hash {
    font-family: 'Courier New', Courier, monospace;
    font-size: 9px;
    color: #555;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }
  .hologram-date {
    font-size: 10px;
    color: #666;
  }
  .hologram-hod {
    font-size: 11px;
    color: #1a5276;
    font-weight: bold;
    margin-top: 4px;
  }
</style>
</head>
<body>

  <!-- HEADER -->
  <table class="pdf-header-table">
    <tr>
      <td class="pdf-logo-cell">
        <img src="${logoBase64}" alt="BHU Logo" class="pdf-logo-img" crossorigin="anonymous">
      </td>
      <td class="pdf-title-cell">
        <span class="pdf-cc-title">COMPUTER CENTRE</span>
      </td>
      <td class="pdf-photo-cell" rowspan="2">
        <div class="pdf-photo-box">
          ${photoDataUrl ? `<img src="${photoDataUrl}" style="display:block;width:100%;height:100%;object-fit:cover;">` : `<span class="pdf-photo-label">Applicant<br>Photograph</span><span class="pdf-photo-hint">Photo must be<br>certified by Head<br>of Department</span>`}
        </div>
      </td>
    </tr>
    <tr>
      <td colspan="2" class="pdf-sub-header">
        <span class="pdf-institution-line">AN INSTITUTION OF NATIONAL IMPORTANCE ESTABLISHED BY AN ACT OF PARLIAMENT</span>
      </td>
    </tr>
  </table>

  <!-- FORM TITLE -->
  <p class="pdf-form-title">Application Form of BHU Domain E-Mail ID: <span>${categoryRaw.replace(/_/g, ' ')}</span></p>

  <!-- DATA TABLE -->
  <table class="pdf-data-table">
    <tr>
      <td class="pdf-field-label"><b>1. Name of the Applicant</b></td>
      <td class="pdf-field-value">${applicantName}</td>
      <td class="pdf-field-label"><b>${label2}</b></td>
      <td class="pdf-field-value">${value2}</td>
    </tr>
    <tr>
      <td class="pdf-field-label"><b>3. Department</b></td>
      <td class="pdf-field-value">${department}</td>
      <td class="pdf-field-label"><b>${label4}</b></td>
      <td class="pdf-field-value">${value4}</td>
    </tr>
    <tr>
      <td class="pdf-field-label"><b>5. Faculty/Institute/Centre</b></td>
      <td class="pdf-field-value">${faculty}</td>
      <td class="pdf-field-label"><b>${label6}</b></td>
      <td class="pdf-field-value">${value6}</td>
    </tr>
    <tr>
      <td class="pdf-field-label"><b>7. Date of Birth</b></td>
      <td class="pdf-field-value">${dob}</td>
      <td class="pdf-field-label"><b>${label8}</b></td>
      <td class="pdf-field-value">${value8}</td>
    </tr>
    <tr>
      <td class="pdf-field-label"><b>9. Nationality</b></td>
      <td class="pdf-field-value">${nationality}</td>
      <td class="pdf-field-label"><b>${label10}</b></td>
      <td class="pdf-field-value">${value10}</td>
    </tr>
    <tr>
      <td class="pdf-field-label" rowspan="4"><b>11. Choice of Email Id</b><br><span style="font-size:9px;">[Default E-mail Id Name of the applicant (Full Name/Short form)]</span></td>
      <td class="pdf-field-label" style="text-align:center;"><b>Choices</b></td>
      <td class="pdf-field-label"><b>12. Mobile No</b></td>
      <td class="pdf-field-value" rowspan="2" style="vertical-align: middle;">${mobile}</td>
    </tr>
    <tr>
      <td class="pdf-email-choice"><span class="pdf-choice-num">1<sup>st</sup></span><span class="pdf-choice-val">${email1}</span></td>
      <td class="pdf-field-label" rowspan="3"><b>13. Alternate E-mail Id :</b><br><span style="font-size:8px;font-style:italic;">(Write in Capital letters only)</span></td>
    </tr>
    <tr>
      <td class="pdf-email-choice"><span class="pdf-choice-num">2<sup>nd</sup></span><span class="pdf-choice-val">${email2}</span></td>
      <td class="pdf-field-value" rowspan="2" style="vertical-align: middle;">${alternateEmail}</td>
    </tr>
    <tr>
      <td class="pdf-email-choice"><span class="pdf-choice-num">3<sup>rd</sup></span><span class="pdf-choice-val">${email3}</span></td>
    </tr>
  </table>

  <!-- UNDERTAKING -->
  <div class="pdf-undertaking">
    <p class="pdf-undertaking-title"><b>Undertaking:</b></p>
    <table class="pdf-undertaking-table">
      <tr><td class="ut-num">i)</td><td>The university email account is intended for official use related to University work and it must be used for academic activities only.</td></tr>
      <tr><td class="ut-num">ii)</td><td>All users must check their email accounts regularly for academic, administrative, and official communications. Failure to do so may result in missed important information. All official communication must be made using the( …@bhu.ac.in) E-mail id. Communications sent from any other E-mail ID may not be considered official or valid.</td></tr>
      <tr><td class="ut-num">iii)</td><td>Users are prohibited from using their university email accounts to:<ul class="pdf-ut-list"><li>Send harmful software, malware, or viruses.</li><li>Misrepresent the identity of the sender.</li><li>Engage in the distribution of offensive, illegal, or inappropriate content.</li></ul></td></tr>
      <tr><td class="ut-num">iv)</td><td>Users must take all necessary steps to secure their email accounts, including maintaining password confidentiality and regularly backing up important data. The computer centre (CC) is not responsible for restoring lost data.</td></tr>
      <tr><td class="ut-num">v)</td><td>Users should regularly delete unnecessary emails and large attachments to manage mailbox space effectively. Important emails should be archived, and users should take periodic backups.</td></tr>
      <tr><td class="ut-num">vi)</td><td>The maximum E-mail size for <b>${config.quotaLabel}</b> will be <b>${config.quotaValue}</b>.</td></tr>
      <tr><td class="ut-num">vii)</td><td>User email accounts will remain active for one year after retirement, after that email account will be deactivated and it may be deleted.</td></tr>
      <tr><td class="ut-num">viii)</td><td>University email Policy must be applicable to all E-mail users.</td></tr>
    </table>
  </div>

  <!-- APPLICANT SIGNATURE -->
  <div class="pdf-signature-block">
    <div class="pdf-sig-left">
      <p><b>Date:</b> ${applicantDate}</p>
      <p><b>Place:</b> ${applicantPlace}</p>
    </div>
    <div class="pdf-sig-right" style="position: relative;">
      <div style="height: 40px; margin-bottom: 5px; display: flex; justify-content: flex-end;">
        ${applicantSigDataUrl ? `<img src="${applicantSigDataUrl}" style="max-height: 40px; max-width: 150px; object-fit: contain;">` : ''}
      </div>
      <p><b>(Signature of the Applicant)</b></p>
    </div>
  </div>

  <!-- HOD DECLARATION -->
  <div class="pdf-declaration">
    <p class="pdf-declaration-title"><b>Declaration by the Head of the Department</b></p>
    <p class="pdf-declaration-text">
      This is to certify that Prof./Dr./Mr. <span style="font-weight: bold; border-bottom: 1px solid #000; padding: 0 10px; display: inline-block; min-width: 200px; text-align: center;">${applicantName || '&nbsp;'}</span> is working in our Department/ Faculty/Institute/ Centre/Section <span style="font-weight: bold; border-bottom: 1px solid #000; padding: 0 10px; display: inline-block; min-width: 200px; text-align: center;">${department || '&nbsp;'}</span> as <span style="font-weight: bold; border-bottom: 1px solid #000; padding: 0 10px; display: inline-block; min-width: 150px; text-align: center;">${designation || '&nbsp;'}</span>. Please issue him/her Email ID for his/her work.
    </p>
  </div>

  <!-- HOD SIGNATURE -->
  <div class="pdf-signature-block">
    <div class="pdf-sig-left">
      <p><b>Date:</b> ${approvalDate}</p>
    </div>
    <div class="pdf-sig-right">
      <div style="height: 40px; margin-bottom: 5px; display: flex; justify-content: flex-end;">
        ${hodSigDataUrl ? `<img src="${hodSigDataUrl}" style="max-height: 40px; max-width: 150px; object-fit: contain;">` : ''}
      </div>
      <p><b>${categoryRaw === 'UNDER_GRADUATE_STUDENT' ? '(Signature & Seal of Dean)' : '(Signature & Seal of HOD / Coordinator / PI / Supervisor)'}</b></p>
      <p><b>${hodName}</b></p>
      <p><b>${categoryRaw === 'UNDER_GRADUATE_STUDENT' ? '(Dean)' : '(Head of the Department)'}</b></p>
    </div>
  </div>

  <!-- HOLOGRAM STAMP -->
  <div class="hologram-stamp">
    <div class="hologram-title">✦ Digitally Signed & Approved ✦</div>
    <div class="hologram-check">✓ Verified by ${categoryRaw === 'UNDER_GRADUATE_STUDENT' ? 'Dean' : 'Head of Department'}</div>
    <div class="hologram-hod">Approved by: ${hodName}</div>
    <div class="hologram-hash">Hash: ${hashDisplay}…</div>
    <div class="hologram-date">Signed on: ${approvalDate} | Ref: ${application.trackingId}</div>
  </div>

  <!-- NOTE -->
  <div class="pdf-note">
    <p><b>NOTE:-</b> 1. Kindly submit this form to the Computer Centre duly signed by the appropriate authority and your E-mail ID will be instantly created and will be send to your alternate Email-ID from <b>"GOOGLE WORKSPACE"</b>.</p>
    <p style="padding-left:38px;">2. After receiving your created Email ID of BHU Domain you have to create your own Password by clicking on <b>"Sign In"</b> Option.</p>
  </div>

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
