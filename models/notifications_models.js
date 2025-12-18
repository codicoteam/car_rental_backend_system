// models/notification_model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const AcknowledgementSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    read_at: { type: Date, default: null },
    acted_at: { type: Date, default: null }, // e.g., clicked CTA
    action: { type: String, trim: true, default: null }, // optional custom action label
  },
  { _id: false }
);
const AudienceSchema = new Schema(
  {
    scope: {
      type: String,
      enum: ["all", "user", "roles"],
      required: true,
      default: "all",
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null, // required when scope === "user"
      index: true,
    },
    roles: {
      type: [String],
      enum: ["customer", "agent", "manager", "admin", "driver"],
      default: undefined, // required non-empty when scope === "roles"
    },
  },
  { _id: false }
);

const NotificationSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },

    type: {
      type: String,
      enum: ["info", "system", "promo", "booking", "payment", "maintenance", "alert"],
      default: "info",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
      index: true,
    },

    audience: {
      type: AudienceSchema,
      required: true,
      default: () => ({ scope: "all" }),
    },

    channels: {
      type: [String],
      enum: ["in_app", "email", "sms", "push"],
      default: ["in_app"],
      validate: (v) => Array.isArray(v) && v.length > 0,
    },

    // Scheduling & lifecycle
    send_at: { type: Date, default: null, index: true },  // when to start dispatch
    sent_at: { type: Date, default: null },
    expires_at: { type: Date, default: null, index: true }, // optional TTL (see index below)
    status: {
      type: String,
      enum: ["draft", "scheduled", "sent", "cancelled"],
      default: "draft",
      index: true,
    },
    is_active: { type: Boolean, default: true, index: true },

    // Optional CTA / link
    action_text: { type: String, trim: true, default: null },
    action_url: { type: String, trim: true, default: null },

    // Arbitrary payload (safe, non-sensitive)
    data: { type: Schema.Types.Mixed, default: {} },

    // Read receipts (only stored for users who have interacted/seen it)
    acknowledgements: { type: [AcknowledgementSchema], default: [] },

    // Audit
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "notifications",
  }
);

/** Helpful compound indexes */
NotificationSchema.index({ "audience.scope": 1, status: 1, send_at: 1 });
NotificationSchema.index({ type: 1, priority: 1, created_at: -1 });
NotificationSchema.index({ is_active: 1, created_at: -1 });

NotificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expires_at: { $type: "date" } } });

module.exports = mongoose.model("Notification", NotificationSchema);
