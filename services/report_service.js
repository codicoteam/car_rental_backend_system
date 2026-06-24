// services/report_service.js
const mongoose = require("mongoose");

const Reservation = require("../models/reservations_model");
const Payment = require("../models/payment_model");
const Branch = require("../models/branch_models");
const Vehicle = require("../models/vehicle_unit_model");
const VehicleIncident = require("../models/vehicle_incident_model");
const ServiceOrder = require("../models/service_order_model");
const ServiceSchedule = require("../models/service_schedule_model");

const { ManagerProfile } = require("../models/profile_models");

// ---------- helpers ----------
function toObjectId(id) {
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    const err = new Error("Invalid ObjectId");
    err.statusCode = 400;
    throw err;
  }
}

function parseDateRange(query) {
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

function parsePaging(query) {
  const page = Math.max(parseInt(query?.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query?.limit || "25", 10), 1), 200);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function parseReportType(query) {
  const type = String(query?.type || "reservations").toLowerCase();
  const allowed = ["reservations", "payments", "incidents", "fleet", "services"];
  if (!allowed.includes(type)) {
    const err = new Error(`Invalid report type. Use one of: ${allowed.join(", ")}`);
    err.statusCode = 400;
    throw err;
  }
  return type;
}

function parseOptionalBranchId(query) {
  if (!query?.branch_id) return null;
  return toObjectId(query.branch_id);
}

// ---------- report builders ----------
async function buildReservationsReport({ from, to, branchIds, paging }) {
  const match = { created_at: { $gte: from, $lte: to } };
  if (branchIds?.length) match["pickup.branch_id"] = { $in: branchIds };

  const [rows, total] = await Promise.all([
    Reservation.find(match)
      .sort({ created_at: -1 })
      .skip(paging.skip)
      .limit(paging.limit)
      .select("code status created_at pickup dropoff pricing.currency pricing.grand_total user_id vehicle_id vehicle_model_id")
      .lean(),
    Reservation.countDocuments(match),
  ]);

  const summaryByStatus = await Reservation.aggregate([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return {
    type: "reservations",
    columns: [
      "code",
      "status",
      "created_at",
      "pickup.branch_id",
      "pickup.at",
      "dropoff.branch_id",
      "dropoff.at",
      "pricing.currency",
      "pricing.grand_total",
    ],
    rows,
    summary: {
      by_status: summaryByStatus.map((x) => ({ status: x._id, count: x.count })),
      total_rows: total,
    },
    paging: {
      page: paging.page,
      limit: paging.limit,
      total,
      total_pages: Math.ceil(total / paging.limit),
    },
  };
}

async function buildPaymentsReport({ from, to, branchIds, paging }) {
  // scope payments to reservation branch via lookup
  const pipeline = [
    {
      $match: {
        boughtAt: { $gte: from, $lte: to },
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
    { $unwind: { path: "$reservation", preserveNullAndEmptyArrays: false } },
  ];

  if (branchIds?.length) {
    pipeline.push({ $match: { "reservation.pickup.branch_id": { $in: branchIds } } });
  }

  const countPipeline = [...pipeline, { $count: "total" }];

  const rowsPipeline = [
    ...pipeline,
    { $sort: { boughtAt: -1 } },
    { $skip: paging.skip },
    { $limit: paging.limit },
    {
      $project: {
        _id: 1,
        reservation_id: 1,
        reservation_code: "$reservation.code",
        branch_id: "$reservation.pickup.branch_id",
        user_id: 1,
        provider: 1,
        method: 1,
        currency: 1,
        amount: 1,
        paymentStatus: 1,
        boughtAt: 1,
      },
    },
  ];

  const [rows, countArr] = await Promise.all([
    Payment.aggregate(rowsPipeline),
    Payment.aggregate(countPipeline),
  ]);

  const total = countArr?.[0]?.total || 0;

  const summary = await Payment.aggregate([
    ...pipeline,
    {
      $group: {
        _id: "$paymentStatus",
        count: { $sum: 1 },
        total_amount: { $sum: "$amount" },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return {
    type: "payments",
    columns: [
      "_id",
      "reservation_code",
      "branch_id",
      "provider",
      "method",
      "currency",
      "amount",
      "paymentStatus",
      "boughtAt",
    ],
    rows,
    summary: {
      by_payment_status: summary.map((x) => ({
        status: x._id,
        count: x.count,
        total_amount: x.total_amount,
      })),
      total_rows: total,
    },
    paging: {
      page: paging.page,
      limit: paging.limit,
      total,
      total_pages: Math.ceil(total / paging.limit),
    },
  };
}

async function buildIncidentsReport({ from, to, branchIds, paging }) {
  const match = { occurred_at: { $gte: from, $lte: to } };
  if (branchIds?.length) match.branch_id = { $in: branchIds };

  const [rows, total] = await Promise.all([
    VehicleIncident.find(match)
      .sort({ occurred_at: -1 })
      .skip(paging.skip)
      .limit(paging.limit)
      .select("vehicle_id reservation_id branch_id type severity status occurred_at estimated_cost final_cost reported_by")
      .lean(),
    VehicleIncident.countDocuments(match),
  ]);

  const summaryByStatus = await VehicleIncident.aggregate([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return {
    type: "incidents",
    columns: [
      "vehicle_id",
      "reservation_id",
      "branch_id",
      "type",
      "severity",
      "status",
      "occurred_at",
      "estimated_cost",
      "final_cost",
    ],
    rows,
    summary: {
      by_status: summaryByStatus.map((x) => ({ status: x._id, count: x.count })),
      total_rows: total,
    },
    paging: {
      page: paging.page,
      limit: paging.limit,
      total,
      total_pages: Math.ceil(total / paging.limit),
    },
  };
}

async function buildFleetReport({ branchIds, paging }) {
  const match = {};
  if (branchIds?.length) match.branch_id = { $in: branchIds };

  const [rows, total] = await Promise.all([
    Vehicle.find(match)
      .sort({ created_at: -1 })
      .skip(paging.skip)
      .limit(paging.limit)
      .select("plate_number branch_id status availability_state odometer_km created_at")
      .lean(),
    Vehicle.countDocuments(match),
  ]);

  const summaryByStatus = await Vehicle.aggregate([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const summaryByAvailability = await Vehicle.aggregate([
    { $match: match },
    { $group: { _id: "$availability_state", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return {
    type: "fleet",
    columns: ["plate_number", "branch_id", "status", "availability_state", "odometer_km", "created_at"],
    rows,
    summary: {
      by_status: summaryByStatus.map((x) => ({ status: x._id, count: x.count })),
      by_availability: summaryByAvailability.map((x) => ({ state: x._id, count: x.count })),
      total_rows: total,
    },
    paging: {
      page: paging.page,
      limit: paging.limit,
      total,
      total_pages: Math.ceil(total / paging.limit),
    },
  };
}

async function buildServicesReport({ from, to, branchIds, paging }) {
  // ServiceOrder has vehicle_id but not branch_id; to scope to branch we join vehicles
  const pipeline = [
    {
      $match: {
        created_at: { $gte: from, $lte: to },
      },
    },
    {
      $lookup: {
        from: "vehicles",
        localField: "vehicle_id",
        foreignField: "_id",
        as: "vehicle",
      },
    },
    { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } },
  ];

  if (branchIds?.length) {
    pipeline.push({ $match: { "vehicle.branch_id": { $in: branchIds } } });
  }

  const countPipeline = [...pipeline, { $count: "total" }];

  const rowsPipeline = [
    ...pipeline,
    { $sort: { created_at: -1 } },
    { $skip: paging.skip },
    { $limit: paging.limit },
    {
      $project: {
        _id: 1,
        vehicle_id: 1,
        branch_id: "$vehicle.branch_id",
        type: 1,
        status: 1,
        odometer_km: 1,
        cost: 1,
        notes: 1,
        created_by: 1,
        performed_by: 1,
        created_at: 1,
      },
    },
  ];

  const [rows, countArr] = await Promise.all([
    ServiceOrder.aggregate(rowsPipeline),
    ServiceOrder.aggregate(countPipeline),
  ]);

  const total = countArr?.[0]?.total || 0;

  const summaryByStatus = await ServiceOrder.aggregate([
    ...pipeline,
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return {
    type: "services",
    columns: ["_id", "vehicle_id", "branch_id", "type", "status", "odometer_km", "cost", "created_at"],
    rows,
    summary: {
      by_status: summaryByStatus.map((x) => ({ status: x._id, count: x.count })),
      total_rows: total,
    },
    paging: {
      page: paging.page,
      limit: paging.limit,
      total,
      total_pages: Math.ceil(total / paging.limit),
    },
  };
}

// ---------- public service API ----------
async function getAdminReport(query = {}) {
  const { from, to } = parseDateRange(query);
  const paging = parsePaging(query);
  const type = parseReportType(query);

  const branchId = parseOptionalBranchId(query);
  const branchIds = branchId ? [branchId] : null;

  if (type === "reservations") return buildReservationsReport({ from, to, branchIds, paging });
  if (type === "payments") return buildPaymentsReport({ from, to, branchIds, paging });
  if (type === "incidents") return buildIncidentsReport({ from, to, branchIds, paging });
  if (type === "fleet") return buildFleetReport({ branchIds, paging });
  if (type === "services") return buildServicesReport({ from, to, branchIds, paging });

  const err = new Error("Unsupported report type");
  err.statusCode = 400;
  throw err;
}

async function getManagerReport(managerUserId, query = {}) {
  const { from, to } = parseDateRange(query);
  const paging = parsePaging(query);
  const type = parseReportType(query);

  const mgrProfile = await ManagerProfile.findOne({
    user: toObjectId(managerUserId),
    role: "manager",
  }).select("branch_ids");

  if (!mgrProfile || !Array.isArray(mgrProfile.branch_ids) || mgrProfile.branch_ids.length === 0) {
    const err = new Error("Manager has no branch scope (branch_ids).");
    err.statusCode = 403;
    throw err;
  }

  let branchIds = mgrProfile.branch_ids.map(toObjectId);

  const requestedBranchId = parseOptionalBranchId(query);
  if (requestedBranchId) {
    const ok = branchIds.some((b) => String(b) === String(requestedBranchId));
    if (!ok) {
      const err = new Error("Requested branch_id is outside your scope.");
      err.statusCode = 403;
      throw err;
    }
    branchIds = [requestedBranchId];
  }

  if (type === "reservations") return buildReservationsReport({ from, to, branchIds, paging });
  if (type === "payments") return buildPaymentsReport({ from, to, branchIds, paging });
  if (type === "incidents") return buildIncidentsReport({ from, to, branchIds, paging });
  if (type === "fleet") return buildFleetReport({ branchIds, paging });
  if (type === "services") return buildServicesReport({ from, to, branchIds, paging });

  const err = new Error("Unsupported report type");
  err.statusCode = 400;
  throw err;
}

// ---------- chart / financial helpers ----------
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function monthLabel(year, month) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function safeDouble(field) {
  return { $convert: { input: field, to: "double", onError: 0, onNull: 0 } };
}

async function chartMonthlyRevenue(from, to, branchIds) {
  const pipeline = [
    {
      $match: {
        boughtAt: { $gte: from, $lte: to },
        paymentStatus: "paid",
        reservation_id: { $ne: null },
      },
    },
  ];

  if (branchIds?.length) {
    pipeline.push(
      { $lookup: { from: "reservations", localField: "reservation_id", foreignField: "_id", as: "_res" } },
      { $unwind: { path: "$_res", preserveNullAndEmptyArrays: false } },
      { $match: { "_res.pickup.branch_id": { $in: branchIds } } }
    );
  }

  pipeline.push(
    {
      $group: {
        _id: { year: { $year: "$boughtAt" }, month: { $month: "$boughtAt" } },
        revenue: { $sum: safeDouble("$amount") },
        transactions: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  );

  const rows = await Payment.aggregate(pipeline);
  return rows.map((r) => ({
    month: monthLabel(r._id.year, r._id.month),
    revenue: Math.round((r.revenue || 0) * 100) / 100,
    transactions: r.transactions,
  }));
}

async function chartBookingStatusDist(from, to, branchIds) {
  const match = { created_at: { $gte: from, $lte: to } };
  if (branchIds?.length) match["pickup.branch_id"] = { $in: branchIds };

  const rows = await Reservation.aggregate([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const total = rows.reduce((s, r) => s + r.count, 0);
  return rows.map((r) => ({
    status: r._id || "unknown",
    count: r.count,
    percentage: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0,
  }));
}

async function chartFleetUtilization(branchIds) {
  const match = {};
  if (branchIds?.length) match.branch_id = { $in: branchIds };

  const rows = await Vehicle.aggregate([
    { $match: match },
    { $group: { _id: "$availability_state", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const total = rows.reduce((s, r) => s + r.count, 0);
  return rows.map((r) => ({
    state: r._id || "unknown",
    count: r.count,
    percentage: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0,
  }));
}

async function chartRevenueByBranch(from, to) {
  const rows = await Payment.aggregate([
    {
      $match: {
        boughtAt: { $gte: from, $lte: to },
        paymentStatus: "paid",
        reservation_id: { $ne: null },
      },
    },
    { $lookup: { from: "reservations", localField: "reservation_id", foreignField: "_id", as: "_res" } },
    { $unwind: { path: "$_res", preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: "$_res.pickup.branch_id",
        revenue: { $sum: safeDouble("$amount") },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
  ]);

  const branchIds = rows.map((r) => r._id).filter(Boolean);
  const branches = branchIds.length
    ? await Branch.find({ _id: { $in: branchIds } }).select("name").lean()
    : [];

  const branchMap = {};
  for (const b of branches) branchMap[String(b._id)] = b.name;

  return rows.map((r) => ({
    branch: branchMap[String(r._id)] || `Branch-${String(r._id).slice(-4)}`,
    branch_id: r._id,
    revenue: Math.round((r.revenue || 0) * 100) / 100,
    bookings: r.bookings,
  }));
}

async function chartPaymentMethodSplit(from, to, branchIds) {
  const pipeline = [
    {
      $match: {
        boughtAt: { $gte: from, $lte: to },
        paymentStatus: "paid",
        reservation_id: { $ne: null },
      },
    },
  ];

  if (branchIds?.length) {
    pipeline.push(
      { $lookup: { from: "reservations", localField: "reservation_id", foreignField: "_id", as: "_res" } },
      { $unwind: { path: "$_res", preserveNullAndEmptyArrays: false } },
      { $match: { "_res.pickup.branch_id": { $in: branchIds } } }
    );
  }

  pipeline.push(
    {
      $group: {
        _id: "$method",
        count: { $sum: 1 },
        total: { $sum: safeDouble("$amount") },
      },
    },
    { $sort: { total: -1 } }
  );

  const rows = await Payment.aggregate(pipeline);
  const totalAmount = rows.reduce((s, r) => s + (r.total || 0), 0);

  return rows.map((r) => ({
    method: r._id || "unknown",
    label: r._id ? r._id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Unknown",
    count: r.count,
    total: Math.round((r.total || 0) * 100) / 100,
    percentage: totalAmount > 0 ? Math.round((r.total / totalAmount) * 1000) / 10 : 0,
  }));
}

async function chartMonthlyBookings(from, to, branchIds) {
  const match = { created_at: { $gte: from, $lte: to } };
  if (branchIds?.length) match["pickup.branch_id"] = { $in: branchIds };

  const rows = await Reservation.aggregate([
    { $match: match },
    {
      $group: {
        _id: { year: { $year: "$created_at" }, month: { $month: "$created_at" } },
        created: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  return rows.map((r) => ({
    month: monthLabel(r._id.year, r._id.month),
    created: r.created,
    completed: r.completed,
    cancelled: r.cancelled,
  }));
}

async function chartIncidentCostsByType(from, to, branchIds) {
  const match = { occurred_at: { $gte: from, $lte: to } };
  if (branchIds?.length) match.branch_id = { $in: branchIds };

  const rows = await VehicleIncident.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        estimated_cost: { $sum: safeDouble("$estimated_cost") },
        final_cost: { $sum: safeDouble("$final_cost") },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return rows.map((r) => ({
    type: r._id || "other",
    label: (r._id || "other").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    count: r.count,
    estimated_cost: Math.round((r.estimated_cost || 0) * 100) / 100,
    final_cost: Math.round((r.final_cost || 0) * 100) / 100,
  }));
}

// ---------- public chart + financial endpoints ----------

async function getAdminChartsData(query = {}) {
  const now = new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const to = query.to ? new Date(query.to) : now;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    const err = new Error("Invalid from/to date.");
    err.statusCode = 400;
    throw err;
  }

  const branchId = parseOptionalBranchId(query);
  const branchIds = branchId ? [branchId] : null;

  const [
    monthly_revenue,
    booking_status_dist,
    fleet_utilization,
    revenue_by_branch,
    payment_method_split,
    monthly_bookings,
    incident_costs_by_type,
  ] = await Promise.all([
    chartMonthlyRevenue(from, to, branchIds),
    chartBookingStatusDist(from, to, branchIds),
    chartFleetUtilization(branchIds),
    chartRevenueByBranch(from, to),
    chartPaymentMethodSplit(from, to, branchIds),
    chartMonthlyBookings(from, to, branchIds),
    chartIncidentCostsByType(from, to, branchIds),
  ]);

  const branchMatch = branchIds?.length ? { "pickup.branch_id": { $in: branchIds } } : {};
  const incidentBranchMatch = branchIds?.length ? { branch_id: { $in: branchIds } } : {};

  const [active_reservations, pending_incidents] = await Promise.all([
    Reservation.countDocuments({ status: "active", ...branchMatch }),
    VehicleIncident.countDocuments({ status: { $in: ["open", "under_review"] }, ...incidentBranchMatch }),
  ]);

  const total_revenue = monthly_revenue.reduce((s, m) => s + m.revenue, 0);
  const total_transactions = monthly_revenue.reduce((s, m) => s + m.transactions, 0);
  const total_bookings = monthly_bookings.reduce((s, m) => s + m.created, 0);
  const completed_bookings = monthly_bookings.reduce((s, m) => s + m.completed, 0);
  const fleet_rented = fleet_utilization.find((f) => f.state === "rented")?.count || 0;
  const fleet_total = fleet_utilization.reduce((s, f) => s + f.count, 0);

  const kpis = {
    total_revenue: Math.round(total_revenue * 100) / 100,
    total_transactions,
    total_bookings,
    completed_bookings,
    avg_booking_value:
      total_transactions > 0 ? Math.round((total_revenue / total_transactions) * 100) / 100 : 0,
    fleet_utilization_pct:
      fleet_total > 0 ? Math.round((fleet_rented / fleet_total) * 1000) / 10 : 0,
    fleet_rented,
    fleet_total,
    active_reservations,
    pending_incidents,
  };

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    kpis,
    monthly_revenue,
    booking_status_dist,
    fleet_utilization,
    revenue_by_branch,
    payment_method_split,
    monthly_bookings,
    incident_costs_by_type,
  };
}

async function getAdminFinancialData(query = {}) {
  const now = new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const to = query.to ? new Date(query.to) : now;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    const err = new Error("Invalid from/to date.");
    err.statusCode = 400;
    throw err;
  }

  const branchId = parseOptionalBranchId(query);
  const branchIds = branchId ? [branchId] : null;

  const [revenueRows, serviceCostRows, incidentCostRows] = await Promise.all([
    chartMonthlyRevenue(from, to, branchIds),
    ServiceOrder.aggregate([
      { $match: { created_at: { $gte: from, $lte: to }, status: "completed" } },
      {
        $group: {
          _id: { year: { $year: "$created_at" }, month: { $month: "$created_at" } },
          cost: { $sum: { $ifNull: ["$cost", 0] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    VehicleIncident.aggregate([
      {
        $match: {
          occurred_at: { $gte: from, $lte: to },
          ...(branchIds?.length ? { branch_id: { $in: branchIds } } : {}),
        },
      },
      {
        $group: {
          _id: { year: { $year: "$occurred_at" }, month: { $month: "$occurred_at" } },
          estimated: { $sum: safeDouble("$estimated_cost") },
          final: { $sum: safeDouble("$final_cost") },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
  ]);

  const revenueMap = {};
  for (const r of revenueRows) revenueMap[r.month] = r;

  const serviceCostMap = {};
  for (const r of serviceCostRows) serviceCostMap[monthLabel(r._id.year, r._id.month)] = r.cost;

  const incidentMap = {};
  for (const r of incidentCostRows)
    incidentMap[monthLabel(r._id.year, r._id.month)] = r.final || r.estimated || 0;

  const allMonths = Array.from(
    new Set([
      ...Object.keys(revenueMap),
      ...Object.keys(serviceCostMap),
      ...Object.keys(incidentMap),
    ])
  ).sort((a, b) => new Date("01 " + a) - new Date("01 " + b));

  const monthly_pl = allMonths.map((month) => {
    const revenue = revenueMap[month]?.revenue || 0;
    const service_cost = serviceCostMap[month] || 0;
    const incident_cost = incidentMap[month] || 0;
    const total_cost = service_cost + incident_cost;
    const gross_profit = revenue - total_cost;
    return {
      month,
      revenue: Math.round(revenue * 100) / 100,
      service_cost: Math.round(service_cost * 100) / 100,
      incident_cost: Math.round(incident_cost * 100) / 100,
      total_cost: Math.round(total_cost * 100) / 100,
      gross_profit: Math.round(gross_profit * 100) / 100,
      transactions: revenueMap[month]?.transactions || 0,
    };
  });

  const totals = monthly_pl.reduce(
    (acc, m) => ({
      revenue: acc.revenue + m.revenue,
      service_cost: acc.service_cost + m.service_cost,
      incident_cost: acc.incident_cost + m.incident_cost,
      total_cost: acc.total_cost + m.total_cost,
      gross_profit: acc.gross_profit + m.gross_profit,
      transactions: acc.transactions + m.transactions,
    }),
    { revenue: 0, service_cost: 0, incident_cost: 0, total_cost: 0, gross_profit: 0, transactions: 0 }
  );

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    monthly_pl,
    totals: {
      revenue: Math.round(totals.revenue * 100) / 100,
      service_cost: Math.round(totals.service_cost * 100) / 100,
      incident_cost: Math.round(totals.incident_cost * 100) / 100,
      total_cost: Math.round(totals.total_cost * 100) / 100,
      gross_profit: Math.round(totals.gross_profit * 100) / 100,
      transactions: totals.transactions,
      gross_margin_pct:
        totals.revenue > 0
          ? Math.round((totals.gross_profit / totals.revenue) * 1000) / 10
          : 0,
    },
  };
}

module.exports = {
  getAdminReport,
  getManagerReport,
  getAdminChartsData,
  getAdminFinancialData,
};
