const mongoose = require("mongoose");
const { Schema } = mongoose;

const PromoCodeSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    type: { type: String, enum: ["percent", "fixed"], required: true },
    value: { type: Number, required: true }, // percent (0–100) or fixed amount
    currency: {
      type: String,
      enum: ["USD", "ZWL"],
      required: function () {
        return this.type === "fixed";
      },
    },
    active: { type: Boolean, default: true },

    valid_from: { type: Date, required: true },
    valid_to: { type: Date, default: null },
    usage_limit: { type: Number, default: null },
    used_count: { type: Number, default: 0 },

    constraints: {
      allowed_classes: [
        {
          type: String,
          enum: [
            "economy",
            "compact",
            "midsize",
            "suv",
            "luxury",
            "van",
            "truck",
          ],
        },
      ],
      min_days: { type: Number, default: 0 },
      branch_ids: [{ type: Schema.Types.ObjectId, ref: "Branch" }],
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true, collection: "promo_codes" }
);

PromoCodeSchema.index({ active: 1, valid_from: 1, valid_to: 1 });

module.exports = mongoose.model("PromoCode", PromoCodeSchema);
