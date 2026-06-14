// routes/dashboard_router.js
const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard_controller");

const {
  authMiddleware,
  adminMiddleware,
  requireRoles,
} = require("../middlewares/auth_middleware");

/**
 * @openapi
 * components:
 *   schemas:
 *     ChartPoint:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           example: "2025-12-30"
 *         value:
 *           oneOf:
 *             - type: number
 *             - type: string
 *           description: "Decimal128 may serialize as string depending on your JSON conversion."
 *     PieSlice:
 *       type: object
 *       properties:
 *         label:
 *           type: string
 *           example: "confirmed"
 *         value:
 *           type: number
 *           example: 42
 *     BarItem:
 *       type: object
 *       properties:
 *         label:
 *           type: string
 *         value:
 *           oneOf:
 *             - type: number
 *             - type: string
 *         count:
 *           type: number
 *           nullable: true
 *         branch_id:
 *           type: string
 *           nullable: true
 *     DashboardResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             range:
 *               type: object
 *               properties:
 *                 from:
 *                   type: string
 *                   format: date-time
 *                 to:
 *                   type: string
 *                   format: date-time
 *             scope:
 *               type: object
 *               nullable: true
 *             kpis:
 *               type: object
 *               additionalProperties: true
 *             charts:
 *               type: object
 *               properties:
 *                 pie:
 *                   type: object
 *                   properties:
 *                     reservations_by_status:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/PieSlice"
 *                 lines:
 *                   type: object
 *                   properties:
 *                     reservations_per_day:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/ChartPoint"
 *                     revenue_per_day:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/ChartPoint"
 *                 bars:
 *                   type: object
 *                   properties:
 *                     revenue_by_branch:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/BarItem"
 *                     vehicles_by_class:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/BarItem"
 */

/**
 * @openapi
 * /api/v1/dashboard/admin:
 *   get:
 *     summary: Admin / Executive Admin dashboard metrics (global)
 *     description: >
 *       Returns global KPIs, revenue charts, fleet stats, and reservation breakdowns
 *       across all branches. Accessible by **admin** and **executive_admin** roles.
 *       executive_admin has read-only access — no write operations are permitted.
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: "Start date in ISO format (e.g. 2025-12-01). Defaults to last 30 days."
 *         example: "2025-12-01"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: "End date in ISO format (e.g. 2025-12-31). Defaults to today."
 *         example: "2025-12-30"
 *     responses:
 *       200:
 *         description: Global dashboard data for admin / executive overview UI
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/DashboardResponse"
 *       401:
 *         description: Unauthorized – missing or invalid Bearer token
 *       403:
 *         description: Forbidden – requires admin or executive_admin role
 */
router.get(
  "/admin",
  authMiddleware,
  requireRoles("admin", "executive_admin"),
  dashboardController.getAdminDashboard
);

/**
 * @openapi
 * /api/v1/dashboard/manager:
 *   get:
 *     summary: Branch manager / receptionist dashboard metrics (scoped to branch)
 *     description: >
 *       Returns KPIs, charts, and metrics scoped to the branches this manager or receptionist is assigned to.
 *       Accessible by users with role **manager** or **branch_receptionist**.
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: "Start date in ISO format (e.g. 2025-01-01). Defaults to last 30 days."
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: "End date in ISO format (e.g. 2025-01-31). Defaults to today."
 *     responses:
 *       200:
 *         description: Dashboard data for branch manager / receptionist UI
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/DashboardResponse"
 *       401:
 *         description: Unauthorized – missing or invalid Bearer token
 *       403:
 *         description: Forbidden – requires manager or branch_receptionist role
 */
router.get(
  "/manager",
  authMiddleware,
  requireRoles("manager", "branch_receptionist"),
  dashboardController.getManagerDashboard
);

/**
 * @openapi
 * /api/v1/dashboard/customer:
 *   get:
 *     summary: Customer home screen data (featured vehicles, branches, promos, active booking, drivers)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All data needed to render the customer home screen
 *       401:
 *         description: Unauthorized
 */
router.get("/customer", authMiddleware, dashboardController.getCustomerDashboard);

module.exports = router;
