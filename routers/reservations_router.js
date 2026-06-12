// routers/reservations_router.js
const express = require("express");
const router = express.Router();

const reservationController = require("../controllers/reservations_controller");
const { authMiddleware } = require("../middlewares/auth_middleware");

/**
 * @swagger
 * tags:
 *   name: Reservations
 *   description: Car rental reservations / bookings
 */

/**
 * @swagger
 * /api/v1/reservations:
 *   post:
 *     summary: Create a reservation
 *     description: >
 *       Customers can create reservations for themselves.
 *       Staff (agent/manager/admin) can create reservations on behalf of customers by providing user_id in the body.
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - vehicle_model_id
 *               - pickup
 *               - dropoff
 *               - pricing
 *             properties:
 *               code:
 *                 type: string
 *                 example: "HRE-2025-000123"
 *               user_id:
 *                 type: string
 *                 description: "Customer user_id. Optional for customers; required when staff books for a customer."
 *               created_channel:
 *                 type: string
 *                 enum: [web, mobile, kiosk, agent]
 *                 example: "web"
 *               vehicle_id:
 *                 type: string
 *                 nullable: true
 *                 description: "Assigned vehicle. May be null until assignment."
 *               vehicle_model_id:
 *                 type: string
 *                 description: "Vehicle model being reserved."
 *               pickup:
 *                 $ref: "#/components/schemas/Endpoint"
 *               dropoff:
 *                 $ref: "#/components/schemas/Endpoint"
 *               pricing:
 *                 $ref: "#/components/schemas/Pricing"
 *               payment_summary:
 *                 $ref: "#/components/schemas/PaymentSummary"
 *               driver_snapshot:
 *                 $ref: "#/components/schemas/DriverSnapshot"
 *               notes:
 *                 type: string
 *                 example: "Customer will arrive 30 minutes early."
 *     responses:
 *       201:
 *         description: Reservation created successfully
 *       400:
 *         description: Validation or business error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Duplicate reservation code
 */
router.post("/", authMiddleware, reservationController.createReservation);

/**
 * @swagger
 * /api/v1/reservations:
 *   get:
 *     summary: List reservations (no pagination)
 *     description: >
 *       - Customers see only *their* reservations.
 *       - Staff (agent/manager/admin) can see all reservations and filter them.
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *         description: "Ignored for customers; staff can filter by user_id."
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, checked_out, returned, cancelled, no_show]
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: vehicle_model_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: created_by
 *         schema:
 *           type: string
 *       - in: query
 *         name: pickup_from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: pickup_to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: dropoff_from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: dropoff_to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of reservations
 *       401:
 *         description: Unauthorized
 */
router.get("/", authMiddleware, reservationController.listReservations);

/**
 * @swagger
 * /api/v1/reservations/{id}:
 *   get:
 *     summary: Get a reservation by ID
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reservation ID
 *     responses:
 *       200:
 *         description: Reservation found
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Reservation not found
 */
router.get("/:id", authMiddleware, reservationController.getReservationById);

/**
 * @swagger
 * /api/v1/reservations/{id}:
 *   patch:
 *     summary: Update a reservation (staff only)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reservation ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/Reservation"
 *     responses:
 *       200:
 *         description: Reservation updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Reservation not found
 */
router.patch("/:id", authMiddleware, reservationController.updateReservation);

/**
 * @swagger
 * /api/v1/reservations/{id}:
 *   delete:
 *     summary: Delete a reservation (admin only)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reservation ID
 *     responses:
 *       200:
 *         description: Reservation deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Reservation not found
 */
router.delete("/:id", authMiddleware, reservationController.deleteReservation);

/**
 * @swagger
 * /api/v1/reservations/{id}/status:
 *   patch:
 *     summary: Update reservation status (staff only)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reservation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, checked_out, returned, closed, cancelled, no_show]
 *                 example: confirmed
 *     responses:
 *       200:
 *         description: Reservation status updated
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Reservation not found
 */
router.patch(
  "/:id/status",
  authMiddleware,
  reservationController.updateReservationStatus
);

/**
 * @swagger
 * /api/v1/reservations/{id}/return:
 *   post:
 *     summary: Process vehicle return with condition check (staff only)
 *     description: >
 *       Marks booking as 'returned', records who submitted the vehicle and its condition.
 *       Booking must currently be 'checked_out'.
 *       Images should be uploaded to Supabase and passed as URL strings.
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fuel_level:
 *                 type: string
 *                 enum: [empty, quarter, half, three_quarter, full]
 *                 example: three_quarter
 *               cleanliness:
 *                 type: string
 *                 enum: [clean, dirty, very_dirty]
 *                 example: clean
 *               mileage_in:
 *                 type: number
 *                 example: 54320
 *               damages_noted:
 *                 type: boolean
 *                 example: false
 *               damage_description:
 *                 type: string
 *                 example: "Small scratch on rear bumper"
 *               damage_images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - "https://hfbudnmvjbzvpefvtiuu.supabase.co/storage/v1/object/public/topics/damage1.jpg"
 *               notes:
 *                 type: string
 *                 example: "Customer returned on time. Fuel slightly below full."
 *     responses:
 *       200:
 *         description: Vehicle return processed
 *       400:
 *         description: Booking not in checked_out state
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Reservation not found
 */
router.post(
  "/:id/return",
  authMiddleware,
  reservationController.submitVehicleReturn
);

/**
 * @swagger
 * /api/v1/reservations/{id}/close:
 *   patch:
 *     summary: Close a booking (staff only)
 *     description: >
 *       Marks booking as 'closed'. Booking must be 'returned'.
 *       Payment must be 'paid' unless force=true is passed.
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               force:
 *                 type: boolean
 *                 description: "Set true to close even if payment is not yet complete"
 *                 example: false
 *     responses:
 *       200:
 *         description: Booking closed
 *       400:
 *         description: Not in returned state or payment not done (use force=true to override)
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Reservation not found
 */
router.patch(
  "/:id/close",
  authMiddleware,
  reservationController.closeReservation
);

/**
 * @swagger
 * /api/v1/reservations/availability:
 *   post:
 *     summary: Check vehicle availability for a time range
 *     description: Checks if a specific vehicle has no blocking reservations in the given time range.
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicle_id
 *               - start
 *               - end
 *             properties:
 *               vehicle_id:
 *                 type: string
 *                 description: Vehicle _id to check
 *               start:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-02-01T10:00:00Z"
 *               end:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-02-05T10:00:00Z"
 *     responses:
 *       200:
 *         description: Availability result
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/availability",
  authMiddleware,
  reservationController.checkVehicleAvailability
);

module.exports = router;
