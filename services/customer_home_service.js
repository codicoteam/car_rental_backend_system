// services/customer_home_service.js
const Vehicle = require("../models/vehicle_unit_model");
const Branch = require("../models/branch_models");
const PromoCode = require("../models/promo_code_model");
const Reservation = require("../models/reservations_model");
const DriverProfile = require("../models/drivers_profile_model");

/**
 * Returns all data the customer home screen needs in one round-trip.
 */
async function getCustomerHomeData(userId) {
  const now = new Date();

  const [featuredVehicles, branches, promos, activeReservation, driverProfile, availableDrivers] =
    await Promise.all([
      // 8 available cars, populated with model + branch
      Vehicle.find({ availability_state: "available", status: "active" })
        .populate(
          "vehicle_model_id",
          "make model year class transmission fuel_type seats images"
        )
        .populate("branch_id", "name address")
        .limit(8)
        .lean(),

      // Up to 6 active branches
      Branch.find({})
        .select("name address phone operating_hours")
        .limit(6)
        .lean(),

      // Active promo codes valid right now
      PromoCode.find({
        active: true,
        valid_from: { $lte: now },
        $or: [{ valid_to: null }, { valid_to: { $gte: now } }],
      })
        .select("code discount_type discount_value description minimum_amount")
        .limit(5)
        .lean(),

      // User's most recent active booking
      Reservation.findOne({
        user_id: userId,
        status: { $in: ["pending", "confirmed", "checked_out"] },
      })
        .populate({
          path: "vehicle_id",
          select: "plate_number color photos",
          populate: { path: "vehicle_model_id", select: "make model year" },
        })
        .select("status pickup dropoff total_amount code created_at")
        .sort({ created_at: -1 })
        .lean(),

      // This customer's own driver profile (if any)
      DriverProfile.findOne({ user_id: userId })
        .select("status display_name is_available rating_average")
        .lean(),

      // Top 6 approved, available drivers for hire
      DriverProfile.find({ status: "approved", is_available: true })
        .populate("user_id", "full_name")
        .select(
          "display_name base_city hourly_rate rating_average rating_count languages years_experience"
        )
        .limit(6)
        .lean(),
    ]);

  return {
    featured_vehicles: featuredVehicles,
    branches,
    active_promos: promos,
    active_reservation: activeReservation || null,
    driver_profile: driverProfile || null,
    available_drivers: availableDrivers,
    stats: {
      total_available_vehicles: await Vehicle.countDocuments({
        availability_state: "available",
        status: "active",
      }),
      total_branches: await Branch.countDocuments({}),
      total_drivers: await DriverProfile.countDocuments({
        status: "approved",
        is_available: true,
      }),
    },
  };
}

module.exports = { getCustomerHomeData };
