// controllers/payment_controller.js
const paymentService = require("../services/payment_service");

function sendError(res, err) {
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal server error.",
    ...(process.env.NODE_ENV !== "production" && err.stack
      ? { stack: err.stack }
      : {}),
  });
}

module.exports = {
  // POST /initiate
  initiate: async (req, res) => {
    try {
      const {
        reservation_id,
        driver_booking_id,
        amount,
        currency,
        promo_code,
        reference,
        email,
        lineItem,
      } = req.body;

      if (!reservation_id && !driver_booking_id) {
        return res.status(400).json({
          success: false,
          message: "reservation_id or driver_booking_id is required.",
        });
      }

      const result = await paymentService.initiateRedirectPayment({
        user: req.user,
        reservation_id,
        driver_booking_id,
        amount,
        currency,
        promo_code,
        reference,
        payerEmail: email,
        lineItem,
      });

      res.status(201).json({ success: true, ...result });
    } catch (err) {
      sendError(res, err);
    }
  },

  // POST /mobile
  mobile: async (req, res) => {
    try {
      const {
        reservation_id,
        driver_booking_id,
        amount,
        currency,
        promo_code,
        reference,
        phone,
        mobileMethod,
        lineItem,
      } = req.body;

      if (!reservation_id && !driver_booking_id) {
        return res.status(400).json({
          success: false,
          message: "reservation_id or driver_booking_id is required.",
        });
      }

      const result = await paymentService.initiateMobilePayment({
        user: req.user,
        reservation_id,
        driver_booking_id,
        amount,
        currency,
        promo_code,
        phone,
        mobileMethod,
        reference,
        lineItem,
      });

      res.status(201).json({ success: true, ...result });
    } catch (err) {
      sendError(res, err);
    }
  },

  // POST /:id/poll  or GET /:id/status
  status: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await paymentService.pollStatus({ paymentId: id });
      res.json({ success: true, ...result });
    } catch (err) {
      sendError(res, err);
    }
  },

  // GET /:id
  getOne: async (req, res) => {
    try {
      const { id } = req.params;
      const payment = await paymentService.getPaymentById(id);
      res.json({ success: true, payment });
    } catch (err) {
      sendError(res, err);
    }
  },

  // GET /
  list: async (req, res) => {
    try {
      const { status, mine } = req.query;
      const userId = mine === "true" ? req.user._id : undefined;

      const result = await paymentService.listPayments({
        userId,
        status,
      });

      res.json({ success: true, ...result });
    } catch (err) {
      sendError(res, err);
    }
  },

  // POST /:id/apply-promo
  applyPromo: async (req, res) => {
    try {
      const { id } = req.params;
      const { code } = req.body;
      if (!code)
        return res
          .status(400)
          .json({ success: false, message: "Promo code is required." });

      const result = await paymentService.applyPromo({ paymentId: id, code });
      res.json({ success: true, ...result });
    } catch (err) {
      sendError(res, err);
    }
  },

  // DELETE /:id/promo
  removePromo: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await paymentService.removePromo({ paymentId: id });
      res.json({ success: true, ...result });
    } catch (err) {
      sendError(res, err);
    }
  },

  // POST /:id/refund
  refund: async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, provider_ref } = req.body;
      const result = await paymentService.refundPayment({
        paymentId: id,
        amount,
        provider_ref,
      });
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      sendError(res, err);
    }
  },

  // POST /:id/cancel
  cancel: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await paymentService.cancelPayment({ paymentId: id });
      res.json({ success: true, ...result });
    } catch (err) {
      sendError(res, err);
    }
  },

  // POST /webhook/paynow
  webhook: async (req, res) => {
    try {
      const result = await paymentService.handlePaynowWebhook({
        query: req.query,
        body: req.body,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      // Always 200 OK for webhooks unless internal error
      res.status(200).json({
        success: false,
        message: err.message || "Webhook processing error.",
      });
    }
  },
};
