// services/user_services.js
const bcrypt = require("bcryptjs");
const User = require("../models/user_model");

const SALT_ROUNDS = 10;

/**
 * Create a new user (registration)
 */
async function createUser({ full_name, email, phone, password, roles }) {
  // Normalize email
  const normalizedEmail = email.toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error("Email already in use");
    error.statusCode = 400;
    throw error;
  }

  let password_hash = undefined;
  if (password) {
    password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  }

  const user = new User({
    full_name,
    email: normalizedEmail,
    phone,
    password_hash,
    roles: roles && roles.length ? roles : undefined, // fallback to default ["customer"]
  });

  await user.save();
  return user;
}

/**
 * Find user by email (without password_hash)
 */
async function getUserByEmail(email) {
  return User.findOne({ email: email.toLowerCase() });
}

/**
 * Find user by email including password_hash
 */
async function getUserByEmailWithPassword(email) {
  return User.findOne({ email: email.toLowerCase() }).select("+password_hash");
}

/**
 * Validate user password
 */
async function validatePassword(user, password) {
  if (!user.password_hash) return false;
  return bcrypt.compare(password, user.password_hash);
}

/**
 * Get user by ID
 */
async function getUserById(userId) {
  return User.findById(userId);
}

/**
 * List users with optional filters & pagination
 */
async function listUsers({ status, role, page = 1, limit = 20 } = {}) {
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (role) {
    filter.roles = role; // match anyone with that role in roles[]
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter).skip(skip).limit(limit).sort({ created_at: -1 }),
    User.countDocuments(filter),
  ]);

  return {
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Update currently authenticated user's profile
 */
async function updateOwnProfile(userId, data) {
  const { full_name, phone } = data;

  const update = {};
  if (full_name !== undefined) update.full_name = full_name;
  if (phone !== undefined) update.phone = phone;

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: update },
    { new: true }
  );

  return user;
}

/**
 * Admin/manager: update user fields (including roles, status)
 */
async function updateUserByAdmin(userId, data) {
  const { full_name, phone, roles, status } = data;

  const update = {};
  if (full_name !== undefined) update.full_name = full_name;
  if (phone !== undefined) update.phone = phone;
  if (Array.isArray(roles) && roles.length > 0) update.roles = roles;
  if (status !== undefined) update.status = status;

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: update },
    { new: true }
  );

  return user;
}

/**
 * Change user status
 */
async function changeUserStatus(userId, status) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { status } },
    { new: true }
  );

  return user;
}

/**
 * Delete user (hard delete)
 */
async function deleteUser(userId) {
  return User.findByIdAndDelete(userId);
}

module.exports = {
  createUser,
  getUserByEmail,
  getUserByEmailWithPassword,
  validatePassword,
  getUserById,
  listUsers,
  updateOwnProfile,
  updateUserByAdmin,
  changeUserStatus,
  deleteUser,
};
