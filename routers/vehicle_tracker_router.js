// routers/vehicle_tracker_router.js
const express = require("express");
const router = express.Router();

const vehicleTrackerController = require("../controllers/vehicle_tracker_controller");
const {
  authMiddleware,
  requireRoles,
} = require("../middlewares/auth_middleware");

// Admin + Manager guard
const adminOrManagerMiddleware = requireRoles("admin", "manager");

/**
 * @swagger
 * tags:
 *   name: VehicleTrackers
 *   description: Vehicle tracker management & device attachment
 */

/**
 * NOTE: Base path in app.js:
 * app.use("/api/v1/vehicle-trackers", router);
 */

/**
 * @swagger
 * /api/v1/vehicle-trackers:
 *   post:
 *     summary: Create a new vehicle tracker
 *     description: Admin/Manager can register a new tracking device in the system.
 *     tags: [VehicleTrackers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               device_id:
 *                 type: string
 *                 example: "TRACKER-001"
 *               label:
 *                 type: string
 *                 example: "Harare CBD Tracker 1"
 *               notes:
 *                 type: string
 *                 example: "Installed in Toyota Corolla, white"
 *             required:
 *               - device_id
 *     responses:
 *       201:
 *         description: Tracker created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/VehicleTracker"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Tracker with same device_id already exists
 */
router.post(
  "/",
  authMiddleware,
  adminOrManagerMiddleware,
  vehicleTrackerController.createTracker
);

/**
 * @swagger
 * /api/v1/vehicle-trackers:
 *   get:
 *     summary: List vehicle trackers
 *     description: Admin/Manager can list all trackers with optional filters.
 *     tags: [VehicleTrackers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [inactive, active, maintenance]
 *         description: Filter by tracker status
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: string
 *         description: Filter by attached vehicle ID
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: string
 *         description: Filter by branch ID
 *     responses:
 *       200:
 *         description: List of trackers.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/VehicleTracker"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/",
  authMiddleware,
  adminOrManagerMiddleware,
  vehicleTrackerController.listTrackers
);

/**
 * @swagger
 * /api/v1/vehicle-trackers/{id}:
 *   get:
 *     summary: Get a tracker by ID
 *     tags: [VehicleTrackers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tracker ID
 *     responses:
 *       200:
 *         description: Tracker found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/VehicleTracker"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tracker not found
 */
router.get(
  "/:id",
  authMiddleware,
  adminOrManagerMiddleware,
  vehicleTrackerController.getTracker
);

/**
 * @swagger
 * /api/v1/vehicle-trackers/{id}:
 *   patch:
 *     summary: Update a tracker
 *     description: Admin/Manager can update tracker label, notes, status, or settings.
 *     tags: [VehicleTrackers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tracker ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label:
 *                 type: string
 *                 example: "Harare CBD Tracker 1 (updated)"
 *               notes:
 *                 type: string
 *                 example: "Tracker moved to another vehicle."
 *               status:
 *                 type: string
 *                 enum: [inactive, active, maintenance]
 *               settings:
 *                 type: object
 *                 properties:
 *                   reporting_interval_sec:
 *                     type: number
 *                     example: 10
 *                   allow_background_tracking:
 *                     type: boolean
 *                     example: true
 *     responses:
 *       200:
 *         description: Tracker updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/VehicleTracker"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tracker not found
 */
router.patch(
  "/:id",
  authMiddleware,
  adminOrManagerMiddleware,
  vehicleTrackerController.updateTracker
);

/**
 * @swagger
 * /api/v1/vehicle-trackers/{id}:
 *   delete:
 *     summary: Delete a tracker
 *     description: Admin/Manager can delete a tracker record.
 *     tags: [VehicleTrackers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tracker ID
 *     responses:
 *       200:
 *         description: Tracker deleted.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     deleted:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tracker not found
 */
router.delete(
  "/:id",
  authMiddleware,
  adminOrManagerMiddleware,
  vehicleTrackerController.deleteTracker
);

