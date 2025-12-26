// routes/service_schedule_router.js
const express = require("express");
const router = express.Router();

const serviceScheduleController = require("../controllers/service_schedule_controller");
const {
  authMiddleware,
  requireRoles,
} = require("../middlewares/auth_middleware");

/**
 * @swagger
 * tags:
 *   name: ServiceSchedules
 *   description: Service schedule rules for vehicles and vehicle models
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ServiceSchedule:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "665a8e3d3f1a2c0012abc123"
 *         vehicle_id:
 *           type: string
 *           nullable: true
 *           description: "Specific vehicle this schedule applies to"
 *           example: "665a8d123f1a2c0012abf999"
 *         vehicle_model_id:
 *           type: string
 *           nullable: true
 *           description: "Vehicle model this schedule applies to"
 *           example: "665a8d123f1a2c0012abf111"
 *         interval_km:
 *           type: number
 *           nullable: true
 *           description: "Service interval in kilometers"
 *           example: 10000
 *         interval_days:
 *           type: number
 *           nullable: true
 *           description: "Service interval in days"
 *           example: 180
 *         next_due_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: "Next due date based on interval_days"
 *           example: "2025-06-01T00:00:00.000Z"
 *         next_due_odo:
 *           type: number
 *           nullable: true
 *           description: "Next due odometer reading based on interval_km"
 *           example: 45000
 *         notes:
 *           type: string
 *           nullable: true
 *           example: "Standard 10k service schedule"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/service-schedules:
 *   post:
 *     summary: Create a service schedule (Admin/Manager only)
 *     tags: [ServiceSchedules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ServiceSchedule"
 *     responses:
 *       201:
 *         description: Service schedule created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (role restriction)
 *       500:
 *         description: Internal server error
 *
 *   get:
 *     summary: List service schedules (all authenticated roles read-only)
 *     tags: [ServiceSchedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: vehicle_model_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of service schedules
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

// Create (admin + manager)
router.post(
  "/",
  authMiddleware,
  requireRoles("admin", "manager", "customer", "agent", "driver"),
  serviceScheduleController.createServiceSchedule
);

// List (all auth users read-only)
router.get(
  "/",
  authMiddleware,
  serviceScheduleController.getServiceSchedules
);

/**
 * @swagger
 * /api/v1/service-schedules/{id}:
 *   get:
 *     summary: Get a service schedule by ID (read-only)
 *     tags: [ServiceSchedules]
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
 *         description: Service schedule found
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *
 *   put:
 *     summary: Update a service schedule (Admin/Manager only)
 *     tags: [ServiceSchedules]
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
 *             $ref: "#/components/schemas/ServiceSchedule"
 *     responses:
 *       200:
 *         description: Updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (role restriction)
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 *
 *   delete:
 *     summary: Delete a service schedule (Admin/Manager only)
 *     tags: [ServiceSchedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted successfully
 *       400:
 *         description: Invalid ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (role restriction)
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 */

// Get by ID (read-only)
router.get(
  "/service-schedules/:id",
  authMiddleware,
  serviceScheduleController.getServiceScheduleById
);

// Update (admin + manager)
router.put(
  "/service-schedules/:id",
  authMiddleware,
  requireRoles("admin", "manager"),
  serviceScheduleController.updateServiceSchedule
);

// Delete (admin + manager)
router.delete(
  "/service-schedules/:id",
  authMiddleware,
  requireRoles("admin", "manager"),
  serviceScheduleController.deleteServiceSchedule
);

/**
 * @swagger
 * /api/v1/vehicles/{vehicleId}/service-schedules:
 *   get:
 *     summary: Get service schedules for a specific vehicle (read-only)
 *     tags: [ServiceSchedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of schedules for vehicle
 *       400:
 *         description: Invalid vehicle ID
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

// By vehicle (read-only)
router.get(
  "/vehicles/:vehicleId/service-schedules",
  authMiddleware,
  serviceScheduleController.getSchedulesByVehicle
);

/**
 * @swagger
 * /api/v1/vehicle-models/{vehicleModelId}/service-schedules:
 *   get:
 *     summary: Get service schedules for a specific vehicle model (read-only)
 *     tags: [ServiceSchedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleModelId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of schedules for vehicle model
 *       400:
 *         description: Invalid vehicle model ID
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

// By vehicle model (read-only)
router.get(
  "/vehicle-models/:vehicleModelId/service-schedules",
  authMiddleware,
  serviceScheduleController.getSchedulesByVehicleModel
);

module.exports = router;
