// controllers/driver_booking_controller.js
const bookingService = require("../services/driver_booking_service");

/**
 * Customer/Agent: create a driver booking
 */
async function createBooking(req, res) {
  try {
    const booking = await bookingService.createDriverBooking(req.user, req.body);
    return res.status(201).json({
      success: true,
      message: "Driver booking created successfully.",
      data: booking,
    });
  } catch (error) {
    console.error("createBooking error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DRIVER_BOOKING_CREATE_ERROR",
      message: error.message || "Failed to create driver booking.",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

/**
 * Customer: list my driver bookings
 */
async function listMyBookings(req, res) {
  try {
    const bookings = await bookingService.listBookingsForCustomer(
      req.user._id,
      req.query
    );
    return res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error("listMyBookings error:", error);
    return res.status(500).json({
      success: false,
      code: "DRIVER_BOOKING_LIST_SELF_ERROR",
      message: "Failed to fetch your driver bookings.",
    });
  }
}

/**
 * Customer: get one of my bookings
 */
async function getMyBookingById(req, res) {
  try {
    const booking = await bookingService.getBookingForCustomer(
      req.user._id,
      req.params.id
    );
    return res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("getMyBookingById error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DRIVER_BOOKING_GET_SELF_ERROR",
      message: error.message || "Failed to fetch the driver booking.",
    });
  }
}

/**
 * Driver: list bookings addressed to me
 */
async function listDriverBookings(req, res) {
  try {
    const bookings = await bookingService.listBookingsForDriver(
      req.user._id,
      req.query
    );
    return res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error("listDriverBookings error:", error);
    return res.status(500).json({
      success: false,
      code: "DRIVER_BOOKING_LIST_DRIVER_ERROR",
      message: "Failed to fetch driver bookings.",
    });
  }
}

/**
 * Driver: get specific booking addressed to me
 */
async function getDriverBookingById(req, res) {
  try {
    const booking = await bookingService.getBookingForDriver(
      req.user._id,
      req.params.id
    );
    return res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("getDriverBookingById error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DRIVER_BOOKING_GET_DRIVER_ERROR",
      message: error.message || "Failed to fetch the driver booking.",
    });
  }
}

/**
 * Driver: respond to booking (accept/decline)
 */
async function driverRespond(req, res) {
  try {
    const { action } = req.body; // 'accept' or 'decline'
    const booking = await bookingService.driverRespondToBooking(
      req.user._id,
      req.params.id,
      action
    );
    return res.json({
      success: true,
      message: `Driver booking ${action}ed successfully.`,
      data: booking,
    });
  } catch (error) {
    console.error("driverRespond error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DRIVER_BOOKING_DRIVER_RESPOND_ERROR",
      message: error.message || "Failed to update driver booking.",
    });
  }
}

/**
 * Customer: attach payment and confirm booking
 */
async function confirmBookingWithPayment(req, res) {
  try {
    const booking = await bookingService.attachPaymentAndConfirm(
      req.user._id,
      req.params.id,
      req.body
    );
    return res.json({
      success: true,
      message: "Driver booking confirmed with payment.",
      data: booking,
    });
  } catch (error) {
    console.error("confirmBookingWithPayment error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DRIVER_BOOKING_CONFIRM_ERROR",
      message: error.message || "Failed to confirm driver booking.",
    });
  }
}

/**
 * Customer: cancel my booking
 */
async function cancelMyBooking(req, res) {
  try {
    const booking = await bookingService.cancelByCustomer(
      req.user._id,
      req.params.id
    );
    return res.json({
      success: true,
      message: "Driver booking cancelled successfully.",
      data: booking,
    });
  } catch (error) {
    console.error("cancelMyBooking error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DRIVER_BOOKING_CANCEL_SELF_ERROR",
      message: error.message || "Failed to cancel driver booking.",
    });
  }
}

/**
 * Driver: cancel booking
 */
async function cancelDriverBooking(req, res) {
  try {
    const booking = await bookingService.cancelByDriver(
      req.user._id,
      req.params.id
    );
    return res.json({
      success: true,
      message: "Driver booking cancelled by driver.",
      data: booking,
    });
  } catch (error) {
    console.error("cancelDriverBooking error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DRIVER_BOOKING_CANCEL_DRIVER_ERROR",
      message: error.message || "Failed to cancel driver booking.",
    });
  }
}

/**
 * Driver: mark booking as completed
 */
async function completeByDriver(req, res) {
  try {
    const booking = await bookingService.completeBooking(
      req.user._id,
      req.params.id,
      "driver"
    );
    return res.json({
      success: true,
      message: "Driver booking marked as completed.",
      data: booking,
    });
  } catch (error) {
    console.error("completeByDriver error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DRIVER_BOOKING_COMPLETE_DRIVER_ERROR",
      message: error.message || "Failed to complete driver booking.",
    });
  }
}

/**
 * Admin/Manager: list all bookings
 */
async function adminListBookings(req, res) {
  try {
    const bookings = await bookingService.listAllBookings(req.query);
    return res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error("adminListBookings error:", error);
    return res.status(500).json({
      success: false,
      code: "DRIVER_BOOKING_LIST_ADMIN_ERROR",
      message: "Failed to fetch driver bookings.",
    });
  }
}

/**
 * Admin/Manager: get booking by ID
 */
async function adminGetBookingById(req, res) {
  try {
    const booking = await bookingService.getBookingByIdAdmin(req.params.id);
    return res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("adminGetBookingById error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DRIVER_BOOKING_GET_ADMIN_ERROR",
      message: error.message || "Failed to fetch driver booking.",
    });
  }
}

/**
 * Admin: delete booking
 */
async function adminDeleteBooking(req, res) {
  try {
    await bookingService.deleteBooking(req.params.id);
    return res.json({
      success: true,
      message: "Driver booking deleted successfully.",
    });
  } catch (error) {
    console.error("adminDeleteBooking error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DRIVER_BOOKING_DELETE_ADMIN_ERROR",
      message: error.message || "Failed to delete driver booking.",
    });
  }
}

module.exports = {
  createBooking,
  listMyBookings,
  getMyBookingById,
  listDriverBookings,
  getDriverBookingById,
  driverRespond,
  confirmBookingWithPayment,
  cancelMyBooking,
  cancelDriverBooking,
  completeByDriver,
  adminListBookings,
  adminGetBookingById,
  adminDeleteBooking,
};
