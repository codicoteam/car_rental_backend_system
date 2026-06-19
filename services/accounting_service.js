const mongoose = require("mongoose");
const Payment = require("../models/payment_model");
const Reservation = require("../models/reservations_model");
const DriverBooking = require("../models/driver_booking_model");
const Expense = require("../models/expense_model");
const ServiceOrder = require("../models/service_order_model");
const VehicleIncident = require("../models/vehicle_incident_model");
const AuditLog = require("../models/audit_log_model");
const { ManagerProfile } = require("../models/profile_models");
const Branch = require("../models/branch_models");
const Vehicle = require("../models/vehicle_unit_model");
const FixedAsset = require("../models/fixed_asset_model");
const BalanceEntry = require("../models/balance_entry_model");

const COS_CATEGORIES = [
  "fuel",
  "maintenance",
  "cleaning",
  "tyres_parts",
  "licensing",
  "parking",
];

const OPEX_CATEGORIES = [
  "salaries",
  "rent",
  "utilities",
  "insurance",
  "marketing",
  "office_supplies",
  "bank_charges",
  "security",
  "it_software",
  "travel",
  "meals",
  "fines",
  "other",
];

const CATEGORY_LABELS = {
  fuel: "Fuel & Oil",
  maintenance: "Vehicle Maintenance",
  cleaning: "Vehicle Cleaning",
  tyres_parts: "Tyres & Spare Parts",
  licensing: "Licensing & Registration",
  parking: "Parking Fees",
  salaries: "Staff Salaries",
  rent: "Branch Rent",
  utilities: "Utilities",
  insurance: "Insurance",
  marketing: "Marketing",
  office_supplies: "Office Supplies",
  bank_charges: "Bank Charges",
  security: "Security Services",
  it_software: "IT & Software",
  travel: "Travel & Accommodation",
  meals: "Meals & Entertainment",
  fines: "Traffic Fines",
  other: "Other Expenses",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function d128(val) {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  try {
    return parseFloat(val.toString()) || 0;
  } catch {
    return 0;
  }
}

function toObjectId(id) {
  return new mongoose.Types.ObjectId(String(id));
}

function parseDateRange(query) {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = query.from ? new Date(query.from) : defaultFrom;
  const to = query.to ? new Date(query.to) : now;
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function parseCompareDates(query) {
  if (!query.compare_from || !query.compare_to) return null;
  const compareTo = new Date(query.compare_to);
  compareTo.setHours(23, 59, 59, 999);
  return {
    compareFrom: new Date(query.compare_from),
    compareTo,
  };
}

function parsePaging(query) {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "50", 10), 1), 200);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// ── Branch Scope Resolution ───────────────────────────────────────────────────

async function resolveBranchScope(user, query) {
  const roles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);

  if (roles.includes("admin") || roles.includes("executive_admin")) {
    return query.branch_id ? [toObjectId(query.branch_id)] : null;
  }

  if (roles.includes("manager") || roles.includes("branch_receptionist")) {
    // Try to find a ManagerProfile for this user
    let profile = await ManagerProfile.findOne({ user: user._id }).select("branch_ids");

    if (!profile) {
      // If a branch_id was explicitly provided in the query, use it
      if (query.branch_id) {
        return [toObjectId(query.branch_id)];
      }
      return []; // no data
    }

    const scopeIds = (profile.branch_ids || []).map((id) => toObjectId(id));
    if (scopeIds.length === 0) {
      if (query.branch_id) return [toObjectId(query.branch_id)];
      return [];
    }

    if (query.branch_id) {
      const requested = toObjectId(query.branch_id);
      const inScope = scopeIds.some((id) => id.equals(requested));
      return inScope ? [requested] : [];
    }

    return scopeIds;
  }

  return null;
}

// ── Revenue Aggregation ───────────────────────────────────────────────────────

async function aggregateRevenue(branchIds, from, to) {
  // ── 1. Rental income ─────────────────────────────────────────────────────
  const rentalPipeline = [];

  if (branchIds) {
    // Join payments → reservations to filter by branch
    rentalPipeline.push({
      $match: {
        paymentStatus: "paid",
        reservation_id: { $ne: null },
        boughtAt: { $gte: from, $lte: to },
      },
    });
    rentalPipeline.push({
      $lookup: {
        from: "reservations",
        localField: "reservation_id",
        foreignField: "_id",
        as: "reservation",
      },
    });
    rentalPipeline.push({ $unwind: { path: "$reservation", preserveNullAndEmptyArrays: false } });
    rentalPipeline.push({
      $match: { "reservation.pickup.branch_id": { $in: branchIds } },
    });
  } else {
    rentalPipeline.push({
      $match: {
        paymentStatus: "paid",
        reservation_id: { $ne: null },
        boughtAt: { $gte: from, $lte: to },
      },
    });
  }

  rentalPipeline.push({
    $group: {
      _id: null,
      rental_income: { $sum: "$pricePaid" },
      promo_discounts: { $sum: { $ifNull: ["$promotionDiscount", 0] } },
      rental_count: { $sum: 1 },
    },
  });

  // Refunds from rental payments
  const refundPipeline = [
    {
      $match: {
        paymentStatus: "paid",
        reservation_id: { $ne: null },
        boughtAt: { $gte: from, $lte: to },
        "refunds.0": { $exists: true },
      },
    },
  ];

  if (branchIds) {
    refundPipeline.push({
      $lookup: {
        from: "reservations",
        localField: "reservation_id",
        foreignField: "_id",
        as: "reservation",
      },
    });
    refundPipeline.push({ $unwind: { path: "$reservation", preserveNullAndEmptyArrays: false } });
    refundPipeline.push({
      $match: { "reservation.pickup.branch_id": { $in: branchIds } },
    });
  }

  refundPipeline.push({ $unwind: "$refunds" });
  refundPipeline.push({
    $group: {
      _id: null,
      refunds: { $sum: { $toDouble: "$refunds.amount" } },
    },
  });

  // ── 2. Driver income ─────────────────────────────────────────────────────
  // Driver bookings have no branch_id; when branchIds is set we skip driver income
  const driverPipeline = [];
  if (!branchIds) {
    driverPipeline.push({
      $match: {
        paymentStatus: "paid",
        driver_booking_id: { $ne: null },
        boughtAt: { $gte: from, $lte: to },
      },
    });
    driverPipeline.push({
      $group: {
        _id: null,
        driver_income: { $sum: "$pricePaid" },
        driver_count: { $sum: 1 },
      },
    });
  }

  const [rentalResult, refundResult, driverResult] = await Promise.all([
    Payment.aggregate(rentalPipeline),
    Payment.aggregate(refundPipeline),
    driverPipeline.length ? Payment.aggregate(driverPipeline) : Promise.resolve([]),
  ]);

  const rental_income = rentalResult[0]?.rental_income || 0;
  const promo_discounts = rentalResult[0]?.promo_discounts || 0;
  const rental_count = rentalResult[0]?.rental_count || 0;
  const refunds = refundResult[0]?.refunds || 0;
  const driver_income = driverResult[0]?.driver_income || 0;
  const driver_count = driverResult[0]?.driver_count || 0;

  const gross_revenue = rental_income + driver_income;
  const net_revenue = gross_revenue - promo_discounts - refunds;

  return {
    rental_income,
    driver_income,
    gross_revenue,
    promo_discounts,
    refunds,
    net_revenue,
    rental_count,
    driver_count,
  };
}

// ── Expense Aggregation ───────────────────────────────────────────────────────

async function aggregateExpenses(branchIds, categories, from, to) {
  const match = {
    status: "approved",
    date: { $gte: from, $lte: to },
    category: { $in: categories },
  };
  if (branchIds) match.branch_id = { $in: branchIds };

  const result = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$category",
        total: { $sum: { $toDouble: "$amount" } },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        category: "$_id",
        label: {
          $switch: {
            branches: Object.entries(CATEGORY_LABELS).map(([k, v]) => ({
              case: { $eq: ["$_id", k] },
              then: v,
            })),
            default: "$_id",
          },
        },
        total: 1,
        count: 1,
      },
    },
    { $sort: { total: -1 } },
  ]);

  const total = result.reduce((s, r) => s + r.total, 0);
  return { total, by_category: result };
}

// ── Service Cost Aggregation ──────────────────────────────────────────────────

async function aggregateServiceCosts(branchIds, from, to) {
  const pipeline = [];

  pipeline.push({
    $match: {
      status: "completed",
      cost: { $gt: 0 },
      updated_at: { $gte: from, $lte: to },
    },
  });

  if (branchIds) {
    pipeline.push({
      $lookup: {
        from: "vehicles",
        localField: "vehicle_id",
        foreignField: "_id",
        as: "vehicle",
      },
    });
    pipeline.push({ $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: false } });
    pipeline.push({ $match: { "vehicle.branch_id": { $in: branchIds } } });
  }

  pipeline.push({
    $group: {
      _id: null,
      total: { $sum: "$cost" },
      count: { $sum: 1 },
    },
  });

  const result = await ServiceOrder.aggregate(pipeline);
  return { total: result[0]?.total || 0, count: result[0]?.count || 0 };
}

