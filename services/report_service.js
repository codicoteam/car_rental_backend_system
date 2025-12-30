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

module.exports = {
  getAdminReport,
  getManagerReport,
};
