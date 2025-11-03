const mongoose = require("mongoose");
const { Schema } = mongoose;

// ---- Reusable sub-schemas ----
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

const PreferencesSchema = new Schema(
  {
    currency: { type: String, enum: ["USD", "ZWL"], default: "USD" },
    locale: { type: String, trim: true, default: "en-ZW" },
  },
  { _id: false }
);

const GdprSchema = new Schema(
  {
    marketing_opt_in: { type: Boolean, default: false },
  },
  { _id: false }
);

// ---- Base Profile (discriminator key = role) ----
const BaseProfileSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["customer", "agent", "manager", "admin"],
    },
    full_name: { type: String, required: true, trim: true },
    dob: { type: Date },
    national_id: { type: String, trim: true },
    driver_license: { type: DriverLicenseSchema, default: undefined },
    address: { type: AddressSchema, default: undefined },
    preferences: { type: PreferencesSchema, default: undefined },
    gdpr: { type: GdprSchema, default: undefined },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    discriminatorKey: "role",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Optional: ensure user.roles contains the profile.role
BaseProfileSchema.pre("validate", async function () {
  if (!this.user) return;
  const User = mongoose.model("User");
  const user = await User.findById(this.user).select("roles");
  if (!user) throw new Error("User not found for profile.user");
  if (!user.roles.includes(this.role)) {
    // You can auto-add here, or throw:
    // throw new Error(`User is missing role '${this.role}'`);
    user.roles.push(this.role);
    await user.save();
  }
});

const Profile = mongoose.model("Profile", BaseProfileSchema);

// ---- Role-specific discriminators ----

// CUSTOMER: typical renter fields
const CustomerProfile = Profile.discriminator(
  "customer",
  new Schema(
    {
      // space for customer-only additions, e.g. loyalty, preferences snapshot history, etc.
      loyalty_points: { type: Number, default: 0 },
    },
    { _id: false }
  )
);

// AGENT: branch assignment, permissions
const AgentProfile = Profile.discriminator(
  "agent",
  new Schema(
    {
      branch_id: { type: Schema.Types.ObjectId, ref: "Branch" }, // if you have a branches collection
      can_apply_discounts: { type: Boolean, default: false },
    },
    { _id: false }
  )
);

// MANAGER: branch scope, reporting flags
const ManagerProfile = Profile.discriminator(
  "manager",
  new Schema(
    {
      branch_ids: [{ type: Schema.Types.ObjectId, ref: "Branch" }],
      approval_limit_usd: { type: Number, default: 0 }, // e.g., max manual override
    },
    { _id: false }
  )
);

// ADMIN: system-level flags
const AdminProfile = Profile.discriminator(
  "admin",
  new Schema(
    {
      super_admin: { type: Boolean, default: false },
    },
    { _id: false }
  )
);

// ---- Helper methods enforcing “manager/agent can create customer profile” ----
/**
 * Create a CUSTOMER profile on behalf of another user,
 * only if actor has role manager/agent/admin.
 */
Profile.statics.createCustomerProfileByStaff = async function (
  actorUserId,
  targetUserId,
  data
) {
  const User = mongoose.model("User");
  const actor = await User.findById(actorUserId).select("roles");
  if (!actor) throw new Error("Actor not found");
  const allowed = actor.roles.some((r) =>
    ["manager", "agent", "admin"].includes(r)
  );
  if (!allowed)
    throw new Error(
      "Forbidden: only manager/agent/admin can create customer profiles"
    );

  const target = await User.findById(targetUserId).select("full_name roles");
  if (!target) throw new Error("Target user not found");

  // ensure target has 'customer' role
  if (!target.roles.includes("customer")) {
    target.roles.push("customer");
    await target.save();
  }

  // upsert (one profile per user)
  const existing = await this.findOne({ user: target._id, role: "customer" });
  if (existing) return existing;

  return await this.create({
    user: target._id,
    role: "customer",
    full_name: data.full_name ?? target.full_name,
    dob: data.dob,
    national_id: data.national_id,
    driver_license: data.driver_license,
    address: data.address,
    preferences: data.preferences,
    gdpr: data.gdpr,
    loyalty_points: data.loyalty_points,
  });
};

/**
 * Create a profile for the same user (self-serve), only for roles the user already has.
 */
Profile.statics.createForSelf = async function (userId, role, data = {}) {
  const User = mongoose.model("User");
  const user = await User.findById(userId).select("full_name roles");
  if (!user) throw new Error("User not found");
  if (!user.roles.includes(role)) throw new Error(`User lacks role '${role}'`);

  const existing = await this.findOne({ user: user._id, role });
  if (existing) return existing;

  return await this.create({
    user: user._id,
    role,
    full_name: data.full_name ?? user.full_name,
    dob: data.dob,
    national_id: data.national_id,
    driver_license: data.driver_license,
    address: data.address,
    preferences: data.preferences,
    gdpr: data.gdpr,
    ...(role === "customer" ? { loyalty_points: data.loyalty_points } : {}),
    ...(role === "agent"
      ? {
          branch_id: data.branch_id,
          can_apply_discounts: !!data.can_apply_discounts,
        }
      : {}),
    ...(role === "manager"
      ? {
          branch_ids: data.branch_ids || [],
          approval_limit_usd: data.approval_limit_usd || 0,
        }
      : {}),
    ...(role === "admin" ? { super_admin: !!data.super_admin } : {}),
  });
};

module.exports = {
  Profile,
  CustomerProfile,
  AgentProfile,
  ManagerProfile,
  AdminProfile,
};
