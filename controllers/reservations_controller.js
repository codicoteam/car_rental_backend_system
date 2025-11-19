// controllers/reservations_controller.js
const reservationService = require("../services/reservations_service");

function hasRole(user, role) {
  return Array.isArray(user.roles) && user.roles.includes(role);
}

function isStaff(user) {
  return Array.isArray(user.roles)
    ? user.roles.some((r) => ["agent", "manager", "admin"].includes(r))
    : false;
}

/**
 * POST /api/reservations
 */
async function createReservation(req, res) {
  try {
    const { user } = req;
    const body = req.body;

    // who is the renter?
    let customerUserId;
    if (isStaff(user) && body.user_id) {
      customerUserId = body.user_id; // staff creating for a customer
    } else {
      customerUserId = user._id; // customer creating for self
    }

    const reservation = await reservationService.createReservation(
      user._id,
      customerUserId,
      body
    );

    return res.status(201).json({
      success: true,
      message: "Reservation created successfully",
      data: reservation,
    });
  } catch (error) {
    console.error("createReservation error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "RESERVATION_CREATE_ERROR",
      message: error.message || "Failed to create reservation",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

/**
 * GET /api/reservations
 * - staff: all (filtered)
 * - customer: only own
 */
async function listReservations(req, res) {
  try {
    const { user } = req;
    const query = { ...req.query };

    if (!isStaff(user)) {
      // force filter to own reservations for customers
      query.user_id = user._id.toString();
    }

    const reservations = await reservationService.listReservations(query);

    return res.json({
      success: true,
      data: reservations,
    });
  } catch (error) {
    console.error("listReservations error:", error);
    return res.status(500).json({
      success: false,
      code: "RESERVATION_LIST_ERROR",
      message: "Failed to fetch reservations",
    });
  }
}

/**
 * GET /api/reservations/:id
 */
async function getReservationById(req, res) {
  try {
    const { user } = req;
    const reservation = await reservationService.getReservationById(
      req.params.id
    );

    const isOwner =
      reservation.user_id &&
      reservation.user_id._id.toString() === user._id.toString();

    if (!isOwner && !isStaff(user)) {
      return res.status(403).json({
        success: false,
        code: "RESERVATION_FORBIDDEN",
        message: "You are not allowed to view this reservation",
      });
    }

    return res.json({
      success: true,
      data: reservation,
    });
  } catch (error) {
    console.error("getReservationById error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "RESERVATION_GET_ERROR",
      message: error.message || "Failed to fetch reservation",
    });
  }
}

/**
 * PATCH /api/reservations/:id
 * staff-only
 */
async function updateReservation(req, res) {
  try {
    const { user } = req;
    if (!isStaff(user)) {
      return res.status(403).json({
        success: false,
        code: "RESERVATION_FORBIDDEN",
        message: "Only staff can update reservations",
      });
    }

    const reservation = await reservationService.updateReservation(
      req.params.id,
      req.body
    );

    return res.json({
      success: true,
      message: "Reservation updated successfully",
      data: reservation,
    });
  } catch (error) {
    console.error("updateReservation error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "RESERVATION_UPDATE_ERROR",
      message: error.message || "Failed to update reservation",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

/**
 * DELETE /api/reservations/:id
 * admin-only
 */
async function deleteReservation(req, res) {
  try {
    const { user } = req;
    if (!hasRole(user, "admin")) {
      return res.status(403).json({
        success: false,
        code: "RESERVATION_FORBIDDEN",
        message: "Only admin can delete reservations",
      });
    }

    await reservationService.deleteReservation(req.params.id);

    return res.json({
      success: true,
      message: "Reservation deleted successfully",
    });
  } catch (error) {
    console.error("deleteReservation error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "RESERVATION_DELETE_ERROR",
      message: error.message || "Failed to delete reservation",
    });
  }
}

/**
 * PATCH /api/reservations/:id/status
 * staff-only
 */
async function updateReservationStatus(req, res) {
  try {
    const { user } = req;
    if (!isStaff(user)) {
      return res.status(403).json({
        success: false,
        code: "RESERVATION_FORBIDDEN",
        message: "Only staff can change reservation status",
      });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        code: "RESERVATION_STATUS_REQUIRED",
        message: "status is required",
      });
    }

    const reservation = await reservationService.updateReservationStatus(
      req.params.id,
      status
    );

    return res.json({
      success: true,
      message: "Reservation status updated successfully",
      data: reservation,
    });
  } catch (error) {
    console.error("updateReservationStatus error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "RESERVATION_STATUS_ERROR",
      message: error.message || "Failed to update reservation status",
    });
  }
}

/**
 * POST /api/reservations/availability
 * check if vehicle is available for [start, end)
 */
async function checkVehicleAvailability(req, res) {
  try {
    const { vehicle_id, start, end } = req.body;

    if (!vehicle_id || !start || !end) {
      return res.status(400).json({
        success: false,
        code: "AVAILABILITY_PARAMS_REQUIRED",
        message: "vehicle_id, start and end are required",
      });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (!(startDate < endDate)) {
      return res.status(400).json({
        success: false,
        code: "AVAILABILITY_INVALID_RANGE",
        message: "end must be after start",
      });
    }

    const available = await reservationService.checkVehicleAvailability(
      vehicle_id,
      startDate,
      endDate
    );

    return res.json({
      success: true,
      data: {
        vehicle_id,
        start: startDate,
        end: endDate,
        available,
      },
    });
  } catch (error) {
    console.error("checkVehicleAvailability error:", error);
    return res.status(500).json({
      success: false,
      code: "AVAILABILITY_CHECK_ERROR",
      message: "Failed to check vehicle availability",
    });
  }
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
