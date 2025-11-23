// models/vehicle_incident_model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const VehicleIncidentSchema = new Schema(
  {
    // 🔗 Which vehicle this incident is about
    vehicle_id: {
      type: ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },

    // 🔗 Which reservation (if it happened during a rental) – optional
    reservation_id: {
      type: ObjectId,
      ref: "Reservation",
      default: null,
      index: true,
    },

    // 🔗 Who reported it (customer, agent, manager, etc.)
    reported_by: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Optional: which branch logged this
    branch_id: {
      type: ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    // What kind of incident/damage
    type: {
      type: String,
      enum: [
        "accident",
        "scratch",
        "tyre",
        "windshield",
        "mechanical_issue",
        "other",
      ],
      required: true,
      default: "accident",
      index: true,
    },

    // How bad is it
    severity: {
      type: String,
      enum: ["minor", "major"],
      required: true,
      default: "minor",
      index: true,
    },

    // Photos of the damage (URLs to your storage)
    photos: {
      type: [String],
      default: [],
    },

    // Text description
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // When did it happen? (can be different from created_at)
    occurred_at: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Cost estimates
    estimated_cost: {
      type: Schema.Types.Decimal128,
      default: null, // can be filled after initial assessment
    },

    final_cost: {
      type: Schema.Types.Decimal128,
      default: null, // set when repairs are done / finalized
    },

    // Lifecycle status of the incident/case
    status: {
      type: String,
      enum: ["open", "under_review", "resolved", "written_off"],
      default: "open",
      index: true,
    },

    // Optional: how much of the cost is charged to customer
    chargeable_to_customer_amount: {
      type: Schema.Types.Decimal128,
      default: null,
    },

    // Optional: link to a payment or damage charge later
    payment_id: {
      type: ObjectId,
      ref: "Payment",
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "vehicle_incidents",
  }
);

// Helpful index for finding all open incidents for a vehicle
VehicleIncidentSchema.index({
  vehicle_id: 1,
  status: 1,
  occurred_at: -1,
});

// Quick helper methods (optional, but handy)
VehicleIncidentSchema.methods.markUnderReview = function () {
  this.status = "under_review";
  return this;
};

VehicleIncidentSchema.methods.markResolved = function () {
  this.status = "resolved";
  return this;
};

VehicleIncidentSchema.methods.markWrittenOff = function () {
  this.status = "written_off";
  return this;
};

module.exports = mongoose.model("VehicleIncident", VehicleIncidentSchema);