// ── Incident Cost Aggregation ─────────────────────────────────────────────────

async function aggregateIncidentCosts(branchIds, from, to) {
  const match = {
    status: { $in: ["resolved", "written_off"] },
    updated_at: { $gte: from, $lte: to },
    final_cost: { $ne: null },
  };
  if (branchIds) match.branch_id = { $in: branchIds };

  const result = await VehicleIncident.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        gross_cost: { $sum: { $toDouble: { $ifNull: ["$final_cost", 0] } } },
        customer_recovery: {
          $sum: {
            $toDouble: { $ifNull: ["$chargeable_to_customer_amount", 0] },
          },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const gross_cost = result[0]?.gross_cost || 0;
  const customer_recovery = result[0]?.customer_recovery || 0;

  return {
    gross_cost,
    customer_recovery,
    net_cost: gross_cost - customer_recovery,
    count: result[0]?.count || 0,
  };
}

// ── Trend Aggregations ────────────────────────────────────────────────────────

async function getRevenueTrend(branchIds, from, to) {
  const pipeline = [];

  if (branchIds) {
    pipeline.push({
      $match: {
        paymentStatus: "paid",
        reservation_id: { $ne: null },
        boughtAt: { $gte: from, $lte: to },
      },
    });
    pipeline.push({
      $lookup: {
        from: "reservations",
        localField: "reservation_id",
        foreignField: "_id",
        as: "reservation",
      },
    });
    pipeline.push({ $unwind: { path: "$reservation", preserveNullAndEmptyArrays: false } });
    pipeline.push({ $match: { "reservation.pickup.branch_id": { $in: branchIds } } });
  } else {
    pipeline.push({
      $match: {
        paymentStatus: "paid",
        boughtAt: { $gte: from, $lte: to },
      },
    });
  }

  pipeline.push({
    $group: {
      _id: {
        year: { $year: "$boughtAt" },
        month: { $month: "$boughtAt" },
        day: { $dayOfMonth: "$boughtAt" },
      },
      amount: { $sum: "$pricePaid" },
    },
  });

  pipeline.push({
    $project: {
      _id: 0,
      date: {
        $concat: [
          { $toString: "$_id.year" },
          "-",
          {
            $cond: [
              { $lt: ["$_id.month", 10] },
              { $concat: ["0", { $toString: "$_id.month" }] },
              { $toString: "$_id.month" },
            ],
          },
          "-",
          {
            $cond: [
              { $lt: ["$_id.day", 10] },
              { $concat: ["0", { $toString: "$_id.day" }] },
              { $toString: "$_id.day" },
            ],
          },
        ],
      },
      amount: 1,
    },
  });

  pipeline.push({ $sort: { date: 1 } });

  return Payment.aggregate(pipeline);
}

async function getExpenseTrend(branchIds, from, to) {
  const match = {
    status: "approved",
    date: { $gte: from, $lte: to },
    category: { $in: [...COS_CATEGORIES, ...OPEX_CATEGORIES] },
  };
  if (branchIds) match.branch_id = { $in: branchIds };

  return Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
          day: { $dayOfMonth: "$date" },
        },
        amount: { $sum: { $toDouble: "$amount" } },
      },
    },
    {
      $project: {
        _id: 0,
        date: {
          $concat: [
            { $toString: "$_id.year" },
            "-",
            {
              $cond: [
                { $lt: ["$_id.month", 10] },
                { $concat: ["0", { $toString: "$_id.month" }] },
                { $toString: "$_id.month" },
              ],
            },
            "-",
            {
              $cond: [
                { $lt: ["$_id.day", 10] },
                { $concat: ["0", { $toString: "$_id.day" }] },
                { $toString: "$_id.day" },
              ],
            },
          ],
        },
        amount: 1,
      },
    },
    { $sort: { date: 1 } },
  ]);
}

// ── Overview ──────────────────────────────────────────────────────────────────

async function getOverview(user, query) {
  const branchIds = await resolveBranchScope(user, query);
  const { from, to } = parseDateRange(query);
  const compareDates = parseCompareDates(query);

  const [revenue, cosExpenses, opexExpenses, serviceCosts, incidentCosts, revTrend, expTrend] =
    await Promise.all([
      aggregateRevenue(branchIds, from, to),
      aggregateExpenses(branchIds, COS_CATEGORIES, from, to),
      aggregateExpenses(branchIds, OPEX_CATEGORIES, from, to),
      aggregateServiceCosts(branchIds, from, to),
      aggregateIncidentCosts(branchIds, from, to),
      getRevenueTrend(branchIds, from, to),
      getExpenseTrend(branchIds, from, to),
    ]);

  const total_cos =
    cosExpenses.total +
    serviceCosts.total +
    incidentCosts.net_cost;
  const gross_profit = revenue.net_revenue - total_cos;
  const gross_margin_pct =
    revenue.net_revenue > 0 ? (gross_profit / revenue.net_revenue) * 100 : 0;
  const total_opex = opexExpenses.total;
  const net_profit = gross_profit - total_opex;
  const net_margin_pct =
    revenue.net_revenue > 0 ? (net_profit / revenue.net_revenue) * 100 : 0;

  let prior_kpis = null;
  if (compareDates) {
    const [pRevenue, pCos, pOpex, pService, pIncident] = await Promise.all([
      aggregateRevenue(branchIds, compareDates.compareFrom, compareDates.compareTo),
      aggregateExpenses(branchIds, COS_CATEGORIES, compareDates.compareFrom, compareDates.compareTo),
      aggregateExpenses(branchIds, OPEX_CATEGORIES, compareDates.compareFrom, compareDates.compareTo),
      aggregateServiceCosts(branchIds, compareDates.compareFrom, compareDates.compareTo),
      aggregateIncidentCosts(branchIds, compareDates.compareFrom, compareDates.compareTo),
    ]);

    const p_total_cos = pCos.total + pService.total + pIncident.net_cost;
    const p_gross_profit = pRevenue.net_revenue - p_total_cos;
    const p_gross_margin_pct =
      pRevenue.net_revenue > 0
        ? (p_gross_profit / pRevenue.net_revenue) * 100
        : 0;
    const p_total_opex = pOpex.total;
    const p_net_profit = p_gross_profit - p_total_opex;
    const p_net_margin_pct =
      pRevenue.net_revenue > 0 ? (p_net_profit / pRevenue.net_revenue) * 100 : 0;

    prior_kpis = {
      gross_revenue: pRevenue.gross_revenue,
      net_revenue: pRevenue.net_revenue,
      total_cos: p_total_cos,
      gross_profit: p_gross_profit,
      gross_margin_pct: p_gross_margin_pct,
      total_opex: p_total_opex,
      net_profit: p_net_profit,
      net_margin_pct: p_net_margin_pct,
    };
  }

  return {
    period: { from, to },
    kpis: {
      gross_revenue: revenue.gross_revenue,
      net_revenue: revenue.net_revenue,
      total_cos,
      gross_profit,
      gross_margin_pct,
      total_opex,
      net_profit,
      net_margin_pct,
    },
    prior_kpis,
    revenue_trend: revTrend,
    expense_trend: expTrend,
  };
}

// ── Trading Account ───────────────────────────────────────────────────────────

