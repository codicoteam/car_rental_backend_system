const Expense = require("../models/expense_model");
const mongoose = require("mongoose");

const POPULATE_BRANCH = { path: "branch_id", select: "name code" };
const POPULATE_VEHICLE = { path: "vehicle_id", select: "plate_number vin" };
const POPULATE_SUBMITTED_BY = { path: "submitted_by", select: "full_name email" };
const POPULATE_APPROVED_BY = { path: "approved_by", select: "full_name email" };

function makeError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

/**
 * Create a new expense (status defaults to draft unless pending_approval is passed)
 */
async function createExpense(submittedByUserId, payload) {
  const {
    title,
    category,
    amount,
    currency,
    date,
    description,
    branch_id,
    vehicle_id,
    receipt_images,
    tags,
    notes,
    status,
  } = payload;

  const expenseData = {
    title,
    category,
    amount,
    currency: currency || "USD",
    date: new Date(date),
    description: description || "",
    branch_id,
    vehicle_id: vehicle_id || null,
    receipt_images: receipt_images || [],
    tags: tags || [],
    notes: notes || "",
    submitted_by: submittedByUserId,
    status: "draft",
    submitted_at: null,
  };

  if (status === "pending_approval") {
    expenseData.status = "pending_approval";
    expenseData.submitted_at = new Date();
  }

  const expense = new Expense(expenseData);
  await expense.save();
  await expense.populate([
    POPULATE_BRANCH,
    POPULATE_VEHICLE,
    POPULATE_SUBMITTED_BY,
    POPULATE_APPROVED_BY,
  ]);
  return expense;
}

/**
 * List expenses with optional filters
 */
async function listExpenses(filters = {}) {
  const query = {};

  if (filters.status) query.status = filters.status;
  if (filters.category) query.category = filters.category;
  if (filters.branch_id) query.branch_id = filters.branch_id;
  if (filters.submitted_by) query.submitted_by = filters.submitted_by;

  if (filters.date_from || filters.date_to) {
    query.date = {};
    if (filters.date_from) query.date.$gte = new Date(filters.date_from);
    if (filters.date_to) {
      const to = new Date(filters.date_to);
      to.setHours(23, 59, 59, 999);
      query.date.$lte = to;
    }
  }

  if (filters.search) {
    const regex = new RegExp(filters.search, "i");
    query.$or = [{ title: regex }, { reference: regex }];
  }

  const expenses = await Expense.find(query)
    .populate(POPULATE_BRANCH)
    .populate(POPULATE_VEHICLE)
    .populate(POPULATE_SUBMITTED_BY)
    .populate(POPULATE_APPROVED_BY)
    .sort({ date: -1 })
    .lean();

  return expenses;
}

/**
 * Get single expense by ID
 */
async function getExpenseById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw makeError("Invalid expense ID", 400, "INVALID_ID");
  }

  const expense = await Expense.findById(id)
    .populate(POPULATE_BRANCH)
    .populate(POPULATE_VEHICLE)
    .populate(POPULATE_SUBMITTED_BY)
    .populate(POPULATE_APPROVED_BY)
    .lean();

  if (!expense) {
    throw makeError("Expense not found", 404, "EXPENSE_NOT_FOUND");
  }

  return expense;
}

/**
 * Update an expense — only if status is draft; only submitter or admin can edit
 */
async function updateExpense(id, payload, requestingUserId, requestingUserRoles) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw makeError("Invalid expense ID", 400, "INVALID_ID");
  }

  const expense = await Expense.findById(id);
  if (!expense) {
    throw makeError("Expense not found", 404, "EXPENSE_NOT_FOUND");
  }

  if (expense.status !== "draft") {
    throw makeError("Only draft expenses can be edited", 400, "NOT_DRAFT");
  }

  const isAdmin = requestingUserRoles && requestingUserRoles.includes("admin");
  const isSubmitter = expense.submitted_by.toString() === requestingUserId.toString();

  if (!isAdmin && !isSubmitter) {
    throw makeError("You are not authorised to edit this expense", 403, "FORBIDDEN");
  }

  const allowedFields = [
    "title",
    "category",
    "amount",
    "currency",
    "date",
    "description",
    "vehicle_id",
    "receipt_images",
    "tags",
    "notes",
    "branch_id",
  ];

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      if (field === "date") {
        expense[field] = new Date(payload[field]);
      } else {
        expense[field] = payload[field];
      }
    }
  }

  await expense.save();
  await expense.populate([
    POPULATE_BRANCH,
    POPULATE_VEHICLE,
    POPULATE_SUBMITTED_BY,
    POPULATE_APPROVED_BY,
  ]);
  return expense;
}

/**
 * Delete an expense — admin can always; submitter can only if draft
 */
async function deleteExpense(id, requestingUserId, requestingUserRoles) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw makeError("Invalid expense ID", 400, "INVALID_ID");
  }

  const expense = await Expense.findById(id);
  if (!expense) {
    throw makeError("Expense not found", 404, "EXPENSE_NOT_FOUND");
  }

  const isAdmin = requestingUserRoles && requestingUserRoles.includes("admin");
  const isSubmitter = expense.submitted_by.toString() === requestingUserId.toString();

  if (!isAdmin && !(isSubmitter && expense.status === "draft")) {
    throw makeError("You are not authorised to delete this expense", 403, "FORBIDDEN");
  }

  await Expense.findByIdAndDelete(id);
  return { deleted: true };
}

