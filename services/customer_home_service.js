// services/customer_home_service.js
const Vehicle = require("../models/vehicle_unit_model");
const Branch = require("../models/branch_models");
const PromoCode = require("../models/promo_code_model");
const Reservation = require("../models/reservations_model");
const DriverProfile = require("../models/drivers_profile_model");
const RatePlan = require("../models/rate_plan_model");

// ── Helpers ──────────────────────────────────────────────────────────────────
function toFloat(d128) {
  return d128 != null ? parseFloat(d128.toString()) : null;
}

function pickBestPlan(plans, vehicleId, modelId, vehicleClass) {
  return (
    plans.find((p) => p.vehicle_id && String(p.vehicle_id) === String(vehicleId)) ||
    plans.find((p) => !p.vehicle_id && p.vehicle_model_id && String(p.vehicle_model_id) === String(modelId)) ||
    plans.find((p) => !p.vehicle_id && !p.vehicle_model_id && p.vehicle_class === vehicleClass) ||
    null
  );
}

function buildRatePlanSummary(plan) {
  if (!plan) return null;
  return {
    daily_rate: toFloat(plan.daily_rate),
    weekly_rate: toFloat(plan.weekly_rate),
    monthly_rate: toFloat(plan.monthly_rate),
    currency: plan.currency,
    name: plan.name || null,
  };
}

async function fetchActivePlans() {
  const now = new Date();
  return RatePlan.find({
    active: true,
    valid_from: { $lte: now },
    $or: [{ valid_to: null }, { valid_to: { $gte: now } }],
  })
    .select("vehicle_class vehicle_model_id vehicle_id daily_rate weekly_rate monthly_rate currency name")
    .lean();
}

/**
 * Returns all data the customer home screen needs in one round-trip.
 */
async function getCustomerHomeData(userId) {
  const now = new Date();

  const [featuredVehicles, branches, promos, activeReservation, driverProfile, availableDrivers, ratePlans] =
    await Promise.all([
      Vehicle.find({ availability_state: "available", status: "active" })
        .populate("vehicle_model_id", "make model year class transmission fuel_type seats images")
        .populate("branch_id", "name address")
        .limit(8)
        .lean(),

      Branch.find({}).select("name address phone operating_hours").limit(6).lean(),

      PromoCode.find({
        active: true,
        valid_from: { $lte: now },
        $or: [{ valid_to: null }, { valid_to: { $gte: now } }],
      })
        .select("code discount_type discount_value description minimum_amount")
        .limit(5)
        .lean(),

      Reservation.findOne({ user_id: userId, status: { $in: ["pending", "confirmed", "checked_out"] } })
        .populate({ path: "vehicle_id", select: "plate_number color photos", populate: { path: "vehicle_model_id", select: "make model year" } })
        .select("status pickup dropoff pricing code created_at")
        .sort({ created_at: -1 })
        .lean(),

      DriverProfile.findOne({ user_id: userId }).select("status display_name is_available rating_average").lean(),

      DriverProfile.find({ status: "approved", is_available: true })
        .populate("user_id", "full_name")
        .select("display_name base_city hourly_rate rating_average rating_count languages years_experience")
        .limit(6)
        .lean(),

      fetchActivePlans(),
    ]);

  const vehiclesWithRates = featuredVehicles.map((v) => ({
    ...v,
    rate_plan: buildRatePlanSummary(
      pickBestPlan(ratePlans, v._id, v.vehicle_model_id?._id, v.vehicle_model_id?.class)
    ),
  }));

  const [totalVehicles, totalBranches, totalDrivers] = await Promise.all([
    Vehicle.countDocuments({ availability_state: "available", status: "active" }),
    Branch.countDocuments({}),
    DriverProfile.countDocuments({ status: "approved", is_available: true }),
  ]);

  return {
    featured_vehicles: vehiclesWithRates,
    branches,
    active_promos: promos,
    active_reservation: activeReservation || null,
    driver_profile: driverProfile || null,
    available_drivers: availableDrivers,
    stats: { total_available_vehicles: totalVehicles, total_branches: totalBranches, total_drivers: totalDrivers },
  };
}

/**
 * Customer-facing vehicle browse with rate plans.
 * GET /api/v1/vehicles/available
 */
async function getAvailableVehiclesForCustomer({ vehicleClass, branchId, limit = 20 } = {}) {
  const filter = { availability_state: "available", status: "active" };
  if (branchId) filter.branch_id = branchId;

  const [vehicles, ratePlans] = await Promise.all([
    Vehicle.find(filter)
      .populate("vehicle_model_id", "make model year class transmission fuel_type seats images features")
      .populate("branch_id", "name address")
      .limit(parseInt(limit))
      .lean(),
    fetchActivePlans(),
  ]);

  let result = vehicles.map((v) => ({
    ...v,
    rate_plan: buildRatePlanSummary(
      pickBestPlan(ratePlans, v._id, v.vehicle_model_id?._id, v.vehicle_model_id?.class)
    ),
  }));

  if (vehicleClass) {
    result = result.filter((v) => v.vehicle_model_id?.class === vehicleClass);
  }

  return result;
}

module.exports = { getCustomerHomeData, getAvailableVehiclesForCustomer };
