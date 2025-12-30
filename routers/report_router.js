// routes/report_router.js
const express = require("express");
const router = express.Router();
const reportController = require("../controllers/report_controller");
const {
  authMiddleware,
  adminMiddleware,
  requireRoles, // or managerMiddleware
} = require("../middlewares/auth_middleware");

/**
 * @openapi
 * components:
 *   schemas:
 *     ReportResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               example: reservations
 *             columns:
 *               type: array
 *               items:
 *                 type: string
 *             rows:
 *               type: array
 *               items:
 *                 type: object
 *             summary:
 *               type: object
 *               additionalProperties: true
 *             paging:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 25
 *                 total:
 *                   type: integer
 *                   example: 120
 *                 total_pages:
 *                   type: integer
 *                   example: 5
 */

/**
 * @openapi
 * /api/reports/admin:
 *   get:
 *     summary: Admin reports (global or optionally filtered by branch)
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum:
 *             - reservations
 *             - payments
 *             - incidents
 *             - fleet
 *             - services
 *         example: reservations
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         example: "2025-12-01"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         example: "2025-12-30"
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: string
 *         description: "Optional: admin can filter for a single branch"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *         example: 25
 *     responses:
 *       200:
 *         description: Report data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ReportResponse"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/admin",
  authMiddleware,
  adminMiddleware,
  reportController.getAdminReport
);

/**
 * @openapi
 * /api/reports/manager:
 *   get:
 *     summary: Manager reports (scoped to manager branch_ids)
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum:
 *             - reservations
 *             - payments
 *             - incidents
 *             - fleet
 *             - services
 *         example: reservations
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         example: "2025-12-01"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         example: "2025-12-30"
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: string
 *         description: "Optional: manager can filter within their own branch scope"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *         example: 25
 *     responses:
 *       200:
 *         description: Report data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ReportResponse"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/manager",
  authMiddleware,
  requireRoles("manager"),
  reportController.getManagerReport
);

module.exports = router;
