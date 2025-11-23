// models/driver_booking_model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

/**
 * Simple location schema for pickup/dropoff.
 * You can expand this later if needed (e.g., GeoJSON).
 */
const LocationSchema = new Schema(
  {
    label: { type: String, trim: true }, // e.g. "Home", "Airport", "Office"
    address: { type: String, trim: true }, // free-form address text
    latitude: { type: Number }, // optional
    longitude: { type: Number }, // optional
  },
  { _id: false }
);

/**
 * Pricing snapshot at time of booking request / confirmation.
 * Keeps booking self-contained even if driver rate changes later.
 */
const PricingSnapshotSchema = new Schema(
  {
    currency: {
      type: String,
      enum: ["USD", "ZWL"],
      required: true,
    },
    hourly_rate_snapshot: {
      // driver hourly rate at the time of request
      type: Schema.Types.Decimal128,
      required: true,
    },
    hours_requested: {
      type: Number,
      required: true,
      min: 1,
    },
    estimated_total_amount: {
      // hourly_rate_snapshot * hours_requested
      type: Schema.Types.Decimal128,
      required: true,
    },
  },
  { _id: false }
);

/**
 * Main DriverBooking schema
 * This is separate from your car reservations.
 */
const DriverBookingSchema = new Schema(
  {
    // Human-friendly booking code, e.g. DRV-2025-000123
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    // Who the booking is for (customer)
    customer_id: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Who created it (customer or agent on behalf of customer)
    created_by: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    created_channel: {
      type: String,
      enum: ["web", "mobile", "agent", "other"],
      default: "mobile",
    },

    // Driver references
    driver_profile_id: {
      type: ObjectId,
      ref: "DriverProfile",
      required: true,
      index: true,
    },
    driver_user_id: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Trip details
    start_at: {
      type: Date,
      required: true,
      index: true,
    },

    // Either you use explicit end_at, or treat hours_requested as the main duration.
    // We keep both for flexibility (and easier conflict checks).
    end_at: {
      type: Date,
      default: null,
      index: true,
    },

    pickup_location: {
      type: LocationSchema,
      required: true,
    },

    dropoff_location: {
      type: LocationSchema,
      required: true,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // Pricing snapshot (immutable for this booking)
    pricing: {
      type: PricingSnapshotSchema,
      required: true,
    },

    // Booking lifecycle status
    status: {
      type: String,
      enum: [
        "requested", // customer created, waiting for driver
        "accepted_by_driver", // driver accepted, waiting for payment
        "declined_by_driver", // driver declined
        "awaiting_payment", // (optional alias; you can use accepted_by_driver instead)
        "confirmed", // paid + confirmed
        "cancelled_by_customer",
        "cancelled_by_driver",
        "expired", // no response or payment timeout
        "completed", // job done
      ],
      default: "requested",
      index: true,
    },

    // Timestamps for milestones
    requested_at: {
      type: Date,
      required: true,
      default: Date.now,
    },

    driver_responded_at: {
      type: Date,
      default: null,
    },

    payment_deadline_at: {
      type: Date,
      default: null,
    },

    paid_at: {
      type: Date,
      default: null,
    },

    cancelled_at: {
      type: Date,
      default: null,
    },

    completed_at: {
      type: Date,
      default: null,
    },

    // Payment linkage
    payment_id: {
      type: ObjectId,
      ref: "Payment",
      default: null,
      index: true,
    },

    payment_status_snapshot: {
      type: String,
      enum: ["unpaid", "pending", "paid", "failed", "refunded", "void"],
      default: "unpaid",
    },

    // Audit – last status change actor (user or system)
    last_status_update_by: {
      type: ObjectId,
      ref: "User",
      default: null,
    },

    // For future ratings (optional, but we include the structure)
    customer_rating_of_driver: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    customer_review_text: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "driver_bookings",
  }
);

/**
 * Basic validations
 */
DriverBookingSchema.pre("validate", function (next) {
  if (!this.start_at) {
    return next(new Error("start_at is required"));
  }

  // If end_at is provided, ensure it is after start_at
  if (this.end_at && this.start_at >= this.end_at) {
    return next(new Error("end_at must be after start_at"));
  }

  // Ensure pricing is present & coherent
  if (!this.pricing) {
    return next(new Error("pricing snapshot is required"));
  }
  if (!this.pricing.hours_requested || this.pricing.hours_requested <= 0) {
    return next(new Error("pricing.hours_requested must be greater than 0"));
  }

  next();
});

/**
 * Indexes for quick searching & conflict checks
 */
DriverBookingSchema.index({ code: 1 }, { unique: true });
DriverBookingSchema.index({
  driver_user_id: 1,
  status: 1,
  start_at: 1,
  end_at: 1,
});
DriverBookingSchema.index({
  customer_id: 1,
  status: 1,
  start_at: 1,
});

/**
 * Helper: find overlapping bookings for a driver
 * Overlap logic: [start_at, end_at) intersects with [start, end)
 * for active-like statuses.
 */
DriverBookingSchema.statics.findDriverOverlaps = function (
  driverUserId,
  start,
  end
) {
  const blockingStatuses = [
    "requested",
    "accepted_by_driver",
    "awaiting_payment",
    "confirmed",
  ];

  return this.find({
    driver_user_id: driverUserId,
    status: { $in: blockingStatuses },
    start_at: { $lt: end },
    end_at: { $gt: start },
  });
};

/**
 * Helper: quick boolean check for driver availability
 */
DriverBookingSchema.statics.isDriverAvailable = async function (
  driverUserId,
  start,
  end
) {
  const blockingStatuses = [
    "requested",
    "accepted_by_driver",
    "awaiting_payment",
    "confirmed",
  ];

  const count = await this.countDocuments({
    driver_user_id: driverUserId,
    status: { $in: blockingStatuses },
    start_at: { $lt: end },
    end_at: { $gt: start },
  });

  return count === 0;
};

module.exports = mongoose.model("DriverBooking", DriverBookingSchema);
