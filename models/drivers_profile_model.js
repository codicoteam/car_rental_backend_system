// models/driver_profile_model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const DriverLicenseSchema = new Schema(
  {
    number: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    country: { type: String, trim: true },
    class: { type: String, trim: true },
    expires_at: { type: Date },
    verified: { type: Boolean, default: false },
  },
  { _id: false }
);
const IdentityDocumentSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["national_id", "passport"],
      required: true,
    },
    imageUrl: {
      type: String,
      trim: true,
      required: true, // we want the image here
    },
  },
  { _id: false }
);

const DriverProfileSchema = new Schema(
  {
    // The user account that owns this driver profile
    user_id: {
      type: ObjectId,
      ref: "User",
      required: true,
      unique: true, // one driver profile per user
      index: true,
    },

    // Public display name (fallback to User.full_name in UI if empty)
    display_name: { type: String, trim: true },
    profile_image: { type: String, trim: true }, // <-- image for driver's licence

    // Where this driver usually operates from
    base_city: { type: String, trim: true },
    base_region: { type: String, trim: true },
    base_country: { type: String, trim: true },

    // Per-hour pricing for booking the driver (not linked to vehicle rental)
    hourly_rate: {
      type: Number,
      required: true,
      min: 0,
    },

    // Short bio / description
    bio: { type: String, trim: true, default: "" },

    // Experience
    years_experience: { type: Number, min: 0, default: 0 },

    // Languages the driver speaks (for UX)
    languages: {
      type: [String],
      default: [],
    },

    // ✅ Image + details for national ID OR passport
    identity_document: {
      type: IdentityDocumentSchema,
      default: undefined,
    },

    // ✅ Image + details for driver's licence
    driver_license: {
      type: DriverLicenseSchema,
      default: undefined,
    },

    // STATUS & APPROVAL WORKFLOW
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    // Admin who reviewed this profile (only set when status = approved or rejected)
    approved_by_admin: {
      type: ObjectId,
      ref: "User",
      default: null,
    },

    approved_at: {
      type: Date,
      default: null,
    },

    // Optional rejection reason if status = "rejected"
    rejection_reason: {
      type: String,
      trim: true,
      default: "",
    },

    // Whether this driver is currently available to be booked
    is_available: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Simple rating summary (later you can hook reviews into this)
    rating_average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    rating_count: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "driver_profiles",
  }
);

// Helper: mark as approved
DriverProfileSchema.methods.approve = function (adminUserId) {
  this.status = "approved";
  this.approved_by_admin = adminUserId;
  this.approved_at = new Date();
  this.rejection_reason = "";
  return this;
};

// Helper: mark as rejected
DriverProfileSchema.methods.reject = function (adminUserId, reason = "") {
  this.status = "rejected";
  this.approved_by_admin = adminUserId;
  this.approved_at = new Date();
  this.rejection_reason = reason;
  return this;
};

module.exports = mongoose.model("DriverProfile", DriverProfileSchema);
