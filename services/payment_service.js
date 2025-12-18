// services/payment_service.js
const mongoose = require("mongoose");
const Payment = require("../models/payment_model"); // your Payment schema file
const PromoCode = require("../models/promo_code_model"); // your PromoCode schema file
const Paynow = require("paynow"); // npm i paynow
require("dotenv").config();

const { PAYNOW_ID, PAYNOW_KEY, PAYNOW_RESULT_URL, PAYNOW_RETURN_URL } =
  process.env;

function initPaynow() {
  if (!PAYNOW_ID || !PAYNOW_KEY) {
    throw new Error("Paynow credentials are not configured.");
  }
  const paynow = new Paynow(PAYNOW_ID, PAYNOW_KEY);
  if (PAYNOW_RESULT_URL) paynow.resultUrl(PAYNOW_RESULT_URL);
  if (PAYNOW_RETURN_URL) paynow.returnUrl(PAYNOW_RETURN_URL);
  return paynow;
}

/** Convert decimal/number/str to Decimal128 */
function toDec128(val) {
  const n = typeof val === "number" ? val : parseFloat(String(val));
  if (Number.isNaN(n)) throw new Error("Invalid amount.");
  return mongoose.Types.Decimal128.fromString(n.toFixed(2));
}

function fromDec128(d) {
  if (!d) return 0;
  return parseFloat(d.toString());
}

/** Validate & compute promo discount for a raw amount */
async function computePromoDiscount({ code, amount, currency, context = {} }) {
  if (!code) return { discount: 0, promo: null, reason: null };
  const now = new Date();
  const promo = await PromoCode.findOne({
    code: code.toUpperCase(),
    active: true,
  });
  if (!promo) return { discount: 0, promo: null, reason: "INVALID_CODE" };

  if (promo.valid_from && now < promo.valid_from) {
    return { discount: 0, promo, reason: "NOT_STARTED" };
  }
  if (promo.valid_to && now > promo.valid_to) {
    return { discount: 0, promo, reason: "EXPIRED" };
  }
  if (promo.usage_limit && promo.used_count >= promo.usage_limit) {
    return { discount: 0, promo, reason: "USAGE_LIMIT_REACHED" };
  }

  // (Optional) contextual constraints (class, days, branch) can be checked via `context`
  // Skipping nuanced checks unless you pass in context.

  let discount = 0;
  if (promo.type === "percent") {
    const pct = Math.max(0, Math.min(100, promo.value));
    discount = (pct / 100) * amount;
  } else {
    // fixed
    if (!promo.currency || promo.currency !== currency) {
      return { discount: 0, promo, reason: "CURRENCY_MISMATCH" };
    }
    discount = promo.value;
  }

  discount = Math.min(discount, amount);
  return { discount, promo, reason: null };
}

/** Create a Payment document (pending) */
async function createPaymentDoc({
  user_id,
  reservation_id,
  driver_booking_id,
  provider = "paynow",
  method,
  amount,
  currency,
  promo, // {code, id}
  discountedAmount,
  pollUrl = "not available",
  provider_ref,
}) {
  const payment = await Payment.create({
    user_id,
    reservation_id: reservation_id || null,
    driver_booking_id: driver_booking_id || null,
    provider,
    method,
    amount: toDec128(discountedAmount),
    currency,
    paymentStatus: "pending",
    pollUrl,
    pricePaid: Number(discountedAmount.toFixed(2)),
    promotionApplied: !!promo,
    promotionDiscount: promo
      ? Number((amount - discountedAmount).toFixed(2))
      : 0,
    promo_code_id: promo?.id || null,
    promo_code: promo?.code || null,
    provider_ref,
  });
  return payment;
}

/** Initiate redirect/card/bank payment (returns redirectUrl + pollUrl) */
async function initiateRedirectPayment({
  user,
  reservation_id,
  driver_booking_id,
  amount,
  currency = "USD",
  promo_code,
  reference, // your internal reference string
  payerEmail, // optional
  lineItem = "Payment",
}) {
  const paynow = initPaynow();
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) throw new Error("Amount must be greater than zero.");
  const { discount, promo, reason } = await computePromoDiscount({
    code: promo_code,
    amount: amt,
    currency,
  });
  const finalAmount = amt - discount;

  const paymentReq = paynow.createPayment(
    reference || `REF-${Date.now()}`,
    payerEmail || undefined
  );
  paymentReq.add(lineItem, finalAmount);

  const response = await paynow.send(paymentReq);
  if (!response.success) {
    const msg = response.error || "Paynow initiation failed.";
    const err = new Error(msg);
    err.status = 502;
    throw err;
  }

  const paymentDoc = await createPaymentDoc({
    user_id: user._id,
    reservation_id,
    driver_booking_id,
    method: "card", // generic redirect method
    amount: amt,
    currency,
    promo: promo_code && !reason ? { code: promo.code, id: promo._id } : null,
    discountedAmount: finalAmount,
    pollUrl: response.pollUrl,
    provider_ref: response.payment ? response.payment.reference : undefined,
  });

  return {
    redirectUrl: response.redirectUrl,
    pollUrl: response.pollUrl,
    payment: paymentDoc,
    promo_warning: reason || null,
  };
}

