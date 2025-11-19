// services/rate_plan_service.js
const RatePlan = require("../models/rate_plan_model");

/**
 * Build filter from query params
 */
function buildRatePlanFilter(query = {}) {
  const {
    branch_id,
    vehicle_class,
    vehicle_model_id,
    vehicle_id,
    currency,
    active,
    valid_on, // optional date to filter by validity window
  } = query;

  const filter = {};

  if (branch_id) filter.branch_id = branch_id;
  if (vehicle_class) filter.vehicle_class = vehicle_class;
  if (vehicle_model_id) filter.vehicle_model_id = vehicle_model_id;
  if (vehicle_id) filter.vehicle_id = vehicle_id;
  if (currency) filter.currency = currency;
  if (typeof active !== "undefined") {
    if (active === "true" || active === true) filter.active = true;
    if (active === "false" || active === false) filter.active = false;
  }

  if (valid_on) {
    const d = new Date(valid_on);
    filter.valid_from = { $lte: d };
    filter.$or = [
      { valid_to: null },
      { valid_to: { $gte: d } },
    ];
  }

  return filter;
}

/**
 * Create a rate plan
 */
async function createRatePlan(payload) {
  try {
    const plan = await RatePlan.create(payload);
    return plan;
  } catch (err) {
    const error = new Error("Failed to create rate plan");
    error.statusCode = 400;
    error.code = "RATE_PLAN_CREATE_FAILED";
    error.details = err.message;
    throw error;
  }
}

/**
 * List rate plans (no hard pagination enforced; optional page/limit)
 */
async function listRatePlans(query = {}) {
  const page = query.page ? Number(query.page) : 1;
  const limit = query.limit ? Number(query.limit) : 50;
  const skip = (page - 1) * limit;

  const filter = buildRatePlanFilter(query);

  const [items, total] = await Promise.all([
    RatePlan.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("branch_id", "name")
      .populate("vehicle_model_id")
      .populate("vehicle_id"),
    RatePlan.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single rate plan by ID
 */
async function getRatePlanById(id) {
  const plan = await RatePlan.findById(id)
    .populate("branch_id", "name")
    .populate("vehicle_model_id")
    .populate("vehicle_id");

  if (!plan) {
    const error = new Error("Rate plan not found");
    error.statusCode = 404;
    error.code = "RATE_PLAN_NOT_FOUND";
    throw error;
  }

  return plan;
}

/**
 * Update a rate plan
 */
async function updateRatePlan(id, payload) {
  try {
    const plan = await RatePlan.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    })
      .populate("branch_id", "name")
      .populate("vehicle_model_id")
      .populate("vehicle_id");

    if (!plan) {
      const error = new Error("Rate plan not found");
      error.statusCode = 404;
      error.code = "RATE_PLAN_NOT_FOUND";
      throw error;
    }

    return plan;
  } catch (err) {
    const error = new Error("Failed to update rate plan");
    error.statusCode = 400;
    error.code = "RATE_PLAN_UPDATE_FAILED";
    error.details = err.message;
    throw error;
  }
}

/**
 * Delete a rate plan
 */
async function deleteRatePlan(id) {
  const plan = await RatePlan.findByIdAndDelete(id);
  if (!plan) {
    const error = new Error("Rate plan not found");
    error.statusCode = 404;
    error.code = "RATE_PLAN_NOT_FOUND";
    throw error;
  }
  return plan;
}

/**
 * Find plans for a specific vehicle (optional filters)
 */
async function findRatePlansByVehicle(vehicleId, query = {}) {
  const filter = buildRatePlanFilter({
    ...query,
    vehicle_id: vehicleId,
  });

  const plans = await RatePlan.find(filter)
    .sort({ valid_from: -1 })
    .populate("branch_id", "name")
    .populate("vehicle_model_id")
    .populate("vehicle_id");

  return plans;
}

/**
 * Find plans for a specific vehicle model
 */
async function findRatePlansByModel(vehicleModelId, query = {}) {
  const filter = buildRatePlanFilter({
    ...query,
    vehicle_model_id: vehicleModelId,
  });

  const plans = await RatePlan.find(filter)
    .sort({ valid_from: -1 })
    .populate("branch_id", "name")
    .populate("vehicle_model_id")
    .populate("vehicle_id");

  return plans;
}

/**
 * Find plans for a vehicle class
 */
async function findRatePlansByClass(vehicleClass, query = {}) {
  const filter = buildRatePlanFilter({
    ...query,
    vehicle_class: vehicleClass,
  });

  const plans = await RatePlan.find(filter)
    .sort({ valid_from: -1 })
    .populate("branch_id", "name")
    .populate("vehicle_model_id")
    .populate("vehicle_id");

  return plans;
}

module.exports = {
  createRatePlan,
  listRatePlans,
  getRatePlanById,
  updateRatePlan,
  deleteRatePlan,
  findRatePlansByVehicle,
  findRatePlansByModel,
  findRatePlansByClass,
};