async function getTradingAccount(user, query) {
  const branchIds = await resolveBranchScope(user, query);
  const { from, to } = parseDateRange(query);
  const compareDates = parseCompareDates(query);

  const [revenue, cosExpenses, serviceCosts, incidentCosts] = await Promise.all([
    aggregateRevenue(branchIds, from, to),
    aggregateExpenses(branchIds, COS_CATEGORIES, from, to),
    aggregateServiceCosts(branchIds, from, to),
    aggregateIncidentCosts(branchIds, from, to),
  ]);

  const total_cos =
    cosExpenses.total + serviceCosts.total + incidentCosts.net_cost;
  const gross_profit = revenue.net_revenue - total_cos;
  const gross_margin_pct =
    revenue.net_revenue > 0 ? (gross_profit / revenue.net_revenue) * 100 : 0;

  let prior = null;
  if (compareDates) {
    const [pRevenue, pCos, pService, pIncident] = await Promise.all([
      aggregateRevenue(branchIds, compareDates.compareFrom, compareDates.compareTo),
      aggregateExpenses(branchIds, COS_CATEGORIES, compareDates.compareFrom, compareDates.compareTo),
      aggregateServiceCosts(branchIds, compareDates.compareFrom, compareDates.compareTo),
      aggregateIncidentCosts(branchIds, compareDates.compareFrom, compareDates.compareTo),
    ]);
    const p_total_cos = pCos.total + pService.total + pIncident.net_cost;
    const p_gross_profit = pRevenue.net_revenue - p_total_cos;
    const p_gross_margin_pct =
      pRevenue.net_revenue > 0 ? (p_gross_profit / pRevenue.net_revenue) * 100 : 0;

    prior = {
      revenue: pRevenue,
      cost_of_revenue: {
        by_category: pCos.by_category,
        service_orders: pService.total,
        service_orders_count: pService.count,
        incidents_gross: pIncident.gross_cost,
        incidents_recovery: pIncident.customer_recovery,
        incidents_net: pIncident.net_cost,
        total: p_total_cos,
      },
      gross_profit: p_gross_profit,
      gross_margin_pct: p_gross_margin_pct,
    };
  }

  return {
    period: { from, to },
    revenue,
    cost_of_revenue: {
      by_category: cosExpenses.by_category,
      service_orders: serviceCosts.total,
      service_orders_count: serviceCosts.count,
      incidents_gross: incidentCosts.gross_cost,
      incidents_recovery: incidentCosts.customer_recovery,
      incidents_net: incidentCosts.net_cost,
      total: total_cos,
    },
    gross_profit,
    gross_margin_pct,
    prior,
  };
}

// ── Income Statement ──────────────────────────────────────────────────────────

async function getIncomeStatement(user, query) {
  const branchIds = await resolveBranchScope(user, query);
  const { from, to } = parseDateRange(query);
  const compareDates = parseCompareDates(query);

  const [revenue, cosExpenses, opexExpenses, serviceCosts, incidentCosts] = await Promise.all([
    aggregateRevenue(branchIds, from, to),
    aggregateExpenses(branchIds, COS_CATEGORIES, from, to),
    aggregateExpenses(branchIds, OPEX_CATEGORIES, from, to),
    aggregateServiceCosts(branchIds, from, to),
    aggregateIncidentCosts(branchIds, from, to),
  ]);

  const total_cos =
    cosExpenses.total + serviceCosts.total + incidentCosts.net_cost;
  const gross_profit = revenue.net_revenue - total_cos;
  const gross_margin_pct =
    revenue.net_revenue > 0 ? (gross_profit / revenue.net_revenue) * 100 : 0;
  const total_opex = opexExpenses.total;
  const net_profit = gross_profit - total_opex;
  const net_margin_pct =
    revenue.net_revenue > 0 ? (net_profit / revenue.net_revenue) * 100 : 0;

  let prior = null;
  if (compareDates) {
    const [pRevenue, pCos, pOpex, pService, pIncident] = await Promise.all([
      aggregateRevenue(branchIds, compareDates.compareFrom, compareDates.compareTo),
      aggregateExpenses(branchIds, COS_CATEGORIES, compareDates.compareFrom, compareDates.compareTo),
      aggregateExpenses(branchIds, OPEX_CATEGORIES, compareDates.compareFrom, compareDates.compareTo),
      aggregateServiceCosts(branchIds, compareDates.compareFrom, compareDates.compareTo),
      aggregateIncidentCosts(branchIds, compareDates.compareFrom, compareDates.compareTo),
    ]);

    const p_total_cos = pCos.total + pService.total + pIncident.net_cost;
    const p_gross_profit = pRevenue.net_revenue - p_total_cos;
    const p_gross_margin_pct =
      pRevenue.net_revenue > 0 ? (p_gross_profit / pRevenue.net_revenue) * 100 : 0;
    const p_total_opex = pOpex.total;
    const p_net_profit = p_gross_profit - p_total_opex;
    const p_net_margin_pct =
      pRevenue.net_revenue > 0 ? (p_net_profit / pRevenue.net_revenue) * 100 : 0;

    prior = {
      revenue: pRevenue,
      cost_of_revenue: {
        by_category: pCos.by_category,
        service_orders: pService.total,
        service_orders_count: pService.count,
        incidents_gross: pIncident.gross_cost,
        incidents_recovery: pIncident.customer_recovery,
        incidents_net: pIncident.net_cost,
        total: p_total_cos,
      },
      gross_profit: p_gross_profit,
      gross_margin_pct: p_gross_margin_pct,
      operating_expenses: { by_category: pOpex.by_category, total: p_total_opex },
      net_profit: p_net_profit,
      net_margin_pct: p_net_margin_pct,
    };
  }

  return {
    period: { from, to },
    revenue,
    cost_of_revenue: {
      by_category: cosExpenses.by_category,
      service_orders: serviceCosts.total,
      service_orders_count: serviceCosts.count,
      incidents_gross: incidentCosts.gross_cost,
      incidents_recovery: incidentCosts.customer_recovery,
      incidents_net: incidentCosts.net_cost,
      total: total_cos,
    },
    gross_profit,
    gross_margin_pct,
    operating_expenses: { by_category: opexExpenses.by_category, total: total_opex },
    net_profit,
    net_margin_pct,
    prior,
  };
}

// ── Transaction Ledger ────────────────────────────────────────────────────────

async function getLedger(user, query) {
  const branchIds = await resolveBranchScope(user, query);
  const { from, to } = parseDateRange(query);
  const { page, limit, skip } = parsePaging(query);

  // ── 1. Paid payments ─────────────────────────────────────────────────────
  const paymentPipeline = [];

  if (branchIds) {
    paymentPipeline.push({
      $match: {
        paymentStatus: "paid",
        reservation_id: { $ne: null },
        boughtAt: { $gte: from, $lte: to },
      },
    });
    paymentPipeline.push({
      $lookup: {
        from: "reservations",
        localField: "reservation_id",
        foreignField: "_id",
        as: "reservation",
      },
    });
    paymentPipeline.push({ $unwind: { path: "$reservation", preserveNullAndEmptyArrays: false } });
    paymentPipeline.push({ $match: { "reservation.pickup.branch_id": { $in: branchIds } } });
    paymentPipeline.push({
      $lookup: {
        from: "branches",
        localField: "reservation.pickup.branch_id",
        foreignField: "_id",
        as: "branch",
      },
    });
    paymentPipeline.push({ $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } });
  } else {
    paymentPipeline.push({
      $match: {
        paymentStatus: "paid",
        boughtAt: { $gte: from, $lte: to },
      },
    });
    paymentPipeline.push({
      $lookup: {
        from: "reservations",
        localField: "reservation_id",
        foreignField: "_id",
        as: "reservation",
      },
    });
    paymentPipeline.push({ $unwind: { path: "$reservation", preserveNullAndEmptyArrays: true } });
    paymentPipeline.push({
      $lookup: {
        from: "branches",
        localField: "reservation.pickup.branch_id",
        foreignField: "_id",
        as: "branch",
      },
    });
    paymentPipeline.push({ $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } });
  }

  paymentPipeline.push({
    $lookup: {
      from: "users",
      localField: "user_id",
      foreignField: "_id",
      as: "user",
    },
  });
  paymentPipeline.push({ $unwind: { path: "$user", preserveNullAndEmptyArrays: true } });

  const paymentRows = await Payment.aggregate(paymentPipeline);

  // ── 2. Approved expenses ─────────────────────────────────────────────────
  const expenseMatch = {
    status: "approved",
    date: { $gte: from, $lte: to },
  };
  if (branchIds) expenseMatch.branch_id = { $in: branchIds };

  const expenseRows = await Expense.find(expenseMatch)
    .populate({ path: "branch_id", select: "name" })
    .populate({ path: "submitted_by", select: "full_name email" })
    .lean();

  // ── 3. Completed service orders with cost > 0 ────────────────────────────
  const servicePipeline = [
    {
      $match: {
        status: "completed",
        cost: { $gt: 0 },
        updated_at: { $gte: from, $lte: to },
      },
    },
  ];

  if (branchIds) {
    servicePipeline.push({
      $lookup: {
        from: "vehicles",
        localField: "vehicle_id",
        foreignField: "_id",
        as: "vehicle",
      },
    });
    servicePipeline.push({ $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: false } });
    servicePipeline.push({ $match: { "vehicle.branch_id": { $in: branchIds } } });
    servicePipeline.push({
      $lookup: {
        from: "branches",
        localField: "vehicle.branch_id",
        foreignField: "_id",
        as: "branch",
      },
    });
    servicePipeline.push({ $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } });
  }

  servicePipeline.push({
    $lookup: {
      from: "users",
      localField: "created_by",
      foreignField: "_id",
      as: "creator",
    },
  });
  servicePipeline.push({ $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } });

  const serviceRows = await ServiceOrder.aggregate(servicePipeline);

  // ── Map to unified ledger rows ───────────────────────────────────────────
  const mapped = [];

  for (const p of paymentRows) {
    mapped.push({
      date: p.boughtAt ? p.boughtAt.toISOString().slice(0, 10) : "",
      ref: p.provider_ref || p._id.toString().slice(-8).toUpperCase(),
      description: `${p.provider || ""} payment — ${p.method || ""}`,
      type: "revenue",
      category: p.driver_booking_id ? "driver_income" : "rental_income",
      amount_in: p.pricePaid || 0,
      amount_out: 0,
      source: "payment",
      source_id: p._id.toString(),
      branch_name: p.branch?.name || "—",
      recorded_by: p.user?.full_name || p.user?.email || "—",
    });
  }

  for (const e of expenseRows) {
    mapped.push({
      date: e.date ? new Date(e.date).toISOString().slice(0, 10) : "",
      ref: e.reference || e._id.toString().slice(-8).toUpperCase(),
      description: e.title,
      type: "expense",
      category: e.category,
      amount_in: 0,
      amount_out: d128(e.amount),
      source: "expense",
      source_id: e._id.toString(),
      branch_name: e.branch_id?.name || "—",
      recorded_by: e.submitted_by?.full_name || e.submitted_by?.email || "—",
    });
  }

  for (const s of serviceRows) {
    mapped.push({
      date: s.updated_at ? s.updated_at.toISOString().slice(0, 10) : "",
      ref: s._id.toString().slice(-8).toUpperCase(),
      description: `Service Order — ${s.type || ""}`,
      type: "service_cost",
      category: "service_order",
      amount_in: 0,
      amount_out: s.cost || 0,
      source: "service_order",
      source_id: s._id.toString(),
      branch_name: s.branch?.name || "—",
      recorded_by: s.creator?.full_name || s.creator?.email || "—",
    });
  }

  // Sort by date DESC
  mapped.sort((a, b) => {
    if (b.date > a.date) return 1;
    if (b.date < a.date) return -1;
    return 0;
  });

  const total = mapped.length;
  const rows = mapped.slice(skip, skip + limit);

  return { rows, total, page, limit };
}

