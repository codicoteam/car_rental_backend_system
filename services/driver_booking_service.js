// services/driver_booking_service.js
const DriverBooking = require("../models/driver_booking_model");
const DriverProfile = require("../models/drivers_profile_model");
const Payment = require("../models/payment_model"); // if you have it, otherwise remove

// --- Helpers ---

// Simple booking code generator: DRV-YYYYMMDD-<timestampLast6>
function generateBookingCode() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const ts = String(now.getTime()).slice(-6);
  return `DRV-${yyyy}${mm}${dd}-${ts}`;
}

// Check user has a certain role
function userHasRole(user, roles = []) {
  if (!user || !Array.isArray(user.roles)) return false;
  return user.roles.some((r) => roles.includes(r));
}

// Compute end_at from start_at + hours_requested if missing
function computeEndAt(startAt, hoursRequested) {
  if (!startAt || !hoursRequested) return null;
  const end = new Date(startAt.getTime());
  end.setHours(end.getHours() + Number(hoursRequested || 0));
  return end;
}

// --- Service methods ---

/**
 * Create a new driver booking (customer or agent on behalf of customer).
 * currentUser: req.user
 * payload: { customer_id?, driver_profile_id, start_at, end_at?, pricing, pickup_location, dropoff_location, notes }
 */
async function createDriverBooking(currentUser, payload) {
  // Only customers or agents can create
  if (!userHasRole(currentUser, ["customer", "agent", "manager", "admin"])) {
    const error = new Error(
      "Only customers, agents or admins can create driver bookings."
    );
    error.statusCode = 403;
    error.code = "DRIVER_BOOKING_FORBIDDEN";
    throw error;
  }

  // Determine which user is the customer for this booking
  const customerId =
    payload.customer_id &&
    userHasRole(currentUser, ["agent", "manager", "admin"])
      ? payload.customer_id
      : currentUser._id;

  // Load driver profile
  const driverProfile = await DriverProfile.findById(payload.driver_profile_id);
  if (!driverProfile) {
    const error = new Error("Driver profile not found.");
    error.statusCode = 404;
    error.code = "DRIVER_PROFILE_NOT_FOUND";
    throw error;
  }

  if (driverProfile.status !== "approved") {
    const error = new Error("Driver profile is not approved.");
    error.statusCode = 400;
    error.code = "DRIVER_NOT_APPROVED";
    throw error;
  }

  if (!driverProfile.is_available) {
    const error = new Error("Driver is currently not available.");
    error.statusCode = 400;
    error.code = "DRIVER_NOT_AVAILABLE";
    throw error;
  }

  if (typeof driverProfile.hourly_rate !== "number") {
    const error = new Error("Driver does not have a valid hourly_rate.");
    error.statusCode = 400;
    error.code = "DRIVER_RATE_INVALID";
    throw error;
  }

  // Parse dates + pricing
  const startAt = payload.start_at ? new Date(payload.start_at) : null;
  if (!startAt || isNaN(startAt.getTime())) {
    const error = new Error("Invalid or missing start_at.");
    error.statusCode = 400;
    error.code = "INVALID_START_AT";
    throw error;
  }

  const hoursRequested = Number(
    payload.pricing?.hours_requested || payload.hours_requested
  );
  if (!hoursRequested || hoursRequested <= 0) {
    const error = new Error("hours_requested must be greater than 0.");
    error.statusCode = 400;
    error.code = "INVALID_HOURS_REQUESTED";
    throw error;
  }

  const endAt =
    payload.end_at && !isNaN(new Date(payload.end_at).getTime())
      ? new Date(payload.end_at)
      : computeEndAt(startAt, hoursRequested);

  if (!endAt) {
    const error = new Error("Could not compute end_at from provided data.");
    error.statusCode = 400;
    error.code = "INVALID_END_AT";
    throw error;
  }

  const currency = payload.pricing?.currency || "USD";
  const hourlyRate = driverProfile.hourly_rate;
  const estimatedTotal = hourlyRate * hoursRequested;

  // Check for overlaps
  const driverAvailable = await DriverBooking.isDriverAvailable(
    driverProfile.user_id,
    startAt,
    endAt
  );
  if (!driverAvailable) {
    const error = new Error(
      "Driver is not available in the selected time window."
    );
    error.statusCode = 409;
    error.code = "DRIVER_TIME_CONFLICT";
    throw error;
  }

  const bookingCode = generateBookingCode();

  const bookingDoc = {
    code: bookingCode,
    customer_id: customerId,
    created_by: currentUser._id,
    created_channel: payload.created_channel || "web",

    driver_profile_id: driverProfile._id,
    driver_user_id: driverProfile.user_id,

    start_at: startAt,
    end_at: endAt,
    pickup_location: payload.pickup_location,
    dropoff_location: payload.dropoff_location,
    notes: payload.notes || "",

    pricing: {
      currency,
      hourly_rate_snapshot: hourlyRate.toString(),
      hours_requested: hoursRequested,
      estimated_total_amount: estimatedTotal.toString(),
    },

    status: "requested",
    requested_at: new Date(),
    payment_status_snapshot: "unpaid",
  };

  try {
    const booking = await DriverBooking.create(bookingDoc);
    return booking;
  } catch (err) {
    const error = new Error("Failed to create driver booking.");
    error.statusCode = 400;
    error.code = "DRIVER_BOOKING_CREATE_FAILED";
    error.details = err.message;
    throw error;
  }
}

