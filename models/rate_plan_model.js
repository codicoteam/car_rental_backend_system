const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const SeasonSchema = new Schema(
  {
    name: { type: String, trim: true }, // e.g., "Peak", "Off-peak"
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
  { _id: false }
);
const RatePlanSchema = new Schema(
  {
    // SCOPE (who/what this plan applies to)
    branch_id: { type: ObjectId, ref: "Branch", default: null }, // null = all branches
    vehicle_class: {
      type: String,
      enum: ["economy", "compact", "midsize", "suv", "luxury", "van", "truck"],
      required: true,
      index: true,
    },
    vehicle_model_id: { type: ObjectId, ref: "VehicleModel", default: null }, // optional model override
    vehicle_id: { type: ObjectId, ref: "Vehicle", default: null }, // optional unit override (most specific)

    currency: {
      type: String,
      enum: ["USD", "ZWL"],
      required: true,
      default: "USD",
    },
    // BASE RATES
    daily_rate: { type: Schema.Types.Decimal128, required: true },
    weekly_rate: { type: Schema.Types.Decimal128, default: null },
    monthly_rate: { type: Schema.Types.Decimal128, default: null },
    weekend_rate: { type: Schema.Types.Decimal128, default: null }, // Fri–Sun price (optional)

    // SEASONAL OVERRIDES (take priority when pickup/dropoff intersects)
    seasonal_overrides: [
      {
        season: { type: SeasonSchema, required: true },
        daily_rate: { type: Schema.Types.Decimal128 },
        weekly_rate: { type: Schema.Types.Decimal128 },
        monthly_rate: { type: Schema.Types.Decimal128 },
        weekend_rate: { type: Schema.Types.Decimal128 },
      },
    ],

    // ALWAYS-ON TAXES & FEES FOR THIS PLAN
    taxes: [
      {
        code: { type: String, trim: true },
        rate: { type: Number, min: 0, max: 1 },
      },
    ], // e.g. {code:"vat", rate:0.15}
    fees: [
      {
        code: { type: String, trim: true },
        amount: { type: Schema.Types.Decimal128 },
      },
    ], // e.g. {code:"airport", amount:"10.00"}

    // LIFECYCLE
    active: { type: Boolean, default: true },
    valid_from: { type: Date, required: true },
    valid_to: { type: Date, default: null }, // null = open-ended
    name: { type: String, trim: true }, // e.g., "HRE Compact 2025"
    notes: { type: String, trim: true },
  },
  { timestamps: true, collection: "rate_plans" }
);

// Avoid ambiguous scoping (customize as you wish)
RatePlanSchema.pre("validate", function (next) {
  if (this.vehicle_id && this.vehicle_model_id) {
    return next(
      new Error("Use either vehicle_id OR vehicle_model_id, not both")
    );
  }
  next();
});
// Fast lookups
RatePlanSchema.index({
  active: 1,
  currency: 1,
  branch_id: 1,
  vehicle_id: 1,
  vehicle_model_id: 1,
  vehicle_class: 1,
  valid_from: 1,
  valid_to: 1,
});

module.exports = mongoose.model("RatePlan", RatePlanSchema);