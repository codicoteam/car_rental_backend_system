// services/reservations_service.js
const Reservation = require("../models/branch_models");

/**
 * Build Mongo filter from query params
 */
function buildReservationFilter(query = {}) {
  const {
    code,
    user_id,
    status,
    vehicle_id,
    vehicle_model_id,
    created_by,
    pickup_from,
    pickup_to,
    dropoff_from,
    dropoff_to,
  } = query;

  const filter = {};

  if (code) {
    filter.code = new RegExp(`^${code}$`, "i"); // case-insensitive
  }

  if (user_id) {
    filter.user_id = user_id;
  }

  if (created_by) {
    filter.created_by = created_by;
  }

  if (status) {
    filter.status = status;
  }

  if (vehicle_id) {
    filter.vehicle_id = vehicle_id;
  }

  if (vehicle_model_id) {
    filter.vehicle_model_id = vehicle_model_id;
  }

  if (pickup_from || pickup_to) {
    filter["pickup.at"] = {};
    if (pickup_from) filter["pickup.at"].$gte = new Date(pickup_from);
    if (pickup_to) filter["pickup.at"].$lte = new Date(pickup_to);
  }

  if (dropoff_from || dropoff_to) {
    filter["dropoff.at"] = {};
    if (dropoff_from) filter["dropoff.at"].$gte = new Date(dropoff_from);
    if (dropoff_to) filter["dropoff.at"].$lte = new Date(dropoff_to);
  }

  return filter;
}

/**
 * Create reservation.
 * - createdById: user who created the reservation
 * - customerUserId: the renter (user_id)
 */
async function createReservation(createdById, customerUserId, payload) {
  try {
    const data = {
      ...payload,
      created_by: createdById,
      user_id: customerUserId,
    };

    const reservation = await Reservation.create(data);
    return reservation;
  } catch (err) {
    const error = new Error("Failed to create reservation");
    error.statusCode = 400;
    error.code = "RESERVATION_CREATE_FAILED";

    if (err.code === 11000 && err.keyPattern?.code) {
      error.statusCode = 409;
      error.code = "RESERVATION_CODE_DUPLICATE";
      error.message = "Reservation with this code already exists";
    } else {
      error.details = err.message;
    }

    throw error;
  }
}

/**
 * List reservations (no pagination).
 * query is raw req.query; we build filter internally.
 */
async function listReservations(query = {}) {
  const filter = buildReservationFilter(query);

  const reservations = await Reservation.find(filter)
    .sort({ created_at: -1 })
    .populate("user_id", "full_name email")
    .populate("created_by", "full_name email")
    .populate("vehicle_id")
    .populate("vehicle_model_id")
    .populate("pickup.branch_id")
    .populate("dropoff.branch_id");

  return reservations;
}

/**
 * Get reservation by ID
 */
async function getReservationById(id) {
  const reservation = await Reservation.findById(id)
    .populate("user_id", "full_name email")
    .populate("created_by", "full_name email")
    .populate("vehicle_id")
    .populate("vehicle_model_id")
    .populate("pickup.branch_id")
    .populate("dropoff.branch_id");

  if (!reservation) {
    const error = new Error("Reservation not found");
    error.statusCode = 404;
    error.code = "RESERVATION_NOT_FOUND";
    throw error;
  }

  return reservation;
}

/**
 * Update reservation
 */
async function updateReservation(id, payload) {
  try {
    const reservation = await Reservation.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    })
      .populate("user_id", "full_name email")
      .populate("created_by", "full_name email")
      .populate("vehicle_id")
      .populate("vehicle_model_id")
      .populate("pickup.branch_id")
      .populate("dropoff.branch_id");

    if (!reservation) {
      const error = new Error("Reservation not found");
      error.statusCode = 404;
      error.code = "RESERVATION_NOT_FOUND";
      throw error;
    }

    return reservation;
  } catch (err) {
    const error = new Error("Failed to update reservation");
    error.statusCode = 400;
    error.code = "RESERVATION_UPDATE_FAILED";
    error.details = err.message;
    throw error;
  }
}

/**
 * Delete reservation
 */
async function deleteReservation(id) {
  const reservation = await Reservation.findByIdAndDelete(id);
  if (!reservation) {
    const error = new Error("Reservation not found");
    error.statusCode = 404;
    error.code = "RESERVATION_NOT_FOUND";
    throw error;
  }
  return reservation;
}

/**
 * Update status only
 */
async function updateReservationStatus(id, status) {
  const allowedStatuses = [
    "pending",
    "confirmed",
    "checked_out",
    "returned",
    "cancelled",
    "no_show",
  ];
  if (!allowedStatuses.includes(status)) {
    const error = new Error("Invalid reservation status");
    error.statusCode = 400;
    error.code = "RESERVATION_STATUS_INVALID";
    throw error;
  }

  const reservation = await Reservation.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!reservation) {
    const error = new Error("Reservation not found");
    error.statusCode = 404;
    error.code = "RESERVATION_NOT_FOUND";
    throw error;
  }

  return reservation;
}

/**
 * Check vehicle availability using schema static
 */
async function checkVehicleAvailability(vehicleId, start, end) {
  const isAvailable = await Reservation.isVehicleAvailable(
    vehicleId,
    start,
    end
  );
  return isAvailable;
}

module.exports = {
  createReservation,
  listReservations,
  getReservationById,
  updateReservation,
  deleteReservation,
  updateReservationStatus,
  checkVehicleAvailability,
};