/** Initiate mobile payment (Ecocash/OneMoney/Telecash if supported) */
async function initiateMobilePayment({
  user,
  reservation_id,
  driver_booking_id,
  amount,
  currency = "USD",
  promo_code,
  phone, // e.g. 077xxxxxxx
  mobileMethod = "ecocash", // 'ecocash', 'onemoney' etc. (as supported by paynow)
  reference,
  lineItem = "Mobile Payment",
}) {
  const paynow = initPaynow();
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) throw new Error("Amount must be greater than zero.");
  if (!phone) throw new Error("Phone is required for mobile payment.");

  const { discount, promo, reason } = await computePromoDiscount({
    code: promo_code,
    amount: amt,
    currency,
  });
  const finalAmount = amt - discount;

  const paymentReq = paynow.createPayment(reference || `REF-${Date.now()}`);
  paymentReq.add(lineItem, finalAmount);

  const response = await paynow.sendMobile(paymentReq, phone, mobileMethod);
  if (!response.success) {
    const msg = response.error || "Paynow mobile initiation failed.";
    const err = new Error(msg);
    err.status = 502;
    throw err;
  }

  const paymentDoc = await createPaymentDoc({
    user_id: user._id,
    reservation_id,
    driver_booking_id,
    method: "wallet",
    amount: amt,
    currency,
    promo: promo_code && !reason ? { code: promo.code, id: promo._id } : null,
    discountedAmount: finalAmount,
    pollUrl: response.pollUrl,
    provider_ref: response.payment ? response.payment.reference : undefined,
  });

  return {
    instructions: response.instructions || null,
    pollUrl: response.pollUrl,
    payment: paymentDoc,
    promo_warning: reason || null,
  };
}

/** Poll Paynow for status (by paymentId or pollUrl) */
async function pollStatus({ paymentId, pollUrl }) {
  const paynow = initPaynow();
  let payment = null;
  if (paymentId) {
    payment = await Payment.findById(paymentId);
    if (!payment) {
      const err = new Error("Payment not found.");
      err.status = 404;
      throw err;
    }
    pollUrl = payment.pollUrl;
  }
  if (!pollUrl || pollUrl === "not available") {
    const err = new Error("No pollUrl available for this payment.");
    err.status = 400;
    throw err;
  }

  const response = await paynow.pollTransaction(pollUrl);
  if (!response) {
    const err = new Error("Unable to reach Paynow.");
    err.status = 502;
    throw err;
  }

  // Map Paynow statuses to our enums
  // Typical statuses: Paid, Awaiting Delivery, Delivered, Cancelled, Failed, Created, Sent
  const mapStatus = (s) => {
    const x = String(s || "").toLowerCase();
    if (x.includes("paid")) return "paid";
    if (x.includes("awaiting delivery")) return "awaiting_delivery";
    if (x.includes("awaiting confirmation")) return "awaiting_confirmation";
    if (x.includes("sent") || x.includes("created")) return "sent";
    if (x.includes("cancel")) return "cancelled";
    if (x.includes("fail")) return "failed";
    return "pending";
  };

  const newStatus = mapStatus(response.status);
  const provider_ref =
    response.reference || (payment ? payment.provider_ref : undefined);

  // Update payment if we loaded it
  if (payment) {
    payment.paymentStatus = newStatus;
    if (newStatus === "paid" && !payment.captured_at) {
      payment.captured_at = new Date();
    }
    if (provider_ref && !payment.provider_ref)
      payment.provider_ref = provider_ref;
    await payment.save();
  }

  return {
    status: newStatus,
    provider_status: response.status,
    amount: response.amount,
    reference: provider_ref,
    raw: response,
    payment: payment || null,
  };
}

/** Apply promo code to an existing pending payment (recomputes amount) */
async function applyPromo({ paymentId, code }) {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    const err = new Error("Payment not found.");
    err.status = 404;
    throw err;
  }
  if (
    payment.paymentStatus !== "pending" &&
    payment.paymentStatus !== "unpaid"
  ) {
    const err = new Error("Cannot apply promo to a non-pending payment.");
    err.status = 409;
    throw err;
  }

  const base =
    fromDec128(payment.amount) +
    (payment.promotionApplied ? payment.promotionDiscount : 0);
  const { discount, promo, reason } = await computePromoDiscount({
    code,
    amount: base,
    currency: payment.currency,
  });

  payment.promotionApplied = !!promo && !reason;
  payment.promotionDiscount = discount;
  payment.promo_code_id = promo && !reason ? promo._id : null;
  payment.promo_code = promo && !reason ? promo.code : null;
  const newAmount = base - discount;
  payment.amount = toDec128(newAmount);
  payment.pricePaid = Number(newAmount.toFixed(2));
  await payment.save();

  return { payment, promo_warning: reason || null };
}

