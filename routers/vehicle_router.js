// routers/vehicle_router.js
const express = require("express");
const router = express.Router();

const vehicleController = require("../controllers/vehicle_controller");
const {
  authMiddleware,
  requireRoles,
} = require("../middlewares/auth_middleware");

// Manager / Admin middleware
const managerOrAdmin = requireRoles("manager", "admin");

/**
 * @swagger
 * tags:
 *   name: VehicleModels
 *   description: Vehicle model catalog operations
 */

/**
 * @swagger
 * /api/v1/vehicle-models:
 *   post:
 *     summary: Create a new vehicle model
 *     description: Only manager or admin can create vehicle models.
 *     tags: [VehicleModels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - make
 *               - model
 *               - year
 *               - class
 *               - transmission
 *               - fuel_type
 *               - seats
 *               - doors
 *             properties:
 *               make:
 *                 type: string
 *                 example: Toyota
 *               model:
 *                 type: string
 *                 example: Corolla
 *               year:
 *                 type: integer
 *                 example: 2018
 *               class:
 *                 type: string
 *                 enum: [economy, compact, midsize, suv, luxury, van, truck]
 *                 example: compact
 *               transmission:
 *                 type: string
 *                 enum: [auto, manual]
 *                 example: auto
 *               fuel_type:
 *                 type: string
 *                 enum: [petrol, diesel, hybrid, ev]
 *                 example: petrol
 *               seats:
 *                 type: integer
 *                 example: 5
 *               doors:
 *                 type: integer
 *                 example: 4
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [ac, bluetooth, gps, child_seat, 4x4]
 *                 example: ["ac", "bluetooth"]
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - "https://example.com/images/corolla-front.jpg"
 *                   - "https://example.com/images/corolla-side.jpg"
 *     responses:
 *       201:
 *         description: Vehicle model created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/VehicleModel'
 *       400:
 *         description: Validation or business error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Model with same make/model/year already exists
 */
router.post(
  "/",
  authMiddleware,
  managerOrAdmin,
  vehicleController.createVehicleModel
);

/**
 * @swagger
 * /api/v1/vehicle-models:
 *   get:
 *     summary: List vehicle models
 *     description: Public endpoint. Supports filtering and pagination for search/browse.
 *     tags: [VehicleModels]
 *     parameters:
 *       - in: query
 *         name: make
 *         schema:
 *           type: string
 *       - in: query
 *         name: model
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: class
 *         schema:
 *           type: string
 *           enum: [economy, compact, midsize, suv, luxury, van, truck]
 *       - in: query
 *         name: transmission
 *         schema:
 *           type: string
 *           enum: [auto, manual]
 *       - in: query
 *         name: fuel_type
 *         schema:
 *           type: string
 *           enum: [petrol, diesel, hybrid, ev]
 *       - in: query
 *         name: seats_min
 *         schema:
 *           type: integer
 *       - in: query
 *         name: seats_max
 *         schema:
 *           type: integer
 *       - in: query
 *         name: doors_min
 *         schema:
 *           type: integer
 *       - in: query
 *         name: doors_max
 *         schema:
 *           type: integer
 *       - in: query
 *         name: feature
 *         schema:
 *           type: string
 *           enum: [ac, bluetooth, gps, child_seat, 4x4]
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
 *         description: List of vehicle models
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
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/VehicleModel'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get("/", vehicleController.listVehicleModels);

/**
 * @swagger
 * /api/v1/vehicle-models/{id}:
 *   get:
 *     summary: Get a vehicle model by ID
 *     tags: [VehicleModels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle model ID
 *     responses:
 *       200:
 *         description: Vehicle model found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VehicleModel'
 *       404:
 *         description: Vehicle model not found
 */
router.get("/:id", vehicleController.getVehicleModelById);

/**
 * @swagger
 * /api/v1/vehicle-models/{id}:
 *   patch:
 *     summary: Update a vehicle model
 *     description: Only manager or admin can update vehicle models.
 *     tags: [VehicleModels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle model ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VehicleModel'
 *     responses:
 *       200:
 *         description: Vehicle model updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vehicle model not found
 *       409:
 *         description: Duplicate make/model/year
 */
router.patch(
  "/:id",
  authMiddleware,
  managerOrAdmin,
  vehicleController.updateVehicleModel
);

/**
 * @swagger
 * /api/v1/vehicle-models/{id}:
 *   delete:
 *     summary: Delete a vehicle model
 *     description: Only manager or admin can delete vehicle models.
 *     tags: [VehicleModels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle model ID
 *     responses:
 *       200:
 *         description: Vehicle model deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vehicle model not found
 */
router.delete(
  "/:id",
  authMiddleware,
  managerOrAdmin,
  vehicleController.deleteVehicleModel
);

module.exports = router;
