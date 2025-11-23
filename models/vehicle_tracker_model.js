// models/vehicle_tracker_model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

/**
 * One-off location snapshot for the tracker device
 * (last known position).
 */
const LocationSnapshotSchema = new Schema(
  {
    latitude: { type: Number },
    longitude: { type: Number },
    speed_kmh: { type: Number, min: 0 }, // optional, from GPS if available
    heading_deg: { type: Number, min: 0, max: 360 }, // optional
    accuracy_m: { type: Number, min: 0 }, // optional
    at: { type: Date, default: Date.now },
    source: {
      type: String,
      enum: ["gps", "network", "mixed", "unknown"],
      default: "gps",
    },
  },
  { _id: false }
);

const VehicleTrackerSchema = new Schema(
  {
    // Unique identifier for the physical device (used by the Android app).
    // Could be a generated UUID, or something like "TRACKER-001".
    device_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    // Optional label for admins, e.g. "HRE Tracker 1"
    label: {
      type: String,
      trim: true,
      default: "",
    },


    // The vehicle this tracker is currently attached to (can be null when unassigned)
    vehicle_id: {
      type: ObjectId,
      ref: "Vehicle",
      default: null,
      index: true,
    },

    // Snapshot: which branch the *current vehicle* belongs to (denormalized for quick filtering)
    branch_id: {
      type: ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    // Tracker lifecycle / status
    status: {
      type: String,
      enum: ["inactive", "active", "maintenance"],
      default: "inactive",
      index: true,
    },

    // When this tracker was last seen online (any event via Socket.IO, HTTP, etc.)
    last_seen_at: {
      type: Date,
      default: null,
    },

    // Optional: last known IP/UA for debugging
    last_seen_ip: {
      type: String,
      trim: true,
      default: "",
    },
    last_seen_user_agent: {
      type: String,
      trim: true,
      default: "",
    },

    // Last known location from this tracker device
    last_location: {
      type: LocationSnapshotSchema,
      default: undefined,
    },

    // Settings for this tracker (you can expand later)
    settings: {
      reporting_interval_sec: {
        type: Number,
        default: 15, // how often device should send location in seconds (hint to client)
      },
      allow_background_tracking: {
        type: Boolean,
        default: true,
      },
    },

    // Audit: who created / registered this device in the system
    created_by: {
      type: ObjectId,
      ref: "User",
      default: null,
    },

    // Audit: when this tracker was attached to its current vehicle
    attached_at: {
      type: Date,
      default: null,
    },

    // Optional: note why/when detached
    detached_at: {
      type: Date,
      default: null,
    },
    detach_reason: {
      type: String,
      trim: true,
      default: "",
    },

    // Free-form notes for admins
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "vehicle_trackers",
  }
);

// Helpful virtual: shows whatever is attached in a human-friendly way
VehicleTrackerSchema.virtual("display_name").get(function () {
  if (this.label) return this.label;
  if (this.device_id) return `Tracker ${this.device_id}`;
  return `Tracker ${this._id}`;
});

/**
 * Helper: attach this tracker to a vehicle
 * (you will call this from a service when the Android device "logs in"
 * and the user chooses a vehicle).
 */
VehicleTrackerSchema.methods.attachToVehicle = function (vehicleId, branchId) {
  this.vehicle_id = vehicleId;
  this.branch_id = branchId || null;
  this.attached_at = new Date();
  this.detached_at = null;
  this.detach_reason = "";
  this.status = "active";
  return this;
};

/**
 * Helper: detach this tracker from its current vehicle
 */
VehicleTrackerSchema.methods.detachFromVehicle = function (reason = "") {
  this.detached_at = new Date();
  this.detach_reason = reason;
  this.vehicle_id = null;
  this.branch_id = null;
  this.status = "inactive";
  return this;
};

/**
 * Helper: update last seen + optional location
 */
VehicleTrackerSchema.methods.markSeen = function ({
  ip,
  userAgent,
  location,
} = {}) {
  this.last_seen_at = new Date();
  if (ip) this.last_seen_ip = ip;
  if (userAgent) this.last_seen_user_agent = userAgent;
  if (location && typeof location === "object") {
    this.last_location = {
      ...(this.last_location || {}),
      ...location,
      at: location.at || new Date(),
    };
  }
  return this;
};

module.exports = mongoose.model("VehicleTracker", VehicleTrackerSchema);
