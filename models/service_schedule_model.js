const mongoose = require("mongoose");
const { Schema } = mongoose;

const ServiceScheduleSchema = new Schema(
  {
    // Bind specifically to a vehicle OR to a vehicle model
    vehicle_id: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },

    vehicle_model_id: {
      type: Schema.Types.ObjectId,
      ref: "VehicleModel",
      default: null,
    },

    // recurrence rules
    interval_km: { type: Number, min: 0, default: null },
    interval_days: { type: Number, min: 0, default: null },

    // next due values (computed & updated automatically by your logic)
    next_due_at: { type: Date, default: null },
    next_due_odo: { type: Number, min: 0, default: null },

    notes: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "service_schedules",
  }
);

// Ensure at least *one* of vehicle or vehicle_model is provided
ServiceScheduleSchema.pre("validate", function (next) {
  if (!this.vehicle_id && !this.vehicle_model_id) {
    return next(
      new Error(
        "ServiceSchedule requires either vehicle_id or vehicle_model_id"
      )
    );
  }
  next();
});

ServiceScheduleSchema.index({ vehicle_id: 1 });
ServiceScheduleSchema.index({ vehicle_model_id: 1 });

module.exports = mongoose.model("ServiceSchedule", ServiceScheduleSchema);
