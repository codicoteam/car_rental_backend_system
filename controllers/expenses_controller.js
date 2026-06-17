const expensesService = require("../services/expenses_service");

/**
 * POST /api/v1/expenses
 * Create a new expense
 */
async function createExpense(req, res, next) {
  try {
    const submittedByUserId = req.user._id;
    const payload = req.body;
    const result = await expensesService.createExpense(submittedByUserId, payload);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/expenses
 * List expenses with optional filters
 */
async function listExpenses(req, res, next) {
  try {
    const { status, category, branch_id, submitted_by, date_from, date_to, search } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (branch_id) filters.branch_id = branch_id;
    if (submitted_by) filters.submitted_by = submitted_by;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;
    if (search) filters.search = search;

    const result = await expensesService.listExpenses(filters);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/expenses/:id
 * Get a single expense by ID
 */
async function getExpense(req, res, next) {
  try {
    const { id } = req.params;
    const result = await expensesService.getExpenseById(id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/expenses/:id
 * Update an expense (only if draft)
 */
async function updateExpense(req, res, next) {
  try {
    const { id } = req.params;
    const payload = req.body;
    const requestingUserId = req.user._id;
    const requestingUserRoles = req.user.roles || [];
    const result = await expensesService.updateExpense(id, payload, requestingUserId, requestingUserRoles);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/expenses/:id
 * Delete an expense
 */
async function deleteExpense(req, res, next) {
  try {
    const { id } = req.params;
    const requestingUserId = req.user._id;
    const requestingUserRoles = req.user.roles || [];
    const result = await expensesService.deleteExpense(id, requestingUserId, requestingUserRoles);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/expenses/:id/submit
 * Submit a draft expense for approval
 */
async function submitExpense(req, res, next) {
  try {
    const { id } = req.params;
    const requestingUserId = req.user._id;
    const result = await expensesService.submitExpense(id, requestingUserId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/expenses/:id/approve
 * Approve a pending expense
 */
async function approveExpense(req, res, next) {
  try {
    const { id } = req.params;
    const approvingUserId = req.user._id;
    const result = await expensesService.approveExpense(id, approvingUserId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/expenses/:id/reject
 * Reject a pending expense
 */
async function rejectExpense(req, res, next) {
  try {
    const { id } = req.params;
    const approvingUserId = req.user._id;
    const { reason } = req.body;
    const result = await expensesService.rejectExpense(id, approvingUserId, reason);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/expenses/summary
 * Get expense summary stats
 */
async function getExpenseSummary(req, res, next) {
  try {
    const { branch_id } = req.query;
    const result = await expensesService.getExpenseSummary(branch_id || null);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createExpense,
  listExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  submitExpense,
  approveExpense,
  rejectExpense,
  getExpenseSummary,
};
