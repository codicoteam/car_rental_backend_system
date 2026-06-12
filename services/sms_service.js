// services/sms_service.js
// Twilio SMS service with Zimbabwe phone number formatting.

const twilio = require('twilio');

/**
 * Convert a local Zimbabwe phone number to E.164 format.
 * Zimbabwe numbers that start with 07X → +2637X
 * Numbers already in E.164 (+263...) are returned as-is.
 * Other international formats are returned unchanged.
 *
 * @param {string} phone - Raw phone number string.
 * @returns {string} - E.164 formatted phone number.
 */
function formatToE164Zimbabwe(phone) {
  if (!phone) return phone;

  // Remove any spaces or dashes
  const cleaned = phone.replace(/[\s\-]/g, '');

  // Already in E.164
  if (cleaned.startsWith('+')) return cleaned;

  // Local Zimbabwe format: starts with 07X or 07XXXXXXXX
  if (cleaned.startsWith('07') && cleaned.length === 10) {
    // Strip leading 0, prepend +263
    return '+263' + cleaned.slice(1);
  }

  // Starts with 263 (without +)
  if (cleaned.startsWith('263')) {
    return '+' + cleaned;
  }

  // Fallback: return as-is (may fail Twilio validation but we won't crash)
  return cleaned;
}

/**
 * Send an SMS message via Twilio.
 *
 * @param {string} to - Recipient phone number (will be auto-formatted for Zimbabwe).
 * @param {string} body - SMS message body.
 * @returns {Promise<object>} - Twilio message object.
 */
async function sendSms(to, body) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || !messagingServiceSid) {
    throw new Error('Twilio credentials are not configured in environment variables.');
  }

  const client = twilio(accountSid, authToken);
  const formattedTo = formatToE164Zimbabwe(to);

  const message = await client.messages.create({
    body,
    messagingServiceSid,
    to: formattedTo,
  });

  console.log(`[SmsService] Sent SMS to ${formattedTo}. SID: ${message.sid}`);
  return message;
}

module.exports = { sendSms, formatToE164Zimbabwe };
