// controllers/rate_plan_controller.js
const ratePlanService = require("../services/rate_plan_service");

function hasRole(user, role) {
  return Array.isArray(user.roles) && user.roles.includes(role);
}

function isPricingStaff(user) {
  // Only manager/admin can manage rate plans
  return Array.isArray(user.roles)
    ? user.roles.some((r) => ["manager", "admin"].includes(r))
    : false;
}

/**
 * POST /api/rate-plans
 */
async function createRatePlan(req, res) {
  try {
    const { user } = req;

    if (!isPricingStaff(user)) {
      return res.status(403).json({
        success: false,
        code: "RATE_PLAN_FORBIDDEN",
        message: "Only manager/admin can create rate plans",
      });
    }

    const plan = await ratePlanService.createRatePlan(req.body);

    return res.status(201).json({
      success: true,
      message: "Rate plan created successfully",
      data: plan,
    });
  } catch (error) {
    console.error("createRatePlan error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "RATE_PLAN_CREATE_ERROR",
      message: error.message || "Failed to create rate plan",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

/**
 * GET /api/rate-plans
 */
async function listRatePlans(req, res) {
  try {
    const { user } = req;

    // you might want to restrict listing to staff only
    if (!isPricingStaff(user)) {
      return res.status(403).json({
        success: false,
        code: "RATE_PLAN_FORBIDDEN",
        message: "Only manager/admin can list rate plans",
      });
    }

    const result = await ratePlanService.listRatePlans(req.query);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("listRatePlans error:", error);
    return res.status(500).json({
      success: false,
      code: "RATE_PLAN_LIST_ERROR",
      message: "Failed to fetch rate plans",
    });
  }
}

/**
 * GET /api/rate-plans/:id
 */
async function getRatePlanById(req, res) {
  try {
    const plan = await ratePlanService.getRatePlanById(req.params.id);

    return res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error("getRatePlanById error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "RATE_PLAN_GET_ERROR",
      message: error.message || "Failed to fetch rate plan",
    });
  }
}

/**
 * PATCH /api/rate-plans/:id
 */
async function updateRatePlan(req, res) {
  try {
    const { user } = req;

    if (!isPricingStaff(user)) {
      return res.status(403).json({
        success: false,
        code: "RATE_PLAN_FORBIDDEN",
        message: "Only manager/admin can update rate plans",
      });
    }

    const plan = await ratePlanService.updateRatePlan(
      req.params.id,
      req.body
    );

    return res.json({
      success: true,
      message: "Rate plan updated successfully",
      data: plan,
    });
  } catch (error) {
    console.error("updateRatePlan error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "RATE_PLAN_UPDATE_ERROR",
      message: error.message || "Failed to update rate plan",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

/**
 * DELETE /api/rate-plans/:id
 * admin only
 */
async function deleteRatePlan(req, res) {
  try {
    const { user } = req;

    if (!hasRole(user, "admin")) {
      return res.status(403).json({
        success: false,
        code: "RATE_PLAN_FORBIDDEN",
        message: "Only admin can delete rate plans",
      });
    }

    await ratePlanService.deleteRatePlan(req.params.id);

    return res.json({
      success: true,
      message: "Rate plan deleted successfully",
    });
  } catch (error) {
    console.error("deleteRatePlan error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "RATE_PLAN_DELETE_ERROR",
      message: error.message || "Failed to delete rate plan",
    });
  }
}

/**
 * GET /api/rate-plans/by-vehicle/:vehicleId
 */
async function getRatePlansByVehicle(req, res) {
  try {
    const { vehicleId } = req.params;
    const plans = await ratePlanService.findRatePlansByVehicle(
      vehicleId,
      req.query
    );

    return res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error("getRatePlansByVehicle error:", error);
    return res.status(500).json({
      success: false,
      code: "RATE_PLAN_BY_VEHICLE_ERROR",
      message: "Failed to fetch rate plans for vehicle",
    });
  }
}

/**
 * GET /api/rate-plans/by-model/:vehicleModelId
 */
async function getRatePlansByModel(req, res) {
  try {
    const { vehicleModelId } = req.params;
    const plans = await ratePlanService.findRatePlansByModel(
      vehicleModelId,
      req.query
    );

    return res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error("getRatePlansByModel error:", error);
    return res.status(500).json({
      success: false,
      code: "RATE_PLAN_BY_MODEL_ERROR",
      message: "Failed to fetch rate plans for vehicle model",
    });
  }
}

/**
 * GET /api/rate-plans/by-class/:vehicleClass
 */
async function getRatePlansByClass(req, res) {
  try {
    const { vehicleClass } = req.params;
    const plans = await ratePlanService.findRatePlansByClass(
      vehicleClass,
      req.query
    );

    return res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error("getRatePlansByClass error:", error);
    return res.status(500).json({
      success: false,
      code: "RATE_PLAN_BY_CLASS_ERROR",
      message: "Failed to fetch rate plans for vehicle class",
    });
  }
}

module.exports = {
  createRatePlan,
  listRatePlans,
  getRatePlanById,
  updateRatePlan,
  deleteRatePlan,
  getRatePlansByVehicle,
  getRatePlansByModel,
  getRatePlansByClass,
};
