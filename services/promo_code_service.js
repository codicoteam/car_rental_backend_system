// services/promo_code_service.js
const PromoCode = require("../models/promo_code_model");

/**
 * Utility: build a rich Error object with HTTP status & code
 */
function buildError(statusCode, code, message, details) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  if (details) err.details = details;
  return err;
}

/**
 * Normalize promo code string (uppercase + trim)
 */
function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

/**
 * Basic business validation for percent/fixed value + validity dates.
 */
function validatePromoPayload(payload = {}, isUpdate = false) {
  const { type, value, valid_from, valid_to } = payload;

  const errors = [];

  // Only validate type/value if present (for partial updates)
  if (!isUpdate || typeof type !== "undefined") {
    const effectiveType = type || payload.type;

    if (!effectiveType) {
      errors.push("type is required");
    } else if (!["percent", "fixed"].includes(effectiveType)) {
      errors.push("type must be 'percent' or 'fixed'");
    }

    if (!isUpdate || typeof value !== "undefined") {
      if (typeof value !== "number") {
        errors.push("value must be a number");
      } else if (effectiveType === "percent") {
        if (value <= 0 || value > 100) {
          errors.push("percent promo value must be between 0 and 100");
        }
      } else if (effectiveType === "fixed") {
        if (value <= 0) {
          errors.push("fixed promo value must be greater than 0");
        }
      }
    }
  }

  // Date logic: valid_from < valid_to (if both present)
  const from =
    typeof valid_from !== "undefined" ? valid_from : payload.valid_from;
  const to = typeof valid_to !== "undefined" ? valid_to : payload.valid_to;

  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      errors.push("valid_from and valid_to must be valid dates");
    } else if (fromDate >= toDate) {
      errors.push("valid_from must be before valid_to");
    }
  }

  if (errors.length > 0) {
    throw buildError(400, "PROMO_VALIDATION_ERROR", "Invalid promo payload", {
      errors,
    });
  }
}

/**
 * Create a new promo code
 */
async function createPromoCode(payload) {
  // Normalize code
  const code = normalizeCode(payload.code);

  if (!code) {
    throw buildError(400, "PROMO_CODE_REQUIRED", "Promo code is required");
  }

  validatePromoPayload(payload, false);

  // Enforce uniqueness on code at service level (since schema doesn't have unique index)
  const existing = await PromoCode.findOne({ code });
  if (existing) {
    throw buildError(
      409,
      "PROMO_CODE_EXISTS",
      `Promo code '${code}' already exists`
    );
  }

  const doc = new PromoCode({
    ...payload,
    code,
  });

  try {
    const saved = await doc.save();
    return saved;
  } catch (err) {
    console.error("createPromoCode DB error:", err);
    throw buildError(
      500,
      "PROMO_CREATE_DB_ERROR",
      "Database error while creating promo code"
    );
  }
}

/**
 * Get all promo codes with simple filters:
 *  - active=true|false
 *  - code=XYZ
 *  - type=percent|fixed
 *  - currency=USD|ZWL
 */
async function getAllPromoCodes(query = {}) {
  const { active, code, type, currency } = query;

  const filter = {};

  if (typeof active !== "undefined") {
    if (active === "true" || active === "1" || active === true) {
      filter.active = true;
    } else if (active === "false" || active === "0" || active === false) {
      filter.active = false;
    }
  }

  if (code) {
    filter.code = normalizeCode(code);
  }

  if (type) {
    filter.type = type;
  }

  if (currency) {
    filter.currency = currency;
  }

  const promos = await PromoCode.find(filter).sort({ createdAt: -1 });
  return promos;
}

/**
 * Get promo code by Mongo _id
 */
async function getPromoCodeById(id) {
  const promo = await PromoCode.findById(id);
  if (!promo) {
    throw buildError(404, "PROMO_NOT_FOUND", "Promo code not found");
  }
  return promo;
}

/**
 * Get promo code by its code (raw, no validity/usage checks)
 */
async function getPromoCodeByCodeRaw(code) {
  const normalized = normalizeCode(code);
  const promo = await PromoCode.findOne({ code: normalized });

  if (!promo) {
    throw buildError(
      404,
      "PROMO_NOT_FOUND",
      `Promo code '${normalized}' not found`
    );
  }

  return promo;
}

/**
 * Get a promo code by code AND enforce:
 *  - active = true
 *  - valid_from <= date <= valid_to (or valid_to is null)
 *  - usage_limit not exceeded (if set)
 */
async function getValidPromoByCode(code, atDate = new Date()) {
  const normalized = normalizeCode(code);
  const date = new Date(atDate);

  const promo = await PromoCode.findOne({
    code: normalized,
    active: true,
    valid_from: { $lte: date },
    $or: [{ valid_to: null }, { valid_to: { $gte: date } }],
  });

  if (!promo) {
    throw buildError(
      404,
      "PROMO_NOT_VALID",
      `Promo code '${normalized}' is not valid or not active`
    );
  }

  if (
    promo.usage_limit != null &&
    typeof promo.usage_limit === "number" &&
    promo.used_count >= promo.usage_limit
  ) {
    throw buildError(
      400,
      "PROMO_USAGE_EXCEEDED",
      `Promo code '${normalized}' has reached its usage limit`
    );
  }

  return promo;
}

/**
 * Get all currently valid promo codes
 *  - active = true
 *  - valid_from <= date <= valid_to (or valid_to is null)
 *  - usage_limit not exceeded (if set)
 */
async function getActivePromos(atDate = new Date()) {
  const date = new Date(atDate);

  const promos = await PromoCode.find({
    active: true,
    valid_from: { $lte: date },
    $or: [{ valid_to: null }, { valid_to: { $gte: date } }],
    $expr: {
      $or: [
        { $eq: ["$usage_limit", null] },
        { $gt: ["$usage_limit", "$used_count"] },
      ],
    },
  }).sort({ createdAt: -1 });

  return promos;
}

/**
 * Update promo code by id (partial update / PATCH)
 */
async function updatePromoCode(id, payload = {}) {
  const promo = await PromoCode.findById(id);
  if (!promo) {
    throw buildError(404, "PROMO_NOT_FOUND", "Promo code not found");
  }

  // Normalize code if attempting to change it
  if (typeof payload.code !== "undefined") {
    payload.code = normalizeCode(payload.code);

    if (!payload.code) {
      throw buildError(400, "PROMO_CODE_REQUIRED", "Promo code is required");
    }

    // Check if new code collides with another promo
    const existing = await PromoCode.findOne({
      code: payload.code,
      _id: { $ne: promo._id },
    });
    if (existing) {
      throw buildError(
        409,
        "PROMO_CODE_EXISTS",
        `Promo code '${payload.code}' already exists`
      );
    }
  }

  // Validate payload logically
  validatePromoPayload(payload, true);

  Object.assign(promo, payload);

  try {
    const saved = await promo.save();
    return saved;
  } catch (err) {
    console.error("updatePromoCode DB error:", err);
    throw buildError(
      500,
      "PROMO_UPDATE_DB_ERROR",
      "Database error while updating promo code"
    );
  }
}

/**
 * Delete promo code by id
 */
async function deletePromoCode(id) {
  const deleted = await PromoCode.findByIdAndDelete(id);
  if (!deleted) {
    throw buildError(404, "PROMO_NOT_FOUND", "Promo code not found");
  }
  return true;
}

module.exports = {
  createPromoCode,
  getAllPromoCodes,
  getPromoCodeById,
  getPromoCodeByCodeRaw,
  getValidPromoByCode,
  getActivePromos,
  updatePromoCode,
  deletePromoCode,
};
