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
 * /api/v1/reports/admin:
 *   get:
 *     summary: Admin / Executive Admin global reports
 *     description: >
 *       Returns paginated report data covering the entire business (all branches).
 *       Accessible by **admin** and **executive_admin** (read-only).
 *       The `type` parameter selects the dataset; `branch_id` can optionally scope results to one branch.
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum:
 *             - reservations
 *             - payments
 *             - incidents
 *             - fleet
 *             - services
 *         description: >
 *           Report dataset to generate:
 *           `reservations` – full booking list with status,
 *           `payments` – payment transactions,
 *           `incidents` – vehicle incidents,
 *           `fleet` – fleet status snapshot,
 *           `services` – service orders.
 *         example: reservations
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: "Start date (ISO, e.g. 2025-12-01). Defaults to last 30 days."
 *         example: "2025-12-01"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: "End date (ISO, e.g. 2025-12-31). Defaults to today."
 *         example: "2025-12-30"
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: string
 *         description: "Optional – filter results to a single branch."
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: "Page number."
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 25
 *         description: "Rows per page (max 200)."
 *         example: 25
 *     responses:
 *       200:
 *         description: Report data with rows, columns, summary, and paging metadata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ReportResponse"
 *       401:
 *         description: Unauthorized – missing or invalid Bearer token
 *       403:
 *         description: Forbidden – requires admin or executive_admin role
 */
router.get(
  "/admin",
  authMiddleware,
  requireRoles("admin", "executive_admin"),
  reportController.getAdminReport
);

router.get(
  "/admin/charts",
  authMiddleware,
  requireRoles("admin", "executive_admin"),
  reportController.getAdminCharts
);

router.get(
  "/admin/financial",
  authMiddleware,
  requireRoles("admin", "executive_admin"),
  reportController.getAdminFinancial
);

/**
 * @openapi
 * /api/v1/reports/manager:
 *   get:
 *     summary: Branch manager / receptionist reports (scoped to branch)
 *     description: >
 *       Returns paginated report data scoped to the branches this manager or receptionist is assigned to.
 *       Accessible by users with role **manager** or **branch_receptionist**.
 *       The `type` parameter selects the report dataset; `branch_id` can optionally narrow results to one branch within the allowed scope.
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum:
 *             - reservations
 *             - payments
 *             - incidents
 *             - fleet
 *             - services
 *         description: >
 *           Report type to generate:
 *           `reservations` – booking list with status,
 *           `payments` – payment transactions,
 *           `incidents` – vehicle incidents,
 *           `fleet` – fleet status snapshot,
 *           `services` – service orders.
 *         example: reservations
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: "Start date (ISO, e.g. 2025-12-01). Defaults to last 30 days."
 *         example: "2025-12-01"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: "End date (ISO, e.g. 2025-12-31). Defaults to today."
 *         example: "2025-12-30"
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: string
 *         description: "Optional – filter results to a single branch within the caller's allowed scope."
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: "Page number for paginated results."
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 25
 *         description: "Number of rows per page (max 200)."
 *         example: 25
 *     responses:
 *       200:
 *         description: Report data with rows, columns, summary, and paging metadata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ReportResponse"
 *       401:
 *         description: Unauthorized – missing or invalid Bearer token
 *       403:
 *         description: Forbidden – requires manager or branch_receptionist role
 */
router.get(
  "/manager",
  authMiddleware,
  requireRoles("manager", "branch_receptionist"),
  reportController.getManagerReport
);

module.exports = router;
