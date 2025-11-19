// routers/rate_plan_router.js
const express = require("express");
const router = express.Router();

const ratePlanController = require("../controllers/rate_plan_controller");
const {
  authMiddleware,
  requireRoles,
} = require("../middlewares/auth_middleware");

const managerOrAdmin = requireRoles("manager", "admin");
const adminOnly = requireRoles("admin");

/**
 * @swagger
 * tags:
 *   name: RatePlans
 *   description: Pricing rate plans for vehicles/branches
 */

/**
 * @swagger
 * /api/v1/rate-plans:
 *   post:
 *     summary: Create a rate plan
 *     description: Only manager/admin can create rate plans.
 *     tags: [RatePlans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicle_class
 *               - currency
 *               - daily_rate
 *               - valid_from
 *             properties:
 *               branch_id:
 *                 type: string
 *                 nullable: true
 *                 description: "If null, plan applies to all branches."
 *               vehicle_class:
 *                 type: string
 *                 enum: [economy, compact, midsize, suv, luxury, van, truck]
 *                 example: "compact"
 *               vehicle_model_id:
 *                 type: string
 *                 nullable: true
 *               vehicle_id:
 *                 type: string
 *                 nullable: true
 *               currency:
 *                 type: string
 *                 enum: [USD, ZWL]
 *                 example: "USD"
 *               daily_rate:
 *                 type: string
 *                 example: "50.00"
 *               weekly_rate:
 *                 type: string
 *                 nullable: true
 *               monthly_rate:
 *                 type: string
 *                 nullable: true
 *               weekend_rate:
 *                 type: string
 *                 nullable: true
 *               seasonal_overrides:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     season:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "Peak"
 *                         start:
 *                           type: string
 *                           format: date-time
 *                         end:
 *                           type: string
 *                           format: date-time
 *                     daily_rate:
 *                       type: string
 *                     weekly_rate:
 *                       type: string
 *                     monthly_rate:
 *                       type: string
 *                     weekend_rate:
 *                       type: string
 *               taxes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "VAT"
 *                     rate:
 *                       type: number
 *                       example: 0.15
 *               fees:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "AIRPORT_FEE"
 *                     amount:
 *                       type: string
 *                       example: "10.00"
 *               active:
 *                 type: boolean
 *                 example: true
 *               valid_from:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-01-01T00:00:00Z"
 *               valid_to:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               name:
 *                 type: string
 *                 example: "HRE Compact 2025"
 *               notes:
 *                 type: string
 *                 example: "Peak season pricing"
 *     responses:
 *       201:
 *         description: Rate plan created successfully
 *       400:
 *         description: Validation or business error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  "/",
  authMiddleware,
  managerOrAdmin,
  ratePlanController.createRatePlan
);

/**
 * @swagger
 * /api/v1/rate-plans:
 *   get:
 *     summary: List rate plans
 *     description: Only manager/admin can list rate plans.
 *     tags: [RatePlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: vehicle_class
 *         schema:
 *           type: string
 *           enum: [economy, compact, midsize, suv, luxury, van, truck]
 *       - in: query
 *         name: vehicle_model_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           enum: [USD, ZWL]
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: valid_on
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "Filter plans valid on this date."
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of rate plans
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/",
  authMiddleware,
  managerOrAdmin,
  ratePlanController.listRatePlans
);

/**
 * @swagger
 * /api/v1/rate-plans/{id}:
 *   get:
 *     summary: Get a rate plan by ID
 *     tags: [RatePlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Rate plan ID
 *     responses:
 *       200:
 *         description: Rate plan found
 *       404:
 *         description: Rate plan not found
 */
router.get(
  "/:id",
  authMiddleware,
  managerOrAdmin,
  ratePlanController.getRatePlanById
);

/**
 * @swagger
 * /api/v1/rate-plans/{id}:
 *   patch:
 *     summary: Update a rate plan
 *     tags: [RatePlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Rate plan ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/RatePlan"
 *     responses:
 *       200:
 *         description: Rate plan updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Rate plan not found
 */
router.patch(
  "/:id",
  authMiddleware,
  managerOrAdmin,
  ratePlanController.updateRatePlan
);

/**
 * @swagger
 * /api/v1/rate-plans/{id}:
 *   delete:
 *     summary: Delete a rate plan (admin only)
 *     tags: [RatePlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Rate plan ID
 *     responses:
 *       200:
 *         description: Rate plan deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Rate plan not found
 */
router.delete(
  "/:id",
  authMiddleware,
  adminOnly,
  ratePlanController.deleteRatePlan
);

/**
 * @swagger
 * /api/v1/rate-plans/by-vehicle/{vehicleId}:
 *   get:
 *     summary: Get rate plans scoped to a specific vehicle
 *     tags: [RatePlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           enum: [USD, ZWL]
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: valid_on
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of rate plans for the vehicle
 */
router.get(
  "/by-vehicle/:vehicleId",
  authMiddleware,
  ratePlanController.getRatePlansByVehicle
);

/**
 * @swagger
 * /api/v1/rate-plans/by-model/{vehicleModelId}:
 *   get:
 *     summary: Get rate plans scoped to a vehicle model
 *     tags: [RatePlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleModelId
 *         required: true
 *         schema:
 *           type: string
 *         description: VehicleModel ID
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           enum: [USD, ZWL]
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: valid_on
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of rate plans for the model
 */
router.get(
  "/by-model/:vehicleModelId",
  authMiddleware,
  ratePlanController.getRatePlansByModel
);

/**
 * @swagger
 * /api/v1/rate-plans/by-class/{vehicleClass}:
 *   get:
 *     summary: Get rate plans by vehicle class
 *     tags: [RatePlans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleClass
 *         required: true
 *         schema:
 *           type: string
 *           enum: [economy, compact, midsize, suv, luxury, van, truck]
 *         description: Vehicle class
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           enum: [USD, ZWL]
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: valid_on
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of rate plans for the class
 */
router.get(
  "/by-class/:vehicleClass",
  authMiddleware,
  ratePlanController.getRatePlansByClass
);

module.exports = router;
