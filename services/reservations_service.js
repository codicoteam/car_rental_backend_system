// services/reservations_service.js
const Reservation = require("../models/reservations_model");
const { sendEmail } = require("../utils/user_email_utils"); // <-- use your email service

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
 * Helper: format date/time nicely
 */
function formatDateTime(date) {
  if (!date) return "";
  // Basic ISO substring, adjust as needed (e.g. timezone)
  return new Date(date).toLocaleString();
}

/**
 * Helper: send reservation emails to customer and creator
 */
async function sendReservationCreatedEmails(reservation) {
  try {
    const customer = reservation.user_id; // populated doc
    const creator = reservation.created_by; // populated doc

    const sameUser =
      customer && creator && String(customer._id) === String(creator._id);

    // Format dates using your existing formatDateTime function
    const pickupAt = formatDateTime(reservation.pickup?.at);
    const dropoffAt = formatDateTime(reservation.dropoff?.at);

    // Prepare reservation data object for templates
    const reservationData = {
      code: reservation.code,
      status: reservation.status,
      pickup: {
        branch_id: reservation.pickup?.branch_id,
      },
      dropoff: {
        branch_id: reservation.dropoff?.branch_id,
      },
      vehicle_model_id: reservation.vehicle_model_id,
      pricing: reservation.pricing,
      pickupAt: pickupAt,
      dropoffAt: dropoffAt,
    };

    // Email to customer
    if (customer && customer.email) {
      await emailService.sendReservationCustomerEmail({
        to: customer.email,
        fullName: customer.full_name || "Customer",
        reservation: reservationData,
      });
    }

    // Email to creator (if different from customer)
    if (creator && creator.email && !sameUser) {
      const customerInfo = customer
        ? `${customer.full_name} (${customer.email})`
        : "N/A";

      await emailService.sendReservationStaffEmail({
        to: creator.email,
        fullName: creator.full_name || "Team Member",
        reservation: reservationData,
        customerInfo: customerInfo,
      });
    }
  } catch (err) {
    // Don't block reservation creation if email fails – just log it
    console.error("Failed to send reservation created emails:", err);
  }
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

    // Re-fetch with populated fields for email content
    const populatedReservation = await Reservation.findById(reservation._id)
      .populate("user_id", "full_name email")
      .populate("created_by", "full_name email")
      .populate("vehicle_id")
      .populate("vehicle_model_id", "name")
      .populate("pickup.branch_id")
      .populate("dropoff.branch_id");

    // Send emails (customer + creator)
    await sendReservationCreatedEmails(populatedReservation);

    return populatedReservation;
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
