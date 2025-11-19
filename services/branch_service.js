// services/branch_service.js
const Branch = require("../models/branch_models");
/**
 * Create a new branch
 */
async function createBranch(payload) {
  try {
    const branch = await Branch.create(payload);
    return branch;
  } catch (err) {
    const error = new Error("Failed to create branch");
    error.statusCode = 400;
    error.code = "BRANCH_CREATE_FAILED";
    error.details = err.message;
    throw error;
  }
}

/**
 * Get all branches (no pagination)
 */
async function getAllBranches() {
  const branches = await Branch.find().sort({ name: 1 });
  return branches;
}

/**
 * Get a branch by ID
 */
async function getBranchById(id) {
  const branch = await Branch.findById(id);
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
    const branch = await Branch.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    if (!branch) {
      const error = new Error("Branch not found");
      error.statusCode = 404;
      error.code = "BRANCH_NOT_FOUND";
      throw error;
    }

    return branch;
  } catch (err) {
    const error = new Error("Failed to update branch");
    error.statusCode = 400;
    error.code = "BRANCH_UPDATE_FAILED";
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

  const branches = await Branch.find(query).sort({ name: 1 });
  return branches;
}

/**
 * Find branches near a point (lng, lat) using static method.
 */
async function findNearbyBranches(lng, lat, maxDistance = 5000) {
  const branches = await Branch.findNearby(lng, lat, maxDistance);
  return branches;
}

/**
 * Check if a branch is open at a given time (or now).
 */
async function isBranchOpen(branchId, at) {
  const branch = await Branch.findById(branchId);
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
