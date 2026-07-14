/**
 * emailTemplate.ts
 * Banaras Hindu University — Email Verification (OTP) Template
 * Table-based HTML built for maximum compatibility across
 * Outlook, Gmail, Apple Mail, and mobile clients.
 */

export function bhuVerificationEmail({ otp, recipientName = '', expiryMinutes = 5 }: { otp: string | number; recipientName?: string; expiryMinutes?: number }) {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>Email Verification — Banaras Hindu University</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #EDE7DC; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }

  @media only screen and (max-width: 600px) {
    .bhu-container { width: 100% !important; }
    .bhu-pad { padding-left: 20px !important; padding-right: 20px !important; }
    .bhu-otp-cell { padding: 18px 8px !important; }
    .bhu-otp-digit { font-size: 26px !important; letter-spacing: 6px !important; }
    .bhu-crest { width: 64px !important; height: 64px !important; }
    .bhu-h1 { font-size: 20px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#EDE7DC;">
<!-- Preheader (hidden preview text) -->
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#EDE7DC;">
  Your BHU Email Portal verification code is ${otp}. This code expires in ${expiryMinutes} minutes.
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EDE7DC;">
  <tr>
    <td align="center" style="padding: 40px 16px;">

      <table role="presentation" class="bhu-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">

        <!-- Outer frame: double-rule certificate border -->
        <tr>
          <td style="background-color:#FFFFFF; border:1px solid #C9A24B; padding:3px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #C9A24B;">
              <tr>
                <td>

                  <!-- Top identity strip -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#7A1F2B;">
                    <tr>
                      <td align="center" style="padding: 28px 24px 22px 24px;">

                        <!-- Seal / Monogram -->
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="bhu-crest" style="width:72px; height:72px;">
                          <tr>
                            <td align="center" valign="middle" style="width:72px; height:72px; border-radius:50%; border:2px solid #E8C97A; background-color:#8C2431; font-family: Georgia, 'Times New Roman', serif;">
                              <span style="display:block; color:#F3E3B3; font-size:22px; font-weight:700; letter-spacing:1px; line-height:1;">BHU</span>
                              <span style="display:block; color:#D9B876; font-size:7px; letter-spacing:1.5px; margin-top:3px; text-transform:uppercase;">Est. 1916</span>
                            </td>
                          </tr>
                        </table>

                        <div style="height:14px; line-height:14px; font-size:1px;">&nbsp;</div>

                        <div class="bhu-h1" style="font-family: Georgia, 'Times New Roman', serif; font-size:22px; line-height:28px; color:#FFFFFF; font-weight:700; letter-spacing:0.3px;">
                          Banaras Hindu University
                        </div>
                        <div style="font-family: Georgia, 'Times New Roman', serif; font-size:12.5px; line-height:18px; color:#E3C68A; font-style:italic; letter-spacing:0.4px; margin-top:2px;">
                          काशी हिन्दू विश्वविद्यालय &nbsp;•&nbsp; Varanasi
                        </div>

                      </td>
                    </tr>
                    <!-- Gold hairline -->
                    <tr>
                      <td style="background-color:#C9A24B; height:3px; line-height:3px; font-size:1px;">&nbsp;</td>
                    </tr>
                  </table>

                  <!-- Body -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td class="bhu-pad" style="padding: 36px 44px 8px 44px;">

                        <div style="font-family: Georgia, 'Times New Roman', serif; font-size:12px; letter-spacing:2.5px; text-transform:uppercase; color:#9A7B2E; font-weight:700;">
                          Email Verification
                        </div>
                        <div style="height:6px; line-height:6px; font-size:1px;">&nbsp;</div>
                        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:15px; line-height:24px; color:#3A322A;">
                          ${recipientName ? `Dear ${escapeHtml(recipientName)},` : 'Dear User,'}
                        </div>
                        <div style="height:10px; line-height:10px; font-size:1px;">&nbsp;</div>
                        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:15px; line-height:24px; color:#5C5348;">
                          Please use the verification code below to confirm your email address on the <strong style="color:#3A322A;">BHU Email Portal</strong>. For your security, do not share this code with anyone, including university staff.
                        </div>

                      </td>
                    </tr>

                    <!-- OTP block -->
                    <tr>
                      <td class="bhu-pad" style="padding: 22px 44px 10px 44px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F3EC; border:1px solid #E2D6BC; border-left:4px solid #7A1F2B;">
                          <tr>
                            <td class="bhu-otp-cell" align="center" style="padding: 26px 20px;">
                              <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:10.5px; letter-spacing:2px; text-transform:uppercase; color:#8A7F6D; margin-bottom:12px;">
                                Your Verification Code
                              </div>
                              <div class="bhu-otp-digit" style="font-family: 'Courier New', Consolas, monospace; font-size:34px; font-weight:700; letter-spacing:10px; color:#7A1F2B;">
                                ${formatOtpDisplay(otp)}
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Expiry + meta -->
                    <tr>
                      <td class="bhu-pad" style="padding: 14px 44px 6px 44px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:13px; color:#8A7F6D;">
                              &#9202;&nbsp; This code will expire in <strong style="color:#5C5348;">${expiryMinutes} minutes</strong>.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Divider -->
                    <tr>
                      <td class="bhu-pad" style="padding: 26px 44px 0 44px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr><td style="border-top:1px solid #E9E2D3; font-size:1px; line-height:1px;">&nbsp;</td></tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Security note -->
                    <tr>
                      <td class="bhu-pad" style="padding: 20px 44px 34px 44px;">
                        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:13px; line-height:21px; color:#9A9184;">
                          If you did not request this code, no action is required — you may safely disregard this email. Someone may have entered your email address by mistake.
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Footer -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F3EC; border-top:1px solid #E9E2D3;">
                    <tr>
                      <td align="center" style="padding: 22px 24px;">
                        <div style="font-family: Georgia, 'Times New Roman', serif; font-size:11.5px; color:#8A7F6D; letter-spacing:0.3px;">
                          Computer Centre &nbsp;•&nbsp; Banaras Hindu University &nbsp;•&nbsp; Varanasi, Uttar Pradesh 221005
                        </div>
                        <div style="height:6px; line-height:6px; font-size:1px;">&nbsp;</div>
                        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:11px; color:#B0A895;">
                          &copy; ${year} Banaras Hindu University. This is an automated message — please do not reply.
                        </div>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="height:24px; line-height:24px; font-size:1px;">&nbsp;</div>
      <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:11.5px; color:#A79E8C; max-width:600px;">
        Bhartiya Institute of Higher Learning &nbsp;|&nbsp; bhu.ac.in
      </div>

    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Adds a visual space between digits for readability without breaking the code itself */
function formatOtpDisplay(otp: string | number) {
  return String(otp).split('').join('&nbsp;');
}

/** Minimal escaping for interpolated user-provided name */
function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Plain-text fallback for clients that don't render HTML */
export function bhuVerificationEmailText({ otp, recipientName = '', expiryMinutes = 5 }: { otp: string | number; recipientName?: string; expiryMinutes?: number }) {
  return `BANARAS HINDU UNIVERSITY
Email Verification — BHU Email Portal

${recipientName ? `Dear ${recipientName},` : 'Dear User,'}

Your verification code is: ${otp}

This code will expire in ${expiryMinutes} minutes.
Do not share this code with anyone.

If you did not request this code, please ignore this email.

— Computer Centre, Banaras Hindu University, Varanasi 221005
This is an automated message. Please do not reply.`;
}

export function bhuRejectionEmail({ recipientName = '', remarks = '', rejectedByRole = 'Administrator' }: { recipientName?: string; remarks: string; rejectedByRole?: string }) {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>Application Status Update — Banaras Hindu University</title>
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #EDE7DC; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }

  @media only screen and (max-width: 600px) {
    .bhu-container { width: 100% !important; }
    .bhu-pad { padding-left: 20px !important; padding-right: 20px !important; }
    .bhu-crest { width: 64px !important; height: 64px !important; }
    .bhu-h1 { font-size: 20px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#EDE7DC;">
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#EDE7DC;">
  Update regarding your BHU Email Portal application.
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EDE7DC;">
  <tr>
    <td align="center" style="padding: 40px 16px;">

      <table role="presentation" class="bhu-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">
        <tr>
          <td style="background-color:#FFFFFF; border:1px solid #C9A24B; padding:3px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #C9A24B;">
              <tr>
                <td>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#7A1F2B;">
                    <tr>
                      <td align="center" style="padding: 28px 24px 22px 24px;">

                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="bhu-crest" style="width:72px; height:72px;">
                          <tr>
                            <td align="center" valign="middle" style="width:72px; height:72px; border-radius:50%; border:2px solid #E8C97A; background-color:#8C2431; font-family: Georgia, 'Times New Roman', serif;">
                              <span style="display:block; color:#F3E3B3; font-size:22px; font-weight:700; letter-spacing:1px; line-height:1;">BHU</span>
                              <span style="display:block; color:#D9B876; font-size:7px; letter-spacing:1.5px; margin-top:3px; text-transform:uppercase;">Est. 1916</span>
                            </td>
                          </tr>
                        </table>

                        <div style="height:14px; line-height:14px; font-size:1px;">&nbsp;</div>

                        <div class="bhu-h1" style="font-family: Georgia, 'Times New Roman', serif; font-size:22px; line-height:28px; color:#FFFFFF; font-weight:700; letter-spacing:0.3px;">
                          Banaras Hindu University
                        </div>
                        <div style="font-family: Georgia, 'Times New Roman', serif; font-size:12.5px; line-height:18px; color:#E3C68A; font-style:italic; letter-spacing:0.4px; margin-top:2px;">
                          काशी हिन्दू विश्वविद्यालय &nbsp;•&nbsp; Varanasi
                        </div>

                      </td>
                    </tr>
                    <tr>
                      <td style="background-color:#C9A24B; height:3px; line-height:3px; font-size:1px;">&nbsp;</td>
                    </tr>
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td class="bhu-pad" style="padding: 36px 44px 8px 44px;">
                        <div style="font-family: Georgia, 'Times New Roman', serif; font-size:12px; letter-spacing:2.5px; text-transform:uppercase; color:#9A7B2E; font-weight:700;">
                          Application Status
                        </div>
                        <div style="height:6px; line-height:6px; font-size:1px;">&nbsp;</div>
                        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:15px; line-height:24px; color:#3A322A;">
                          ${recipientName ? `Dear ${escapeHtml(recipientName)},` : 'Dear Applicant,'}
                        </div>
                        <div style="height:10px; line-height:10px; font-size:1px;">&nbsp;</div>
                        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:15px; line-height:24px; color:#5C5348;">
                          We are writing to inform you that your application for a BHU Email account has been <strong>rejected</strong> by the ${escapeHtml(rejectedByRole)}.
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td class="bhu-pad" style="padding: 22px 44px 10px 44px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFF5F5; border:1px solid #FFE6E6; border-left:4px solid #D32F2F;">
                          <tr>
                            <td class="bhu-otp-cell" style="padding: 20px;">
                              <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:12px; font-weight:600; text-transform:uppercase; color:#D32F2F; margin-bottom:8px;">
                                Reason for Rejection
                              </div>
                              <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:14px; line-height:22px; color:#3A322A;">
                                "${escapeHtml(remarks)}"
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <tr>
                      <td class="bhu-pad" style="padding: 14px 44px 34px 44px;">
                        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:13px; line-height:21px; color:#9A9184;">
                          You can log in to your BHU Email Portal dashboard to view the status or submit a re-application request if applicable.
                        </div>
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F3EC; border-top:1px solid #E9E2D3;">
                    <tr>
                      <td align="center" style="padding: 22px 24px;">
                        <div style="font-family: Georgia, 'Times New Roman', serif; font-size:11.5px; color:#8A7F6D; letter-spacing:0.3px;">
                          Computer Centre &nbsp;•&nbsp; Banaras Hindu University &nbsp;•&nbsp; Varanasi, Uttar Pradesh 221005
                        </div>
                        <div style="height:6px; line-height:6px; font-size:1px;">&nbsp;</div>
                        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:11px; color:#B0A895;">
                          &copy; ${year} Banaras Hindu University. This is an automated message — please do not reply.
                        </div>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="height:24px; line-height:24px; font-size:1px;">&nbsp;</div>
      <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:11.5px; color:#A79E8C; max-width:600px;">
        Bhartiya Institute of Higher Learning &nbsp;|&nbsp; bhu.ac.in
      </div>

    </td>
  </tr>
</table>
</body>
</html>`;
}

export function bhuRejectionEmailText({ recipientName = '', remarks = '', rejectedByRole = 'Administrator' }: { recipientName?: string; remarks: string; rejectedByRole?: string }) {
  return `BANARAS HINDU UNIVERSITY
Application Status Update — BHU Email Portal

${recipientName ? `Dear ${recipientName},` : 'Dear Applicant,'}

We are writing to inform you that your application for a BHU Email account has been REJECTED by the ${rejectedByRole}.

Reason for Rejection:
"${remarks}"

You can log in to your BHU Email Portal dashboard to view your status or submit a re-application request if applicable.

— Computer Centre, Banaras Hindu University, Varanasi 221005
This is an automated message. Please do not reply.`;
}

export function bhuAdminApprovalEmail({ recipientName = '' }: { recipientName?: string }) {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>Application Approved — Banaras Hindu University</title>
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #EDE7DC; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }

  @media only screen and (max-width: 600px) {
    .bhu-container { width: 100% !important; }
    .bhu-pad { padding-left: 20px !important; padding-right: 20px !important; }
    .bhu-crest { width: 64px !important; height: 64px !important; }
    .bhu-h1 { font-size: 20px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#EDE7DC;">
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#EDE7DC;">
  Your application is approved. You will soon get your email.
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EDE7DC;">
  <tr>
    <td align="center" style="padding: 40px 16px;">

      <table role="presentation" class="bhu-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">
        <tr>
          <td style="background-color:#FFFFFF; border:1px solid #C9A24B; padding:3px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #C9A24B;">
              <tr>
                <td>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#7A1F2B;">
                    <tr>
                      <td align="center" style="padding: 28px 24px 22px 24px;">

                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="bhu-crest" style="width:72px; height:72px;">
                          <tr>
                            <td align="center" valign="middle" style="width:72px; height:72px; border-radius:50%; border:2px solid #E8C97A; background-color:#8C2431; font-family: Georgia, 'Times New Roman', serif;">
                              <span style="display:block; color:#F3E3B3; font-size:22px; font-weight:700; letter-spacing:1px; line-height:1;">BHU</span>
                              <span style="display:block; color:#D9B876; font-size:7px; letter-spacing:1.5px; margin-top:3px; text-transform:uppercase;">Est. 1916</span>
                            </td>
                          </tr>
                        </table>

                        <div style="height:14px; line-height:14px; font-size:1px;">&nbsp;</div>

                        <div class="bhu-h1" style="font-family: Georgia, 'Times New Roman', serif; font-size:22px; line-height:28px; color:#FFFFFF; font-weight:700; letter-spacing:0.3px;">
                          Banaras Hindu University
                        </div>
                        <div style="font-family: Georgia, 'Times New Roman', serif; font-size:12.5px; line-height:18px; color:#E3C68A; font-style:italic; letter-spacing:0.4px; margin-top:2px;">
                          काशी हिन्दू विश्वविद्यालय &nbsp;•&nbsp; Varanasi
                        </div>

                      </td>
                    </tr>
                    <tr>
                      <td style="background-color:#C9A24B; height:3px; line-height:3px; font-size:1px;">&nbsp;</td>
                    </tr>
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td class="bhu-pad" style="padding: 36px 44px 8px 44px;">
                        <div style="font-family: Georgia, 'Times New Roman', serif; font-size:12px; letter-spacing:2.5px; text-transform:uppercase; color:#9A7B2E; font-weight:700;">
                          Application Approved
                        </div>
                        <div style="height:6px; line-height:6px; font-size:1px;">&nbsp;</div>
                        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:15px; line-height:24px; color:#3A322A;">
                          ${recipientName ? `Dear ${escapeHtml(recipientName)},` : 'Dear Applicant,'}
                        </div>
                        <div style="height:10px; line-height:10px; font-size:1px;">&nbsp;</div>
                        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:15px; line-height:24px; color:#5C5348;">
                          Your application is approved you will soon get your email.
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td class="bhu-pad" style="padding: 34px 44px 34px 44px;">
                        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:13px; line-height:21px; color:#9A9184;">
                          Please keep an eye on your inbox for further instructions from the Computer Centre.
                        </div>
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F3EC; border-top:1px solid #E9E2D3;">
                    <tr>
                      <td align="center" style="padding: 22px 24px;">
                        <div style="font-family: Georgia, 'Times New Roman', serif; font-size:11.5px; color:#8A7F6D; letter-spacing:0.3px;">
                          Computer Centre &nbsp;•&nbsp; Banaras Hindu University &nbsp;•&nbsp; Varanasi, Uttar Pradesh 221005
                        </div>
                        <div style="height:6px; line-height:6px; font-size:1px;">&nbsp;</div>
                        <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:11px; color:#B0A895;">
                          &copy; ${year} Banaras Hindu University. This is an automated message — please do not reply.
                        </div>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="height:24px; line-height:24px; font-size:1px;">&nbsp;</div>
      <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size:11.5px; color:#A79E8C; max-width:600px;">
        Bhartiya Institute of Higher Learning &nbsp;|&nbsp; bhu.ac.in
      </div>

    </td>
  </tr>
</table>
</body>
</html>`;
}
