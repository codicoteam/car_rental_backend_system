// models/vehicle.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const MetadataSchema = new Schema(
  {
    gps_device_id: { type: String, trim: true },
    notes: { type: String, trim: true },
    seats: { type: Number, min: 1, max: 20 },
    doors: { type: Number, min: 2, max: 6 },
    features: {
      type: [String],
      enum: ["ac", "bluetooth", "gps", "child_seat", "4x4"],
    },
  },
  { _id: false }
);

const VehicleSchema = new Schema(
  {
    vin: { type: String, trim: true, unique: true, sparse: true },
    plate_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    // refs
    vehicle_model_id: {
      type: Schema.Types.ObjectId,
      ref: "VehicleModel",
      required: true,
      index: true,
    },
    branch_id: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    odometer_km: { type: Number, default: 0, min: 0 },
    color: { type: String, trim: true },

    status: {
      type: String,
      enum: ["active", "maintenance", "retired"],
      default: "active",
      index: true,
    },
    // cached/derived for UI speed
    availability_state: {
      type: String,
      enum: ["available", "reserved", "out", "blocked"],
      default: "available",
      index: true,
    },
    photos: {
      type: [String],
      default: [],
    },

    // NEW: last service info
    last_service_at: { type: Date, default: null }, // date of last service
    last_service_odometer_km: { type: Number, min: 0, default: null }, // odo at last service (optional)
    metadata: { type: MetadataSchema, default: {} },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "vehicles",
  }
);

// Indexes
VehicleSchema.index({ plate_number: 1 }, { unique: true });
VehicleSchema.index({ branch_id: 1, status: 1 });

// Virtuals
VehicleSchema.virtual("display_name").get(function () {
  return `${this.plate_number}${this.color ? " • " + this.color : ""}`;
});

// Methods
VehicleSchema.methods.setAvailability = function (state) {
  if (!["available", "reserved", "out", "blocked"].includes(state)) {
    throw new Error("Invalid availability_state");
  }
  this.availability_state = state;
  return this;
};

// NEW helper: record a service event quickly
VehicleSchema.methods.recordService = function (
  date = new Date(),
  odometerKm = null
) {
  this.last_service_at = date;
  if (typeof odometerKm === "number")
    this.last_service_odometer_km = odometerKm;
  return this;
};

module.exports = mongoose.model("Vehicle", VehicleSchema);
