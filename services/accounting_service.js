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

module.exports = {
  getOverview,
  getTradingAccount,
  getIncomeStatement,
  getLedger,
  getRevenueAnalysis,
  getAuditTrail,
};