/**
 * List bookings for a customer (own bookings).
 */
async function listBookingsForCustomer(customerId, filters = {}) {
  const query = { customer_id: customerId };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.from) {
    query.start_at = query.start_at || {};
    query.start_at.$gte = new Date(filters.from);
  }

  if (filters.to) {
    query.start_at = query.start_at || {};
    query.start_at.$lte = new Date(filters.to);
  }

  const bookings = await DriverBooking.find(query)
    .populate("driver_profile_id")
    .sort({ start_at: -1 });

  return bookings;
}

/**
 * Get single booking for a customer (must own it).
 */
async function getBookingForCustomer(customerId, bookingId) {
  const booking = await DriverBooking.findOne({
    _id: bookingId,
    customer_id: customerId,
  }).populate("driver_profile_id");

  if (!booking) {
    const error = new Error("Driver booking not found.");
    error.statusCode = 404;
    error.code = "DRIVER_BOOKING_NOT_FOUND";
    throw error;
  }
  return booking;
}

/**
 * List bookings for a driver (their jobs).
 */
async function listBookingsForDriver(driverUserId, filters = {}) {
  const query = { driver_user_id: driverUserId };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.from) {
    query.start_at = query.start_at || {};
    query.start_at.$gte = new Date(filters.from);
  }

  if (filters.to) {
    query.start_at = query.start_at || {};
    query.start_at.$lte = new Date(filters.to);
  }

  const bookings = await DriverBooking.find(query)
    .populate("customer_id", "full_name email phone")
    .sort({ start_at: -1 });

  return bookings;
}

/**
 * Get a single booking for a driver (must be their booking).
 */
async function getBookingForDriver(driverUserId, bookingId) {
  const booking = await DriverBooking.findOne({
    _id: bookingId,
    driver_user_id: driverUserId,
  })
    .populate("customer_id", "full_name email phone")
    .populate("driver_profile_id");

  if (!booking) {
    const error = new Error("Driver booking not found.");
    error.statusCode = 404;
    error.code = "DRIVER_BOOKING_NOT_FOUND";
    throw error;
  }

  return booking;
}

/**
 * Driver responds to a booking: accept or decline.
 */
async function driverRespondToBooking(driverUserId, bookingId, action) {
  const booking = await DriverBooking.findOne({
    _id: bookingId,
    driver_user_id: driverUserId,
  });

  if (!booking) {
    const error = new Error("Driver booking not found.");
    error.statusCode = 404;
    error.code = "DRIVER_BOOKING_NOT_FOUND";
    throw error;
  }

  if (booking.status !== "requested") {
    const error = new Error(
      "Only bookings in 'requested' status can be responded to."
    );
    error.statusCode = 400;
    error.code = "INVALID_BOOKING_STATUS";
    throw error;
  }

  if (action === "accept") {
    // Check again for overlap (defensive)
    const available = await DriverBooking.isDriverAvailable(
      driverUserId,
      booking.start_at,
      booking.end_at
    );
    if (!available) {
      const error = new Error(
        "Cannot accept booking: driver is not available for that time."
      );
      error.statusCode = 409;
      error.code = "DRIVER_TIME_CONFLICT_ACCEPT";
      throw error;
    }

    booking.status = "accepted_by_driver";
    booking.driver_responded_at = new Date();
    // Example: 30min payment window
    const deadline = new Date();
    deadline.setMinutes(deadline.getMinutes() + 30);
    booking.payment_deadline_at = deadline;
  } else if (action === "decline") {
    booking.status = "declined_by_driver";
    booking.driver_responded_at = new Date();
  } else {
    const error = new Error("Invalid action. Must be 'accept' or 'decline'.");
    error.statusCode = 400;
    error.code = "INVALID_DRIVER_ACTION";
    throw error;
  }

  booking.last_status_update_by = driverUserId;
  await booking.save();
  return booking;
}

/**
 * Attach payment and mark booking as confirmed.
 * Usually called after payment is successful.
 */
async function attachPaymentAndConfirm(customerId, bookingId, payload) {
  const booking = await DriverBooking.findOne({
    _id: bookingId,
    customer_id: customerId,
  });

  if (!booking) {
    const error = new Error("Driver booking not found.");
    error.statusCode = 404;
    error.code = "DRIVER_BOOKING_NOT_FOUND";
    throw error;
  }

  if (!["accepted_by_driver", "awaiting_payment"].includes(booking.status)) {
    const error = new Error(
      "Booking must be accepted by driver and awaiting payment to confirm."
    );
    error.statusCode = 400;
    error.code = "INVALID_BOOKING_STATUS_FOR_PAYMENT";
    throw error;
  }

  // Optional: verify Payment exists
  if (payload.payment_id) {
    const payment = await Payment.findById(payload.payment_id);
    if (!payment) {
      const error = new Error("Payment record not found.");
      error.statusCode = 404;
      error.code = "PAYMENT_NOT_FOUND";
      throw error;
    }
  }

  booking.payment_id = payload.payment_id || booking.payment_id;
  booking.payment_status_snapshot = payload.payment_status || "paid";
  booking.paid_at = new Date();
  booking.status = "confirmed";
  booking.last_status_update_by = customerId;

  await booking.save();
  return booking;
}

