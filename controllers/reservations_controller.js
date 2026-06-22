// controllers/reservations_controller.js
const reservationService = require("../services/reservations_service");
const notifHelper = require("../services/notification_helper");
const pushSvc = require("../services/push_notification_service");
const User = require("../models/user_model");
const { sendReservationStatusUpdateEmail } = require("../utils/user_email_utils");

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

    // Fire-and-forget: booking confirmation in-app + push notification
    const vehicleName = reservation.vehicle_model_id?.name || 'your vehicle';
    const customerId = reservation.user_id?._id || reservation.user_id;
    notifHelper.sendToUser({
      userId: customerId,
      title: 'Booking Confirmed',
      message: `Your booking for ${vehicleName} has been confirmed. Please proceed to payment to secure your reservation.`,
      type: 'booking',
      channels: ['in_app', 'push'],
      actionUrl: '/reservations',
    });

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

    // Fire-and-forget: push + in-app + email to customer (all logged)
    const statusNotifMessages = {
      pending:     { title: "Reservation Pending",      message: "Your reservation is pending review by our team." },
      confirmed:   { title: "Reservation Confirmed",    message: "Your reservation has been confirmed. Please complete payment to secure your booking." },
      checked_out: { title: "Vehicle Checked Out",      message: "Your vehicle has been checked out. Drive safely and return it at the agreed time." },
      checked_in:  { title: "Vehicle Checked In",       message: "Your vehicle return has been received and is being processed by our team." },
      returned:    { title: "Vehicle Return Processed", message: "Your vehicle return has been successfully recorded." },
      completed:   { title: "Reservation Completed",    message: "Your reservation is complete. Thank you for choosing Mo Rental!" },
      closed:      { title: "Reservation Closed",       message: "Your reservation has been closed. We hope you had a great experience!" },
      cancelled:   { title: "Reservation Cancelled",    message: "Your reservation has been cancelled. Contact support if you need assistance." },
      no_show:     { title: "Reservation: No Show",     message: "Your reservation was marked as no-show. Contact support if this is an error." },
    };

    const notif = statusNotifMessages[status] || { title: "Reservation Updated", message: `Your reservation status has been updated to ${status}.` };
    const customerId = reservation.user_id;
    const reservationCode = reservation.code || String(reservation._id).slice(-8).toUpperCase();

    console.log(`[StatusNotif] Status changed → ${reservationCode} | status: ${status} | customer: ${customerId}`);

    (async () => {
      try {
        const customer = await User.findById(customerId).select("email full_name fcm_tokens");
        if (!customer) {
          console.warn(`[StatusNotif] Customer not found for id: ${customerId} — skipping all notifications`);
          return;
        }

        // ── 1. In-app notification (stored in DB, polled by mobile) ──────────
        notifHelper.sendToUser({
          userId: customerId,
          title: notif.title,
          message: notif.message,
          type: "booking",
          channels: ["in_app"],
          actionUrl: "/reservations",
        });
        console.log(`[StatusNotif] In-app notification queued → ${customer.email}`);

        // ── 2. Push notification (FCM direct, full logging) ───────────────────
        const fcmTokens = Array.isArray(customer.fcm_tokens) ? customer.fcm_tokens.filter(Boolean) : [];
        if (fcmTokens.length > 0) {
          try {
            const pushResult = await pushSvc.sendToTokens(fcmTokens, {
              title: notif.title,
              body: notif.message,
              data: {
                type: "reservation",
                action_url: "/reservations",
                reservation_code: reservationCode,
                status,
              },
            });
            console.log(`[StatusNotif] Push → ${customer.email} | tokens: ${fcmTokens.length} | success: ${pushResult?.successCount ?? "?"} | failed: ${pushResult?.failureCount ?? "?"}`);
          } catch (pushErr) {
            console.error(`[StatusNotif] Push FAILED → ${customer.email}:`, pushErr.message);
          }
        } else {
          console.warn(`[StatusNotif] No FCM tokens for ${customer.email} — push skipped (user needs to log in on mobile)`);
        }

        // ── 3. Email notification ─────────────────────────────────────────────
        if (customer.email) {
          try {
            const pickupAt = reservation.pickup?.at
              ? new Date(reservation.pickup.at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
              : undefined;
            const dropoffAt = reservation.dropoff?.at
              ? new Date(reservation.dropoff.at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
              : undefined;

            await sendReservationStatusUpdateEmail({
              to: customer.email,
              fullName: customer.full_name || "Customer",
              status,
              reservation: {
                code: reservationCode,
                vehicleModelName: reservation.vehicle_model_id?.name,
                pickupAt,
                dropoffAt,
              },
            });
            console.log(`[StatusNotif] Email sent → ${customer.email} | status: ${status}`);
          } catch (emailErr) {
            console.error(`[StatusNotif] Email FAILED → ${customer.email}:`, emailErr.message);
          }
        } else {
          console.warn(`[StatusNotif] No email address for user ${customerId} — email skipped`);
        }

      } catch (err) {
        console.error(`[StatusNotif] Notification pipeline error for ${reservationCode}:`, err.message);
      }
    })();

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
 * POST /api/v1/reservations/:id/return
 * Admin/manager: process vehicle return + record vehicle check.
 */
async function submitVehicleReturn(req, res) {
  try {
    const { user } = req;
    if (!isStaff(user)) {
      return res.status(403).json({
        success: false,
        code: "RESERVATION_FORBIDDEN",
        message: "Only staff can process vehicle returns",
      });
    }

    const reservation = await reservationService.submitVehicleReturn(
      req.params.id,
      user._id,
      req.body
    );

    return res.json({
      success: true,
      message: "Vehicle return processed successfully",
      data: reservation,
    });
  } catch (error) {
    console.error("submitVehicleReturn error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "RESERVATION_RETURN_ERROR",
      message: error.message || "Failed to process vehicle return",
    });
  }
}

/**
 * PATCH /api/v1/reservations/:id/close
 * Admin/manager: close a booking after vehicle returned + payment done.
 */
async function closeReservation(req, res) {
  try {
    const { user } = req;
    if (!isStaff(user)) {
      return res.status(403).json({
        success: false,
        code: "RESERVATION_FORBIDDEN",
        message: "Only staff can close reservations",
      });
    }

    const force = req.body?.force === true;
    const reservation = await reservationService.closeReservation(
      req.params.id,
      user._id,
      { force }
    );

    return res.json({
      success: true,
      message: "Reservation closed successfully",
      data: reservation,
    });
  } catch (error) {
    console.error("closeReservation error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "RESERVATION_CLOSE_ERROR",
      message: error.message || "Failed to close reservation",
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
  submitVehicleReturn,
  closeReservation,
  checkVehicleAvailability,
};
