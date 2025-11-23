// routers/vehicle_unit_router.js
const express = require("express");
const router = express.Router();

const vehicleUnitController = require("../controllers/vehicle_unit_controller");
const {
  authMiddleware,
  requireRoles,
} = require("../middlewares/auth_middleware");

const managerOrAdmin = requireRoles("manager", "admin");

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Actual vehicle units in branches
 */

/**
 * @swagger
 * /api/v1/vehicles:
 *   post:
 *     summary: Create a vehicle unit
 *     description: Only manager or admin can create vehicles.
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plate_number
 *               - vehicle_model_id
 *               - branch_id
 *             properties:
 *               vin:
 *                 type: string
 *                 example: "VF3ABCDEF12345678"
 *               plate_number:
 *                 type: string
 *                 example: "ABC1234"
 *               vehicle_model_id:
 *                 type: string
 *                 description: ID of VehicleModel
 *               branch_id:
 *                 type: string
 *                 description: ID of Branch
 *               odometer_km:
 *                 type: number
 *                 example: 45000
 *               color:
 *                 type: string
 *                 example: "White"
 *               status:
 *                 type: string
 *                 enum: [active, maintenance, retired]
 *                 example: active
 *               availability_state:
 *                 type: string
 *                 enum: [available, reserved, out, blocked]
 *                 example: available
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - "https://example.com/vehicle1-front.jpg"
 *                   - "https://example.com/vehicle1-interior.jpg"
 *               metadata:
 *                 type: object
 *                 properties:
 *                   gps_device_id:
 *                     type: string
 *                   notes:
 *                     type: string
 *                   seats:
 *                     type: number
 *                   doors:
 *                     type: number
 *                   features:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [ac, bluetooth, gps, child_seat, 4x4]
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Duplicate plate_number or VIN
 */
router.post(
  "/",
  authMiddleware,
  managerOrAdmin,
  vehicleUnitController.createVehicle
);

/**
 * @swagger
 * /api/v1/vehicles:
 *   get:
 *     summary: List vehicles (guest-friendly)
 *     description: Public endpoint to list/ search vehicles in the fleet.
 *     tags: [Vehicles]
 *     parameters:
 *       - in: query
 *         name: plate_number
 *         schema:
 *           type: string
 *       - in: query
 *         name: vin
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
 *           enum: [active, maintenance, retired]
 *       - in: query
 *         name: availability_state
 *         schema:
 *           type: string
 *           enum: [available, reserved, out, blocked]
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *       - in: query
 *         name: odometer_min
 *         schema:
 *           type: number
 *       - in: query
 *         name: odometer_max
 *         schema:
 *           type: number
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 20
 *     responses:
 *       200:
 *         description: List of vehicles
 */
router.get("/", vehicleUnitController.listVehicles);

/**
 * @swagger
 * /api/v1/vehicles/{id}:
 *   get:
 *     summary: Get a vehicle by ID
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: Vehicle found
 *       404:
 *         description: Vehicle not found
 */
router.get("/:id", vehicleUnitController.getVehicleById);

/**
 * @swagger
 * /api/v1/vehicles/{id}:
 *   patch:
 *     summary: Update a vehicle
 *     description: Only manager or admin can update vehicle units.
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Any updatable fields from the Vehicle model
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vehicle not found
 */
router.patch(
  "/:id",
  authMiddleware,
  managerOrAdmin,
  vehicleUnitController.updateVehicle
);

/**
 * @swagger
 * /api/v1/vehicles/{id}:
 *   delete:
 *     summary: Delete a vehicle
 *     description: Only manager or admin can delete vehicles.
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: Vehicle deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vehicle not found
 */
router.delete(
  "/:id",
  authMiddleware,
  managerOrAdmin,
  vehicleUnitController.deleteVehicle
);

/**
 * @swagger
 * /api/v1/vehicles/{id}/availability:
 *   patch:
 *     summary: Update vehicle availability state
 *     description: Only manager or admin can change availability_state.
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - availability_state
 *             properties:
 *               availability_state:
 *                 type: string
 *                 enum: [available, reserved, out, blocked]
 *                 example: reserved
 *     responses:
 *       200:
 *         description: Vehicle availability updated
 *       400:
 *         description: Invalid availability state
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vehicle not found
 */
router.patch(
  "/:id/availability",
  authMiddleware,
  managerOrAdmin,
  vehicleUnitController.updateVehicleAvailability
);

/**
 * @swagger
 * /api/v1/vehicles/{id}/service:
 *   patch:
 *     summary: Record a service event for a vehicle
 *     description: Only manager or admin can record services.
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-01-10T09:00:00Z"
 *               odometer_km:
 *                 type: number
 *                 example: 52000
 *     responses:
 *       200:
 *         description: Vehicle service recorded
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vehicle not found
 */
router.patch(
  "/:id/service",
  authMiddleware,
  managerOrAdmin,
  vehicleUnitController.recordVehicleService
);

module.exports = router;