// ── Revenue Analysis ──────────────────────────────────────────────────────────

async function getRevenueAnalysis(user, query) {
  const branchIds = await resolveBranchScope(user, query);
  const { from, to } = parseDateRange(query);

  const revenue = await aggregateRevenue(branchIds, from, to);
  const trend = await getRevenueTrend(branchIds, from, to);

  // By branch — only useful when no branch filter applied
  let by_branch = [];
  if (!branchIds) {
    by_branch = await Payment.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          reservation_id: { $ne: null },
          boughtAt: { $gte: from, $lte: to },
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
      {
        $group: {
          _id: "$reservation.pickup.branch_id",
          total_revenue: { $sum: "$pricePaid" },
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
          branch_name: { $ifNull: ["$branch.name", "Unknown"] },
          total_revenue: 1,
        },
      },
      { $sort: { total_revenue: -1 } },
    ]);
  }

  // Compute metrics
  const days = Math.max(
    1,
    Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
  );
  const avg_daily_revenue = revenue.net_revenue / days;

  let peak_day = { date: null, amount: 0 };
  if (trend.length > 0) {
    peak_day = trend.reduce(
      (best, cur) => (cur.amount > best.amount ? cur : best),
      trend[0]
    );
  }

  const total_transactions = revenue.rental_count + revenue.driver_count;
  const avg_transaction_value =
    total_transactions > 0 ? revenue.gross_revenue / total_transactions : 0;

  return {
    by_source: {
      rental_income: revenue.rental_income,
      driver_income: revenue.driver_income,
      rental_count: revenue.rental_count,
      driver_count: revenue.driver_count,
    },
    by_branch,
    trend,
    metrics: {
      avg_daily_revenue,
      peak_day,
      total_transactions,
      avg_transaction_value,
    },
  };
}

// ── Audit Trail ───────────────────────────────────────────────────────────────

