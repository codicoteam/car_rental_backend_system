// routers/promo_code_router.js
const express = require("express");
const router = express.Router();

const promoController = require("../controllers/promo_code_controller");
const {
  authMiddleware,
  requireRoles,
} = require("../middlewares/auth_middleware");

const managerOrAdmin = requireRoles("manager", "admin");
const adminOnly = requireRoles("admin");

/**
 * @swagger
 * tags:
 *   name: PromoCodes
 *   description: Promo / discount codes
 */

/**
 * @swagger
 * /api/v1/promo-codes:
 *   post:
 *     summary: Create a promo code
 *     description: Only manager/admin can create promo codes.
 *     tags: [PromoCodes]
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
 *               - type
 *               - value
 *               - valid_from
 *             properties:
 *               code:
 *                 type: string
 *                 example: "WELCOME10"
 *               type:
 *                 type: string
 *                 enum: [percent, fixed]
 *                 example: "percent"
 *               value:
 *                 type: number
 *                 example: 10
 *               currency:
 *                 type: string
 *                 enum: [USD, ZWL]
 *                 description: Required if type = fixed
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
 *                 example: "2025-03-31T23:59:59Z"
 *               usage_limit:
 *                 type: number
 *                 nullable: true
 *                 example: 100
 *               constraints:
 *                 type: object
 *                 properties:
 *                   allowed_classes:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [economy, compact, midsize, suv, luxury, van, truck]
 *                     example: ["economy", "compact"]
 *                   min_days:
 *                     type: number
 *                     example: 3
 *                   branch_ids:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["6750f1e0c1a2b34de0branch01"]
 *               notes:
 *                 type: string
 *                 example: "New customers only"
 *     responses:
 *       201:
 *         description: Promo code created successfully
 *       400:
 *         description: Validation or business error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Duplicate promo code
 */
router.post(
  "/",
  authMiddleware,
  managerOrAdmin,
  promoController.createPromoCode
);

/**
 * @swagger
 * /api/v1/promo-codes:
 *   get:
 *     summary: Get all promo codes (management)
 *     description: Only manager/admin can list all promo codes.
 *     tags: [PromoCodes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status.
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Case-insensitive exact match on code.
 *     responses:
 *       200:
 *         description: List of promo codes
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/",
  authMiddleware,
  managerOrAdmin,
  promoController.getAllPromoCodes
);

/**
 * @swagger
 * /api/v1/promo-codes/{id}:
 *   get:
 *     summary: Get a promo code by ID (management)
 *     tags: [PromoCodes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Promo code ID
 *     responses:
 *       200:
 *         description: Promo code found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Promo code not found
 */
router.get(
  "/:id",
  authMiddleware,
  managerOrAdmin,
  promoController.getPromoCodeById
);

/**
 * @swagger
 * /api/v1/promo-codes/code/{code}:
 *   get:
 *     summary: Get a promo code by code (public)
 *     description: >
 *       Public endpoint to validate a promo code.  
 *       By default, checks current validity window and usage (enforceValidity=true).  
 *       You can set ?enforceValidity=false to fetch it even if expired.
 *     tags: [PromoCodes]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Promo code string (e.g., WELCOME10)
 *       - in: query
 *         name: enforceValidity
 *         schema:
 *           type: boolean
 *         description: >
 *           If true (default), only return if currently valid.  
 *           If false, returns even if inactive/expired.
 *       - in: query
 *         name: at
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Date/time at which to evaluate validity (default now).
 *     responses:
 *       200:
 *         description: Promo code found
 *       400:
 *         description: Promo not valid (when enforceValidity=true)
 *       404:
 *         description: Promo code not found
 */
router.get("/code/:code", promoController.getPromoByCode);

/**
 * @swagger
 * /api/v1/promo-codes/active:
 *   get:
 *     summary: Get all currently valid promo codes (public)
 *     tags: [PromoCodes]
 *     parameters:
 *       - in: query
 *         name: at
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Evaluate validity at this time (default now).
 *     responses:
 *       200:
 *         description: List of active promo codes
 */
router.get("/active", promoController.getActivePromoCodes);

/**
 * @swagger
 * /api/v1/promo-codes/{id}:
 *   patch:
 *     summary: Update a promo code
 *     description: Only manager/admin can update promo codes.
 *     tags: [PromoCodes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Promo code ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/PromoCode"
 *     responses:
 *       200:
 *         description: Promo code updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Promo code not found
 */
router.patch(
  "/:id",
  authMiddleware,
  managerOrAdmin,
  promoController.updatePromoCode
);

/**
 * @swagger
 * /api/v1/promo-codes/{id}:
 *   delete:
 *     summary: Delete a promo code
 *     description: Admin only.
 *     tags: [PromoCodes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Promo code ID
 *     responses:
 *       200:
 *         description: Promo code deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Promo code not found
 */
router.delete(
  "/:id",
  authMiddleware,
  adminOnly,
  promoController.deletePromoCode
);

module.exports = router;
