const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const ChangeLogEntrySchema = new Schema(
  {
    changed_by: { type: ObjectId, ref: "User", required: true },
    changed_at: { type: Date, default: Date.now },
    field: { type: String, required: true },
    old_value: { type: Schema.Types.Mixed },
    new_value: { type: Schema.Types.Mixed },
    reason: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const FixedAssetSchema = new Schema(
  {
    vehicle_id: {
      type: ObjectId,
      ref: "Vehicle",
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },
    is_vehicle: { type: Boolean, default: true },
    asset_name: { type: String, trim: true, default: "" },

    branch_id: {
      type: ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    acquisition_cost: { type: Schema.Types.Decimal128, required: true },
    acquisition_date: { type: Date, required: true },
    currency: { type: String, default: "USD", uppercase: true, trim: true },

    useful_life_years: { type: Number, required: true, min: 1, max: 30 },
    salvage_value: { type: Schema.Types.Decimal128, default: "0.00" },
    depreciation_method: {
      type: String,
      enum: ["straight_line", "declining_balance", "units_of_production"],
      default: "straight_line",
      required: true,
    },
    declining_rate_pct: { type: Number, min: 1, max: 99, default: null },
    total_expected_km: { type: Number, min: 1, default: null },

    disposal_date: { type: Date, default: null },
    disposal_amount: { type: Schema.Types.Decimal128, default: null },
    disposal_notes: { type: String, trim: true, default: "" },

    notes: { type: String, trim: true, default: "" },

    created_by: { type: ObjectId, ref: "User", required: true },
    updated_by: { type: ObjectId, ref: "User", default: null },
    change_log: { type: [ChangeLogEntrySchema], default: [] },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "fixed_assets",
  }
);

FixedAssetSchema.index({ branch_id: 1 });
FixedAssetSchema.index({ disposal_date: 1 }, { sparse: true });

module.exports = mongoose.model("FixedAsset", FixedAssetSchema);