/**
 * Cancel by customer.
 */
async function cancelByCustomer(customerId, bookingId) {
  const booking = await DriverBooking.findOne({
    _id: bookingId,
    customer_id: customerId,
  });

  if (!booking) {
    const error = new Error("Driver booking not found.");
    error.statusCode = 404;
    error.code = "DRIVER_BOOKING_NOT_FOUND";
    throw error;
  }

  if (
    ["completed", "cancelled_by_customer", "cancelled_by_driver"].includes(
      booking.status
    )
  ) {
    const error = new Error(
      "Booking cannot be cancelled in its current status."
    );
    error.statusCode = 400;
    error.code = "INVALID_CANCEL_STATUS";
    throw error;
  }

  booking.status = "cancelled_by_customer";
  booking.cancelled_at = new Date();
  booking.last_status_update_by = customerId;

  await booking.save();
  return booking;
}

/**
 * Cancel by driver.
 */
async function cancelByDriver(driverUserId, bookingId) {
  const booking = await DriverBooking.findOne({
    _id: bookingId,
    driver_user_id: driverUserId,
  });

  if (!booking) {
    const error = new Error("Driver booking not found.");
    error.statusCode = 404;
    error.code = "DRIVER_BOOKING_NOT_FOUND";
    throw error;
  }

  if (
    ["completed", "cancelled_by_customer", "cancelled_by_driver"].includes(
      booking.status
    )
  ) {
    const error = new Error(
      "Booking cannot be cancelled in its current status."
    );
    error.statusCode = 400;
    error.code = "INVALID_CANCEL_STATUS";
    throw error;
  }

  booking.status = "cancelled_by_driver";
  booking.cancelled_at = new Date();
  booking.last_status_update_by = driverUserId;

  await booking.save();
  return booking;
}

/**
 * Mark booking as completed (driver or admin).
 */
async function completeBooking(actorUserId, bookingId, role = "driver") {
  const query =
    role === "driver"
      ? { _id: bookingId, driver_user_id: actorUserId }
      : { _id: bookingId };

  const booking = await DriverBooking.findOne(query);
  if (!booking) {
    const error = new Error("Driver booking not found.");
    error.statusCode = 404;
    error.code = "DRIVER_BOOKING_NOT_FOUND";
    throw error;
  }

  if (booking.status !== "confirmed") {
    const error = new Error(
      "Only confirmed bookings can be marked as completed."
    );
    error.statusCode = 400;
    error.code = "INVALID_COMPLETE_STATUS";
    throw error;
  }

  booking.status = "completed";
  booking.completed_at = new Date();
  booking.last_status_update_by = actorUserId;

  await booking.save();
  return booking;
}

/**
 * Admin/manager: list all bookings with filters.
 */
async function listAllBookings(filters = {}) {
  const query = {};

  if (filters.status) query.status = filters.status;
  if (filters.driver_user_id) query.driver_user_id = filters.driver_user_id;
  if (filters.customer_id) query.customer_id = filters.customer_id;

  if (filters.from) {
    query.start_at = query.start_at || {};
    query.start_at.$gte = new Date(filters.from);
  }

  if (filters.to) {
    query.start_at = query.start_at || {};
    query.start_at.$lte = new Date(filters.to);
  }

  const bookings = await DriverBooking.find(query)
    .populate("customer_id", "full_name email phone")
    .populate("driver_profile_id")
    .sort({ start_at: -1 });

  return bookings;
}

/**
 * Admin/manager: get booking by id
 */
async function getBookingByIdAdmin(bookingId) {
  const booking = await DriverBooking.findById(bookingId)
    .populate("customer_id", "full_name email phone")
    .populate("driver_profile_id")
    .populate("driver_user_id", "full_name email");

  if (!booking) {
    const error = new Error("Driver booking not found.");
    error.statusCode = 404;
    error.code = "DRIVER_BOOKING_NOT_FOUND";
    throw error;
  }
  return booking;
}

/**
 * Admin: delete booking
 */
async function deleteBooking(bookingId) {
  const booking = await DriverBooking.findByIdAndDelete(bookingId);
  if (!booking) {
    const error = new Error("Driver booking not found.");
    error.statusCode = 404;
    error.code = "DRIVER_BOOKING_NOT_FOUND";
    throw error;
  }
  return booking;
}

module.exports = {
  createDriverBooking,
  listBookingsForCustomer,
  getBookingForCustomer,
  listBookingsForDriver,
  getBookingForDriver,
  driverRespondToBooking,
  attachPaymentAndConfirm,
  cancelByCustomer,
  cancelByDriver,
  completeBooking,
  listAllBookings,
  getBookingByIdAdmin,
  deleteBooking,
};
