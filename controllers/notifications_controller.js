// controllers/notifications_controller.js
const svc = require("../services/notifications_service");
const mongoose = require("mongoose");

function sendError(res, err) {
  const status = err.status || 500;
  return res.status(status).json({
    success: false,
    message: err.message || "Internal server error.",
    ...(process.env.NODE_ENV !== "production" && err.stack
      ? { stack: err.stack }
      : {}),
  });
}

module.exports = {
  // POST /
  create: async (req, res) => {
    try {
      const payload = req.body || {};
      const doc = await svc.createNotification({
        payload,
        created_by: req.user?._id,
      });
      return res.status(201).json({ success: true, notification: doc });
    } catch (err) {
      return sendError(res, err);
    }
  },

  // GET /
// controllers/notification_controller.js
list: async (req, res) => {
  try {
    const { status, type, priority, active, sort } = req.query;

    const result = await svc.listNotifications({
      status,
      type,
      priority,
      active:
        typeof active === "string" ? active === "true" : undefined,
      sort: sort || "-created_at",
    });

    return res.json({ success: true, ...result });
  } catch (err) {
    return sendError(res, err);
  }
},


  // GET /mine
  listMine: async (req, res) => {
    try {
      const { onlyUnread, page, limit, sort, includeFuture } = req.query;
      const result = await svc.listMine({
        user: req.user,
        onlyUnread: String(onlyUnread) === "true",
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        sort: sort || "-created_at",
        includeFuture: String(includeFuture) === "true",
      });
      return res.json({ success: true, ...result });
    } catch (err) {
      return sendError(res, err);
    }
  },

  // GET /:id
  getOne: async (req, res) => {
    try {
      const doc = await svc.getNotification(req.params.id);
      return res.json({ success: true, notification: doc });
    } catch (err) {
      return sendError(res, err);
    }
  },

  // PATCH /:id
  update: async (req, res) => {
    try {
      const doc = await svc.updateNotification(req.params.id, req.body || {});
      return res.json({ success: true, notification: doc });
    } catch (err) {
      return sendError(res, err);
    }
  },

  // POST /:id/schedule
  schedule: async (req, res) => {
    try {
      const { send_at } = req.body || {};
      const doc = await svc.scheduleNotification(req.params.id, send_at);
      return res.json({ success: true, notification: doc });
    } catch (err) {
      return sendError(res, err);
    }
  },

  // POST /:id/send
  sendNow: async (req, res) => {
    try {
      const doc = await svc.sendNow(req.params.id);
      return res.json({ success: true, notification: doc });
    } catch (err) {
      return sendError(res, err);
    }
  },

  // POST /:id/cancel
  cancel: async (req, res) => {
    try {
      const doc = await svc.cancelNotification(req.params.id);
      return res.json({ success: true, notification: doc });
    } catch (err) {
      return sendError(res, err);
    }
  },

  // DELETE /:id  (soft delete/disable)
  disable: async (req, res) => {
    try {
      const doc = await svc.disableNotification(req.params.id);
      return res.json({ success: true, notification: doc });
    } catch (err) {
      return sendError(res, err);
    }
  },

  // POST /:id/read
  ackRead: async (req, res) => {
    try {
      const out = await svc.ackRead({ id: req.params.id, user: req.user });
      return res.status(200).json({ success: true, ...out });
    } catch (err) {
      return sendError(res, err);
    }
  },

  // POST /:id/action
  ackAction: async (req, res) => {
    try {
      const { action } = req.body || {};
      const out = await svc.ackAction({
        id: req.params.id,
        user: req.user,
        action,
      });
      return res.status(200).json({ success: true, ...out });
    } catch (err) {
      return sendError(res, err);
    }
  },

  // POST /bulk/read
  bulkRead: async (req, res) => {
    try {
      const { ids } = req.body || {};
      const out = await svc.bulkMarkRead({ ids, user: req.user });
      return res.status(200).json({ success: true, ...out });
    } catch (err) {
      return sendError(res, err);
    }
  },

  // GET /:id/acks
  listAcks: async (req, res) => {
    try {
      const acks = await svc.listAcknowledgements(req.params.id);
      return res.json({ success: true, acknowledgements: acks });
    } catch (err) {
      return sendError(res, err);
    }
  },

  // GET /for-user/:userId
  listForUserById: async (req, res) => {
    try {
      const { onlyUnread, includeFuture, roles } = req.query;

      const userId = new mongoose.Types.ObjectId(String(req.params.userId));

      // roles can be provided as CSV: ?roles=customer,driver
      const roleList =
        typeof roles === "string" && roles.trim()
          ? roles
              .split(",")
              .map((r) => r.trim())
              .filter(Boolean)
          : [];

      const items = await svc.listForUserById({
        userId,
        roles: roleList,
        onlyUnread: String(onlyUnread) === "true",
        includeFuture: String(includeFuture) === "true",
      });

      return res.json({ success: true, items, total: items.length });
    } catch (err) {
      return sendError(res, err);
    }
  },

  // GET /created-by/:userId
  listCreatedByUserId: async (req, res) => {
    try {
      const { status, type, priority, active } = req.query;

      const createdByUserId = new mongoose.Types.ObjectId(
        String(req.params.userId)
      );

      const items = await svc.listCreatedByUserId({
        createdByUserId,
        status,
        type,
        priority,
        active: typeof active === "string" ? active === "true" : undefined,
      });

      return res.json({ success: true, items, total: items.length });
    } catch (err) {
      return sendError(res, err);
    }
  },
};
