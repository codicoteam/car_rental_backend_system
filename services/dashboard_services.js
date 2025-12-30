// services/dashboard_service.js
const mongoose = require("mongoose");

const Reservation = require("../models/reservations_model");
const Payment = require("../models/payment_model");
const Branch = require("../models/branch_models");
const Vehicle = require("../models/vehicle_unit_model");
const VehicleIncident = require("../models/vehicle_incident_model");
const ServiceOrder = require("../models/service_order_model");
const ServiceSchedule = require("../models/service_schedule_model");

const { ManagerProfile } = require("../models/profile_models"); // exports discriminators

// ---------- helpers ----------
function toObjectId(id) {
  return new mongoose.Types.ObjectId(String(id));
}

function parseDateRange(query) {
  // Defaults: last 30 days until now
  const now = new Date();
  const from = query?.from
    ? new Date(query.from)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const to = query?.to ? new Date(query.to) : now;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    const err = new Error("Invalid from/to date. Use ISO format, e.g. 2025-12-01");
    err.statusCode = 400;
    throw err;
  }
  if (from > to) {
    const err = new Error("Invalid date range: from must be <= to");
    err.statusCode = 400;
    throw err;
  }
  return { from, to };
}

function dayBucketsPipeline(dateField, from, to) {
  // Daily buckets between from/to (inclusive range)
  return [
    { $match: { [dateField]: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: `$${dateField}` },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];
}

function moneySumPipeline(dateField, from, to) {
  // Payments.amount is Decimal128; sum stays Decimal128
  return [
    { $match: { [dateField]: { $gte: from, $lte: to }, paymentStatus: "paid" } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: `$${dateField}` } },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];
}

// Atlas-tier-safe replacement for $function grouping
function statusGroupExpr() {
  return {
    $switch: {
      branches: [
        { case: { $eq: ["$status", "pending"] }, then: "pending" },
        { case: { $eq: ["$status", "confirmed"] }, then: "confirmed" },
        { case: { $eq: ["$status", "checked_out"] }, then: "checked_out" },
      ],
      default: "other", // returned/cancelled/no_show/etc.
    },
  };
}

// Ensure >= 4 slices with stable keys, even when some are missing from agg output
function normalizePie4(aggRows) {
  const base = { pending: 0, confirmed: 0, checked_out: 0, other: 0 };

  for (const r of aggRows || []) {
    const key = r?._id;
    const value = r?.value ?? 0;
    if (Object.prototype.hasOwnProperty.call(base, key)) {
      base[key] = value;
    } else {
      base.other += value;
    }
  }

  return Object.entries(base).map(([label, value]) => ({ label, value }));
}

