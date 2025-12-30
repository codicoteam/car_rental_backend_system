// controllers/report_controller.js
const reportService = require("../services/report_service");

function sendError(res, err) {
  const statusCode =
    err?.statusCode ||
    err?.status ||
    (err?.name === "ValidationError" ? 400 : 500);

  const isProd = process.env.NODE_ENV === "production";

  const payload = {
    success: false,
    message: err?.publicMessage || err?.message || "An unexpected error occurred.",
  };

  if (!isProd) {
    payload.error = {
      name: err?.name,
      code: err?.code,
      stack: err?.stack,
    };
  }

  return res.status(statusCode).json(payload);
}

const asyncHandler =
  (fn) =>
  async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      return sendError(res, err);
    }
  };

const getAdminReport = asyncHandler(async (req, res) => {
  const data = await reportService.getAdminReport(req.query);
  return res.status(200).json({ success: true, data });
});

const getManagerReport = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    const err = new Error("Authentication required.");
    err.statusCode = 401;
    throw err;
  }
  const data = await reportService.getManagerReport(req.user._id, req.query);
  return res.status(200).json({ success: true, data });
});

module.exports = {
  getAdminReport,
  getManagerReport,
};
