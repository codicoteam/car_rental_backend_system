// models/vehicleModel.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const FEATURE_SET = ["ac", "bluetooth", "gps", "child_seat", "4x4"];

const VehicleModelSchema = new Schema(
  {
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1900, max: 2100 },

    class: {
      type: String,
      required: true,
      enum: ["economy", "compact", "midsize", "suv", "luxury", "van", "truck"],
    },

    transmission: { type: String, required: true, enum: ["auto", "manual"] },

    fuel_type: {
      type: String,
      required: true,
      enum: ["petrol", "diesel", "hybrid", "ev"],
    },

    seats: { type: Number, required: true, min: 1, max: 20 },
    doors: { type: Number, required: true, min: 2, max: 6 },

    features: {
      type: [
        {
          type: String,
          enum: FEATURE_SET,
        },
      ],
      default: [],
    },

    images: {
      type: [String],
      default: [],

    },
  },
  {
    timestamps: true,
    collection: "vehicle_models",
  }
);

// Normalize make/model (Title Case optional, here we just trim; adjust if you prefer strict casing)
VehicleModelSchema.pre("save", function (next) {
  if (this.isModified("make")) this.make = this.make.trim();
  if (this.isModified("model")) this.model = this.model.trim();
  next();
});

// Compound index for quick lookups by make/model/year
VehicleModelSchema.index({ make: 1, model: 1, year: 1 }, { unique: true });

// Handy virtual
VehicleModelSchema.virtual("display_name").get(function () {
  return `${this.make} ${this.model} ${this.year}`;
});

// Helper to check if a feature exists
VehicleModelSchema.methods.hasFeature = function (feat) {
  return this.features?.includes(feat);
};

module.exports = mongoose.model("VehicleModel", VehicleModelSchema);