/** Remove promo from pending payment */
async function removePromo({ paymentId }) {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    const err = new Error("Payment not found.");
    err.status = 404;
    throw err;
  }
  if (
    payment.paymentStatus !== "pending" &&
    payment.paymentStatus !== "unpaid"
  ) {
    const err = new Error("Cannot remove promo from a non-pending payment.");
    err.status = 409;
    throw err;
  }

  // restore original base = amount + discount
  const base =
    fromDec128(payment.amount) +
    (payment.promotionApplied ? payment.promotionDiscount : 0);
  payment.promotionApplied = false;
  payment.promotionDiscount = 0;
  payment.promo_code_id = null;
  payment.promo_code = null;
  payment.amount = toDec128(base);
  payment.pricePaid = Number(base.toFixed(2));
  await payment.save();

  return { payment };
}

/** Cancel a pending/unpaid payment (local only) */
async function cancelPayment({ paymentId }) {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    const err = new Error("Payment not found.");
    err.status = 404;
    throw err;
  }
  if (["paid", "cancelled", "failed"].includes(payment.paymentStatus)) {
    const err = new Error("Payment cannot be cancelled in its current status.");
    err.status = 409;
    throw err;
  }
  payment.paymentStatus = "cancelled";
  await payment.save();
  return { payment };
}

/** Record a refund locally (Paynow refunds typically require portal/manual) */
async function refundPayment({ paymentId, amount, provider_ref }) {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    const err = new Error("Payment not found.");
    err.status = 404;
    throw err;
  }
  if (payment.paymentStatus !== "paid") {
    const err = new Error("Only paid payments can be refunded.");
    err.status = 409;
    throw err;
  }
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) {
    const err = new Error("Refund amount must be greater than zero.");
    err.status = 400;
    throw err;
  }
  const alreadyRefunded = (payment.refunds || []).reduce(
    (sum, r) => sum + fromDec128(r.amount),
    0
  );
  const remaining = fromDec128(payment.amount) - alreadyRefunded;
  if (amt > remaining + 1e-6) {
    const err = new Error("Refund exceeds remaining amount.");
    err.status = 400;
    throw err;
  }

  payment.refunds.push({
    amount: toDec128(amt),
    provider_ref: provider_ref || null,
    at: new Date(),
  });
  await payment.save();
  return { payment, refunded: amt, totalRefunded: alreadyRefunded + amt };
}

/** Webhook/result handler: update status using poll or payload */
async function handlePaynowWebhook({ query = {}, body = {} }) {
  // Paynow typically recommends polling using pollUrl; however, they also POST back.
  // Try to locate payment via provided reference or merchant reference.
  const ref =
    body.reference ||
    body.merchantReference ||
    query.reference ||
    query.merchantReference;
  let payment = null;
  if (ref) {
    payment = await Payment.findOne({ provider_ref: ref });
  }
  // Fallback: do nothing if we can't resolve; return ok to avoid retries storm
  if (!payment)
    return { updated: false, message: "Payment not resolved by reference." };

  // Best-effort: poll current status
  if (payment.pollUrl && payment.pollUrl !== "not available") {
    const result = await pollStatus({ pollUrl: payment.pollUrl });
    return {
      updated: true,
      status: result.status,
      paymentId: payment._id.toString(),
    };
  }

  // Or map status from payload if present
  const statusText = body.status || query.status || "";
  if (statusText) {
    const mapped = /paid/i.test(statusText)
      ? "paid"
      : /awaiting delivery/i.test(statusText)
      ? "awaiting_delivery"
      : /awaiting confirmation/i.test(statusText)
      ? "awaiting_confirmation"
      : /cancel/i.test(statusText)
      ? "cancelled"
      : /fail/i.test(statusText)
      ? "failed"
      : /sent|created/i.test(statusText)
      ? "sent"
      : "pending";

    payment.paymentStatus = mapped;
    if (mapped === "paid" && !payment.captured_at)
      payment.captured_at = new Date();
    await payment.save();
    return { updated: true, status: mapped, paymentId: payment._id.toString() };
  }

  return { updated: false, message: "No actionable status in webhook." };
}

/** Queries */
async function getPaymentById(id) {
  const p = await Payment.findById(id);
  if (!p) {
    const err = new Error("Payment not found.");
    err.status = 404;
    throw err;
  }
  return p;
}

async function listPayments({ userId, status, page = 1, limit = 20 }) {
  const q = {};
  if (userId) q.user_id = userId;
  if (status) q.paymentStatus = status;
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const [items, total] = await Promise.all([
    Payment.find(q)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Math.max(1, limit)),
    Payment.countDocuments(q),
  ]);
  return {
    items,
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Math.max(1, limit)) || 1,
  };
}

module.exports = {
  initiateRedirectPayment,
  initiateMobilePayment,
  pollStatus,
  applyPromo,
  removePromo,
  refundPayment,
  cancelPayment,
  handlePaynowWebhook,
  getPaymentById,
  listPayments,
};
