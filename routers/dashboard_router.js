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
 *     summary: Admin dashboard metrics (global)
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
 *         description: "Start date (ISO). Default: last 30 days."
 *         example: "2025-12-01"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: "End date (ISO). Default: today."
 *         example: "2025-12-30"
 *     responses:
 *       200:
 *         description: Dashboard data for admin UI
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/DashboardResponse"
 *       401:
 *         description: Unauthorized (missing/invalid token)
 *       403:
 *         description: Forbidden (requires admin role)
 */
router.get(
  "/admin",
  authMiddleware,
  adminMiddleware, // ✅ your existing middleware
  dashboardController.getAdminDashboard
);

/**
 * @openapi
 * /api/v1/dashboard/manager:
 *   get:
 *     summary: Branch manager dashboard metrics (scoped to manager branch_ids)
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
 *         description: "Start date (ISO). Default: last 30 days."
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: "End date (ISO). Default: today."
 *     responses:
 *       200:
 *         description: Dashboard data for manager UI
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/DashboardResponse"
 *       401:
 *         description: Unauthorized (missing/invalid token)
 *       403:
 *         description: Forbidden (requires manager role and branch scope)
 */
router.get(
  "/manager",
  authMiddleware,
  requireRoles("manager"), // ✅ use requireRoles factory OR swap to managerMiddleware
  dashboardController.getManagerDashboard
);

module.exports = router;