/**
 * Submit an expense for approval — only submitter can submit; must be draft
 */
async function submitExpense(id, requestingUserId) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw makeError("Invalid expense ID", 400, "INVALID_ID");
  }

  const expense = await Expense.findById(id);
  if (!expense) {
    throw makeError("Expense not found", 404, "EXPENSE_NOT_FOUND");
  }

  if (expense.status !== "draft") {
    throw makeError("Only draft expenses can be submitted", 400, "NOT_DRAFT");
  }

  const isSubmitter = expense.submitted_by.toString() === requestingUserId.toString();
  if (!isSubmitter) {
    throw makeError("Only the expense submitter can submit for approval", 403, "FORBIDDEN");
  }

  expense.status = "pending_approval";
  expense.submitted_at = new Date();
  await expense.save();

  await expense.populate([
    POPULATE_BRANCH,
    POPULATE_VEHICLE,
    POPULATE_SUBMITTED_BY,
    POPULATE_APPROVED_BY,
  ]);
  return expense;
}

/**
 * Approve an expense — must be pending_approval
 */
async function approveExpense(id, approvingUserId) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw makeError("Invalid expense ID", 400, "INVALID_ID");
  }

  const expense = await Expense.findById(id);
  if (!expense) {
    throw makeError("Expense not found", 404, "EXPENSE_NOT_FOUND");
  }

  if (expense.status !== "pending_approval") {
    throw makeError("Only pending approval expenses can be approved", 400, "NOT_PENDING");
  }

  expense.status = "approved";
  expense.approved_by = approvingUserId;
  expense.approved_at = new Date();
  await expense.save();

  await expense.populate([
    POPULATE_BRANCH,
    POPULATE_VEHICLE,
    POPULATE_SUBMITTED_BY,
    POPULATE_APPROVED_BY,
  ]);
  return expense;
}

/**
 * Reject an expense — must be pending_approval
 */
async function rejectExpense(id, approvingUserId, reason) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw makeError("Invalid expense ID", 400, "INVALID_ID");
  }

  const expense = await Expense.findById(id);
  if (!expense) {
    throw makeError("Expense not found", 404, "EXPENSE_NOT_FOUND");
  }

  if (expense.status !== "pending_approval") {
    throw makeError("Only pending approval expenses can be rejected", 400, "NOT_PENDING");
  }

  expense.status = "rejected";
  expense.approved_by = approvingUserId;
  expense.approved_at = new Date();
  expense.rejection_reason = reason || "";
  await expense.save();

  await expense.populate([
    POPULATE_BRANCH,
    POPULATE_VEHICLE,
    POPULATE_SUBMITTED_BY,
    POPULATE_APPROVED_BY,
  ]);
  return expense;
}

/**
 * Get expense summary stats
 */
async function getExpenseSummary(branchId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const branchMatch = branchId ? { branch_id: new mongoose.Types.ObjectId(branchId) } : {};

  // Total approved this month
  const approvedThisMonth = await Expense.aggregate([
    {
      $match: {
        ...branchMatch,
        status: "approved",
        date: { $gte: startOfMonth, $lte: endOfMonth },
      },
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: { $toDouble: "$amount" },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  // Total pending
  const pendingExpenses = await Expense.aggregate([
    {
      $match: {
        ...branchMatch,
        status: "pending_approval",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: { $toDouble: "$amount" } },
        count: { $sum: 1 },
      },
    },
  ]);

  // Total rejected this month
  const rejectedThisMonth = await Expense.aggregate([
    {
      $match: {
        ...branchMatch,
        status: "rejected",
        date: { $gte: startOfMonth, $lte: endOfMonth },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: { $toDouble: "$amount" } },
        count: { $sum: 1 },
      },
    },
  ]);

  // Total approved all time
  const approvedAllTime = await Expense.aggregate([
    {
      $match: {
        ...branchMatch,
        status: "approved",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: { $toDouble: "$amount" } },
        count: { $sum: 1 },
      },
    },
  ]);

  // By category (approved only)
  const byCategory = await Expense.aggregate([
    {
      $match: {
        ...branchMatch,
        status: "approved",
      },
    },
    {
      $group: {
        _id: "$category",
        total_amount: { $sum: { $toDouble: "$amount" } },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        category: "$_id",
        total_amount: 1,
        count: 1,
      },
    },
    { $sort: { total_amount: -1 } },
  ]);

  // By month — last 6 months of approved expenses
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const byMonth = await Expense.aggregate([
    {
      $match: {
        ...branchMatch,
        status: "approved",
        date: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
        },
        total_amount: { $sum: { $toDouble: "$amount" } },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        month: {
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
          ],
        },
        total_amount: 1,
        count: 1,
      },
    },
    { $sort: { month: 1 } },
  ]);

  return {
    total_approved_this_month: approvedThisMonth[0]?.total ?? 0,
    total_pending: pendingExpenses[0]?.total ?? 0,
    total_pending_count: pendingExpenses[0]?.count ?? 0,
    total_rejected_this_month: rejectedThisMonth[0]?.total ?? 0,
    total_rejected_count_this_month: rejectedThisMonth[0]?.count ?? 0,
    total_approved_all_time: approvedAllTime[0]?.total ?? 0,
    by_category: byCategory,
    by_month: byMonth,
  };
}

module.exports = {
  createExpense,
  listExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  submitExpense,
  approveExpense,
  rejectExpense,
  getExpenseSummary,
};
