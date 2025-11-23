// controllers/driver_profile_controller.js
const driverService = require("../services/driver_profile_service");

/**
 * Driver: create own profile
 */
async function createMyDriverProfile(req, res) {
  try {
    const userId = req.user._id;
    const profile = await driverService.createDriverProfileForUser(
      userId,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Driver profile created successfully",
      data: profile,
    });
  } catch (error) {
    console.error("createMyDriverProfile error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DRIVER_PROFILE_CREATE_ERROR",
      message: error.message || "Failed to create driver profile",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

/**
 * Driver: get own profile
 */
async function getMyDriverProfile(req, res) {
  try {
    const userId = req.user._id;
    const profile = await driverService.getDriverProfileForUser(userId);

    return res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("getMyDriverProfile error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DRIVER_PROFILE_GET_SELF_ERROR",
      message: error.message || "Failed to fetch driver profile",
    });
  }
}

/**
 * Driver: update own profile
 */
async function updateMyDriverProfile(req, res) {
  try {
    const userId = req.user._id;
    const profile = await driverService.updateDriverProfileForUser(
      userId,
      req.body
    );

    return res.json({
      success: true,
      message: "Driver profile updated successfully",
      data: profile,
    });
  } catch (error) {
    console.error("updateMyDriverProfile error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DRIVER_PROFILE_UPDATE_SELF_ERROR",
      message: error.message || "Failed to update driver profile",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

/**
 * Admin/Manager: list driver profiles
 */
async function listDriverProfiles(req, res) {
  try {
    const profiles = await driverService.listDriverProfiles(req.query);

    return res.json({
      success: true,
      data: profiles,
    });
  } catch (error) {
    console.error("listDriverProfiles error:", error);
    return res.status(500).json({
      success: false,
      code: "DRIVER_PROFILE_LIST_ERROR",
      message: "Failed to fetch driver profiles",
    });
  }
}

/**
 * Admin/Manager: get profile by id
 */
async function getDriverProfileById(req, res) {
  try {
    const profile = await driverService.getDriverProfileById(req.params.id);

    return res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("getDriverProfileById error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DRIVER_PROFILE_GET_ERROR",
      message: error.message || "Failed to fetch driver profile",
    });
  }
}

/**
 * Admin: approve profile
 */
async function approveDriverProfile(req, res) {
  try {
    const adminUserId = req.user._id;
    const profile = await driverService.approveDriverProfile(
      req.params.id,
      adminUserId
    );

    return res.json({
      success: true,
      message: "Driver profile approved successfully",
      data: profile,
    });
  } catch (error) {
    console.error("approveDriverProfile error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DRIVER_PROFILE_APPROVE_ERROR",
      message: error.message || "Failed to approve driver profile",
    });
  }
}

/**
 * Admin: reject profile
 */
async function rejectDriverProfile(req, res) {
  try {
    const adminUserId = req.user._id;
    const reason = req.body.reason || "";
    const profile = await driverService.rejectDriverProfile(
      req.params.id,
      adminUserId,
      reason
    );

    return res.json({
      success: true,
      message: "Driver profile rejected",
      data: profile,
    });
  } catch (error) {
    console.error("rejectDriverProfile error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DRIVER_PROFILE_REJECT_ERROR",
      message: error.message || "Failed to reject driver profile",
    });
  }
}

/**
 * Admin: generic update (e.g. is_available, hourly_rate, etc.)
 */
async function adminUpdateDriverProfile(req, res) {
  try {
    const profile = await driverService.adminUpdateDriverProfile(
      req.params.id,
      req.body
    );

    return res.json({
      success: true,
      message: "Driver profile updated successfully",
      data: profile,
    });
  } catch (error) {
    console.error("adminUpdateDriverProfile error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DRIVER_PROFILE_ADMIN_UPDATE_ERROR",
      message: error.message || "Failed to update driver profile",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

/**
 * Admin: delete profile
 */
async function deleteDriverProfile(req, res) {
  try {
    await driverService.deleteDriverProfile(req.params.id);

    return res.json({
      success: true,
      message: "Driver profile deleted successfully",
    });
  } catch (error) {
    console.error("deleteDriverProfile error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DRIVER_PROFILE_DELETE_ERROR",
      message: error.message || "Failed to delete driver profile",
    });
  }
}

/**
 * Public: list approved + available drivers
 */
async function listPublicDrivers(req, res) {
  try {
    const profiles = await driverService.listPublicDrivers(req.query);

    return res.json({
      success: true,
      data: profiles,
    });
  } catch (error) {
    console.error("listPublicDrivers error:", error);
    return res.status(500).json({
      success: false,
      code: "DRIVER_PROFILE_PUBLIC_LIST_ERROR",
      message: "Failed to fetch public drivers",
    });
  }
}

module.exports = {
  createMyDriverProfile,
  getMyDriverProfile,
  updateMyDriverProfile,
  listDriverProfiles,
  getDriverProfileById,
  approveDriverProfile,
  rejectDriverProfile,
  adminUpdateDriverProfile,
  deleteDriverProfile,
  listPublicDrivers,
};
