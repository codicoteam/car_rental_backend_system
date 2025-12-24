// services/profile_service.js
const mongoose = require("mongoose");
const {
  Profile,
  CustomerProfile,
  AgentProfile,
  ManagerProfile,
  AdminProfile,
} = require("../models/profile_models");
const User = require("../models/user_model");

/**
 * Generic: list profiles with filters + pagination
 */
async function listProfiles({ role, userId } = {}) {
  const filter = {};
  if (role) filter.role = role;
  if (userId) filter.user = userId;

  const profiles = await Profile.find(filter).sort({ created_at: -1 });

  return {
    profiles,
    total: profiles.length,
  };
}

/**
 * Get a profile by _id
 */
async function getProfileById(profileId) {
  return Profile.findById(profileId);
}

/**
 * Get a profile by user + role
 */
async function getProfileByUserAndRole(userId, role) {
  return Profile.findOne({ user: userId, role });
}

/**
 * Self-serve: user creates their own profile for a role they already have.
 * Uses Profile.createForSelf from the model.
 */
async function createSelfProfile(userId, role, data = {}) {
  // This will throw if user doesn't have the role.
  return Profile.createForSelf(userId, role, data);
}

/**
 * Staff: create a CUSTOMER profile for another user.
 * Uses Profile.createCustomerProfileByStaff from the model.
 */
async function createCustomerProfileByStaff(actorUserId, targetUserId, data) {
  return Profile.createCustomerProfileByStaff(actorUserId, targetUserId, data);
}

/**
 * Staff: create an AGENT profile for another user.
 * Allowed actor roles: manager, admin.
 */
async function createAgentProfileByStaff(actorUserId, targetUserId, data = {}) {
  const actor = await User.findById(actorUserId).select("roles");
  if (!actor) throw new Error("Actor not found");

  const allowed = actor.roles.some((r) => ["manager", "admin"].includes(r));
  if (!allowed)
    throw new Error(
      "Forbidden: only manager/admin can create agent profiles"
    );

  const target = await User.findById(targetUserId).select("full_name roles");
  if (!target) throw new Error("Target user not found");

  // ensure target has 'agent' role
  if (!target.roles.includes("agent")) {
    target.roles.push("agent");
    await target.save();
  }

  // use createForSelf to respect model logic
  const profile = await Profile.createForSelf(target._id, "agent", {
    full_name: data.full_name ?? target.full_name,
    dob: data.dob,
    national_id: data.national_id,
    driver_license: data.driver_license,
    address: data.address,
    preferences: data.preferences,
    gdpr: data.gdpr,
    branch_id: data.branch_id,
    can_apply_discounts: !!data.can_apply_discounts,
    ...(typeof data.verified === "boolean" ? { verified: data.verified } : {}),
  });

  return profile;
}

/**
 * Staff: create a MANAGER profile for another user.
 * Allowed actor roles: admin only.
 */
async function createManagerProfileByStaff(
  actorUserId,
  targetUserId,
  data = {}
) {
  const actor = await User.findById(actorUserId).select("roles");
  if (!actor) throw new Error("Actor not found");

  const allowed = actor.roles.includes("admin");
  if (!allowed)
    throw new Error("Forbidden: only admin can create manager profiles");

  const target = await User.findById(targetUserId).select("full_name roles");
  if (!target) throw new Error("Target user not found");

  // ensure target has 'manager' role
  if (!target.roles.includes("manager")) {
    target.roles.push("manager");
    await target.save();
  }

  const profile = await Profile.createForSelf(target._id, "manager", {
    full_name: data.full_name ?? target.full_name,
    dob: data.dob,
    national_id: data.national_id,
    driver_license: data.driver_license,
    address: data.address,
    preferences: data.preferences,
    gdpr: data.gdpr,
    branch_ids: data.branch_ids || [],
    approval_limit_usd: data.approval_limit_usd || 0,
  });

  return profile;
}

/**
 * Update a profile (generic).
 * NOTE: do not allow changing 'user' or 'role' here.
 */
async function updateProfile(profileId, data = {}) {
  const updatableFields = [
    "full_name",
    "dob",
    "national_id",
    "driver_license",
    "address",
    "preferences",
    "gdpr",
    "verified",
    "loyalty_points",
    "branch_id",
    "branch_ids",
    "can_apply_discounts",
    "approval_limit_usd",
    "super_admin",
  ];

  const update = {};
  for (const key of updatableFields) {
    if (data[key] !== undefined) {
      update[key] = data[key];
    }
  }

  const profile = await Profile.findByIdAndUpdate(
    profileId,
    { $set: update },
    { new: true }
  );

  return profile;
}

/**
 * Delete a profile
 */
async function deleteProfile(profileId) {
  return Profile.findByIdAndDelete(profileId);
}

/**
 * Get all profiles for a user (across all roles)
 */
async function getProfilesByUserId(userId) {
  return Profile.find({ user: userId }).sort({ created_at: -1 });
}


module.exports = {
  listProfiles,
  getProfileById,
  getProfileByUserAndRole,
  createSelfProfile,
  createCustomerProfileByStaff,
  createAgentProfileByStaff,
  createManagerProfileByStaff,
  updateProfile,
  deleteProfile,
  getProfilesByUserId
};
