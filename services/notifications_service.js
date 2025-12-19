// services/notifications_service.js
const mongoose = require("mongoose");
const Notification = require("../models/notifications_models");
const User = require("../models/user_model"); // adjust path to your User model

/** Helper: build audience filter for "mine" */
function buildAudienceFilterForUser({ userId, roles = [] }) {
  return {
    $or: [
      { "audience.scope": "all" },
      { "audience.scope": "user", "audience.user_id": userId },
      {
        "audience.scope": "roles",
        "audience.roles": { $elemMatch: { $in: roles } },
      },
    ],
  };
}

/** LIST notifications delivered/visible to a specific user (no pagination) */
async function listForUserById({
  userId,
  roles = [],
  onlyUnread = false,
  includeFuture = false,
}) {
  const now = new Date();

  const q = {
    is_active: true,
    $and: [
      buildAudienceFilterForUser({ userId, roles }),
      {
        $or: [
          { status: "sent" },
          includeFuture
            ? { status: "scheduled" }
            : { status: "scheduled", send_at: { $lte: now } },
        ],
      },
      { $or: [{ expires_at: null }, { expires_at: { $gt: now } }] },
    ],
  };

  if (onlyUnread) {
    q.$and.push({
      $or: [
        { acknowledgements: { $size: 0 } },
        { "acknowledgements.user_id": { $ne: userId } },
        {
          $and: [
            { "acknowledgements.user_id": userId },
            { "acknowledgements.read_at": null },
          ],
        },
      ],
    });
  }

  // no pagination
  return Notification.find(q).sort("-created_at");
}

/** CREATE */
async function createNotification({ payload, created_by }) {
  // default to draft if status not provided
  const doc = new Notification({
    ...payload,
    created_by: created_by || null,
  });
  await doc.validate(); // throw 400-ish upstream when caught
  const saved = await doc.save();
  return saved;
}

/** LIST (admin/global) */
async function listNotifications({
  status,
  type,
  priority,
  active = true,
  page = 1,
  limit = 20,
  sort = "-created_at",
}) {
  const q = {};
  if (typeof active === "boolean") q.is_active = active;
  if (status) q.status = status;
  if (type) q.type = type;
  if (priority) q.priority = priority;

  const pg = Math.max(1, Number(page));
  const lim = Math.max(1, Number(limit));
  const skip = (pg - 1) * lim;

  const [items, total] = await Promise.all([
    Notification.find(q).sort(sort).skip(skip).limit(lim),
    Notification.countDocuments(q),
  ]);

  return {
    items,
    total,
    page: pg,
    limit: lim,
    pages: Math.ceil(total / lim) || 1,
  };
}

/** LIST "mine" (audience-filtered) */
async function listMine({
  user,
  onlyUnread = false,
  page = 1,
  limit = 20,
  sort = "-created_at",
  includeFuture = false, // by default hide future scheduled
}) {
  const now = new Date();
  const q = {
    is_active: true,
    $and: [
      buildMineAudienceFilter(user),
      {
        // show sent or scheduled already due; drafts are not user-facing by default
        $or: [
          { status: "sent" },
          includeFuture
            ? { status: "scheduled" }
            : { status: "scheduled", send_at: { $lte: now } },
        ],
      },
    ],
  };

  // Filter out expired
  q.$and.push({ $or: [{ expires_at: null }, { expires_at: { $gt: now } }] });

  if (onlyUnread) {
    q.$and.push({
      $or: [
        { acknowledgements: { $size: 0 } },
        { "acknowledgements.user_id": { $ne: user._id } },
        // Or user exists but has no read_at
        {
          $and: [
            { "acknowledgements.user_id": user._id },
            { "acknowledgements.read_at": null },
          ],
        },
      ],
    });
  }

  const pg = Math.max(1, Number(page));
  const lim = Math.max(1, Number(limit));
  const skip = (pg - 1) * lim;

  const [items, total] = await Promise.all([
    Notification.find(q).sort(sort).skip(skip).limit(lim),
    Notification.countDocuments(q),
  ]);

  return {
    items,
    total,
    page: pg,
    limit: lim,
    pages: Math.ceil(total / lim) || 1,
  };
}

/** GET ONE */
async function getNotification(id) {
  const doc = await Notification.findById(id);
  if (!doc) {
    const err = new Error("Notification not found.");
    err.status = 404;
    throw err;
  }
  return doc;
}

/** UPDATE (only allowed when not sent/cancelled) */
async function updateNotification(id, updates = {}) {
  const doc = await getNotification(id);
  if (["sent", "cancelled"].includes(doc.status)) {
    const err = new Error("Cannot modify a sent or cancelled notification.");
    err.status = 409;
    throw err;
  }

  // Do not let API directly change acknowledgements here
  delete updates.acknowledgements;
  // If status becomes "scheduled" ensure send_at is present
  if (updates.status === "scheduled" && !updates.send_at && !doc.send_at) {
    const err = new Error(
      "send_at is required when scheduling a notification."
    );
    err.status = 400;
    throw err;
  }

  Object.assign(doc, updates);
  await doc.validate();
  await doc.save();
  return doc;
}

