// routes/vehicle_incident_router.js
const express = require("express");
const router = express.Router();

const vehicleIncidentController = require("../controllers/vehicle_incident_controller");
const {
  authMiddleware,
  requireRoles,
} = require("../middlewares/auth_middleware");

/**
 * @swagger
 * tags:
 *   name: VehicleIncidents
 *   description: Vehicle incident and damage reporting
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     VehicleIncident:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "665a8e3d3f1a2c0012abc123"
 *         vehicle_id:
 *           type: string
 *           description: "Vehicle involved in the incident"
 *           example: "665a8d123f1a2c0012abf999"
 *         reservation_id:
 *           type: string
 *           nullable: true
 *           description: "Reservation during which the incident occurred (optional)"
 *           example: "665a8d123f1a2c0012abf777"
 *         reported_by:
 *           type: string
 *           description: "User who reported the incident"
 *           example: "665a8d123f1a2c0012abf555"
 *         branch_id:
 *           type: string
 *           nullable: true
 *           description: "Branch where the incident was logged"
 *           example: "665a8d123f1a2c0012abf222"
 *         type:
 *           type: string
 *           enum: [accident, scratch, tyre, windshield, mechanical_issue, other]
 *           example: "accident"
 *         severity:
 *           type: string
 *           enum: [minor, major]
 *           example: "minor"
 *         photos:
 *           type: array
 *           items:
 *             type: string
 *           example:
 *             - "https://cdn.example.com/incidents/abc123/photo1.jpg"
 *             - "https://cdn.example.com/incidents/abc123/photo2.jpg"
 *         description:
 *           type: string
 *           example: "Front bumper scratched and left headlight cracked."
 *         occurred_at:
 *           type: string
 *           format: date-time
 *           example: "2025-01-15T10:23:45.000Z"
 *         estimated_cost:
 *           type: number
 *           nullable: true
 *           example: 300.5
 *         final_cost:
 *           type: number
 *           nullable: true
 *           example: 280.0
 *         status:
 *           type: string
 *           enum: [open, under_review, resolved, written_off]
 *           example: "open"
 *         chargeable_to_customer_amount:
 *           type: number
 *           nullable: true
 *           example: 150.0
 *         payment_id:
 *           type: string
 *           nullable: true
 *           example: "665a8d123f1a2c0012abf888"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/vehicle-incidents:
 *   post:
 *     summary: Create a vehicle incident (Admin/Manager only)
 *     tags: [VehicleIncidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/VehicleIncident"
 *     responses:
 *       201:
 *         description: Incident created
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
 *     summary: Get all vehicle incidents (optional filters, no pagination)
 *     tags: [VehicleIncidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: reservation_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, under_review, resolved, written_off]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [accident, scratch, tyre, windshield, mechanical_issue, other]
 *     responses:
 *       200:
 *         description: List of incidents
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

// Create incident (admin + manager)
router.post(
  "/vehicle-incidents",
  authMiddleware,
  requireRoles("admin", "manager"),
  vehicleIncidentController.createVehicleIncident
);

// List incidents (all auth users, no pagination)
router.get(
  "/vehicle-incidents",
  authMiddleware,
  vehicleIncidentController.getVehicleIncidents
);

/**
 * @swagger
 * /api/v1/vehicle-incidents/{id}:
 *   get:
 *     summary: Get a vehicle incident by ID
 *     tags: [VehicleIncidents]
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
 *         description: Incident found
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
 *     summary: Update a vehicle incident (Admin/Manager only)
 *     tags: [VehicleIncidents]
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
 *             $ref: "#/components/schemas/VehicleIncident"
 *     responses:
 *       200:
 *         description: Incident updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 *
 *   delete:
 *     summary: Delete a vehicle incident (Admin/Manager only)
 *     tags: [VehicleIncidents]
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
 *         description: Forbidden
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 */

// Get by ID (read-only)
router.get(
  "/vehicle-incidents/:id",
  authMiddleware,
  vehicleIncidentController.getVehicleIncidentById
);

// Full update (admin + manager)
router.put(
  "/vehicle-incidents/:id",
  authMiddleware,
  requireRoles("admin", "manager"),
  vehicleIncidentController.updateVehicleIncident
);

// Delete (admin + manager)
router.delete(
  "/vehicle-incidents/:id",
  authMiddleware,
  requireRoles("admin", "manager"),
  vehicleIncidentController.deleteVehicleIncident
);

/**
 * @swagger
 * /api/v1/vehicle-incidents/{id}/status:
 *   patch:
 *     summary: Update the status of a vehicle incident (Admin/Manager only)
 *     tags: [VehicleIncidents]
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
 *               status:
 *                 type: string
 *                 enum: [open, under_review, resolved, written_off]
 *             required: [status]
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid status or ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 */

// Status update (admin + manager)
router.patch(
  "/vehicle-incidents/:id/status",
  authMiddleware,
  requireRoles("admin", "manager"),
  vehicleIncidentController.updateVehicleIncidentStatus
);

/**
 * @swagger
 * /api/v1/vehicles/{vehicleId}/vehicle-incidents:
 *   get:
 *     summary: Get incidents for a specific vehicle
 *     tags: [VehicleIncidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of incidents for vehicle
 *       400:
 *         description: Invalid vehicle ID
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

// By vehicle (read-only)
router.get(
  "/vehicles/:vehicleId/vehicle-incidents",
  authMiddleware,
  vehicleIncidentController.getIncidentsByVehicle
);

/**
 * @swagger
 * /api/v1/reservations/{reservationId}/vehicle-incidents:
 *   get:
 *     summary: Get incidents for a specific reservation
 *     tags: [VehicleIncidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reservationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of incidents for reservation
 *       400:
 *         description: Invalid reservation ID
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

// By reservation (read-only)
router.get(
  "/reservations/:reservationId/vehicle-incidents",
  authMiddleware,
  vehicleIncidentController.getIncidentsByReservation
);

/**
 * @swagger
 * /api/v1/branches/{branchId}/vehicle-incidents:
 *   get:
 *     summary: Get incidents logged by a specific branch
 *     tags: [VehicleIncidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of incidents for branch
 *       400:
 *         description: Invalid branch ID
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

// By branch (read-only)
router.get(
  "/branches/:branchId/vehicle-incidents",
  authMiddleware,
  vehicleIncidentController.getIncidentsByBranch
);

module.exports = router;
