// services/driver_profile_service.js
const DriverProfile = require("../models/drivers_profile_model");
const User = require("../models/user_model");

/**
 * Ensure user has 'driver' role; if not, optionally we could auto-append it.
 * For now, we just check and throw a clear error.
 */
async function ensureUserHasDriverRole(userId) {
  const user = await User.findById(userId).select("roles");
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    error.code = "USER_NOT_FOUND";
    throw error;
  }
  if (!Array.isArray(user.roles) || !user.roles.includes("driver")) {
    const error = new Error("User does not have driver role");
    error.statusCode = 403;
    error.code = "USER_NOT_DRIVER";
    throw error;
  }
}

/**
 * Create driver profile for current user (driver).
 * Fails if profile already exists.
 */
async function createDriverProfileForUser(userId, payload) {
  await ensureUserHasDriverRole(userId);

  const existing = await DriverProfile.findOne({ user_id: userId });
  if (existing) {
    const error = new Error("Driver profile already exists");
    error.statusCode = 409;
    error.code = "DRIVER_PROFILE_EXISTS";
    throw error;
  }

  try {
    const profile = await DriverProfile.create({
      user_id: userId,
      display_name: payload.display_name,
      base_city: payload.base_city,
      base_region: payload.base_region,
      base_country: payload.base_country,
      hourly_rate: payload.hourly_rate,
      bio: payload.bio,
      years_experience: payload.years_experience,
      languages: payload.languages,
      identity_document: payload.identity_document,
      driver_license: payload.driver_license,
    });

    return profile;
  } catch (err) {
    const error = new Error("Failed to create driver profile");
    error.statusCode = 400;
    error.code = "DRIVER_PROFILE_CREATE_FAILED";
    error.details = err.message;
    throw error;
  }
}

/**
 * Get driver profile of current user
 */
async function getDriverProfileForUser(userId) {
  await ensureUserHasDriverRole(userId);
  const profile = await DriverProfile.findOne({ user_id: userId });

  if (!profile) {
    const error = new Error("Driver profile not found");
    error.statusCode = 404;
    error.code = "DRIVER_PROFILE_NOT_FOUND";
    throw error;
  }

  return profile;
}

/**
 * Update driver profile of current user
 */
async function updateDriverProfileForUser(userId, payload) {
  await ensureUserHasDriverRole(userId);

  try {
    const profile = await DriverProfile.findOneAndUpdate(
      { user_id: userId },
      {
        $set: {
          display_name: payload.display_name,
          base_city: payload.base_city,
          base_region: payload.base_region,
          base_country: payload.base_country,
          hourly_rate: payload.hourly_rate,
          bio: payload.bio,
          years_experience: payload.years_experience,
          languages: payload.languages,
          identity_document: payload.identity_document,
          driver_license: payload.driver_license,
          // do NOT allow user to directly change status/approved_by_admin/approved_at here
        },
      },
      { new: true, runValidators: true }
    );

    if (!profile) {
      const error = new Error("Driver profile not found");
      error.statusCode = 404;
      error.code = "DRIVER_PROFILE_NOT_FOUND";
      throw error;
    }

    return profile;
  } catch (err) {
    const error = new Error("Failed to update driver profile");
    error.statusCode = 400;
    error.code = "DRIVER_PROFILE_UPDATE_FAILED";
    error.details = err.message;
    throw error;
  }
}

/**
 * Admin/manager: list driver profiles with filters
 */
async function listDriverProfiles(filters = {}) {
  const query = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (typeof filters.is_available !== "undefined") {
    if (filters.is_available === "true" || filters.is_available === true)
      query.is_available = true;
    if (filters.is_available === "false" || filters.is_available === false)
      query.is_available = false;
  }

  if (filters.base_city) {
    query.base_city = new RegExp(filters.base_city, "i");
  }

  if (filters.base_country) {
    query.base_country = new RegExp(filters.base_country, "i");
  }

  const profiles = await DriverProfile.find(query)
    .populate("user_id", "full_name email phone roles status")
    .populate("approved_by_admin", "full_name email")
    .sort({ created_at: -1 });

  return profiles;
}

/**
 * Admin/manager: get profile by id
 */
async function getDriverProfileById(id) {
  const profile = await DriverProfile.findById(id)
    .populate("user_id", "full_name email phone roles status")
    .populate("approved_by_admin", "full_name email");

  if (!profile) {
    const error = new Error("Driver profile not found");
    error.statusCode = 404;
    error.code = "DRIVER_PROFILE_NOT_FOUND";
    throw error;
  }

  return profile;
}

/**
 * Admin: approve profile
 */
async function approveDriverProfile(profileId, adminUserId) {
  const profile = await DriverProfile.findById(profileId);

  if (!profile) {
    const error = new Error("Driver profile not found");
    error.statusCode = 404;
    error.code = "DRIVER_PROFILE_NOT_FOUND";
    throw error;
  }

  profile.approve(adminUserId);
  await profile.save();

  return profile;
}

/**
 * Admin: reject profile
 */
async function rejectDriverProfile(profileId, adminUserId, reason = "") {
  const profile = await DriverProfile.findById(profileId);

  if (!profile) {
    const error = new Error("Driver profile not found");
    error.statusCode = 404;
    error.code = "DRIVER_PROFILE_NOT_FOUND";
    throw error;
  }

  profile.reject(adminUserId, reason);
  await profile.save();

  return profile;
}

/**
 * Admin: update arbitrary fields (e.g. is_available, hourly_rate, etc.)
 */
async function adminUpdateDriverProfile(profileId, payload) {
  try {
    const profile = await DriverProfile.findByIdAndUpdate(
      profileId,
      { $set: payload },
      { new: true, runValidators: true }
    );

    if (!profile) {
      const error = new Error("Driver profile not found");
      error.statusCode = 404;
      error.code = "DRIVER_PROFILE_NOT_FOUND";
      throw error;
    }

    return profile;
  } catch (err) {
    const error = new Error("Failed to update driver profile");
    error.statusCode = 400;
    error.code = "DRIVER_PROFILE_ADMIN_UPDATE_FAILED";
    error.details = err.message;
    throw error;
  }
}

/**
 * Admin: delete profile
 */
async function deleteDriverProfile(profileId) {
  const profile = await DriverProfile.findByIdAndDelete(profileId);

  if (!profile) {
    const error = new Error("Driver profile not found");
    error.statusCode = 404;
    error.code = "DRIVER_PROFILE_NOT_FOUND";
    throw error;
  }

  return profile;
}

/**
 * Public: list approved + available drivers
 */
async function listPublicDrivers(filters = {}) {
  const query = {
    status: "approved",
    is_available: true,
  };

  if (filters.base_city) {
    query.base_city = new RegExp(filters.base_city, "i");
  }
  if (filters.base_country) {
    query.base_country = new RegExp(filters.base_country, "i");
  }
  if (filters.min_rating) {
    query.rating_average = { $gte: Number(filters.min_rating) || 0 };
  }

  const profiles = await DriverProfile.find(query)
    .select(
      "-rejection_reason -approved_by_admin" // hide admin details in public listing
    )
    .populate("user_id", "full_name");

  return profiles;
}

module.exports = {
  createDriverProfileForUser,
  getDriverProfileForUser,
  updateDriverProfileForUser,
  listDriverProfiles,
  getDriverProfileById,
  approveDriverProfile,
  rejectDriverProfile,
  adminUpdateDriverProfile,
  deleteDriverProfile,
  listPublicDrivers,
};
