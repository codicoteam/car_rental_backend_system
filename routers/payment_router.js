// routes/payment_router.js
const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  // all roles have access; no role guards applied
} = require("../middlewares/auth_middleware");

const paymentController = require("../controllers/payment_controller");

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Paynow payments (redirect + mobile), promos, refunds, status, and webhooks
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Refund:
 *       type: object
 *       properties:
 *         amount: { type: number, format: float }
 *         provider_ref: { type: string, nullable: true }
 *         at: { type: string, format: date-time }
 *     Payment:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         user_id: { type: string }
 *         reservation_id: { type: string, nullable: true }
 *         driver_booking_id: { type: string, nullable: true }
 *         provider: { type: string, enum: ["stripe","paynow","ecocash","bank_transfer","cash"] }
 *         method: { type: string, enum: ["card","wallet","bank","cash"] }
 *         amount: { type: string, description: "Decimal128 stored as string" }
 *         currency: { type: string, enum: ["USD","ZWL"] }
 *         paymentStatus:
 *           type: string
 *           enum: ["paid","pending","failed","unpaid","cancelled","sent","awaiting_delivery","awaiting_confirmation"]
 *         pollUrl: { type: string }
 *         pricePaid: { type: number }
 *         promotionApplied: { type: boolean }
 *         promotionDiscount: { type: number }
 *         boughtAt: { type: string, format: date-time }
 *         provider_ref: { type: string, nullable: true }
 *         captured_at: { type: string, format: date-time, nullable: true }
 *         paynow_invoice_id: { type: string, nullable: true }
 *         refunds:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Refund'
 *         promo_code_id: { type: string, nullable: true }
 *         promo_code: { type: string, nullable: true }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: false }
 *         message: { type: string }
 */

/**
 * @swagger
 * /api/v1/payments/initiate:
 *   post:
 *     summary: Initiate a Paynow redirect (card/bank) payment and get redirect+poll URLs
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, currency]
 *             properties:
 *               reservation_id: { type: string, nullable: true }
 *               driver_booking_id: { type: string, nullable: true }
 *               amount: { type: number }
 *               currency: { type: string, enum: ["USD","ZWL"], default: "USD" }
 *               promo_code: { type: string, nullable: true }
 *               reference: { type: string, nullable: true }
 *               email: { type: string, nullable: true }
 *               lineItem: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Redirect & poll URLs returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 redirectUrl: { type: string }
 *                 pollUrl: { type: string }
 *                 promo_warning: { type: string, nullable: true }
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *       4XX:
 *         description: Client error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post("/initiate", authMiddleware, paymentController.initiate);

/**
 * @swagger
 * /api/v1/payments/mobile:
 *   post:
 *     summary: Initiate a Paynow mobile money payment (e.g., Ecocash)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, currency, phone]
 *             properties:
 *               reservation_id: { type: string, nullable: true }
 *               driver_booking_id: { type: string, nullable: true }
 *               amount: { type: number }
 *               currency: { type: string, enum: ["USD","ZWL"], default: "USD" }
 *               promo_code: { type: string, nullable: true }
 *               reference: { type: string, nullable: true }
 *               phone: { type: string }
 *               mobileMethod: { type: string, example: "ecocash" }
 *               lineItem: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Mobile payment initiated (pollUrl + optional instructions)
 *       4XX:
 *         description: Client error
 */
router.post("/mobile", authMiddleware, paymentController.mobile);

/**
 * @swagger
 * /api/v1/payments/{id}/status:
 *   get:
 *     summary: Get current status by polling Paynow for a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Current status
 */
router.get("/:id/status", authMiddleware, paymentController.status);

/**
 * @swagger
 * /api/v1/payments/{id}/poll:
 *   post:
 *     summary: Explicitly poll Paynow for a payment (same as GET /{id}/status)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Current status
 */
router.post("/:id/poll", authMiddleware, paymentController.status);

/**
 * @swagger
 * /api/v1/payments/{id}:
 *   get:
 *     summary: Get a single payment by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 payment: { $ref: '#/components/schemas/Payment' }
 *       404:
 *         description: Not found
 */
router.get("/:id", authMiddleware, paymentController.getOne);
/**
 * @swagger
 * /api/v1/payments:
 *   get:
 *     summary: List payments (optionally filter by status; `mine=true` limits to caller)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: mine
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *           default: "false"
 *     responses:
 *       200:
 *         description: List of payments
 */
router.get("/", authMiddleware, paymentController.list);

/**
 * @swagger
 * /api/v1/payments/{id}/apply-promo:
 *   post:
 *     summary: Apply a promo code to a pending/unpaid payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string }
 *     responses:
 *       200:
 *         description: Promo applied (or warning)
 */
router.post("/:id/apply-promo", authMiddleware, paymentController.applyPromo);

/**
 * @swagger
 * /api/v1/payments/{id}/promo:
 *   delete:
 *     summary: Remove promo from a pending/unpaid payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Promo removed
 */
router.delete("/:id/promo", authMiddleware, paymentController.removePromo);

/**
 * @swagger
 * /api/v1/payments/{id}/refund:
 *   post:
 *     summary: Record a refund (local record; Paynow refunds are typically manual)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number }
 *               provider_ref: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Refund captured
 */
router.post("/:id/refund", authMiddleware, paymentController.refund);

/**
 * @swagger
 * /api/v1/payments/{id}/cancel:
 *   post:
 *     summary: Cancel a pending/unpaid payment (local only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cancelled
 */
router.post("/:id/cancel", authMiddleware, paymentController.cancel);

/**
 * @swagger
 * /api/v1/payments/webhook/paynow:
 *   post:
 *     summary: Paynow result URL webhook (public; no auth)
 *     tags: [Payments]
 *     requestBody:
 *       description: Paynow payload (fields vary)
 *       required: false
 *     responses:
 *       200:
 *         description: Accepted
 */
router.post(
  "/webhook/paynow",
  express.urlencoded({ extended: false }),
  express.json(),
  paymentController.webhook
);

module.exports = router;
