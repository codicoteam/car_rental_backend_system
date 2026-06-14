// models/audit_log_model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const AuditLogSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actor_id: { type: Schema.Types.ObjectId, ref: "User", default: null },

    action: {
      type: String,
      required: true,
      enum: [
        "login",
        "logout",
        "password_change",
        "profile_created",
        "profile_updated",
        "user_created",
        "user_updated",
        "user_deleted",
        "reservation_created",
        "reservation_cancelled",
        "reservation_confirmed",
        "reservation_checked_out",
        "reservation_completed",
        "payment_initiated",
        "payment_completed",
        "payment_failed",
        "driver_booking_created",
        "driver_booking_cancelled",
        "driver_booking_completed",
        "document_uploaded",
        "other",
      ],
      index: true,
    },

    entity_type: {
      type: String,
      enum: ["user", "profile", "reservation", "payment", "driver_booking", "document", "other"],
      default: "other",
    },

    entity_id: { type: Schema.Types.ObjectId, default: null },

    description: { type: String, trim: true },

    metadata: { type: Schema.Types.Mixed, default: {} },

    ip_address: { type: String, trim: true },
    user_agent: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

AuditLogSchema.index({ user_id: 1, created_at: -1 });
AuditLogSchema.index({ action: 1, created_at: -1 });

module.exports = mongoose.model("AuditLog", AuditLogSchema);
