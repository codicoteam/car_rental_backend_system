const mongoose = require("mongoose");
const { Schema } = mongoose;

const ServiceOrderSchema = new Schema(
  {
    vehicle_id: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["scheduled_service", "repair", "tyre_change", "inspection"],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "completed", "cancelled"],
      default: "open",
      index: true,
    },

    odometer_km: { type: Number, min: 0 },

    cost: { type: Number, min: 0 },

    notes: { type: String, trim: true },

    // user system or external vendor
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    performed_by: {
      type: Schema.Types.ObjectId,
      ref: "User", // or Vendor model if you add one
      required: false,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "service_orders",
  }
);

// Indexes for analytics + filtering
ServiceOrderSchema.index({ vehicle_id: 1, status: 1 });
ServiceOrderSchema.index({ vehicle_id: 1, type: 1 });

module.exports = mongoose.model("ServiceOrder", ServiceOrderSchema);