/** SCHEDULE */
async function scheduleNotification(id, send_at) {
  const doc = await getNotification(id);
  if (["sent", "cancelled"].includes(doc.status)) {
    const err = new Error("Cannot schedule a sent or cancelled notification.");
    err.status = 409;
    throw err;
  }
  if (!send_at) {
    const err = new Error("send_at is required.");
    err.status = 400;
    throw err;
  }
  doc.status = "scheduled";
  doc.send_at = new Date(send_at);
  await doc.save();
  return doc;
}

/** SEND NOW (mark as sent) */
async function sendNow(id) {
  const doc = await getNotification(id);
  if (doc.status === "sent") return doc;
  if (doc.status === "cancelled") {
    const err = new Error("Cannot send a cancelled notification.");
    err.status = 409;
    throw err;
  }
  doc.status = "sent";
  doc.sent_at = new Date();
  if (!doc.send_at) doc.send_at = doc.sent_at;
  await doc.save();
  return doc;
}

/** CANCEL */
async function cancelNotification(id) {
  const doc = await getNotification(id);
  if (doc.status === "cancelled") return doc;
  if (doc.status === "sent") {
    const err = new Error("Cannot cancel a sent notification.");
    err.status = 409;
    throw err;
  }
  doc.status = "cancelled";
  await doc.save();
  return doc;
}

/** DISABLE (soft delete) */
async function disableNotification(id) {
  const doc = await getNotification(id);
  doc.is_active = false;
  await doc.save();
  return doc;
}

/** ACK READ for user (idempotent) */
async function ackRead({ id, user }) {
  const doc = await getNotification(id);

  const idx = (doc.acknowledgements || []).findIndex(
    (a) => a.user_id && a.user_id.toString() === user._id.toString()
  );

  if (idx === -1) {
    doc.acknowledgements.push({
      user_id: user._id,
      read_at: new Date(),
      acted_at: null,
      action: null,
    });
  } else {
    if (!doc.acknowledgements[idx].read_at) {
      doc.acknowledgements[idx].read_at = new Date();
    }
  }

  await doc.save();
  return { ok: true };
}

/** ACK ACTION for user (idempotent for action label) */
async function ackAction({ id, user, action }) {
  const doc = await getNotification(id);

  const idx = (doc.acknowledgements || []).findIndex(
    (a) => a.user_id && a.user_id.toString() === user._id.toString()
  );

  if (idx === -1) {
    doc.acknowledgements.push({
      user_id: user._id,
      read_at: new Date(),
      acted_at: new Date(),
      action: action || "clicked",
    });
  } else {
    doc.acknowledgements[idx].read_at =
      doc.acknowledgements[idx].read_at || new Date();
    doc.acknowledgements[idx].acted_at = new Date();
    doc.acknowledgements[idx].action =
      action || doc.acknowledgements[idx].action || "clicked";
  }

  await doc.save();
  return { ok: true };
}

/** BULK MARK READ (ids array) */
async function bulkMarkRead({ ids = [], user }) {
  if (!Array.isArray(ids) || ids.length === 0) {
    const err = new Error("ids array is required.");
    err.status = 400;
    throw err;
  }
  const objectIds = ids
    .filter(Boolean)
    .map((x) => new mongoose.Types.ObjectId(String(x)));

  const docs = await Notification.find({
    _id: { $in: objectIds },
    is_active: true,
  });

  // Update each doc idempotently
  await Promise.all(
    docs.map(async (doc) => {
      const idx = (doc.acknowledgements || []).findIndex(
        (a) => a.user_id && a.user_id.toString() === user._id.toString()
      );
      if (idx === -1) {
        doc.acknowledgements.push({
          user_id: user._id,
          read_at: new Date(),
          acted_at: null,
          action: null,
        });
      } else if (!doc.acknowledgements[idx].read_at) {
        doc.acknowledgements[idx].read_at = new Date();
      }
      await doc.save();
    })
  );

  return { updated: docs.length };
}

/** LIST ACKS */
async function listAcknowledgements(id) {
  const doc = await getNotification(id);
  return doc.acknowledgements || [];
}


/** LIST notifications created by a specific user (no pagination) */
async function listCreatedByUserId({ createdByUserId, status, type, priority, active }) {
  const q = { created_by: createdByUserId };

  if (typeof active === "boolean") q.is_active = active;
  if (status) q.status = status;
  if (type) q.type = type;
  if (priority) q.priority = priority;

  return Notification.find(q).sort("-created_at");
}




module.exports = {
  createNotification,
  listNotifications,
  listMine,
  getNotification,
  updateNotification,
  scheduleNotification,
  sendNow,
  cancelNotification,
  disableNotification,
  ackRead,
  ackAction,
  bulkMarkRead,
  listAcknowledgements,
  listForUserById,
  listCreatedByUserId
};
