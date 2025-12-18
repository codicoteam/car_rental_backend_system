// services/email_service.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Generate professional HTML email template
 */
function generateEmailTemplate({ title, message, otpCode = null }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
          
          <!-- Official Header -->
          <tr>
            <td style="background-color: #1a365d; padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">MAvHU PROJECT</h1>
              <p style="color: #cbd5e0; margin: 10px 0 0 0; font-size: 14px;">Health & Medical Research Initiative</p>
            </td>
          </tr>
          
          <!-- Content Area -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              
              <!-- Title -->
              <h2 style="color: #2d3748; margin: 0 0 25px 0; font-size: 20px; font-weight: bold; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                ${title}
              </h2>
              
              <!-- Message -->
              <div style="color: #4a5568; font-size: 15px; line-height: 1.6;">
                ${message}
              </div>
              
              <!-- OTP Section (if applicable) -->
              ${
                otpCode
                  ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td>
                    <p style="color: #718096; font-size: 14px; margin: 0 0 10px 0;">Verification Code:</p>
                    <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 20px; text-align: center;">
                      <p style="color: #2d3748; font-size: 28px; font-weight: bold; letter-spacing: 5px; margin: 0; font-family: 'Courier New', monospace;">
                        ${otpCode}
                      </p>
                    </div>
                    <p style="color: #718096; font-size: 12px; margin: 10px 0 0 0; font-style: italic;">
                      This code expires in 15 minutes. Do not share with anyone.
                    </p>
                  </td>
                </tr>
              </table>
              `
                  : ""
              }
              
            </td>
          </tr>
          
          <!-- Action Required Notice -->
          ${
            otpCode
              ? `
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <div style="background-color: #fffaf0; border-left: 4px solid #ed8936; padding: 15px;">
                <p style="color: #744210; font-size: 13px; margin: 0; font-weight: bold;">ACTION REQUIRED</p>
                <p style="color: #975a16; font-size: 12px; margin: 5px 0 0 0;">
                  Please use the verification code above to complete your requested action.
                </p>
              </div>
            </td>
          </tr>
          `
              : ""
          }
          
          <!-- Official Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 0 0 15px 0; border-bottom: 1px solid #e2e8f0;">
                    <p style="color: #4a5568; font-size: 14px; margin: 0 0 10px 0; font-weight: bold;">
                      MAvHU Project
                    </p>
                    <p style="color: #718096; font-size: 12px; margin: 0; line-height: 1.5;">
                      Health Research Initiative • Data Protection & Privacy Compliant
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 0 0 0;">
                    <p style="color: #a0aec0; font-size: 11px; margin: 0; line-height: 1.4;">
                      This is an automated message from the MAvHU Project system.<br>
                      Please do not reply to this email. For assistance, contact the project administrator.<br>
                      © ${new Date().getFullYear()} MAvHU Project. All communications are confidential.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Send verification email for new user registration
 */
async function sendVerificationEmail({ to, fullName, otp }) {
  const subject = "Account Verification - MAvHU Project";
  const title = "Account Verification Required";
  const message = `
    <p style="margin: 0 0 15px 0;">Dear ${fullName},</p>
    <p style="margin: 0 0 15px 0;">
      Welcome to the MAvHU Project. Your account registration has been received and requires verification.
    </p>
    <p style="margin: 0 0 15px 0;">
      To activate your account and access the research portal, please verify your email address using the verification code provided below.
    </p>
    <p style="margin: 0;">
      Upon verification, you will gain access to project documents, research data, and collaboration tools as per your assigned permissions.
    </p>
  `;

  const html = generateEmailTemplate({
    title,
    message,
    otpCode: otp,
  });

  await sendEmail({ to, subject, html });
}

/**
 * Send account deletion confirmation email
 */
async function sendDeleteAccountEmail({ to, fullName, otp }) {
  const subject = "Account Deletion Request - MAvHU Project";
  const title = "Account Deletion Confirmation";
  const message = `
    <p style="margin: 0 0 15px 0;">Dear ${fullName},</p>
    <p style="margin: 0 0 15px 0;">
      We have received a request to permanently delete your MAvHU Project account and all associated data.
    </p>
    <p style="margin: 0 0 15px 0;">
      <strong>Important:</strong> This action will remove your access to all project resources, research data, and communication channels. All your contributions will be anonymized in accordance with our data retention policy.
    </p>
    <p style="margin: 0;">
      To proceed with account deletion, please confirm this action using the verification code below. If you did not initiate this request, please disregard this email and immediately contact the project administrator.
    </p>
  `;

  const html = generateEmailTemplate({
    title,
    message,
    otpCode: otp,
  });

  await sendEmail({ to, subject, html });
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail({ to, fullName, otp }) {
  const subject = "Password Reset - MAvHU Project";
  const title = "Password Reset Request";
  const message = `
    <p style="margin: 0 0 15px 0;">Dear ${fullName},</p>
    <p style="margin: 0 0 15px 0;">
      A password reset request has been initiated for your MAvHU Project account.
    </p>
    <p style="margin: 0 0 15px 0;">
      To reset your password and regain access to the research portal, please use the verification code provided below.
    </p>
    <p style="margin: 0;">
      If you did not request a password reset, please ignore this email or contact the project security team immediately.
    </p>
  `;

  const html = generateEmailTemplate({
    title,
    message,
    otpCode: otp,
  });

  await sendEmail({ to, subject, html });
}

/**
 * Generate formal document-style template for notifications
 */
function generateDocumentTemplate({ title, message, details = null }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
          
          <!-- Official Letterhead -->
          <tr>
            <td style="border-bottom: 3px solid #1a365d; padding: 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="color: #1a365d; margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 1px;">
                      MAvHU PROJECT
                    </h1>
                    <p style="color: #4a5568; margin: 5px 0 0 0; font-size: 13px;">
                      OFFICIAL COMMUNICATION
                    </p>
                  </td>
                  <td align="right" style="vertical-align: top;">
                    <p style="color: #718096; margin: 0; font-size: 11px;">
                      ${new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Document Content -->
          <tr>
            <td style="padding: 35px 40px 25px 40px;">
              
              <!-- Document Title -->
              <h2 style="color: #2d3748; margin: 0 0 25px 0; font-size: 18px; font-weight: bold;">
                ${title}
              </h2>
              
              <!-- Main Content -->
              <div style="color: #4a5568; font-size: 14px; line-height: 1.7;">
                ${message}
              </div>
              
              <!-- Details Section -->
              ${details || ""}
              
            </td>
          </tr>
          
          <!-- Signature/Authority Section -->
          <tr>
            <td style="padding: 25px 40px 30px 40px; border-top: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="color: #4a5568; font-size: 12px; margin: 0 0 5px 0; font-weight: bold;">
                      MAvHU Project Administration
                    </p>
                    <p style="color: #718096; font-size: 11px; margin: 0; line-height: 1.5;">
                      Health Research Coordination • Data Management • Project Oversight<br>
                      This communication is generated and authorized by the MAvHU Project system.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Confidential Footer -->
          <tr>
            <td style="background-color: #1a365d; padding: 20px 40px;">
              <p style="color: #cbd5e0; font-size: 10px; margin: 0; text-align: center; line-height: 1.4;">
                CONFIDENTIAL: This email and any attachments contain information which is confidential and may be privileged.<br>
                It is intended for the named recipient(s) only. If you are not the intended recipient, please notify the sender immediately.<br>
                Unauthorized use, disclosure, copying, or distribution is prohibited. © MAvHU Project.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Send project notification email
 */
async function sendProjectNotificationEmail({ to, fullName, notification }) {
  const subject = `Project Notification: ${notification.subject}`;
  const title = notification.subject;

  const message = `
    <p style="margin: 0 0 15px 0;">Dear ${fullName},</p>
    <p style="margin: 0 0 15px 0;">
      ${notification.message}
    </p>
    ${
      notification.details
        ? `<p style="margin: 0 0 15px 0;">${notification.details}</p>`
        : ""
    }
    <p style="margin: 0;">
      This notification is part of the MAvHU Project's communication protocol. Please take appropriate action as required.
    </p>
  `;

  let detailsHtml = "";
  if (notification.metadata) {
    detailsHtml = `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0; background-color: #f8fafc; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 15px;">
            <p style="color: #4a5568; font-size: 12px; margin: 0 0 10px 0; font-weight: bold;">
              ADDITIONAL INFORMATION:
            </p>
            ${Object.entries(notification.metadata)
              .map(
                ([key, value]) => `
              <p style="color: #718096; font-size: 12px; margin: 0 0 5px 0;">
                <span style="font-weight: bold;">${key}:</span> ${value}
              </p>
            `
              )
              .join("")}
          </td>
        </tr>
      </table>
    `;
  }

  const html = generateDocumentTemplate({
    title,
    message,
    details: detailsHtml,
  });

  await sendEmail({ to, subject, html });
}

/**
 * Send data submission confirmation
 */
async function sendDataSubmissionEmail({ to, fullName, submission }) {
  const subject = `Data Submission Received - ${submission.reference}`;
  const title = "Data Submission Acknowledgement";

  const message = `
    <p style="margin: 0 0 15px 0;">Dear ${fullName},</p>
    <p style="margin: 0 0 15px 0;">
      This email confirms that the MAvHU Project has received your data submission.
    </p>
    <p style="margin: 0;">
      Your contribution has been logged and will undergo the standard verification process. You will be notified once the data has been processed and integrated into the research database.
    </p>
  `;

  const detailsHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0; background-color: #f8fafc; border: 1px solid #e2e8f0;">
      <tr>
        <td style="padding: 15px;">
          <p style="color: #4a5568; font-size: 12px; margin: 0 0 15px 0; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">
            SUBMISSION DETAILS
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 5px 0; color: #718096; font-size: 12px; width: 150px;">Reference ID:</td>
              <td style="padding: 5px 0; color: #4a5568; font-size: 12px; font-weight: bold;">${submission.reference}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #718096; font-size: 12px;">Submission Date:</td>
              <td style="padding: 5px 0; color: #4a5568; font-size: 12px;">${submission.date}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #718096; font-size: 12px;">Type:</td>
              <td style="padding: 5px 0; color: #4a5568; font-size: 12px;">${submission.type}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #718096; font-size: 12px;">Status:</td>
              <td style="padding: 5px 0; color: #4a5568; font-size: 12px;">RECEIVED</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const html = generateDocumentTemplate({
    title,
    message,
    details: detailsHtml,
  });

  await sendEmail({ to, subject, html });
}

/**
 * Base email sending function
 */
async function sendEmail({ to, subject, text, html }) {
  const mailOptions = {
    from: `MAvHU Project <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text: text || subject,
    html: html || `<p>${text || subject}</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendDeleteAccountEmail,
  sendPasswordResetEmail,
  sendProjectNotificationEmail,
  sendDataSubmissionEmail,
  generateEmailTemplate,
  generateDocumentTemplate,
};
