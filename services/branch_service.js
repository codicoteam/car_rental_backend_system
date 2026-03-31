const Branch = require("../models/branch_models");
const User = require("../models/user_model"); // <-- import User model for validation

/**
 * Helper: validate that a user exists (and optionally has manager role)
 * @param {string} userId - The user's ObjectId
 * @returns {Promise<Object>} - The user document
 * @throws {Error} if user not found or invalid
 */
async function validateUser(userId) {
  if (!userId) return null;
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    error.code = "USER_NOT_FOUND";
    throw error;
  }
  // Optional: enforce that the user has 'manager' or 'admin' role
  // if (!user.roles.some(role => ['manager', 'admin'].includes(role))) {
  //   const error = new Error("User is not authorized to be a branch manager");
  //   error.statusCode = 403;
  //   error.code = "INVALID_MANAGER_ROLE";
  //   throw error;
  // }
  return user;
}

/**
 * Create a new branch
 */
async function createBranch(payload) {
  try {
    // Validate branchManager if provided
    if (payload.branchManager) {
      await validateUser(payload.branchManager);
    }

    const branch = await Branch.create(payload);
    // Populate the branchManager after creation
    await branch.populate('branchManager', 'full_name email roles');
    return branch;
  } catch (err) {
    const error = new Error("Failed to create branch");
    error.statusCode = err.statusCode || 400;
    error.code = err.code || "BRANCH_CREATE_FAILED";
    error.details = err.message;
    throw error;
  }
}

/**
 * Get all branches (no pagination), with branchManager populated
 */
async function getAllBranches() {
  const branches = await Branch.find()
    .sort({ name: 1 })
    .populate('branchManager', 'full_name email roles'); // populate manager info
  return branches;
}

/**
 * Get a branch by ID, with branchManager populated
 */
async function getBranchById(id) {
  const branch = await Branch.findById(id).populate('branchManager', 'full_name email roles');
  if (!branch) {
    const error = new Error("Branch not found");
    error.statusCode = 404;
    error.code = "BRANCH_NOT_FOUND";
    throw error;
  }
  return branch;
}

/**
 * Update a branch by ID
 */
async function updateBranch(id, payload) {
  try {
    // Validate branchManager if present in payload
    if (payload.branchManager) {
      await validateUser(payload.branchManager);
    }

    const branch = await Branch.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    }).populate('branchManager', 'full_name email roles');

    if (!branch) {
      const error = new Error("Branch not found");
      error.statusCode = 404;
      error.code = "BRANCH_NOT_FOUND";
      throw error;
    }

    return branch;
  } catch (err) {
    const error = new Error("Failed to update branch");
    error.statusCode = err.statusCode || 400;
    error.code = err.code || "BRANCH_UPDATE_FAILED";
    error.details = err.message;
    throw error;
  }
}

/**
 * Delete a branch by ID
 */
async function deleteBranch(id) {
  const branch = await Branch.findByIdAndDelete(id);
  if (!branch) {
    const error = new Error("Branch not found");
    error.statusCode = 404;
    error.code = "BRANCH_NOT_FOUND";
    throw error;
  }
  return branch;
}

/**
 * Standalone filter search (no pagination)
 * Filters: city, region, active, q (text on name/address)
 * Returns branches with branchManager populated
 */
async function searchBranches(filters = {}) {
  const { city, region, active, q } = filters;

  const query = {};

  if (typeof active !== "undefined") {
    if (active === "true" || active === true) query.active = true;
    if (active === "false" || active === false) query.active = false;
  }

  if (city) {
    query["address.city"] = new RegExp(city, "i");
  }

  if (region) {
    query["address.region"] = new RegExp(region, "i");
  }

  if (q) {
    const regex = new RegExp(q, "i");
    query.$or = [
      { name: regex },
      { "address.line1": regex },
      { "address.line2": regex },
      { "address.city": regex },
      { "address.region": regex },
      { "address.country": regex },
    ];
  }

  const branches = await Branch.find(query)
    .sort({ name: 1 })
    .populate('branchManager', 'full_name email roles');
  return branches;
}

/**
 * Find branches near a point (lng, lat) using static method.
 * Returns branches with branchManager populated
 */
async function findNearbyBranches(lng, lat, maxDistance = 5000) {
  const branches = await Branch.findNearby(lng, lat, maxDistance)
    .populate('branchManager', 'full_name email roles');
  return branches;
}

/**
 * Check if a branch is open at a given time (or now).
 * Returns branch info with branchManager populated
 */
async function isBranchOpen(branchId, at) {
  const branch = await Branch.findById(branchId).populate('branchManager', 'full_name email roles');
  if (!branch) {
    const error = new Error("Branch not found");
    error.statusCode = 404;
    error.code = "BRANCH_NOT_FOUND";
    throw error;
  }

  const date = at ? new Date(at) : new Date();
  const open = branch.isOpenAt(date);

  return { branch, open, at: date };
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