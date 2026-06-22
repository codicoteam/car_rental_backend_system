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
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold; letter-spacing: 1px;">Mo Rental</h1>
              <p style="color: #e0f2fe; margin: 10px 0 0 0; font-size: 14px;">Premium Car Rental Services</p>
            </td>
          </tr>
          
          <!-- Content Area -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              
              <!-- Title -->
              <h2 style="color: #1e3a8a; margin: 0 0 25px 0; font-size: 20px; font-weight: bold; border-bottom: 2px solid #0891b2; padding-bottom: 10px;">
                ${title}
              </h2>
              
              <!-- Message -->
              <div style="color: #334155; font-size: 15px; line-height: 1.6;">
                ${message}
              </div>
              
              <!-- OTP Section (if applicable) -->
              ${
                otpCode
                  ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td>
                    <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0;">Verification Code:</p>
                    <div style="background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%); border: 2px solid #0891b2; border-radius: 8px; padding: 20px; text-align: center;">
                      <p style="color: #1e3a8a; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
                        ${otpCode}
                      </p>
                    </div>
                    <p style="color: #64748b; font-size: 12px; margin: 10px 0 0 0; font-style: italic;">
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
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
                <p style="color: #92400e; font-size: 13px; margin: 0; font-weight: bold;">ACTION REQUIRED</p>
                <p style="color: #b45309; font-size: 12px; margin: 5px 0 0 0;">
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
            <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #cbd5e1;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 0 0 15px 0; border-bottom: 1px solid #cbd5e1;">
                    <p style="color: #1e3a8a; font-size: 14px; margin: 0 0 10px 0; font-weight: bold;">
                      Mo Rental App
                    </p>
                    <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.5;">
                      Premium Car Rental Services • Secure & Reliable
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 0 0 0;">
                    <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.4;">
                      This is an automated message from Mo Rental App.<br>
                      Please do not reply to this email. For assistance, contact our customer support team.<br>
                      © ${new Date().getFullYear()} Mo Rental App. All rights reserved.
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
  const subject = "Account Verification - Mo Rental App";
  const title = "Account Verification Required";
  const message = `
    <p style="margin: 0 0 15px 0;">Dear ${fullName},</p>
    <p style="margin: 0 0 15px 0;">
      Welcome to Mo Rental App. Your account registration has been received and requires verification.
    </p>
    <p style="margin: 0 0 15px 0;">
      To activate your account and start browsing our premium car rental services, please verify your email address using the verification code provided below.
    </p>
    <p style="margin: 0;">
      Upon verification, you will gain access to our fleet of vehicles, booking system, and exclusive rental offers.
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
  const subject = "Account Deletion Request - Mo Rental App";
  const title = "Account Deletion Confirmation";
  const message = `
    <p style="margin: 0 0 15px 0;">Dear ${fullName},</p>
    <p style="margin: 0 0 15px 0;">
      We have received a request to permanently delete your Mo Rental App account and all associated data.
    </p>
    <p style="margin: 0 0 15px 0;">
      <strong>Important:</strong> This action will remove your access to all rental services, booking history, and loyalty rewards. All your personal information will be permanently deleted in accordance with our data retention policy.
    </p>
    <p style="margin: 0;">
      To proceed with account deletion, please confirm this action using the verification code below. If you did not initiate this request, please disregard this email and immediately contact our customer support team.
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
  const subject = "Password Reset - Mo Rental App";
  const title = "Password Reset Request";
  const message = `
    <p style="margin: 0 0 15px 0;">Dear ${fullName},</p>
    <p style="margin: 0 0 15px 0;">
      A password reset request has been initiated for your Mo Rental App account.
    </p>
    <p style="margin: 0 0 15px 0;">
      To reset your password and regain access to our rental services, please use the verification code provided below.
    </p>
    <p style="margin: 0;">
      If you did not request a password reset, please ignore this email or contact our security team immediately.
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
            <td style="border-bottom: 3px solid #0891b2; padding: 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="color: #1e3a8a; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">
                      Mo Rental App
                    </h1>
                    <p style="color: #334155; margin: 5px 0 0 0; font-size: 13px;">
                      OFFICIAL COMMUNICATION
                    </p>
                  </td>
                  <td align="right" style="vertical-align: top;">
                    <p style="color: #64748b; margin: 0; font-size: 11px;">
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
              <h2 style="color: #1e3a8a; margin: 0 0 25px 0; font-size: 18px; font-weight: bold;">
                ${title}
              </h2>
              
              <!-- Main Content -->
              <div style="color: #334155; font-size: 14px; line-height: 1.7;">
                ${message}
              </div>
              
              <!-- Details Section -->
              ${details || ""}
              
            </td>
          </tr>
          
          <!-- Signature/Authority Section -->
          <tr>
            <td style="padding: 25px 40px 30px 40px; border-top: 1px solid #cbd5e1;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="color: #334155; font-size: 12px; margin: 0 0 5px 0; font-weight: bold;">
                      Mo Rental App Customer Service
                    </p>
                    <p style="color: #64748b; font-size: 11px; margin: 0; line-height: 1.5;">
                      Premium Car Rentals • Customer Support • Account Management<br>
                      This communication is generated and authorized by Mo Rental App.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Confidential Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%); padding: 20px 40px;">
              <p style="color: #e0f2fe; font-size: 10px; margin: 0; text-align: center; line-height: 1.4;">
                CONFIDENTIAL: This email and any attachments contain information which is confidential and may be privileged.<br>
                It is intended for the named recipient(s) only. If you are not the intended recipient, please notify the sender immediately.<br>
                Unauthorized use, disclosure, copying, or distribution is prohibited. © Mo Rental App.
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
 * Send booking notification email
 */
async function sendBookingNotificationEmail({ to, fullName, notification }) {
  const subject = `Booking Notification: ${notification.subject}`;
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
      Thank you for choosing Mo Rental App. We're committed to providing you with excellent car rental service.
    </p>
  `;

  let detailsHtml = "";
  if (notification.metadata) {
    detailsHtml = `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;">
        <tr>
          <td style="padding: 15px;">
            <p style="color: #1e3a8a; font-size: 12px; margin: 0 0 10px 0; font-weight: bold;">
              BOOKING DETAILS:
            </p>
            ${Object.entries(notification.metadata)
              .map(
                ([key, value]) => `
              <p style="color: #64748b; font-size: 12px; margin: 0 0 5px 0;">
                <span style="font-weight: bold; color: #334155;">${key}:</span> ${value}
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
 * Send rental confirmation email
 */
async function sendRentalConfirmationEmail({ to, fullName, rental }) {
  const subject = `Rental Confirmation - ${rental.reference}`;
  const title = "Rental Booking Confirmed";

  const message = `
    <p style="margin: 0 0 15px 0;">Dear ${fullName},</p>
    <p style="margin: 0 0 15px 0;">
      This email confirms that Mo Rental App has received and processed your car rental booking.
    </p>
    <p style="margin: 0;">
      Your vehicle is reserved and will be ready for pickup at the scheduled date and time. Please bring a valid driver's license and payment method to complete the rental process.
    </p>
  `;

  const detailsHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;">
      <tr>
        <td style="padding: 15px;">
          <p style="color: #1e3a8a; font-size: 12px; margin: 0 0 15px 0; font-weight: bold; border-bottom: 2px solid #0891b2; padding-bottom: 5px;">
            RENTAL DETAILS
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 5px 0; color: #64748b; font-size: 12px; width: 150px;">Booking Reference:</td>
              <td style="padding: 5px 0; color: #1e3a8a; font-size: 12px; font-weight: bold;">${rental.reference}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b; font-size: 12px;">Booking Date:</td>
              <td style="padding: 5px 0; color: #334155; font-size: 12px;">${rental.date}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b; font-size: 12px;">Vehicle Type:</td>
              <td style="padding: 5px 0; color: #334155; font-size: 12px;">${rental.type}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b; font-size: 12px;">Status:</td>
              <td style="padding: 5px 0; color: #0891b2; font-size: 12px; font-weight: bold;">CONFIRMED</td>
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
    from: `Mo Rental App <${process.env.EMAIL_USER}>`,
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


async function sendAdminCreatedAccountEmail({
  to,
  fullName,
  webLoginUrl = process.env.WEB_LOGIN_URL,
  playStoreUrl = process.env.PLAYSTORE_URL,
}) {
  const subject = "Your Mo Rental account has been created";
  const title = "Welcome to Mo Rental — Your account is ready";

  const message = `
    <p style="margin:0 0 15px 0;">Dear ${fullName},</p>
    <p style="margin:0 0 15px 0;">
      An account has been created for you on <strong>Mo Rental</strong> by our staff.
    </p>
    <p style="margin:0 0 15px 0;">
      You can sign in using the email that received this message.
      If you don't have a password yet, simply choose <em>Forgot password</em> on the sign-in page to set one securely.
    </p>
    <p style="margin:0 0 15px 0;">
      <a href="${webLoginUrl}" style="display:inline-block;padding:10px 16px;border-radius:8px;border:1px solid #0891b2;text-decoration:none;">
        Sign in to Mo Rental
      </a>
    </p>
    <p style="margin:0 0 15px 0;">Or get the app on Google Play:</p>
    <p style="margin:0;">
      <a href="${playStoreUrl}" style="display:inline-block;padding:10px 16px;border-radius:8px;border:1px solid #1e3a8a;text-decoration:none;">
        Open on Google Play
      </a>
    </p>
  `;

  const html = generateDocumentTemplate({
    title,
    message,
    details: "",
  });

  await sendEmail({ to, subject, html });
}



/**
 * Staff alert email sent to admins & branch managers when a customer makes a new booking.
 *
 * @param {string} to           - recipient email
 * @param {string} fullName     - recipient name
 * @param {object} reservation  - { code, pickupAt, dropoffAt, vehicleModelName,
 *                                   pickupBranchName, dropoffBranchName, total, currency }
 * @param {object} customer     - { fullName, email, phone }
 */
async function sendNewBookingStaffAlertEmail({
  to,
  fullName,
  reservation,
  customer,
}) {
  const subject = `[New Booking] ${reservation.code} — ${customer.fullName}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Booking Alert</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(30,58,138,0.10);">

          <!-- ── Header / Logo bar ─────────────────────────────────────── -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a 0%,#0891b2 100%);padding:0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Logo wordmark -->
                  <td style="padding:28px 36px 20px 36px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color:rgba(255,255,255,0.12);border-radius:8px;padding:10px 18px;">
                          <span style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:2px;font-family:Georgia,serif;">Mo</span>
                          <span style="color:#7dd3fc;font-size:22px;font-weight:900;letter-spacing:2px;font-family:Georgia,serif;">Rental</span>
                        </td>
                      </tr>
                    </table>
                    <p style="color:#bae6fd;margin:8px 0 0 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;">
                      Zimbabwe's Premium Car Rental
                    </p>
                  </td>
                  <!-- Alert badge -->
                  <td align="right" style="padding:28px 36px 20px 0;vertical-align:top;">
                    <div style="display:inline-block;background-color:#f59e0b;border-radius:20px;padding:6px 14px;">
                      <span style="color:#fff;font-size:11px;font-weight:bold;letter-spacing:1px;">NEW BOOKING</span>
                    </div>
                  </td>
                </tr>
              </table>
              <!-- Divider stripe -->
              <div style="height:4px;background:linear-gradient(90deg,#f59e0b 0%,#fbbf24 50%,#f59e0b 100%);"></div>
            </td>
          </tr>

          <!-- ── Greeting ───────────────────────────────────────────────── -->
          <tr>
            <td style="padding:32px 36px 0 36px;">
              <h2 style="color:#1e3a8a;font-size:18px;margin:0 0 8px 0;font-weight:bold;">
                New Booking Alert
              </h2>
              <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 6px 0;">
                Dear ${fullName},
              </p>
              <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 0 0;">
                A new vehicle booking has been submitted on <strong style="color:#1e3a8a;">Mo Rental</strong>
                and is awaiting confirmation.
              </p>
            </td>
          </tr>

          <!-- ── Booking reference banner ──────────────────────────────── -->
          <tr>
            <td style="padding:20px 36px;">
              <div style="background:linear-gradient(135deg,#eff6ff 0%,#f0f9ff 100%);border:1.5px solid #bfdbfe;border-radius:8px;padding:14px 20px;text-align:center;">
                <p style="color:#64748b;font-size:11px;margin:0 0 4px 0;letter-spacing:1px;text-transform:uppercase;">Booking Reference</p>
                <p style="color:#1e3a8a;font-size:22px;font-weight:bold;letter-spacing:3px;margin:0;font-family:'Courier New',monospace;">
                  ${reservation.code}
                </p>
              </div>
            </td>
          </tr>

          <!-- ── Customer Details ──────────────────────────────────────── -->
          <tr>
            <td style="padding:0 36px 16px 36px;">
              <p style="color:#0891b2;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;margin:0 0 10px 0;border-bottom:2px solid #e0f2fe;padding-bottom:6px;">
                Customer Information
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:5px 0;color:#64748b;font-size:13px;width:140px;">Full Name</td>
                  <td style="padding:5px 0;color:#1e3a8a;font-size:13px;font-weight:bold;">${customer.fullName}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;color:#64748b;font-size:13px;">Email</td>
                  <td style="padding:5px 0;color:#334155;font-size:13px;">${customer.email || "—"}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;color:#64748b;font-size:13px;">Phone</td>
                  <td style="padding:5px 0;color:#334155;font-size:13px;">${customer.phone || "—"}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Booking Details ───────────────────────────────────────── -->
          <tr>
            <td style="padding:0 36px 16px 36px;">
              <p style="color:#0891b2;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;margin:0 0 10px 0;border-bottom:2px solid #e0f2fe;padding-bottom:6px;">
                Booking Details
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:5px 0;color:#64748b;font-size:13px;width:140px;">Vehicle</td>
                  <td style="padding:5px 0;color:#1e3a8a;font-size:13px;font-weight:bold;">${reservation.vehicleModelName || "—"}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;color:#64748b;font-size:13px;">Pickup Branch</td>
                  <td style="padding:5px 0;color:#334155;font-size:13px;">${reservation.pickupBranchName || "—"}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;color:#64748b;font-size:13px;">Pickup Date</td>
                  <td style="padding:5px 0;color:#334155;font-size:13px;">${reservation.pickupAt}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;color:#64748b;font-size:13px;">Drop-off Branch</td>
                  <td style="padding:5px 0;color:#334155;font-size:13px;">${reservation.dropoffBranchName || "—"}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;color:#64748b;font-size:13px;">Drop-off Date</td>
                  <td style="padding:5px 0;color:#334155;font-size:13px;">${reservation.dropoffAt}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Total Amount ──────────────────────────────────────────── -->
          <tr>
            <td style="padding:0 36px 28px 36px;">
              <div style="background-color:#1e3a8a;border-radius:8px;padding:14px 20px;display:flex;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#bae6fd;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Total Amount</td>
                    <td align="right" style="color:#ffffff;font-size:20px;font-weight:bold;">
                      ${reservation.currency || "USD"} ${reservation.total || "—"}
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- ── Action notice ─────────────────────────────────────────── -->
          <tr>
            <td style="padding:0 36px 28px 36px;">
              <div style="background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;padding:14px 16px;">
                <p style="color:#92400e;font-size:12px;font-weight:bold;margin:0 0 4px 0;text-transform:uppercase;">
                  Action Required
                </p>
                <p style="color:#b45309;font-size:12px;margin:0;line-height:1.5;">
                  Please log in to the Mo Rental dashboard to review and confirm this booking.
                  The customer is awaiting payment instructions.
                </p>
              </div>
            </td>
          </tr>

          <!-- ── Footer ───────────────────────────────────────────────── -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a 0%,#0891b2 100%);padding:22px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="color:#bae6fd;font-size:11px;margin:0 0 4px 0;font-weight:bold;letter-spacing:1px;">
                      Mo Rental · Staff Notification System
                    </p>
                    <p style="color:#7dd3fc;font-size:10px;margin:0;line-height:1.5;">
                      This is an automated internal alert. Do not reply to this email.<br>
                      © ${new Date().getFullYear()} Mo Rental Zimbabwe. All rights reserved.
                    </p>
                  </td>
                  <td align="right" style="vertical-align:bottom;">
                    <p style="color:#e0f2fe;font-size:10px;margin:0;">
                      ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
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

  await sendEmail({ to, subject, html });
}

/**
 * Send reservation status update email to customer
 *
 * @param {string} to
 * @param {string} fullName
 * @param {string} status  - one of the reservation status enum values
 * @param {object} reservation  - { code, vehicleModelName?, pickupAt?, dropoffAt? }
 */
async function sendReservationStatusUpdateEmail({ to, fullName, status, reservation }) {
  const statusConfig = {
    pending:     { label: "Pending",             color: "#f59e0b", badge: "PENDING" },
    confirmed:   { label: "Confirmed",           color: "#10b981", badge: "CONFIRMED" },
    checked_out: { label: "Checked Out",         color: "#0891b2", badge: "CHECKED OUT" },
    checked_in:  { label: "Checked In",          color: "#6366f1", badge: "CHECKED IN" },
    returned:    { label: "Returned",            color: "#8b5cf6", badge: "RETURNED" },
    completed:   { label: "Completed",           color: "#10b981", badge: "COMPLETED" },
    closed:      { label: "Closed",              color: "#64748b", badge: "CLOSED" },
    cancelled:   { label: "Cancelled",           color: "#ef4444", badge: "CANCELLED" },
    no_show:     { label: "No Show",             color: "#f97316", badge: "NO SHOW" },
  };

  const statusMessages = {
    pending:     "Your reservation is currently pending review by our team. We will update you shortly.",
    confirmed:   "Great news! Your reservation has been confirmed. Please ensure payment is completed and bring your driver's licence on the pickup date.",
    checked_out: "Your vehicle has been checked out and is ready for use. Please handle the vehicle with care and return it at the agreed date and time.",
    checked_in:  "Your vehicle return has been received by our team and is being processed.",
    returned:    "Your vehicle return has been successfully recorded by our team.",
    completed:   "Your reservation has been completed. Thank you for choosing Mo Rental!",
    closed:      "Your reservation has been closed. We hope you had a great experience with Mo Rental. We look forward to serving you again.",
    cancelled:   "Your reservation has been cancelled. If you believe this is an error or need assistance, please contact our customer support team.",
    no_show:     "Your reservation was marked as no-show as we did not receive a vehicle pickup. Please contact our team if you need further assistance.",
  };

  const cfg = statusConfig[status] || { label: status, color: "#334155", badge: status.toUpperCase() };
  const body = statusMessages[status] || `Your reservation status has been updated to ${cfg.label}.`;
  const subject = `Reservation ${reservation.code ? reservation.code + " — " : ""}Status Update: ${cfg.label}`;

  const detailsHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background-color:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="color:#1e3a8a;font-size:11px;margin:0 0 12px 0;font-weight:bold;border-bottom:2px solid #0891b2;padding-bottom:6px;letter-spacing:1px;text-transform:uppercase;">
            Reservation Details
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${reservation.code ? `
            <tr>
              <td style="padding:5px 0;color:#64748b;font-size:12px;width:140px;">Reference</td>
              <td style="padding:5px 0;color:#1e3a8a;font-size:13px;font-weight:bold;letter-spacing:1px;">${reservation.code}</td>
            </tr>` : ""}
            ${reservation.vehicleModelName ? `
            <tr>
              <td style="padding:5px 0;color:#64748b;font-size:12px;">Vehicle</td>
              <td style="padding:5px 0;color:#334155;font-size:12px;">${reservation.vehicleModelName}</td>
            </tr>` : ""}
            ${reservation.pickupAt ? `
            <tr>
              <td style="padding:5px 0;color:#64748b;font-size:12px;">Pickup Date</td>
              <td style="padding:5px 0;color:#334155;font-size:12px;">${reservation.pickupAt}</td>
            </tr>` : ""}
            ${reservation.dropoffAt ? `
            <tr>
              <td style="padding:5px 0;color:#64748b;font-size:12px;">Return Date</td>
              <td style="padding:5px 0;color:#334155;font-size:12px;">${reservation.dropoffAt}</td>
            </tr>` : ""}
            <tr>
              <td style="padding:8px 0 0 0;color:#64748b;font-size:12px;">New Status</td>
              <td style="padding:8px 0 0 0;">
                <span style="background-color:${cfg.color};color:#fff;font-size:11px;font-weight:bold;padding:3px 12px;border-radius:12px;letter-spacing:1px;">
                  ${cfg.badge}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const message = `
    <p style="margin:0 0 14px 0;">Dear ${fullName},</p>
    <p style="margin:0 0 14px 0;">${body}</p>
    <p style="margin:0;">If you have any questions, please do not hesitate to contact our support team.</p>
  `;

  const html = generateDocumentTemplate({ title: "Reservation Status Update", message, details: detailsHtml });
  await sendEmail({ to, subject, html });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendDeleteAccountEmail,
  sendPasswordResetEmail,
  sendBookingNotificationEmail,
  sendRentalConfirmationEmail,
  generateEmailTemplate,
  generateDocumentTemplate,
  sendAdminCreatedAccountEmail,
  sendNewBookingStaffAlertEmail,
  sendReservationStatusUpdateEmail,
};