// controllers/profile_controller.js
const profileService = require("../services/profile_service");

/**
 * Helper: check if current user is manager or admin
 */
function isManagerOrAdmin(user) {
  if (!user || !Array.isArray(user.roles)) return false;
  return user.roles.some((r) => r === "manager" || r === "admin");
}

/**
 * POST /api/profiles/self
 * Authenticated user creates their own profile for a role they already have.
 */
async function createSelfProfile(req, res) {
  try {
    const { role, ...data } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "role is required",
      });
    }

    const profile = await profileService.createSelfProfile(
      req.user._id,
      role,
      data
    );

    return res.status(201).json({
      success: true,
      message: "Profile created successfully",
      data: profile,
    });
  } catch (error) {
    console.error("createSelfProfile error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create profile",
    });
  }
}

/**
 * POST /api/profiles/customer/by-staff
 * Agent / Manager / Admin create a CUSTOMER profile for another user.
 */
async function createCustomerByStaff(req, res) {
  try {
    const { target_user_id, ...data } = req.body;

    if (!target_user_id) {
      return res.status(400).json({
        success: false,
        message: "target_user_id is required",
      });
    }

    const profile = await profileService.createCustomerProfileByStaff(
      req.user._id,
      target_user_id,
      data
    );

    return res.status(201).json({
      success: true,
      message: "Customer profile created successfully",
      data: profile,
    });
  } catch (error) {
    console.error("createCustomerByStaff error:", error);
    const status = /Forbidden/.test(error.message) ? 403 : 400;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to create customer profile",
    });
  }
}

/**
 * POST /api/profiles/agent/by-staff
 * Manager / Admin create an AGENT profile for another user.
 */
async function createAgentByStaff(req, res) {
  try {
    const { target_user_id, ...data } = req.body;

    if (!target_user_id) {
      return res.status(400).json({
        success: false,
        message: "target_user_id is required",
      });
    }

    const profile = await profileService.createAgentProfileByStaff(
      req.user._id,
      target_user_id,
      data
    );

    return res.status(201).json({
      success: true,
      message: "Agent profile created successfully",
      data: profile,
    });
  } catch (error) {
    console.error("createAgentByStaff error:", error);
    const status = /Forbidden/.test(error.message) ? 403 : 400;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to create agent profile",
    });
  }
}

/**
 * POST /api/profiles/manager/by-staff
 * Admin creates a MANAGER profile for another user.
 */
async function createManagerByStaff(req, res) {
  try {
    const { target_user_id, ...data } = req.body;

    if (!target_user_id) {
      return res.status(400).json({
        success: false,
        message: "target_user_id is required",
      });
    }

    const profile = await profileService.createManagerProfileByStaff(
      req.user._id,
      target_user_id,
      data
    );

    return res.status(201).json({
      success: true,
      message: "Manager profile created successfully",
      data: profile,
    });
  } catch (error) {
    console.error("createManagerByStaff error:", error);
    const status = /Forbidden/.test(error.message) ? 403 : 400;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to create manager profile",
    });
  }
}

/**
 * GET /api/profiles/me/:role
 * Get current user's profile for a specific role.
 */
async function getMyProfileByRole(req, res) {
  try {
    const { role } = req.params;

    const profile = await profileService.getProfileByUserAndRole(
      req.user._id,
      role
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    return res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("getMyProfileByRole error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
}

/**
 * GET /api/profiles
 * List profiles (manager/admin).
 */
async function listProfiles(req, res) {
  try {
    const { role, userId } = req.query;

    const result = await profileService.listProfiles({
      role,
      userId,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("listProfiles error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profiles",
    });
  }
}

/**
 * GET /api/profiles/:id
 * Get a profile by ID.
 * - Admin/Manager: any profile.
 * - Others: only own profile.
 */
async function getProfileById(req, res) {
  try {
    const profile = await profileService.getProfileById(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    const isOwner = profile.user.toString() === req.user._id.toString();
    if (!isOwner && !isManagerOrAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: cannot access this profile",
      });
    }

    return res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("getProfileById error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
}

/**
 * PATCH /api/profiles/:id
 * Update a profile.
 * - Admin/Manager: any profile.
 * - Others: only own profile (and cannot change role/user).
 */
async function updateProfile(req, res) {
  try {
    const profile = await profileService.getProfileById(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    const isOwner = profile.user.toString() === req.user._id.toString();
    if (!isOwner && !isManagerOrAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: cannot update this profile",
      });
    }

    const updated = await profileService.updateProfile(
      req.params.id,
      req.body
    );

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("updateProfile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
}

/**
 * DELETE /api/profiles/:id
 * Admin only (router enforces requireRoles('admin')).
 */
async function deleteProfile(req, res) {
  try {
    const profile = await profileService.deleteProfile(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    return res.json({
      success: true,
      message: "Profile deleted successfully",
    });
  } catch (error) {
    console.error("deleteProfile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete profile",
    });
  }
}

module.exports = {
  createSelfProfile,
  createCustomerByStaff,
  createAgentByStaff,
  createManagerByStaff,
  getMyProfileByRole,
  listProfiles,
  getProfileById,
  updateProfile,
  deleteProfile,
};