async function getAuditTrail(user, query) {
  const branchIds = await resolveBranchScope(user, query);
  const { from, to } = parseDateRange(query);

  // ── 1. All expenses in period ────────────────────────────────────────────
  const expenseMatch = { date: { $gte: from, $lte: to } };
  if (branchIds) expenseMatch.branch_id = { $in: branchIds };

  const expenses = await Expense.find(expenseMatch)
    .populate({ path: "submitted_by", select: "full_name email" })
    .populate({ path: "approved_by", select: "full_name email" })
    .populate({ path: "branch_id", select: "name" })
    .lean();

  // ── 2. All payments in period ────────────────────────────────────────────
  const paymentPipeline = [];

  if (branchIds) {
    paymentPipeline.push({
      $match: {
        reservation_id: { $ne: null },
        boughtAt: { $gte: from, $lte: to },
      },
    });
    paymentPipeline.push({
      $lookup: {
        from: "reservations",
        localField: "reservation_id",
        foreignField: "_id",
        as: "reservation",
      },
    });
    paymentPipeline.push({ $unwind: { path: "$reservation", preserveNullAndEmptyArrays: false } });
    paymentPipeline.push({ $match: { "reservation.pickup.branch_id": { $in: branchIds } } });
  } else {
    paymentPipeline.push({
      $match: { boughtAt: { $gte: from, $lte: to } },
    });
  }

  paymentPipeline.push({
    $lookup: {
      from: "users",
      localField: "user_id",
      foreignField: "_id",
      as: "user",
    },
  });
  paymentPipeline.push({ $unwind: { path: "$user", preserveNullAndEmptyArrays: true } });

  const payments = await Payment.aggregate(paymentPipeline);

  // ── 3. Flag expenses ─────────────────────────────────────────────────────
  const flaggedExpenses = expenses.map((e) => {
    const flags = [];
    const amount = d128(e.amount);

    // SELF_APPROVAL
    if (
      e.submitted_by &&
      e.approved_by &&
      e.submitted_by._id &&
      e.approved_by._id &&
      e.submitted_by._id.toString() === e.approved_by._id.toString()
    ) {
      flags.push("SELF_APPROVAL");
    }

    // NO_RECEIPT_LARGE
    if (
      (e.receipt_images || []).length === 0 &&
      amount > 500 &&
      e.status === "approved"
    ) {
      flags.push("NO_RECEIPT_LARGE");
    }

    // RAPID_APPROVAL
    if (e.submitted_at && e.approved_at) {
      const diff = new Date(e.approved_at) - new Date(e.submitted_at);
      if (diff < 10 * 60 * 1000) {
        flags.push("RAPID_APPROVAL");
      }
    }

    // AFTER_HOURS
    if (e.approved_at) {
      const h = new Date(e.approved_at).getHours();
      if (h < 6 || h > 20) {
        flags.push("AFTER_HOURS");
      }
    }

    // ROUND_NUMBER
    if (amount > 200 && amount % 100 === 0) {
      flags.push("ROUND_NUMBER");
    }

    // WEEKEND
    if (e.submitted_at) {
      const day = new Date(e.submitted_at).getDay();
      if (day === 0 || day === 6) {
        flags.push("WEEKEND");
      }
    }

    return { ...e, flags };
  });

  // ── 4. Flag payments ─────────────────────────────────────────────────────
  const flaggedPayments = payments.map((p) => {
    const flags = [];
    const amount = p.pricePaid || d128(p.amount);

    if (p.paymentStatus === "failed" || p.paymentStatus === "cancelled") {
      flags.push("FAILED_ATTEMPT");
    }

    if (amount > 2000) {
      flags.push("LARGE_PAYMENT");
    }

    if (p.refunds && p.refunds.length > 0) {
      flags.push("REFUND_ISSUED");
    }

    return { ...p, flags };
  });

  // ── 5. Flag breakdown summary ────────────────────────────────────────────
  const allExpenseFlags = flaggedExpenses.flatMap((e) => e.flags);
  const allPaymentFlags = flaggedPayments.flatMap((p) => p.flags);

  const flag_breakdown = {};
  for (const f of [...allExpenseFlags, ...allPaymentFlags]) {
    flag_breakdown[f] = (flag_breakdown[f] || 0) + 1;
  }

  const summary = {
    expenses_reviewed: expenses.length,
    expenses_flagged: flaggedExpenses.filter((e) => e.flags.length > 0).length,
    payments_reviewed: payments.length,
    payments_flagged: flaggedPayments.filter((p) => p.flags.length > 0).length,
    flag_breakdown,
  };

  return {
    expenses: flaggedExpenses,
    payments: flaggedPayments,
    summary,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TIER 2 — Fixed Assets, Balance Sheet, Cash Flow, Data Health
// ═══════════════════════════════════════════════════════════════════════════

// ── Depreciation Engine ───────────────────────────────────────────────────────

function calcAssetDepreciation(asset, asOfDate = new Date(), vehicleOdometer = 0) {
  const cost = d128(asset.acquisition_cost);
  const salvage = d128(asset.salvage_value) || 0;
  const life = asset.useful_life_years;
  const acqDate = new Date(asset.acquisition_date);

  if (cost <= 0) return null;

  const effectiveDate =
    asset.disposal_date && new Date(asset.disposal_date) <= asOfDate
      ? new Date(asset.disposal_date)
      : asOfDate;

  const msElapsed = Math.max(0, effectiveDate - acqDate);
  const yearsElapsed = msElapsed / (365.25 * 24 * 60 * 60 * 1000);
  const depreciableAmount = Math.max(0, cost - salvage);

  let annualDep = 0, accumDep = 0, nbv = cost;

  if (asset.depreciation_method === "straight_line") {
    annualDep = life > 0 ? depreciableAmount / life : 0;
    accumDep = Math.min(annualDep * yearsElapsed, depreciableAmount);
    nbv = cost - accumDep;
  } else if (asset.depreciation_method === "declining_balance") {
    const rate = (asset.declining_rate_pct || 25) / 100;
    let cv = cost;
    let accum = 0;
    const yearsComplete = Math.min(Math.floor(yearsElapsed), life);
    for (let y = 0; y < yearsComplete; y++) {
      const dep = Math.max(0, cv - salvage) * rate;
      accum += dep;
      cv -= dep;
      if (cv <= salvage) { cv = salvage; break; }
    }
    const frac = yearsElapsed - Math.floor(yearsElapsed);
    if (frac > 0 && cv > salvage && yearsComplete < life) {
      const partialDep = Math.max(0, cv - salvage) * rate * frac;
      accum += partialDep;
      cv -= partialDep;
    }
    accumDep = accum;
    annualDep = Math.max(0, cv - salvage) * rate;
    nbv = Math.max(cv, salvage);
  } else if (asset.depreciation_method === "units_of_production") {
    const totalKm = asset.total_expected_km || 100000;
    const kmDriven = vehicleOdometer || 0;
    const depPerKm = totalKm > 0 ? depreciableAmount / totalKm : 0;
    accumDep = Math.min(depPerKm * kmDriven, depreciableAmount);
    nbv = cost - accumDep;
    annualDep = 0;
  }

  const isFullyDep = nbv <= salvage + 0.01;
  const yearsRemaining = Math.max(0, life - yearsElapsed);
  const pctDep = depreciableAmount > 0 ? Math.min((accumDep / depreciableAmount) * 100, 100) : 100;

  let disposalGainLoss = null;
  if (asset.disposal_date) {
    const disposalAmt = d128(asset.disposal_amount) || 0;
    disposalGainLoss = disposalAmt - Math.max(nbv, salvage);
  }

  return {
    cost,
    salvage,
    depreciable_amount: depreciableAmount,
    annual_depreciation: annualDep,
    accumulated_depreciation: accumDep,
    net_book_value: Math.max(nbv, salvage),
    years_elapsed: yearsElapsed,
    years_remaining: yearsRemaining,
    pct_depreciated: pctDep,
    is_fully_depreciated: isFullyDep,
    disposal_gain_loss: disposalGainLoss,
  };
}

// ── Fixed Assets ──────────────────────────────────────────────────────────────

async function getFixedAssets(user, query) {
  const branchIds = await resolveBranchScope(user, query);
  const asOfDate = query.as_of ? new Date(query.as_of) : new Date();

  const vehicleMatch = {};
  if (branchIds) vehicleMatch.branch_id = { $in: branchIds };

  const vehicles = await Vehicle.find(vehicleMatch)
    .populate("vehicle_model_id", "make model year")
    .populate("branch_id", "name code")
    .lean();

  const vehicleIds = vehicles.map((v) => v._id);
  const fixedAssets = await FixedAsset.find({ vehicle_id: { $in: vehicleIds } })
    .populate("created_by", "full_name email")
    .populate("updated_by", "full_name email")
    .lean();

  const assetMap = new Map(fixedAssets.map((a) => [a.vehicle_id.toString(), a]));

  let totalCost = 0, totalAccumDep = 0, totalNBV = 0;
  let totalAnnualDep = 0;

  const rows = vehicles.map((v) => {
    const asset = assetMap.get(v._id.toString());
    const base = {
      vehicle_id: v._id,
      plate_number: v.plate_number,
      make: v.vehicle_model_id?.make,
      model: v.vehicle_model_id?.model,
      year: v.vehicle_model_id?.year,
      branch: v.branch_id?.name,
      branch_id: v.branch_id?._id,
      vehicle_status: v.status,
      odometer_km: v.odometer_km,
    };

    if (!asset) {
      return {
        ...base,
        has_asset_record: false,
        asset: null,
        depreciation: null,
        flags: ["NO_ASSET_RECORD"],
      };
    }

    const dep = calcAssetDepreciation(asset, asOfDate, v.odometer_km);
    if (dep) {
      totalCost += dep.cost;
      totalAccumDep += dep.accumulated_depreciation;
      totalNBV += dep.net_book_value;
      if (dep.annual_depreciation) totalAnnualDep += dep.annual_depreciation;
    }

    const flags = [];
    if (dep?.is_fully_depreciated && v.status === "active" && !asset.disposal_date) flags.push("FULLY_DEP_ACTIVE");
    if (dep?.pct_depreciated > 80 && !dep.is_fully_depreciated) flags.push("NEAR_END_OF_LIFE");
    if (asset.disposal_date && dep?.disposal_gain_loss !== null) {
      flags.push(dep.disposal_gain_loss < 0 ? "DISPOSAL_LOSS" : "DISPOSAL_GAIN");
    }

    return {
      ...base,
      has_asset_record: true,
      asset: {
        _id: asset._id,
        acquisition_cost: d128(asset.acquisition_cost),
        acquisition_date: asset.acquisition_date,
        useful_life_years: asset.useful_life_years,
        salvage_value: d128(asset.salvage_value),
        depreciation_method: asset.depreciation_method,
        declining_rate_pct: asset.declining_rate_pct,
        total_expected_km: asset.total_expected_km,
        disposal_date: asset.disposal_date,
        disposal_amount: asset.disposal_amount ? d128(asset.disposal_amount) : null,
        disposal_notes: asset.disposal_notes,
        notes: asset.notes,
        created_by: asset.created_by,
        updated_by: asset.updated_by,
        created_at: asset.created_at,
        updated_at: asset.updated_at,
        change_log: asset.change_log || [],
      },
      depreciation: dep,
      flags,
    };
  });

  return {
    as_of: asOfDate,
    vehicles_in_scope: vehicles.length,
    registered: fixedAssets.length,
    unregistered: vehicles.length - fixedAssets.length,
    totals: {
      cost: totalCost,
      accumulated_depreciation: totalAccumDep,
      net_book_value: totalNBV,
      annual_depreciation: totalAnnualDep,
    },
    rows,
  };
}

async function createFixedAsset(user, body) {
  const { vehicle_id, branch_id, acquisition_cost, acquisition_date,
          useful_life_years, salvage_value, depreciation_method,
          declining_rate_pct, total_expected_km, notes } = body;

  const existing = await FixedAsset.findOne({ vehicle_id });
  if (existing) throw new Error("A fixed asset record already exists for this vehicle.");

  const D = (v) => mongoose.Types.Decimal128.fromString(String(parseFloat(v) || 0));

  const asset = await FixedAsset.create({
    vehicle_id,
    branch_id,
    acquisition_cost: D(acquisition_cost),
    acquisition_date: new Date(acquisition_date),
    useful_life_years: Number(useful_life_years),
    salvage_value: D(salvage_value || 0),
    depreciation_method: depreciation_method || "straight_line",
    declining_rate_pct: declining_rate_pct ? Number(declining_rate_pct) : null,
    total_expected_km: total_expected_km ? Number(total_expected_km) : null,
    notes: notes || "",
    created_by: user._id,
  });

  // Sync to vehicle.accounting for quick lookups
  await Vehicle.updateOne(
    { _id: vehicle_id },
    {
      $set: {
        "accounting.purchase_price": parseFloat(acquisition_cost) || 0,
        "accounting.purchased_at": new Date(acquisition_date),
        "accounting.currency": "USD",
      },
    }
  );

  return asset;
}

async function updateFixedAsset(user, body, params) {
  const asset = await FixedAsset.findById(params.id);
  if (!asset) throw new Error("Fixed asset record not found");

  const D = (v) => mongoose.Types.Decimal128.fromString(String(parseFloat(v) || 0));
  const TRACKED = [
    "acquisition_cost", "acquisition_date", "useful_life_years",
    "salvage_value", "depreciation_method", "declining_rate_pct",
    "total_expected_km", "disposal_date", "disposal_amount", "notes",
  ];

  const changeLog = [];
  for (const field of TRACKED) {
    if (body[field] !== undefined && String(asset[field]) !== String(body[field])) {
      changeLog.push({
        changed_by: user._id,
        changed_at: new Date(),
        field,
        old_value: asset[field],
        new_value: body[field],
        reason: body.change_reason || "",
      });
    }
  }

  if (body.acquisition_cost !== undefined) asset.acquisition_cost = D(body.acquisition_cost);
  if (body.acquisition_date !== undefined) asset.acquisition_date = new Date(body.acquisition_date);
  if (body.useful_life_years !== undefined) asset.useful_life_years = Number(body.useful_life_years);
  if (body.salvage_value !== undefined) asset.salvage_value = D(body.salvage_value);
  if (body.depreciation_method !== undefined) asset.depreciation_method = body.depreciation_method;
  if (body.declining_rate_pct !== undefined) asset.declining_rate_pct = body.declining_rate_pct ? Number(body.declining_rate_pct) : null;
  if (body.total_expected_km !== undefined) asset.total_expected_km = body.total_expected_km ? Number(body.total_expected_km) : null;
  if (body.disposal_date !== undefined) asset.disposal_date = body.disposal_date ? new Date(body.disposal_date) : null;
  if (body.disposal_amount !== undefined) asset.disposal_amount = body.disposal_amount ? D(body.disposal_amount) : null;
  if (body.disposal_notes !== undefined) asset.disposal_notes = body.disposal_notes;
  if (body.notes !== undefined) asset.notes = body.notes;

  asset.updated_by = user._id;
  if (changeLog.length > 0) asset.change_log.push(...changeLog);
  await asset.save();

  return asset;
}

// ── Balance Entries ───────────────────────────────────────────────────────────

async function getBalanceEntries(user, query) {
  const branchIds = await resolveBranchScope(user, query);
  const match = {};
  if (branchIds) match.$or = [{ branch_id: { $in: branchIds } }, { branch_id: null }];
  if (query.type) match.type = query.type;
  if (query.category) match.category = query.category;

  const entries = await BalanceEntry.find(match)
    .populate("created_by", "full_name email")
    .populate("updated_by", "full_name email")
    .populate("branch_id", "name code")
    .populate("change_log.changed_by", "full_name email")
    .sort({ effective_date: -1 })
    .lean();

  return {
    entries: entries.map((e) => ({ ...e, amount: d128(e.amount) })),
    total: entries.length,
  };
}

async function createBalanceEntry(user, body) {
  const D = (v) => mongoose.Types.Decimal128.fromString(String(parseFloat(v) || 0));
  const entry = await BalanceEntry.create({
    type: body.type,
    category: body.category,
    description: body.description,
    amount: D(body.amount),
    currency: body.currency || "USD",
    effective_date: new Date(body.effective_date),
    reference: body.reference || "",
    branch_id: body.branch_id || null,
    is_opening_balance: !!body.is_opening_balance,
    notes: body.notes || "",
    created_by: user._id,
  });
  return entry;
}

async function updateBalanceEntry(user, body, params) {
  const entry = await BalanceEntry.findById(params.id);
  if (!entry) throw new Error("Balance entry not found");

  const D = (v) => mongoose.Types.Decimal128.fromString(String(parseFloat(v) || 0));
  const logEntry = { changed_by: user._id, changed_at: new Date(), reason: body.change_reason || "" };

  if (body.amount !== undefined) {
    logEntry.old_amount = entry.amount;
    logEntry.new_amount = D(body.amount);
    entry.amount = logEntry.new_amount;
  }
  if (body.description !== undefined) {
    logEntry.old_description = entry.description;
    logEntry.new_description = body.description;
    entry.description = body.description;
  }
  if (body.effective_date !== undefined) entry.effective_date = new Date(body.effective_date);
  if (body.reference !== undefined) entry.reference = body.reference;
  if (body.notes !== undefined) entry.notes = body.notes;

  entry.updated_by = user._id;
  entry.change_log.push(logEntry);
  await entry.save();
  return entry;
}

async function deleteBalanceEntry(user, params) {
  const entry = await BalanceEntry.findById(params.id);
  if (!entry) throw new Error("Balance entry not found");
  await entry.deleteOne();
  return { deleted: true };
}

// ── Balance Sheet ─────────────────────────────────────────────────────────────

async function getBalanceSheet(user, query) {
  const branchIds = await resolveBranchScope(user, query);
  const { to: asOf } = parseDateRange(query);

  // ── Fleet assets ──────────────────────────────────────────────────────────
  const vehicleMatch = {};
  if (branchIds) vehicleMatch.branch_id = { $in: branchIds };
  const vehicles = await Vehicle.find(vehicleMatch).lean();
  const vehicleIds = vehicles.map((v) => v._id);
  const fixedAssets = await FixedAsset.find({ vehicle_id: { $in: vehicleIds } }).lean();

  let fleetCost = 0, fleetAccumDep = 0, fleetNBV = 0;
  for (const v of vehicles) {
    const asset = fixedAssets.find((a) => a.vehicle_id.toString() === v._id.toString());
    if (!asset) continue;
    const dep = calcAssetDepreciation(asset, asOf, v.odometer_km);
    if (dep) {
      fleetCost += dep.cost;
      fleetAccumDep += dep.accumulated_depreciation;
      fleetNBV += dep.net_book_value;
    }
  }

  // ── Cash (derived from all-time paid payments up to asOf) ─────────────────
  const cashPipeline = [{ $match: { paymentStatus: "paid", boughtAt: { $lte: asOf } } }];
  if (branchIds) {
    cashPipeline.push(
      { $lookup: { from: "reservations", localField: "reservation_id", foreignField: "_id", as: "res" } },
      { $unwind: { path: "$res", preserveNullAndEmptyArrays: true } },
      { $match: { $or: [{ "res.pickup.branch_id": { $in: branchIds } }, { reservation_id: null }] } }
    );
  }
  cashPipeline.push({ $group: { _id: null, total: { $sum: "$pricePaid" } } });
  const cashResult = await Payment.aggregate(cashPipeline);
  const cashAndBank = cashResult[0]?.total || 0;

  // Net out all-time expenses paid
  const expPipeline = [{ $match: { status: "approved", date: { $lte: asOf } } }];
  if (branchIds) expPipeline[0].$match.branch_id = { $in: branchIds };
  expPipeline.push({ $group: { _id: null, total: { $sum: { $toDouble: "$amount" } } } });
  const expResult = await Expense.aggregate(expPipeline);
  const totalExpensesPaid = expResult[0]?.total || 0;
  const netCash = Math.max(0, cashAndBank - totalExpensesPaid);

  // ── Accounts receivable ───────────────────────────────────────────────────
  const arPipeline = [
    { $match: { status: { $in: ["pending", "confirmed", "checked_out"] }, "pickup.at": { $lte: asOf } } },
  ];
  if (branchIds) arPipeline.push({ $match: { "pickup.branch_id": { $in: branchIds } } });
  arPipeline.push({ $group: { _id: null, total: { $sum: { $toDouble: "$payment_summary.outstanding" } } } });
  const arResult = await Reservation.aggregate(arPipeline);
  const receivables = arResult[0]?.total || 0;

  // ── Balance entries ───────────────────────────────────────────────────────
  const entryMatch = { effective_date: { $lte: asOf } };
  if (branchIds) entryMatch.$or = [{ branch_id: { $in: branchIds } }, { branch_id: null }];
  const entries = await BalanceEntry.find(entryMatch).lean();

  function groupEntries(type, cats) {
    const rows = [];
    const grouped = {};
    entries.filter((e) => e.type === type && cats.includes(e.category)).forEach((e) => {
      const key = e.category;
      if (!grouped[key]) grouped[key] = { category: key, description: e.description, total: 0 };
      grouped[key].total += d128(e.amount);
    });
    Object.values(grouped).forEach((g) => rows.push(g));
    return rows;
  }
  function sumEntries(type, cats) {
    return entries.filter((e) => e.type === type && cats.includes(e.category))
      .reduce((s, e) => s + d128(e.amount), 0);
  }

  const CUCA = ["deposits", "prepayments", "other_current_asset"];
  const NCCA = ["property_equipment", "intangibles", "investments", "other_noncurrent_asset"];
  const CLC = ["accounts_payable", "accrued_expenses", "tax_payable", "short_term_loan", "other_liability"];
  const NCLC = ["vehicle_loan", "bank_loan", "lease_obligation"];

  const otherCurrentAssets = sumEntries("asset", CUCA);
  const otherNonCurrentAssets = sumEntries("asset", NCCA);
  const currentLiabs = sumEntries("liability", CLC);
  const nonCurrentLiabs = sumEntries("liability", NCLC);

  // ── Retained earnings = cumulative net profit all-time to asOf ────────────
  const EPOCH = new Date("2015-01-01T00:00:00.000Z");
  const [revAll, cosAll, opexAll, svcAll, incAll] = await Promise.all([
    aggregateRevenue(branchIds, EPOCH, asOf),
    aggregateExpenses(branchIds, COS_CATEGORIES, EPOCH, asOf),
    aggregateExpenses(branchIds, OPEX_CATEGORIES, EPOCH, asOf),
    aggregateServiceCosts(branchIds, EPOCH, asOf),
    aggregateIncidentCosts(branchIds, EPOCH, asOf),
  ]);
  const retainedEarnings =
    revAll.net_revenue - (cosAll.total + svcAll.total + incAll.net_cost) - opexAll.total;

  const shareCapital = sumEntries("equity", ["share_capital"]);
  const drawings = sumEntries("equity", ["drawings"]);
  const revaluation = sumEntries("equity", ["revaluation_reserve", "other_equity"]);
  const totalEquity = shareCapital + retainedEarnings - drawings + revaluation;

  const totalCurrentAssets = netCash + receivables + otherCurrentAssets;
  const totalNonCurrentAssets = fleetNBV + otherNonCurrentAssets;
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;
  const totalLiabilities = currentLiabs + nonCurrentLiabs;
  const totalLiabsAndEquity = totalLiabilities + totalEquity;
  const diff = totalAssets - totalLiabsAndEquity;

  return {
    as_of: asOf,
    assets: {
      current: {
        cash_and_bank: netCash,
        accounts_receivable: receivables,
        other: groupEntries("asset", CUCA),
        total: totalCurrentAssets,
      },
      non_current: {
        fleet: { at_cost: fleetCost, accumulated_depreciation: fleetAccumDep, net_book_value: fleetNBV },
        other: groupEntries("asset", NCCA),
        total: totalNonCurrentAssets,
      },
      total: totalAssets,
    },
    liabilities: {
      current: { rows: groupEntries("liability", CLC), total: currentLiabs },
      non_current: { rows: groupEntries("liability", NCLC), total: nonCurrentLiabs },
      total: totalLiabilities,
    },
    equity: {
      share_capital: shareCapital,
      retained_earnings: retainedEarnings,
      drawings,
      revaluation_reserve: revaluation,
      total: totalEquity,
    },
    total_liabilities_and_equity: totalLiabsAndEquity,
    is_balanced: Math.abs(diff) < 0.01,
    balancing_difference: diff,
  };
}

// ── Cash Flow Statement ───────────────────────────────────────────────────────

async function getCashFlowStatement(user, query) {
  const branchIds = await resolveBranchScope(user, query);
  const { from, to } = parseDateRange(query);

  // Net profit for period
  const [rev, cosExp, opexExp, svcCosts, incCosts] = await Promise.all([
    aggregateRevenue(branchIds, from, to),
    aggregateExpenses(branchIds, COS_CATEGORIES, from, to),
    aggregateExpenses(branchIds, OPEX_CATEGORIES, from, to),
    aggregateServiceCosts(branchIds, from, to),
    aggregateIncidentCosts(branchIds, from, to),
  ]);
  const totalCos = cosExp.total + svcCosts.total + incCosts.net_cost;
  const netProfit = rev.net_revenue - totalCos - opexExp.total;

  // Depreciation add-back for the period
  const vehicleMatch = {};
  if (branchIds) vehicleMatch.branch_id = { $in: branchIds };
  const vehicles = await Vehicle.find(vehicleMatch).lean();
  const vehicleIds = vehicles.map((v) => v._id);
  const fixedAssets = await FixedAsset.find({ vehicle_id: { $in: vehicleIds } }).lean();

  let periodDepreciation = 0;
  for (const v of vehicles) {
    const asset = fixedAssets.find((a) => a.vehicle_id.toString() === v._id.toString());
    if (!asset) continue;
    const depStart = calcAssetDepreciation(asset, from, v.odometer_km);
    const depEnd = calcAssetDepreciation(asset, to, v.odometer_km);
    if (depStart && depEnd) {
      periodDepreciation += depEnd.accumulated_depreciation - depStart.accumulated_depreciation;
    }
  }

  // Receivables change (working capital)
  const arMatch = { status: { $in: ["pending", "confirmed", "checked_out"] } };
  if (branchIds) arMatch["pickup.branch_id"] = { $in: branchIds };
  const [arStart, arEnd] = await Promise.all([
    Reservation.aggregate([
      { $match: { ...arMatch, "pickup.at": { $lte: from } } },
      { $group: { _id: null, total: { $sum: { $toDouble: "$payment_summary.outstanding" } } } },
    ]),
    Reservation.aggregate([
      { $match: { ...arMatch, "pickup.at": { $lte: to } } },
      { $group: { _id: null, total: { $sum: { $toDouble: "$payment_summary.outstanding" } } } },
    ]),
  ]);
  const receivablesChange = (arEnd[0]?.total || 0) - (arStart[0]?.total || 0);
  const netOperating = netProfit + periodDepreciation - receivablesChange;

  // Investing: vehicle acquisitions (vehicle_acquisition expenses)
  const acqPipeline = [
    { $match: { status: "approved", category: "vehicle_acquisition", date: { $gte: from, $lte: to } } },
  ];
  if (branchIds) acqPipeline[0].$match.branch_id = { $in: branchIds };
  acqPipeline.push({ $group: { _id: null, total: { $sum: { $toDouble: "$amount" } } } });
  const acqResult = await Expense.aggregate(acqPipeline);
  const vehicleAcquisitions = -(acqResult[0]?.total || 0);

  // Investing: disposals
  const disposedAssets = await FixedAsset.find({
    vehicle_id: { $in: vehicleIds },
    disposal_date: { $gte: from, $lte: to },
    disposal_amount: { $ne: null },
  }).lean();
  const disposalProceeds = disposedAssets.reduce((s, a) => s + d128(a.disposal_amount), 0);
  const netInvesting = vehicleAcquisitions + disposalProceeds;

  // Financing: from balance_entries
  const entryMatch = { effective_date: { $gte: from, $lte: to }, type: { $in: ["liability", "equity"] } };
  if (branchIds) entryMatch.$or = [{ branch_id: { $in: branchIds } }, { branch_id: null }];
  const finEntries = await BalanceEntry.find(entryMatch).lean();

  const loanProceeds = finEntries
    .filter((e) => ["vehicle_loan", "bank_loan", "short_term_loan"].includes(e.category) && d128(e.amount) > 0)
    .reduce((s, e) => s + d128(e.amount), 0);
  const loanRepayments = finEntries
    .filter((e) => ["vehicle_loan", "bank_loan", "short_term_loan"].includes(e.category) && d128(e.amount) < 0)
    .reduce((s, e) => s + d128(e.amount), 0);
  const capitalInjections = finEntries
    .filter((e) => e.category === "share_capital" && d128(e.amount) > 0)
    .reduce((s, e) => s + d128(e.amount), 0);
  const drawingsAmt = finEntries
    .filter((e) => e.category === "drawings")
    .reduce((s, e) => s - Math.abs(d128(e.amount)), 0);
  const netFinancing = loanProceeds + loanRepayments + capitalInjections + drawingsAmt;

  return {
    period: { from, to },
    operating: {
      net_profit: netProfit,
      add_depreciation: periodDepreciation,
      receivables_change: -receivablesChange,
      net_cash: netOperating,
    },
    investing: {
      vehicle_acquisitions: vehicleAcquisitions,
      disposal_proceeds: disposalProceeds,
      net_cash: netInvesting,
    },
    financing: {
      loan_proceeds: loanProceeds,
      loan_repayments: loanRepayments,
      capital_injections: capitalInjections,
      drawings: drawingsAmt,
      net_cash: netFinancing,
    },
    net_change_in_cash: netOperating + netInvesting + netFinancing,
  };
}

// ── Data Health ───────────────────────────────────────────────────────────────

async function getDataHealth(user, query) {
  const branchIds = await resolveBranchScope(user, query);
  const now = new Date();
  const flags = [];

  // Vehicles
  const vehicleMatch = {};
  if (branchIds) vehicleMatch.branch_id = { $in: branchIds };
  const vehicles = await Vehicle.find(vehicleMatch)
    .populate("vehicle_model_id", "make model year")
    .populate("branch_id", "name")
    .lean();
  const vehicleIds = vehicles.map((v) => v._id);
  const fixedAssets = await FixedAsset.find({ vehicle_id: { $in: vehicleIds } })
    .populate("created_by", "full_name email")
    .lean();
  const assetMap = new Map(fixedAssets.map((a) => [a.vehicle_id.toString(), a]));

  for (const v of vehicles) {
    const asset = assetMap.get(v._id.toString());
    const vLabel = `${v.plate_number}${v.vehicle_model_id ? " – " + v.vehicle_model_id.make + " " + v.vehicle_model_id.model : ""}`;

    if (!asset) {
      flags.push({
        severity: "critical", code: "NO_ASSET_RECORD",
        entity: "vehicle", entity_id: v._id, label: vLabel,
        message: `No depreciation record for ${vLabel}. Depreciation cannot be calculated.`,
        action: "Register this vehicle in Fixed Assets.",
        branch: v.branch_id?.name, added_by: null,
      });
      continue;
    }

    const dep = calcAssetDepreciation(asset, now, v.odometer_km);
    if (!dep) continue;

    if (dep.is_fully_depreciated && v.status === "active" && !asset.disposal_date) {
      flags.push({
        severity: "critical", code: "FULLY_DEP_ACTIVE",
        entity: "vehicle", entity_id: v._id, label: vLabel,
        message: `${vLabel} is fully depreciated (NBV $${dep.net_book_value.toFixed(2)}) but is still active in the fleet.`,
        action: "Dispose, write off, or revalue this vehicle.",
        branch: v.branch_id?.name, added_by: asset.created_by?.full_name,
      });
    }

    if (asset.useful_life_years < 2 || asset.useful_life_years > 15) {
      flags.push({
        severity: "warning", code: "UNUSUAL_USEFUL_LIFE",
        entity: "vehicle", entity_id: v._id, label: vLabel,
        message: `${vLabel} has useful life of ${asset.useful_life_years} years (expected 2–15 for vehicles).`,
        action: "Review and correct the useful life. Registered by " + (asset.created_by?.full_name || "unknown") + ".",
        branch: v.branch_id?.name, added_by: asset.created_by?.full_name,
      });
    }

    if (dep.cost > 0 && (dep.salvage / dep.cost) > 0.4) {
      flags.push({
        severity: "warning", code: "HIGH_SALVAGE_VALUE",
        entity: "vehicle", entity_id: v._id, label: vLabel,
        message: `${vLabel}'s salvage value ($${dep.salvage.toFixed(2)}) is ${((dep.salvage / dep.cost) * 100).toFixed(0)}% of cost — unusually high.`,
        action: "Verify salvage estimate. Registered by " + (asset.created_by?.full_name || "unknown") + ".",
        branch: v.branch_id?.name, added_by: asset.created_by?.full_name,
      });
    }

    if (dep.pct_depreciated > 80 && !dep.is_fully_depreciated) {
      flags.push({
        severity: "info", code: "NEAR_END_OF_LIFE",
        entity: "vehicle", entity_id: v._id, label: vLabel,
        message: `${vLabel} is ${dep.pct_depreciated.toFixed(0)}% depreciated. NBV: $${dep.net_book_value.toFixed(2)}, ${dep.years_remaining.toFixed(1)} years remaining.`,
        action: "Plan for replacement or revaluation.",
        branch: v.branch_id?.name, added_by: asset.created_by?.full_name,
      });
    }

    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    if (v.status === "active" && (!v.last_service_at || new Date(v.last_service_at) < ninetyDaysAgo)) {
      flags.push({
        severity: "info", code: "NO_RECENT_SERVICE",
        entity: "vehicle", entity_id: v._id, label: vLabel,
        message: `${vLabel} has no service records in the last 90 days.`,
        action: "Schedule a service inspection.",
        branch: v.branch_id?.name, added_by: null,
      });
    }
  }

  // Recent expenses (last 60 days)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const expMatch = { status: "approved", date: { $gte: sixtyDaysAgo } };
  if (branchIds) expMatch.branch_id = { $in: branchIds };
  const recentExp = await Expense.find(expMatch)
    .populate("submitted_by", "full_name email")
    .populate("approved_by", "full_name email")
    .populate("branch_id", "name")
    .lean();

  for (const e of recentExp) {
    const amount = d128(e.amount);
    const eLabel = `EXP ${e.reference || String(e._id).slice(-6).toUpperCase()}`;

    if (
      e.submitted_by?._id && e.approved_by?._id &&
      e.submitted_by._id.toString() === e.approved_by._id.toString()
    ) {
      flags.push({
        severity: "critical", code: "SELF_APPROVAL",
        entity: "expense", entity_id: e._id, label: eLabel,
        message: `${eLabel} ($${amount.toFixed(2)}, ${e.category}) was submitted AND approved by ${e.submitted_by.full_name}. This violates segregation of duties.`,
        action: "Expenses must be approved by a different person. Review and re-approve.",
        branch: e.branch_id?.name, added_by: e.submitted_by?.full_name,
      });
    }

    if (amount > 200 && (e.receipt_images || []).length === 0) {
      flags.push({
        severity: "warning", code: "NO_RECEIPT_LARGE",
        entity: "expense", entity_id: e._id, label: eLabel,
        message: `${eLabel} ($${amount.toFixed(2)}) has no receipt attached. Policy requires documentation for expenses over $200.`,
        action: "Attach receipt or supporting documentation. Submitted by " + (e.submitted_by?.full_name || "unknown") + ".",
        branch: e.branch_id?.name, added_by: e.submitted_by?.full_name,
      });
    }

    if (e.submitted_at && e.approved_at) {
      const diffMins = (new Date(e.approved_at) - new Date(e.submitted_at)) / 60000;
      if (diffMins < 5) {
        flags.push({
          severity: "warning", code: "RAPID_APPROVAL",
          entity: "expense", entity_id: e._id, label: eLabel,
          message: `${eLabel} was approved in ${diffMins.toFixed(0)} minute(s) — too fast for meaningful review.`,
          action: "Verify the approval by " + (e.approved_by?.full_name || "unknown") + " was legitimate.",
          branch: e.branch_id?.name, added_by: e.submitted_by?.full_name,
        });
      }
    }

    if (amount >= 100 && amount % 50 === 0) {
      flags.push({
        severity: "info", code: "ROUND_NUMBER",
        entity: "expense", entity_id: e._id, label: eLabel,
        message: `${eLabel} is a round number ($${amount.toFixed(2)}) which may indicate an estimate rather than an actual amount.`,
        action: "Confirm exact amount and attach receipt. Submitted by " + (e.submitted_by?.full_name || "unknown") + ".",
        branch: e.branch_id?.name, added_by: e.submitted_by?.full_name,
      });
    }
  }

  // Balance sheet integrity
  try {
    const bs = await getBalanceSheet(user, query);
    if (!bs.is_balanced) {
      flags.push({
        severity: "critical", code: "BALANCE_SHEET_IMBALANCE",
        entity: "balance_sheet", entity_id: null, label: "Balance Sheet",
        message: `Balance sheet does not balance. Assets $${bs.assets.total.toFixed(2)} ≠ Liabilities + Equity $${bs.total_liabilities_and_equity.toFixed(2)}. Difference: $${Math.abs(bs.balancing_difference).toFixed(2)}.`,
        action: "Review and reconcile balance entries. Ensure opening balances are recorded.",
        branch: null, added_by: null,
      });
    }
  } catch (_) { /* balance sheet failure doesn't block data health */ }

  // Balance entries missing reference numbers over $1,000
  const entryMatch = {};
  if (branchIds) entryMatch.$or = [{ branch_id: { $in: branchIds } }, { branch_id: null }];
  const largeEntries = await BalanceEntry.find({ ...entryMatch, reference: { $in: ["", null] } })
    .populate("created_by", "full_name")
    .lean();
  for (const be of largeEntries) {
    const amt = d128(be.amount);
    if (Math.abs(amt) >= 1000) {
      flags.push({
        severity: "warning", code: "ENTRY_NO_REFERENCE",
        entity: "balance_entry", entity_id: be._id,
        label: `${be.type.toUpperCase()} – ${be.description}`,
        message: `Balance entry of $${Math.abs(amt).toFixed(2)} (${be.category}) has no reference number. Added by ${be.created_by?.full_name || "unknown"}.`,
        action: "Add a reference number (invoice, loan agreement, etc.) for audit trail.",
        branch: null, added_by: be.created_by?.full_name,
      });
    }
  }

  const critical = flags.filter((f) => f.severity === "critical").length;
  const warning = flags.filter((f) => f.severity === "warning").length;
  const info = flags.filter((f) => f.severity === "info").length;

  return {
    generated_at: now,
    summary: { critical, warning, info, total: flags.length },
    flags: flags.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    }),
  };
}

module.exports = {
  getOverview,
  getTradingAccount,
  getIncomeStatement,
  getLedger,
  getRevenueAnalysis,
  getAuditTrail,
  // Tier 2
  getFixedAssets,
  createFixedAsset,
  updateFixedAsset,
  getBalanceSheet,
  getCashFlowStatement,
  getDataHealth,
  getBalanceEntries,
  createBalanceEntry,
  updateBalanceEntry,
  deleteBalanceEntry,
};
