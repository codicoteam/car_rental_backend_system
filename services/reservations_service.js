// services/reservations_service.js
const Reservation = require("../models/reservations_model");
const User = require("../models/user_model");
const { Profile } = require("../models/profile_models");
const {
  sendRentalConfirmationEmail,
  sendNewBookingStaffAlertEmail,
} = require("../utils/user_email_utils");

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
    pickup_branch_id,
    dropoff_branch_id,
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

  if (pickup_branch_id) {
    filter["pickup.branch_id"] = pickup_branch_id;
  }

  if (dropoff_branch_id) {
    filter["dropoff.branch_id"] = dropoff_branch_id;
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
 * Send booking confirmation to the customer.
 */
async function sendCustomerConfirmationEmail(reservation) {
  const customer = reservation.user_id;
  if (!customer?.email) return;

  await sendRentalConfirmationEmail({
    to: customer.email,
    fullName: customer.full_name || "Customer",
    rental: {
      reference: reservation.code,
      date: formatDateTime(reservation.pickup?.at),
      type: reservation.vehicle_model_id?.name || "Vehicle",
    },
  });
}

/**
 * Find all active admins + branch managers assigned to a given branch.
 * Admins (platform-wide) always receive the alert.
 * Branch managers only receive it if they belong to the pickup branch.
 */
async function findStaffToNotify(pickupBranchId) {
  const [admins, managers] = await Promise.all([
    User.find({ roles: { $in: ["admin"] }, status: "active" }).select(
      "full_name email"
    ),
    pickupBranchId
      ? User.find({
          roles: { $in: ["manager"] },
          branch_id: pickupBranchId,
          status: "active",
        }).select("full_name email")
      : [],
  ]);

  // Deduplicate by email in case an admin is also listed as a manager
  const seen = new Set();
  return [...admins, ...managers].filter((u) => {
    if (!u.email || seen.has(u.email)) return false;
    seen.add(u.email);
    return true;
  });
}

/**
 * Fire-and-forget: alert all admins and branch managers about a new booking.
 */
async function notifyStaffOfNewBooking(reservation) {
  try {
    const customer = reservation.user_id;
    const pickupBranchId = reservation.pickup?.branch_id?._id ?? reservation.pickup?.branch_id;

    const staffList = await findStaffToNotify(pickupBranchId);
    if (!staffList.length) return;

    const pickupBranchName =
      reservation.pickup?.branch_id?.name || String(pickupBranchId || "—");
    const dropoffBranchName =
      reservation.dropoff?.branch_id?.name ||
      String(reservation.dropoff?.branch_id || "—");

    const grandTotal = reservation.pricing?.grand_total;
    const totalStr = grandTotal != null ? Number(grandTotal).toFixed(2) : "—";

    const reservationPayload = {
      code: reservation.code,
      vehicleModelName: reservation.vehicle_model_id?.name || "—",
      pickupBranchName,
      dropoffBranchName,
      pickupAt: formatDateTime(reservation.pickup?.at),
      dropoffAt: formatDateTime(reservation.dropoff?.at),
      total: totalStr,
      currency: reservation.pricing?.currency || "USD",
    };

    const customerPayload = {
      fullName: customer?.full_name || "Unknown Customer",
      email: customer?.email || "",
      phone: customer?.phone || "",
    };

    await Promise.allSettled(
      staffList.map((staff) =>
        sendNewBookingStaffAlertEmail({
          to: staff.email,
          fullName: staff.full_name || "Team Member",
          reservation: reservationPayload,
          customer: customerPayload,
        })
      )
    );
  } catch (err) {
    console.error("notifyStaffOfNewBooking error:", err);
  }
}
/**
 * Build a driver_snapshot from the customer's User + Profile records.
 * Returns undefined if neither record has useful data (safe to omit from doc).
 */
async function buildDriverSnapshot(customerUserId) {
  const [user, profile] = await Promise.all([
    User.findById(customerUserId).select("full_name email phone"),
    Profile.findOne({ user: customerUserId, role: "customer" }).select(
      "full_name driver_license"
    ),
  ]);

  if (!user) return undefined;

  const dl = profile?.driver_license;
  return {
    full_name: user.full_name,
    email: user.email,
    phone: user.phone ?? undefined,
    ...(dl
      ? {
          driver_license: {
            number: dl.number,
            country: dl.country,
            class: dl.class,
            expires_at: dl.expires_at,
            verified: dl.verified ?? false,
          },
        }
      : {}),
  };
}

/**
 * Create reservation.
 * - createdById: user who created the reservation
 * - customerUserId: the renter (user_id)
 */
async function createReservation(createdById, customerUserId, payload) {
  try {
    // Auto-populate driver_snapshot unless the caller already provided one
    const snapshot =
      payload.driver_snapshot ?? (await buildDriverSnapshot(customerUserId));

    const data = {
      ...payload,
      created_by: createdById,
      user_id: customerUserId,
      driver_snapshot: snapshot,
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

    // Fire-and-forget emails — don't let email failures block the response
    sendCustomerConfirmationEmail(populatedReservation).catch((err) =>
      console.error("Customer confirmation email failed:", err)
    );
    notifyStaffOfNewBooking(populatedReservation).catch((err) =>
      console.error("Staff booking alert email failed:", err)
    );

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
    "checked_in",
    "returned",
    "completed",
    "closed",
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
    {
      status,
      ...(status === "closed" ? { closed_at: new Date() } : {}),
    },
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
 * Admin/manager: process vehicle return and record check condition.
 * Sets status → 'returned' and populates vehicle_return.
 */
async function submitVehicleReturn(id, staffUserId, checkPayload = {}) {
  const reservation = await Reservation.findById(id);
  if (!reservation) {
    const error = new Error("Reservation not found");
    error.statusCode = 404;
    error.code = "RESERVATION_NOT_FOUND";
    throw error;
  }

  if (reservation.status !== "checked_out") {
    const error = new Error(
      `Cannot process return — booking is currently '${reservation.status}'. It must be 'checked_out'.`
    );
    error.statusCode = 400;
    error.code = "RESERVATION_INVALID_STATE";
    throw error;
  }

  const now = new Date();
  reservation.status = "checked_in";
  reservation.vehicle_return = {
    returned_at: now,
    submitted_by: staffUserId,
    vehicle_check: {
      fuel_level: checkPayload.fuel_level ?? "full",
      cleanliness: checkPayload.cleanliness ?? "clean",
      mileage_in: checkPayload.mileage_in ?? null,
      damages_noted: checkPayload.damages_noted ?? false,
      damage_description: checkPayload.damage_description ?? "",
      damage_images: checkPayload.damage_images ?? [],
      notes: checkPayload.notes ?? "",
    },
  };

  await reservation.save();

  return Reservation.findById(id)
    .populate("user_id", "full_name email")
    .populate("created_by", "full_name email")
    .populate("vehicle_id")
    .populate("vehicle_model_id")
    .populate("pickup.branch_id")
    .populate("dropoff.branch_id")
    .populate("vehicle_return.submitted_by", "full_name email");
}

/**
 * Admin/manager: close a booking.
 * Status must be 'returned'. Payment must be 'paid' (waivable by admin via force flag).
 */
async function closeReservation(id, staffUserId, { force = false } = {}) {
  const reservation = await Reservation.findById(id);
  if (!reservation) {
    const error = new Error("Reservation not found");
    error.statusCode = 404;
    error.code = "RESERVATION_NOT_FOUND";
    throw error;
  }

  if (reservation.status !== "checked_in" && reservation.status !== "returned") {
    const error = new Error(
      `Cannot close — booking must be 'checked_in' first (currently '${reservation.status}').`
    );
    error.statusCode = 400;
    error.code = "RESERVATION_INVALID_STATE";
    throw error;
  }

  const paymentStatus = reservation.payment_summary?.status;
  if (!force && paymentStatus !== "paid") {
    const error = new Error(
      "Cannot close — payment is not yet completed. Pass force=true to override."
    );
    error.statusCode = 400;
    error.code = "RESERVATION_PAYMENT_PENDING";
    throw error;
  }

  reservation.status = "closed";
  reservation.closed_at = new Date();
  await reservation.save();

  return Reservation.findById(id)
    .populate("user_id", "full_name email")
    .populate("created_by", "full_name email")
    .populate("vehicle_id")
    .populate("vehicle_model_id")
    .populate("pickup.branch_id")
    .populate("dropoff.branch_id")
    .populate("vehicle_return.submitted_by", "full_name email");
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
  submitVehicleReturn,
  closeReservation,
  checkVehicleAvailability,
};
