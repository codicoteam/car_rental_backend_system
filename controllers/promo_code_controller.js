// controllers/promo_code_controller.js
const promoService = require("../services/promo_code_service");

function hasRole(user, role) {
  return Array.isArray(user.roles) && user.roles.includes(role);
}

function isPromoManager(user) {
  // allow manager & admin to manage promos
  return Array.isArray(user.roles)
    ? user.roles.some((r) => ["manager", "admin"].includes(r))
    : false;
}

/**
 * POST /api/promo-codes
 * manager/admin only
 */
async function createPromoCode(req, res) {
  try {
    const { user } = req;

    if (!isPromoManager(user)) {
      return res.status(403).json({
        success: false,
        code: "PROMO_FORBIDDEN",
        message: "Only manager/admin can create promo codes",
      });
    }

    const promo = await promoService.createPromoCode(req.body);

    return res.status(201).json({
      success: true,
      message: "Promo code created successfully",
      data: promo,
    });
  } catch (error) {
    console.error("createPromoCode error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "PROMO_CREATE_ERROR",
      message: error.message || "Failed to create promo code",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

/**
 * GET /api/promo-codes
 * manager/admin only
 * Standalone "get all" with simple filters (active, code)
 */
async function getAllPromoCodes(req, res) {
  try {
    const { user } = req;

    if (!isPromoManager(user)) {
      return res.status(403).json({
        success: false,
        code: "PROMO_FORBIDDEN",
        message: "Only manager/admin can list promo codes",
      });
    }

    const promos = await promoService.getAllPromoCodes(req.query);

    return res.json({
      success: true,
      data: promos,
    });
  } catch (error) {
    console.error("getAllPromoCodes error:", error);
    return res.status(500).json({
      success: false,
      code: "PROMO_LIST_ERROR",
      message: "Failed to fetch promo codes",
    });
  }
}

/**
 * GET /api/promo-codes/{id}
 * manager/admin only
 */
async function getPromoCodeById(req, res) {
  try {
    const { user } = req;

    if (!isPromoManager(user)) {
      return res.status(403).json({
        success: false,
        code: "PROMO_FORBIDDEN",
        message: "Only manager/admin can view promo codes by id",
      });
    }

    const promo = await promoService.getPromoCodeById(req.params.id);

    return res.json({
      success: true,
      data: promo,
    });
  } catch (error) {
    console.error("getPromoCodeById error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "PROMO_GET_ERROR",
      message: error.message || "Failed to fetch promo code",
    });
  }
}

/**
 * GET /api/promo-codes/code/{code}
 * Public: validate a specific code (optionally enforce validity)
 * Query: ?enforceValidity=true|false (default true)
 */
async function getPromoByCode(req, res) {
  try {
    const { code } = req.params;
    const { enforceValidity = "true", at } = req.query;

    const shouldEnforce =
      enforceValidity === "true" || enforceValidity === true;

    const date = at ? new Date(at) : new Date();

    const promo = shouldEnforce
      ? await promoService.getValidPromoByCode(code, date)
      : await promoService.getPromoCodeByCodeRaw(code);

    return res.json({
      success: true,
      data: promo,
    });
  } catch (error) {
    console.error("getPromoByCode error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "PROMO_BY_CODE_ERROR",
      message: error.message || "Failed to fetch promo code",
    });
  }
}

/**
 * GET /api/promo-codes/active
 * Public: get all currently valid promo codes
 */
async function getActivePromoCodes(req, res) {
  try {
    const { at } = req.query;
    const date = at ? new Date(at) : new Date();

    const promos = await promoService.getActivePromos(date);

    return res.json({
      success: true,
      data: promos,
    });
  } catch (error) {
    console.error("getActivePromoCodes error:", error);
    return res.status(500).json({
      success: false,
      code: "PROMO_ACTIVE_LIST_ERROR",
      message: "Failed to fetch active promo codes",
    });
  }
}

/**
 * PATCH /api/promo-codes/{id}
 * manager/admin only
 */
async function updatePromoCode(req, res) {
  try {
    const { user } = req;

    if (!isPromoManager(user)) {
      return res.status(403).json({
        success: false,
        code: "PROMO_FORBIDDEN",
        message: "Only manager/admin can update promo codes",
      });
    }

    const promo = await promoService.updatePromoCode(
      req.params.id,
      req.body
    );

    return res.json({
      success: true,
      message: "Promo code updated successfully",
      data: promo,
    });
  } catch (error) {
    console.error("updatePromoCode error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "PROMO_UPDATE_ERROR",
      message: error.message || "Failed to update promo code",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

/**
 * DELETE /api/promo-codes/{id}
 * admin only
 */
async function deletePromoCode(req, res) {
  try {
    const { user } = req;

    if (!hasRole(user, "admin")) {
      return res.status(403).json({
        success: false,
        code: "PROMO_FORBIDDEN",
        message: "Only admin can delete promo codes",
      });
    }

    await promoService.deletePromoCode(req.params.id);

    return res.json({
      success: true,
      message: "Promo code deleted successfully",
    });
  } catch (error) {
    console.error("deletePromoCode error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "PROMO_DELETE_ERROR",
      message: error.message || "Failed to delete promo code",
    });
  }
}

module.exports = {
  createPromoCode,
  getAllPromoCodes,
  getPromoCodeById,
  getPromoByCode,
  getActivePromoCodes,
  updatePromoCode,
  deletePromoCode,
};
