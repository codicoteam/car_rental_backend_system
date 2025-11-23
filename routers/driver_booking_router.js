// routers/driver_booking_router.js
const express = require("express");
const router = express.Router();

const driverBookingController = require("../controllers/driver_booking_controller");
const {
  authMiddleware,
  requireRoles,
  customerMiddleware,
  adminMiddleware,
} = require("../middlewares/auth_middleware");

const driverOnly = requireRoles("driver");
const managerOrAdmin = requireRoles("manager", "admin");

/**
 * @swagger
 * tags:
 *   name: DriverBookings
 *   description: Standalone bookings for drivers (not linked to car reservations)
 */

/**
 * @swagger
 * /api/v1/driver-bookings:
 *   post:
 *     summary: Create a driver booking
 *     description: Customer (or agent/admin on behalf of a customer) creates a booking request for a driver.
 *     tags: [DriverBookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/DriverBookingCreateRequest"
 *     responses:
 *       201:
 *         description: Booking created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post("/", authMiddleware, driverBookingController.createBooking);

/**
 * @swagger
 * /api/v1/driver-bookings/me:
 *   get:
 *     summary: Get my driver bookings (as customer)
 *     tags: [DriverBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum:
 *             [requested,accepted_by_driver,declined_by_driver,awaiting_payment,
 *              confirmed,cancelled_by_customer,cancelled_by_driver,expired,completed]
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of my driver bookings
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/me",
  authMiddleware,
  customerMiddleware,
  driverBookingController.listMyBookings
);

/**
 * @swagger
 * /api/v1/driver-bookings/me/{id}:
 *   get:
 *     summary: Get a specific driver booking (as customer)
 *     tags: [DriverBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: DriverBooking _id
 *     responses:
 *       200:
 *         description: Booking found
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.get(
  "/me/:id",
  authMiddleware,
  customerMiddleware,
  driverBookingController.getMyBookingById
);

/**
 * @swagger
 * /api/v1/driver-bookings/me/{id}/cancel:
 *   patch:
 *     summary: Cancel my driver booking (customer)
 *     tags: [DriverBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       400:
 *         description: Invalid status for cancellation
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.patch(
  "/me/:id/cancel",
  authMiddleware,
  customerMiddleware,
  driverBookingController.cancelMyBooking
);

/**
 * @swagger
 * /api/v1/driver-bookings/me/{id}/confirm-payment:
 *   patch:
 *     summary: Attach payment and confirm driver booking (customer)
 *     tags: [DriverBookings]
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
 *             $ref: "#/components/schemas/DriverBookingPaymentAttach"
 *     responses:
 *       200:
 *         description: Booking confirmed
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking or payment not found
 */
router.patch(
  "/me/:id/confirm-payment",
  authMiddleware,
  customerMiddleware,
  driverBookingController.confirmBookingWithPayment
);

/**
 * @swagger
 * /api/v1/driver-bookings/driver:
 *   get:
 *     summary: Get driver bookings addressed to me (as driver)
 *     tags: [DriverBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of bookings for this driver
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/driver",
  authMiddleware,
  driverOnly,
  driverBookingController.listDriverBookings
);

/**
 * @swagger
 * /api/v1/driver-bookings/driver/{id}:
 *   get:
 *     summary: Get specific driver booking (as driver)
 *     tags: [DriverBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking found
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.get(
  "/driver/:id",
  authMiddleware,
  driverOnly,
  driverBookingController.getDriverBookingById
);

/**
 * @swagger
 * /api/v1/driver-bookings/driver/{id}/respond:
 *   patch:
 *     summary: Driver responds to a booking (accept/decline)
 *     tags: [DriverBookings]
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
 *               action:
 *                 type: string
 *                 enum: [accept, decline]
 *                 example: accept
 *     responses:
 *       200:
 *         description: Booking updated
 *       400:
 *         description: Invalid action or status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.patch(
  "/driver/:id/respond",
  authMiddleware,
  driverOnly,
  driverBookingController.driverRespond
);

/**
 * @swagger
 * /api/v1/driver-bookings/driver/{id}/cancel:
 *   patch:
 *     summary: Driver cancels a booking
 *     tags: [DriverBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking cancelled by driver
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.patch(
  "/driver/:id/cancel",
  authMiddleware,
  driverOnly,
  driverBookingController.cancelDriverBooking
);

/**
 * @swagger
 * /api/v1/driver-bookings/driver/{id}/complete:
 *   patch:
 *     summary: Driver marks booking as completed
 *     tags: [DriverBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking completed
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.patch(
  "/driver/:id/complete",
  authMiddleware,
  driverOnly,
  driverBookingController.completeByDriver
);

/**
 * @swagger
 * /api/v1/driver-bookings/admin:
 *   get:
 *     summary: Admin/Manager - list all driver bookings
 *     tags: [DriverBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: driver_user_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: customer_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of driver bookings
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/admin",
  authMiddleware,
  managerOrAdmin,
  driverBookingController.adminListBookings
);

/**
 * @swagger
 * /api/v1/driver-bookings/admin/{id}:
 *   get:
 *     summary: Admin/Manager - get driver booking by ID
 *     tags: [DriverBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 */
router.get(
  "/admin/:id",
  authMiddleware,
  managerOrAdmin,
  driverBookingController.adminGetBookingById
);

/**
 * @swagger
 * /api/v1/driver-bookings/admin/{id}:
 *   delete:
 *     summary: Admin - delete driver booking
 *     tags: [DriverBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 */
router.delete(
  "/admin/:id",
  authMiddleware,
  adminMiddleware,
  driverBookingController.adminDeleteBooking
);

module.exports = router;