/**
 * @swagger
 * /api/v1/vehicle-trackers/{id}/attach:
 *   patch:
 *     summary: Attach a tracker to a vehicle
 *     description: Admin/Manager attaches an existing tracker to a vehicle.
 *     tags: [VehicleTrackers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tracker ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicle_id:
 *                 type: string
 *                 example: "67a12b3c4d5e6f7890abcd01"
 *             required:
 *               - vehicle_id
 *     responses:
 *       200:
 *         description: Tracker attached to vehicle.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/VehicleTracker"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tracker or vehicle not found
 */
router.patch(
  "/:id/attach",
  authMiddleware,
  adminOrManagerMiddleware,
  vehicleTrackerController.attachTracker
);

/**
 * @swagger
 * /api/v1/vehicle-trackers/{id}/detach:
 *   patch:
 *     summary: Detach a tracker from its vehicle
 *     description: Admin/Manager detaches a tracker from its current vehicle.
 *     tags: [VehicleTrackers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tracker ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Vehicle taken out of service."
 *     responses:
 *       200:
 *         description: Tracker detached from vehicle.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/VehicleTracker"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tracker not found
 */
router.patch(
  "/:id/detach",
  authMiddleware,
  adminOrManagerMiddleware,
  vehicleTrackerController.detachTracker
);

/**
 * @swagger
 * /api/v1/vehicle-trackers/device/login:
 *   post:
 *     summary: Login a tracking device
 *     description: Device provides its device_id and receives a device token (JWT) plus tracker data.
 *     tags: [VehicleTrackers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               device_id:
 *                 type: string
 *                 example: "TRACKER-001"
 *             required:
 *               - device_id
 *     responses:
 *       200:
 *         description: Device logged in successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     tracker:
 *                       $ref: "#/components/schemas/VehicleTracker"
 *                     device_token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Validation error
 *       404:
 *         description: Tracker not registered
 *       403:
 *         description: Tracker in maintenance mode
 */
router.post("/device/login", vehicleTrackerController.deviceLogin);

/**
 * @swagger
 * /api/v1/vehicle-trackers/device/attach:
 *   post:
 *     summary: Attach tracker to vehicle (device-side)
 *     description: Tracking device calls this to attach itself to a vehicle by device_id and vehicle_id.
 *     tags: [VehicleTrackers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               device_id:
 *                 type: string
 *                 example: "TRACKER-001"
 *               vehicle_id:
 *                 type: string
 *                 example: "67a12b3c4d5e6f7890abcd01"
 *             required:
 *               - device_id
 *               - vehicle_id
 *     responses:
 *       200:
 *         description: Tracker attached to vehicle.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/VehicleTracker"
 *       400:
 *         description: Validation error
 *       404:
 *         description: Tracker or vehicle not found
 */
router.post("/device/attach", vehicleTrackerController.deviceAttach);

/**
 * @swagger
 * /api/v1/vehicle-trackers/device/detach:
 *   post:
 *     summary: Detach tracker from vehicle (device-side)
 *     description: Tracking device calls this to detach itself from its current vehicle.
 *     tags: [VehicleTrackers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               device_id:
 *                 type: string
 *                 example: "TRACKER-001"
 *               reason:
 *                 type: string
 *                 example: "End of trip, moving device to another car."
 *             required:
 *               - device_id
 *     responses:
 *       200:
 *         description: Tracker detached from vehicle.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/VehicleTracker"
 *       400:
 *         description: Validation error
 *       404:
 *         description: Tracker not found
 */
router.post("/device/detach", vehicleTrackerController.deviceDetach);

/**
 * @swagger
 * /api/v1/vehicle-trackers/vehicle/{vehicleId}/location:
 *   get:
 *     summary: Get last known location for a vehicle
 *     description: Returns the last known location snapshot from the active tracker attached to the vehicle.
 *     tags: [VehicleTrackers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: Last known location found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     vehicle_id:
 *                       type: string
 *                       example: "67a12b3c4d5e6f7890abcd01"
 *                     tracker_id:
 *                       type: string
 *                       example: "67a12b3c4d5e6f7890abcd99"
 *                     last_location:
 *                       $ref: "#/components/schemas/VehicleLocationSnapshot"
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active tracker or location found for this vehicle
 */
router.get(
  "/vehicle/:vehicleId/location",
  authMiddleware,
  vehicleTrackerController.getLastLocationForVehicle
);

module.exports = router;
