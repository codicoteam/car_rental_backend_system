// controllers/dashboard_controller.js
const dashboardService = require("../services/dashboard_services");

/**
 * Standard API error response helper
 */
function sendError(res, err) {
  const statusCode =
    err?.statusCode ||
    err?.status ||
    (err?.name === "ValidationError" ? 400 : 500);

  // Hide internal errors in production unless explicitly marked safe
  const isProd = process.env.NODE_ENV === "production";

  const payload = {
    success: false,
    message:
      err?.publicMessage ||
      err?.message ||
      "An unexpected error occurred.",
  };

  // Optional extras (helpful in dev, safe to include if not sensitive)
  if (!isProd) {
    payload.error = {
      name: err?.name,
      code: err?.code,
      stack: err?.stack,
    };
  }

  return res.status(statusCode).json(payload);
}

/**
 * Async wrapper with controller-level error handling.
 * Ensures consistent error responses even if no global error handler exists.
 */
const asyncHandler =
  (fn) =>
  async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      // If you have a global error middleware, call next(err) instead.
      // But since you asked for correct error responses here, we respond directly:
      return sendError(res, err);
    }
  };

/**
 * GET /api/dashboard/admin
 * Requires auth + admin role in router middleware.
 */
const getAdminDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getAdminDashboard(req.query);
  return res.status(200).json({ success: true, data });
});

/**
 * GET /api/dashboard/manager
 * Requires auth + manager role in router middleware.
 */
const getManagerDashboard = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    // Should not happen if authMiddleware is applied, but safe-guard anyway
    const err = new Error("Authentication required.");
    err.statusCode = 401;
    throw err;
  }

  const data = await dashboardService.getManagerDashboard(req.user._id, req.query);
  return res.status(200).json({ success: true, data });
});

module.exports = {
  getAdminDashboard,
  getManagerDashboard,
};
