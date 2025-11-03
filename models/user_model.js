const mongoose = require("mongoose");

const AuthProviderSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["google", "apple", "email"],
      required: true,
    },
    provider_user_id: { type: String, required: true },
    added_at: { type: Date, default: Date.now },
  },
  { _id: false }
);
const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, unique: true, sparse: true, trim: true },
    password_hash: { type: String, select: false }, // omit if using external auth only
    roles: {
      type: [String],
      enum: ["customer", "agent", "manager", "admin"],
      default: ["customer"],
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    full_name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["active", "suspended", "deleted"],
      default: "active",
    },
    auth_providers: { type: [AuthProviderSchema], default: [] },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("User", UserSchema);