// ---------- service ----------
async function getAdminDashboard(query = {}) {
  const { from, to } = parseDateRange(query);

  // KPIs (global)
  const [
    totalBranches,
    totalVehicles,
    activeFleet,
    totalReservations,
    activeReservations,
    openIncidents,
    openServiceOrders,
    dueServiceSchedules,
    totalDriversBookingsCount,
  ] = await Promise.all([
    Branch.countDocuments({ active: true }),
    Vehicle.countDocuments({}),
    Vehicle.countDocuments({ status: "active" }),
    Reservation.countDocuments({ created_at: { $gte: from, $lte: to } }),
    Reservation.countDocuments({ status: { $in: ["pending", "confirmed", "checked_out"] } }),
    VehicleIncident.countDocuments({ status: { $in: ["open", "under_review"] } }),
    ServiceOrder.countDocuments({ status: { $in: ["open", "in_progress"] } }),
    ServiceSchedule.countDocuments({
      next_due_at: { $ne: null, $lte: to },
    }),
    // driver bookings model might be in your project; if it is, uncomment and use it
    // DriverBooking.countDocuments({ created_at: { $gte: from, $lte: to } }),
    Promise.resolve(null),
  ]);

  // Pie: reservations by status (NO $function)
  const reservationsByStatusAgg = await Reservation.aggregate([
    { $match: { created_at: { $gte: from, $lte: to } } },
    { $project: { status_group: statusGroupExpr() } },
    { $group: { _id: "$status_group", value: { $sum: 1 } } },
  ]);

  // Lines: reservations per day (use created_at), revenue per day (use boughtAt)
  const [reservationsPerDayAgg, revenuePerDayAgg] = await Promise.all([
    Reservation.aggregate(dayBucketsPipeline("created_at", from, to)),
    Payment.aggregate(moneySumPipeline("boughtAt", from, to)),
  ]);

  // Bar #1: revenue by branch (top 10) from payments linked to reservations -> reservation.pickup.branch_id
  // We only count reservation payments here (reservation_id not null)
  const revenueByBranchAgg = await Payment.aggregate([
    {
      $match: {
        boughtAt: { $gte: from, $lte: to },
        paymentStatus: "paid",
        reservation_id: { $ne: null },
      },
    },
    {
      $lookup: {
        from: "reservations",
        localField: "reservation_id",
        foreignField: "_id",
        as: "reservation",
      },
    },
    { $unwind: "$reservation" },
    {
      $group: {
        _id: "$reservation.pickup.branch_id",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "branches",
        localField: "_id",
        foreignField: "_id",
        as: "branch",
      },
    },
    { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        branch_id: "$_id",
        label: { $ifNull: ["$branch.name", "Unknown Branch"] },
        total: 1,
        count: 1,
      },
    },
    { $sort: { total: -1 } },
    { $limit: 10 },
  ]);

  // Bar #2: vehicles by class (via vehicle_model.class)
  const vehiclesByClassAgg = await Vehicle.aggregate([
    {
      $lookup: {
        from: "vehicle_models",
        localField: "vehicle_model_id",
        foreignField: "_id",
        as: "vm",
      },
    },
    { $unwind: "$vm" },
    { $group: { _id: "$vm.class", value: { $sum: 1 } } },
    { $sort: { value: -1 } },
    { $project: { _id: 0, label: "$_id", value: 1 } },
  ]);

  // Optional extra KPI: total revenue paid in range
  const totalRevenueAgg = await Payment.aggregate([
    { $match: { boughtAt: { $gte: from, $lte: to }, paymentStatus: "paid" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const totalRevenue = totalRevenueAgg?.[0]?.total ?? null;

  return {
    range: { from, to },
    kpis: {
      total_branches: totalBranches,
      total_vehicles: totalVehicles,
      active_fleet: activeFleet,
      reservations_in_range: totalReservations,
      active_reservations_now: activeReservations,
      open_or_review_incidents: openIncidents,
      open_or_in_progress_services: openServiceOrders,
      due_service_schedules_by_date: dueServiceSchedules,
      driver_bookings_in_range: totalDriversBookingsCount, // null if not wired
      total_revenue_paid_in_range: totalRevenue, // Decimal128
    },
    charts: {
      pie: {
        reservations_by_status: normalizePie4(reservationsByStatusAgg),
      },
      lines: {
        reservations_per_day: reservationsPerDayAgg.map((x) => ({
          date: x._id,
          value: x.count,
        })),
        revenue_per_day: revenuePerDayAgg.map((x) => ({
          date: x._id,
          value: x.total, // Decimal128
          count: x.count,
        })),
      },
      bars: {
        revenue_by_branch: revenueByBranchAgg.map((x) => ({
          label: x.label,
          value: x.total, // Decimal128
          count: x.count,
          branch_id: x.branch_id,
        })),
        vehicles_by_class: vehiclesByClassAgg,
      },
    },
  };
}

async function getManagerDashboard(managerUserId, query = {}) {
  const { from, to } = parseDateRange(query);

  const mgrProfile = await ManagerProfile.findOne({
    user: toObjectId(managerUserId),
    role: "manager",
  }).select("branch_ids");

  if (!mgrProfile || !Array.isArray(mgrProfile.branch_ids) || mgrProfile.branch_ids.length === 0) {
    const err = new Error("Manager has no branch scope (branch_ids).");
    err.statusCode = 403;
    throw err;
  }

  const branchIds = mgrProfile.branch_ids.map(toObjectId);

  // KPIs (scoped)
  const [
    branchesCount,
    vehiclesCount,
    activeFleet,
    reservationsInRange,
    activeReservationsNow,
    openIncidents,
    openServiceOrders,
    dueServiceSchedules,
  ] = await Promise.all([
    Branch.countDocuments({ _id: { $in: branchIds }, active: true }),
    Vehicle.countDocuments({ branch_id: { $in: branchIds } }),
    Vehicle.countDocuments({ branch_id: { $in: branchIds }, status: "active" }),
    Reservation.countDocuments({
      created_at: { $gte: from, $lte: to },
      "pickup.branch_id": { $in: branchIds },
    }),
    Reservation.countDocuments({
      status: { $in: ["pending", "confirmed", "checked_out"] },
      "pickup.branch_id": { $in: branchIds },
    }),
    VehicleIncident.countDocuments({
      status: { $in: ["open", "under_review"] },
      branch_id: { $in: branchIds },
    }),
    ServiceOrder.countDocuments({
      status: { $in: ["open", "in_progress"] },
      // service order ties to vehicle_id; scope via vehicle lookup below would be more accurate
    }),
    ServiceSchedule.countDocuments({
      next_due_at: { $ne: null, $lte: to },
      // schedule not branch-specific; scope would require vehicle join if you bind schedule->vehicle
    }),
  ]);

  // Pie: reservations by status (scoped) - NO $function
  const reservationsByStatusAgg = await Reservation.aggregate([
    {
      $match: {
        created_at: { $gte: from, $lte: to },
        "pickup.branch_id": { $in: branchIds },
      },
    },
    { $project: { status_group: statusGroupExpr() } },
    { $group: { _id: "$status_group", value: { $sum: 1 } } },
  ]);

  // Lines (scoped):
  const [reservationsPerDayAgg, revenuePerDayAgg] = await Promise.all([
    Reservation.aggregate([
      {
        $match: {
          created_at: { $gte: from, $lte: to },
          "pickup.branch_id": { $in: branchIds },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // revenue scoped via reservations -> payments
    Payment.aggregate([
      {
        $match: {
          boughtAt: { $gte: from, $lte: to },
          paymentStatus: "paid",
          reservation_id: { $ne: null },
        },
      },
      {
        $lookup: {
          from: "reservations",
          localField: "reservation_id",
          foreignField: "_id",
          as: "reservation",
        },
      },
      { $unwind: "$reservation" },
      { $match: { "reservation.pickup.branch_id": { $in: branchIds } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$boughtAt" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  // Bar #1 (scoped): revenue by branch (within manager branches)
  const revenueByBranchAgg = await Payment.aggregate([
    {
      $match: {
        boughtAt: { $gte: from, $lte: to },
        paymentStatus: "paid",
        reservation_id: { $ne: null },
      },
    },
    {
      $lookup: {
        from: "reservations",
        localField: "reservation_id",
        foreignField: "_id",
        as: "reservation",
      },
    },
    { $unwind: "$reservation" },
    { $match: { "reservation.pickup.branch_id": { $in: branchIds } } },
    {
      $group: {
        _id: "$reservation.pickup.branch_id",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "branches",
        localField: "_id",
        foreignField: "_id",
        as: "branch",
      },
    },
    { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        branch_id: "$_id",
        label: { $ifNull: ["$branch.name", "Unknown Branch"] },
        total: 1,
        count: 1,
      },
    },
    { $sort: { total: -1 } },
  ]);

  // Bar #2 (scoped): vehicles by class (vehicles in manager branches)
  const vehiclesByClassAgg = await Vehicle.aggregate([
    { $match: { branch_id: { $in: branchIds } } },
    {
      $lookup: {
        from: "vehicle_models",
        localField: "vehicle_model_id",
        foreignField: "_id",
        as: "vm",
      },
    },
    { $unwind: "$vm" },
    { $group: { _id: "$vm.class", value: { $sum: 1 } } },
    { $sort: { value: -1 } },
    { $project: { _id: 0, label: "$_id", value: 1 } },
  ]);

  const totalRevenueAgg = await Payment.aggregate([
    {
      $match: {
        boughtAt: { $gte: from, $lte: to },
        paymentStatus: "paid",
        reservation_id: { $ne: null },
      },
    },
    {
      $lookup: {
        from: "reservations",
        localField: "reservation_id",
        foreignField: "_id",
        as: "reservation",
      },
    },
    { $unwind: "$reservation" },
    { $match: { "reservation.pickup.branch_id": { $in: branchIds } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const totalRevenue = totalRevenueAgg?.[0]?.total ?? null;

  return {
    range: { from, to },
    scope: { branch_ids: branchIds },
    kpis: {
      branches_in_scope: branchesCount,
      total_vehicles_in_scope: vehiclesCount,
      active_fleet_in_scope: activeFleet,
      reservations_in_range: reservationsInRange,
      active_reservations_now: activeReservationsNow,
      open_or_review_incidents: openIncidents,
      open_or_in_progress_services: openServiceOrders,
      due_service_schedules_by_date: dueServiceSchedules,
      total_revenue_paid_in_range: totalRevenue,
    },
    charts: {
      pie: {
        reservations_by_status: normalizePie4(reservationsByStatusAgg),
      },
      lines: {
        reservations_per_day: reservationsPerDayAgg.map((x) => ({
          date: x._id,
          value: x.count,
        })),
        revenue_per_day: revenuePerDayAgg.map((x) => ({
          date: x._id,
          value: x.total,
          count: x.count,
        })),
      },
      bars: {
        revenue_by_branch: revenueByBranchAgg.map((x) => ({
          label: x.label,
          value: x.total,
          count: x.count,
          branch_id: x.branch_id,
        })),
        vehicles_by_class: vehiclesByClassAgg,
      },
    },
  };
}

module.exports = {
  getAdminDashboard,
  getManagerDashboard,
};
