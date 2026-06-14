// routers/audit_router.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const { authMiddleware, requireRoles } = require("../middlewares/auth_middleware");
const auditService = require("../services/audit_service");
const AuditLog = require("../models/audit_log_model");
const Reservation = require("../models/reservations_model");
const Payment = require("../models/payment_model");
const DriverBooking = require("../models/driver_booking_model");
const { Profile } = require("../models/profile_models");

const staffOrAdmin = requireRoles("manager", "branch_receptionist", "executive_admin", "admin");

/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: Audit logs and user activity analytics
 */

/**
 * @swagger
 * /api/v1/audit/users/{userId}/logs:
 *   get:
 *     summary: Get paginated audit logs for a user
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audit logs returned
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/users/:userId/logs",
  authMiddleware,
  staffOrAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const action = req.query.action || undefined;

      const result = await auditService.getLogsForUser(userId, { page, limit, action });
      return res.json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/audit/users/{userId}/stats:
 *   get:
 *     summary: Get aggregated activity stats for a user (for analytics charts)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User stats returned
 */
router.get(
  "/users/:userId/stats",
  authMiddleware,
  staffOrAdmin,
  async (req, res) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.params.userId);

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [
        reservationTotal,
        reservationActive,
        reservationCancelled,
        reservationCompleted,
        paymentsPaid,
        driverBookingsTotal,
        driverBookingsCompleted,
        reservationsByMonth,
        paymentsByMonth,
        activityBreakdown,
        profiles,
      ] = await Promise.all([
        // Total reservations
        Reservation.countDocuments({ user_id: userId }),
        // Active reservations
        Reservation.countDocuments({ user_id: userId, status: { $in: ["confirmed", "checked_out"] } }),
        // Cancelled
        Reservation.countDocuments({ user_id: userId, status: { $in: ["cancelled", "no_show"] } }),
        // Completed (returned/closed)
        Reservation.countDocuments({ user_id: userId, status: { $in: ["returned", "closed"] } }),
        // Paid payments aggregate
        Payment.aggregate([
          { $match: { user_id: userId, paymentStatus: "paid" } },
          { $group: { _id: null, total: { $sum: "$pricePaid" }, count: { $sum: 1 } } },
        ]),
        // Total driver bookings
        DriverBooking.countDocuments({ customer_id: userId }),
        // Completed driver bookings
        DriverBooking.countDocuments({ customer_id: userId, status: "completed" }),
        // Reservations by month (last 6 months)
        Reservation.aggregate([
          { $match: { user_id: userId, created_at: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: { year: { $year: "$created_at" }, month: { $month: "$created_at" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),
        // Payments by month (last 6 months)
        Payment.aggregate([
          { $match: { user_id: userId, paymentStatus: "paid", boughtAt: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: { year: { $year: "$boughtAt" }, month: { $month: "$boughtAt" } },
              total: { $sum: "$pricePaid" },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),
        // Audit log action breakdown
        AuditLog.aggregate([
          { $match: { user_id: userId } },
          { $group: { _id: "$action", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        // Profile count
        Profile.find({ user: userId }, { role: 1 }).lean(),
      ]);

      // Build month labels for the last 6 months
      const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthSeries = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        monthSeries.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: MONTH_NAMES[d.getMonth()] });
      }

      const reservationChartData = monthSeries.map(m => {
        const found = reservationsByMonth.find(r => r._id.year === m.year && r._id.month === m.month);
        return { month: m.label, count: found ? found.count : 0 };
      });

      const paymentChartData = monthSeries.map(m => {
        const found = paymentsByMonth.find(p => p._id.year === m.year && p._id.month === m.month);
        return { month: m.label, total: found ? Math.round(found.total * 100) / 100 : 0 };
      });

      const paidTotal = paymentsPaid[0]?.total || 0;
      const paidCount = paymentsPaid[0]?.count || 0;

      return res.json({
        success: true,
        data: {
          summary: {
            reservations: { total: reservationTotal, active: reservationActive, cancelled: reservationCancelled, completed: reservationCompleted },
            payments: { paid_total_usd: Math.round(paidTotal * 100) / 100, paid_count: paidCount },
            driver_bookings: { total: driverBookingsTotal, completed: driverBookingsCompleted },
            profiles: profiles.map(p => p.role),
          },
          charts: {
            reservations_by_month: reservationChartData,
            payments_by_month: paymentChartData,
            activity_breakdown: activityBreakdown.map(a => ({ action: a._id, count: a.count })),
          },
        },
      });
    } catch (err) {
      console.error("user stats error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;
