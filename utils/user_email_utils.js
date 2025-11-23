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
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%); padding: 30px 40px; text-align: center;">
              <img src="https://aamokxxnfpmdpayvmngs.supabase.co/storage/v1/object/public/medicineimages/MR3.png" alt="MoRental Logo" style="max-width: 180px; height: auto;">
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1e3a8a; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">${title}</h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${message}
              </p>
              
              ${
                otpCode
                  ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <div style="background-color: #f0f9ff; border: 2px dashed #0891b2; border-radius: 8px; padding: 20px; display: inline-block;">
                      <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0; font-weight: 500;">Your Verification Code</p>
                      <p style="color: #1e3a8a; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${otpCode}</p>
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
                This code will expire in <strong>15 minutes</strong>. For your security, please do not share this code with anyone.
              </p>
              `
                  : ""
              }
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                <strong>MoRental Car Rental</strong>
              </p>
              <p style="color: #9ca3af; font-size: 13px; margin: 0; line-height: 1.5;">
                This is an automated message, please do not reply to this email.
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
 * Send verification email for new user registration
 */
async function sendVerificationEmail({ to, fullName, otp }) {
  const subject = "Verify Your Email - MoRental";
  const title = "Welcome to MoRental!";
  const message = `Hi ${fullName},<br><br>Thank you for registering with MoRental. To complete your registration and secure your account, please verify your email address using the code below.`;

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
  const subject = "Confirm Account Deletion - MoRental";
  const title = "Account Deletion Request";
  const message = `Hi ${fullName},<br><br>We received a request to delete your MoRental account. To confirm this action, please enter the verification code below. If you did not request this, please ignore this email and your account will remain active.`;

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
  const subject = "Reset Your Password - MoRental";
  const title = "Password Reset Request";
  const message = `Hi ${fullName},<br><br>We received a request to reset your password. Use the verification code below to proceed with resetting your password. If you didn't request this, please ignore this email.`;

  const html = generateEmailTemplate({
    title,
    message,
    otpCode: otp,
  });

  await sendEmail({ to, subject, html });
}

/**
 * Send reservation confirmation email to customer
 */
async function sendReservationCustomerEmail({ to, fullName, reservation }) {
  const subject = `Booking Confirmation - ${reservation.code}`;
  const title = "Reservation Confirmed!";

  const pickupBranch =
    reservation.pickup?.branch_id?.name ||
    reservation.pickup?.branch_id?.code ||
    reservation.pickup?.branch_id?._id ||
    "N/A";

  const dropoffBranch =
    reservation.dropoff?.branch_id?.name ||
    reservation.dropoff?.branch_id?.code ||
    reservation.dropoff?.branch_id?._id ||
    "N/A";

  const vehicleModel =
    reservation.vehicle_model_id?.name ||
    reservation.vehicle_model_id?._id ||
    "TBA";

  const currency = reservation.pricing?.currency || "";
  const grandTotal = reservation.pricing?.grand_total?.toString() || "0.00";

  const message = `Hi ${fullName},<br><br>Your reservation has been confirmed successfully. Below are your booking details:`;

  const detailsHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
      <tr>
        <td style="padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #0891b2;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Reservation Code</td>
              <td style="padding: 8px 0; color: #1e3a8a; font-size: 14px; font-weight: 600; text-align: right;">${reservation.code}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Vehicle</td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${vehicleModel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Pickup Location</td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${pickupBranch}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Pickup Date</td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${reservation.pickupAt}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Dropoff Location</td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${dropoffBranch}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Dropoff Date</td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${reservation.dropoffAt}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Status</td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; text-transform: capitalize;">${reservation.status}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 12px 0 0 0; border-top: 1px solid #e5e7eb;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; color: #1e3a8a; font-size: 16px; font-weight: 700;">Total Amount</td>
                    <td style="padding: 8px 0; color: #1e3a8a; font-size: 18px; font-weight: 700; text-align: right;">${currency} ${grandTotal}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 20px 0 0 0;">
      If you have any questions or need to make changes to your reservation, please contact our support team.
    </p>
  `;

  const html = generateReservationEmailTemplate({
    title,
    message,
    detailsHtml,
  });

  await sendEmail({ to, subject, html });
}

/**
 * Send reservation notification email to staff/creator
 */
async function sendReservationStaffEmail({
  to,
  fullName,
  reservation,
  customerInfo,
}) {
  const subject = `New Reservation Created - ${reservation.code}`;
  const title = "New Reservation";

  const pickupBranch =
    reservation.pickup?.branch_id?.name ||
    reservation.pickup?.branch_id?.code ||
    reservation.pickup?.branch_id?._id ||
    "N/A";

  const dropoffBranch =
    reservation.dropoff?.branch_id?.name ||
    reservation.dropoff?.branch_id?.code ||
    reservation.dropoff?.branch_id?._id ||
    "N/A";

  const vehicleModel =
    reservation.vehicle_model_id?.name ||
    reservation.vehicle_model_id?._id ||
    "TBA";

  const currency = reservation.pricing?.currency || "";
  const grandTotal = reservation.pricing?.grand_total?.toString() || "0.00";

  const message = `Hi ${fullName},<br><br>A new reservation has been created under your account. Here are the details:`;

  const detailsHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
      <tr>
        <td style="padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #0891b2;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Reservation Code</td>
              <td style="padding: 8px 0; color: #1e3a8a; font-size: 14px; font-weight: 600; text-align: right;">${
                reservation.code
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Customer</td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${
                customerInfo || "N/A"
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Vehicle</td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${vehicleModel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Pickup Location</td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${pickupBranch}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Pickup Date</td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${
                reservation.pickupAt
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Dropoff Location</td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${dropoffBranch}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Dropoff Date</td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${
                reservation.dropoffAt
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Status</td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right; text-transform: capitalize;">${
                reservation.status
              }</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 12px 0 0 0; border-top: 1px solid #e5e7eb;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; color: #1e3a8a; font-size: 16px; font-weight: 700;">Total Amount</td>
                    <td style="padding: 8px 0; color: #1e3a8a; font-size: 18px; font-weight: 700; text-align: right;">${currency} ${grandTotal}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 20px 0 0 0;">
      You can manage this reservation from the MoRental admin portal.
    </p>
  `;

  const html = generateReservationEmailTemplate({
    title,
    message,
    detailsHtml,
  });

  await sendEmail({ to, subject, html });
}

/**
 * Generate reservation email template (without OTP code)
 */
function generateReservationEmailTemplate({ title, message, detailsHtml }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%); padding: 30px 40px; text-align: center;">
              <img src="https://aamokxxnfpmdpayvmngs.supabase.co/storage/v1/object/public/medicineimages/MR3.png" alt="MoRental Logo" style="max-width: 180px; height: auto;">
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1e3a8a; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">${title}</h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">
                ${message}
              </p>
              
              ${detailsHtml}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                <strong>MoRental Car Rental</strong>
              </p>
              <p style="color: #9ca3af; font-size: 13px; margin: 0; line-height: 1.5;">
                This is an automated message, please do not reply to this email.
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
 * Base email sending function
 */
async function sendEmail({ to, subject, text, html }) {
  const mailOptions = {
    from: `MoRental <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html: html || `<p>${text}</p>`,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendDeleteAccountEmail,
  sendPasswordResetEmail,
  sendReservationCustomerEmail,
  sendReservationStaffEmail,
};
