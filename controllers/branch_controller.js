// controllers/branch_controller.js
const branchService = require("../services/branch_service");

function hasRole(user, role) {
  return Array.isArray(user.roles) && user.roles.includes(role);
}

function isBranchManagerOrAdmin(user) {
  return Array.isArray(user.roles)
    ? user.roles.some((r) => ["manager", "admin"].includes(r))
    : false;
}

/**
 * POST /api/branches
 * manager/admin only
 */
async function createBranch(req, res) {
  try {
    const { user } = req;

    if (!isBranchManagerOrAdmin(user)) {
      return res.status(403).json({
        success: false,
        code: "BRANCH_FORBIDDEN",
        message: "Only manager/admin can create branches",
      });
    }

    const branch = await branchService.createBranch(req.body);

    return res.status(201).json({
      success: true,
      message: "Branch created successfully",
      data: branch,
    });
  } catch (error) {
    console.error("createBranch error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "BRANCH_CREATE_ERROR",
      message: error.message || "Failed to create branch",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

/**
 * GET /api/branches
 * Public: get all branches (no filters, no pagination)
 */
async function getAllBranches(req, res) {
  try {
    const branches = await branchService.getAllBranches();
    return res.json({
      success: true,
      data: branches,
    });
  } catch (error) {
    console.error("getAllBranches error:", error);
    return res.status(500).json({
      success: false,
      code: "BRANCH_LIST_ERROR",
      message: "Failed to fetch branches",
    });
  }
}

/**
 * GET /api/branches/{id}
 * Public
 */
async function getBranchById(req, res) {
  try {
    const branch = await branchService.getBranchById(req.params.id);
    return res.json({
      success: true,
      data: branch,
    });
  } catch (error) {
    console.error("getBranchById error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "BRANCH_GET_ERROR",
      message: error.message || "Failed to fetch branch",
    });
  }
}

/**
 * PATCH /api/branches/{id}
 * manager/admin only
 */
async function updateBranch(req, res) {
  try {
    const { user } = req;

    if (!isBranchManagerOrAdmin(user)) {
      return res.status(403).json({
        success: false,
        code: "BRANCH_FORBIDDEN",
        message: "Only manager/admin can update branches",
      });
    }

    const branch = await branchService.updateBranch(req.params.id, req.body);

    return res.json({
      success: true,
      message: "Branch updated successfully",
      data: branch,
    });
  } catch (error) {
    console.error("updateBranch error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "BRANCH_UPDATE_ERROR",
      message: error.message || "Failed to update branch",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

/**
 * DELETE /api/branches/{id}
 * admin only
 */
async function deleteBranch(req, res) {
  try {
    const { user } = req;

    if (!hasRole(user, "admin")) {
      return res.status(403).json({
        success: false,
        code: "BRANCH_FORBIDDEN",
        message: "Only admin can delete branches",
      });
    }

    await branchService.deleteBranch(req.params.id);

    return res.json({
      success: true,
      message: "Branch deleted successfully",
    });
  } catch (error) {
    console.error("deleteBranch error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "BRANCH_DELETE_ERROR",
      message: error.message || "Failed to delete branch",
    });
  }
}

/**
 * GET /api/branches/search
 * Public standalone filter endpoint
 */
async function searchBranches(req, res) {
  try {
    const { city, region, active, q } = req.query;
    const branches = await branchService.searchBranches({
      city,
      region,
      active,
      q,
    });

    return res.json({
      success: true,
      data: branches,
    });
  } catch (error) {
    console.error("searchBranches error:", error);
    return res.status(500).json({
      success: false,
      code: "BRANCH_SEARCH_ERROR",
      message: "Failed to search branches",
    });
  }
}

/**
 * GET /api/branches/nearby
 * Public: ?lng=&lat=&maxDistance=
 */
async function findNearbyBranches(req, res) {
  try {
    const { lng, lat, maxDistance } = req.query;

    if (
      typeof lng === "undefined" ||
      typeof lat === "undefined" ||
      lng === "" ||
      lat === ""
    ) {
      return res.status(400).json({
        success: false,
        code: "BRANCH_NEARBY_PARAMS_REQUIRED",
        message: "lng and lat are required",
      });
    }

    const lngNum = Number(lng);
    const latNum = Number(lat);
    const maxDist = maxDistance ? Number(maxDistance) : 5000;

    if (
      Number.isNaN(lngNum) ||
      Number.isNaN(latNum) ||
      lngNum < -180 ||
      lngNum > 180 ||
      latNum < -90 ||
      latNum > 90
    ) {
      return res.status(400).json({
        success: false,
        code: "BRANCH_NEARBY_INVALID_COORDS",
        message: "lng/lat are out of range",
      });
    }

    const branches = await branchService.findNearbyBranches(
      lngNum,
      latNum,
      maxDist
    );

    return res.json({
      success: true,
      data: branches,
    });
  } catch (error) {
    console.error("findNearbyBranches error:", error);
    return res.status(500).json({
      success: false,
      code: "BRANCH_NEARBY_ERROR",
      message: "Failed to find nearby branches",
    });
  }
}

/**
 * GET /api/branches/{id}/is-open
 * Public: optional ?at=ISO_DATE_TIME
 */
async function isBranchOpen(req, res) {
  try {
    const { id } = req.params;
    const { at } = req.query;

    const result = await branchService.isBranchOpen(id, at);

    return res.json({
      success: true,
      data: {
        branch: result.branch,
        open: result.open,
        at: result.at,
      },
    });
  } catch (error) {
    console.error("isBranchOpen error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "BRANCH_IS_OPEN_ERROR",
      message: error.message || "Failed to check if branch is open",
    });
  }
}

module.exports = {
  createBranch,
  getAllBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
  searchBranches,
  findNearbyBranches,
  isBranchOpen,
};
