// models/branch.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

/** Opening period like { open: "08:00", close: "17:30" } */
const OpeningPeriodSchema = new Schema(
  {
    open: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "open must be HH:mm"],
    },
    close: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "close must be HH:mm"],
    },
  },
  { _id: false }
);

/** Opening hours object with per-day arrays of periods */
const OpeningHoursSchema = new Schema(
  {
    mon: { type: [OpeningPeriodSchema], default: [] },
    tue: { type: [OpeningPeriodSchema], default: [] },
    wed: { type: [OpeningPeriodSchema], default: [] },
    thu: { type: [OpeningPeriodSchema], default: [] },
    fri: { type: [OpeningPeriodSchema], default: [] },
    sat: { type: [OpeningPeriodSchema], default: [] },
    sun: { type: [OpeningPeriodSchema], default: [] },
    // Optional public holiday overrides could be added later
  },
  { _id: false }
);

const AddressSchema = new Schema(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    region: { type: String, trim: true },
    postal_code: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  { _id: false }
);

/** GeoJSON Point */
const GeoPointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
      validate: {
        validator: (v) =>
          Array.isArray(v) &&
          v.length === 2 &&
          v[0] >= -180 &&
          v[0] <= 180 &&
          v[1] >= -90 &&
          v[1] <= 90,
        message: "coordinates must be [lng, lat] within valid ranges",
      },
    },
  },
  { _id: false }
);

const emailRegex =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\\.,;:\s@"]+\.)+[^<>()[\]\\.,;:\s@"]{2,})$/i;

const BranchSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },

    // e.g., "HRE-CBD"
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    address: { type: AddressSchema, default: {} },

    geo: { type: GeoPointSchema, required: true },

    opening_hours: { type: OpeningHoursSchema, default: {} },

    phone: { type: String, trim: true },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: { validator: (v) => !v || emailRegex.test(v), message: "Invalid email" },
    },

    imageLoc: { type: String, trim: true },


    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "branches",
  }
);

// Indexes
BranchSchema.index({ code: 1 }, { unique: true });
BranchSchema.index({ geo: "2dsphere" });

// Virtual: nicely formatted one-line address
BranchSchema.virtual("fullAddress").get(function () {
  const a = this.address || {};
  return [a.line1, a.line2, a.city, a.region, a.postal_code, a.country]
    .filter(Boolean)
    .join(", ");
});

/**
 * Static: find branches near a point (lng, lat), within maxDistance meters.
 * Example: Branch.findNearby(31.053, -17.829, 5000)
 */
BranchSchema.statics.findNearby = function (lng, lat, maxDistance = 5000) {
  return this.find({
    geo: {
      $near: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: maxDistance,
      },
    },
    active: true,
  });
};

/**
 * Method: check if branch is open at a given Date (defaults to now) in local time.
 * Assumes opening_hours in local branch time and compares using HH:mm.
 */
BranchSchema.methods.isOpenAt = function (at = new Date()) {
  // Convert to local time string HH:mm (no TZ lib to keep it dependency-free)
  const pad = (n) => String(n).padStart(2, "0");
  const local = new Date(at);
  const hh = pad(local.getHours());
  const mm = pad(local.getMinutes());
  const time = `${hh}:${mm}`;

  // 0=Sun .. 6=Sat; map to schema keys
  const dayMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const key = dayMap[local.getDay()];
  const periods = (this.opening_hours && this.opening_hours[key]) || [];

  return periods.some((p) => p.open <= time && time <= p.close);
};

module.exports = mongoose.model("Branch", BranchSchema);
