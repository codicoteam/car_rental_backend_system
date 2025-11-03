const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

/** Sub-schemas **/
const PricingLineSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unit_amount: { type: Schema.Types.Decimal128, required: true },
    total: { type: Schema.Types.Decimal128, required: true },
  },
  { _id: false }
);

const FeeLineSchema = new Schema(
  {
    code: { type: String, required: true, trim: true },
    amount: { type: Schema.Types.Decimal128, required: true },
  },
  { _id: false }
);

const TaxLineSchema = new Schema(
  {
    code: { type: String, required: true, trim: true },
    rate: { type: Number, required: true, min: 0, max: 1 },
    amount: { type: Schema.Types.Decimal128, required: true },
  },
  { _id: false }
);

const DiscountLineSchema = new Schema(
  {
    promo_code_id: { type: ObjectId, ref: "PromoCode" },
    amount: { type: Schema.Types.Decimal128, required: true },
  },
  { _id: false }
);

const PricingSchema = new Schema(
  {
    currency: { type: String, enum: ["USD", "ZWL"], required: true },
    breakdown: { type: [PricingLineSchema], default: [] }, // base + extras, etc.
    fees: { type: [FeeLineSchema], default: [] },
    taxes: { type: [TaxLineSchema], default: [] },
    discounts: { type: [DiscountLineSchema], default: [] },
    grand_total: { type: Schema.Types.Decimal128, required: true },
    computed_at: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const PaymentSummarySchema = new Schema(
  {
    status: {
      // convenience mirror for UI; derive from payments if you prefer
      type: String,
      enum: ["unpaid", "partial", "paid", "refunded", "void"],
      default: "unpaid",
    },
    paid_total: { type: Schema.Types.Decimal128, default: "0.00" },
    outstanding: { type: Schema.Types.Decimal128, default: "0.00" },
    last_payment_at: { type: Date, default: null },
  },
  { _id: false }
);

const DriverSnapshotSchema = new Schema(
  {
    full_name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    driver_license: {
      number: { type: String, trim: true },
      country: { type: String, trim: true },
      class: { type: String, trim: true },
      expires_at: { type: Date },
      verified: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const EndpointSchema = new Schema(
  {
    branch_id: { type: ObjectId, ref: "Branch", required: true },
    at: { type: Date, required: true },
  },
  { _id: false }
);

/** Main Reservation schema **/
const ReservationSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true }, // e.g., HRE-2025-000123

    // who booked (customer who will rent)
    user_id: { type: ObjectId, ref: "User", required: true, index: true },

    // who created the booking (customer self-serve or staff)
    created_by: { type: ObjectId, ref: "User", required: true, index: true },
    created_channel: {
      type: String,
      enum: ["web", "mobile", "kiosk", "agent"],
      default: "web",
    },

    // vehicle assignment
    vehicle_id: { type: ObjectId, ref: "Vehicle", default: null, index: true }, // may be null until assignment
    vehicle_model_id: {
      type: ObjectId,
      ref: "VehicleModel",
      required: true,
      index: true,
    },

    pickup: { type: EndpointSchema, required: true },
    dropoff: { type: EndpointSchema, required: true },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "checked_out",
        "returned",
        "cancelled",
        "no_show",
      ],
      default: "pending",
      index: true,
    },

    // pricing snapshot (immutable)
    pricing: { type: PricingSchema, required: true },

    // payment rollup (fast UI)
    payment_summary: { type: PaymentSummarySchema, default: () => ({}) },

    driver_snapshot: { type: DriverSnapshotSchema, default: undefined },

    notes: { type: String, trim: true, default: "" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "reservations",
  }
);

/** Validations **/
ReservationSchema.pre("validate", function (next) {
  if (!this.pickup || !this.dropoff) {
    return next(new Error("Pickup and dropoff are required"));
  }
  if (this.pickup.at >= this.dropoff.at) {
    return next(new Error("Dropoff time must be after pickup time"));
  }
  if (!this.vehicle_model_id && !this.vehicle_id) {
    return next(
      new Error(
        "vehicle_model_id is required (vehicle_id optional until assignment)"
      )
    );
  }
  next();
});

/** Indexes (availability & lookups) **/
ReservationSchema.index({ code: 1 }, { unique: true });
ReservationSchema.index(
  { vehicle_id: 1, status: 1, "pickup.at": 1, "dropoff.at": 1 },
  { partialFilterExpression: { vehicle_id: { $type: "objectId" } } }
);
ReservationSchema.index({
  vehicle_model_id: 1,
  status: 1,
  "pickup.at": 1,
  "dropoff.at": 1,
});

/** Helpful statics **/
/**
 * Find overlapping reservations for a vehicle in active states.
 * A reservation blocks [start, end) if (pickup < end && dropoff > start)
 */
ReservationSchema.statics.findVehicleOverlaps = function (
  vehicleId,
  start,
  end
) {
  const blocking = ["pending", "confirmed", "checked_out"];
  return this.find({
    vehicle_id: vehicleId,
    status: { $in: blocking },
    "pickup.at": { $lt: end },
    "dropoff.at": { $gt: start },
  });
};

/**
 * Quick boolean check for availability of a vehicle.
 */
ReservationSchema.statics.isVehicleAvailable = async function (
  vehicleId,
  start,
  end
) {
  const count = await this.countDocuments({
    vehicle_id: vehicleId,
    status: { $in: ["pending", "confirmed", "checked_out"] },
    "pickup.at": { $lt: end },
    "dropoff.at": { $gt: start },
  });
  return count === 0;
};

module.exports = mongoose.model("Reservation", ReservationSchema);
