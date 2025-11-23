// services/vehicle_tracker_service.js
const VehicleTracker = require("../models/vehicle_tracker_model");
const Vehicle = require("../models/vehicle_unit_model");

/**
 * Create a new tracker device (admin/manager)
 */
async function createTracker(data, createdByUserId) {
  const { device_id, label, notes } = data;

  if (!device_id) {
    const err = new Error("device_id is required");
    err.statusCode = 400;
    throw err;
  }

  const existing = await VehicleTracker.findOne({
    device_id: device_id.toUpperCase(),
  });
  if (existing) {
    const err = new Error("A tracker with this device_id already exists.");
    err.statusCode = 409;
    throw err;
  }

  const tracker = new VehicleTracker({
    device_id,
    label,
    notes,
    created_by: createdByUserId || null,
  });

  await tracker.save();
  return tracker;
}

/**
 * List trackers with optional filters
 */
async function listTrackers(filters = {}) {
  const query = {};

  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.vehicle_id) {
    query.vehicle_id = filters.vehicle_id;
  }
  if (filters.branch_id) {
    query.branch_id = filters.branch_id;
  }

  return VehicleTracker.find(query).sort({ created_at: -1 });
}

/**
 * Get a single tracker by ID
 */
async function getTrackerById(id) {
  const tracker = await VehicleTracker.findById(id);
  if (!tracker) {
    const err = new Error("Vehicle tracker not found.");
    err.statusCode = 404;
    throw err;
  }
  return tracker;
}

/**
 * Update tracker (label, notes, settings, status, etc.)
 */
async function updateTracker(id, payload) {
  const tracker = await VehicleTracker.findById(id);
  if (!tracker) {
    const err = new Error("Vehicle tracker not found.");
    err.statusCode = 404;
    throw err;
  }

  const allowedFields = ["label", "notes", "status", "settings"];
  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      tracker[field] = payload[field];
    }
  }

  await tracker.save();
  return tracker;
}

/**
 * Delete tracker (hard delete)
 */
async function deleteTracker(id) {
  const tracker = await VehicleTracker.findById(id);
  if (!tracker) {
    const err = new Error("Vehicle tracker not found.");
    err.statusCode = 404;
    throw err;
  }

  await tracker.deleteOne();
  return { deleted: true };
}

/**
 * Attach a tracker to a vehicle (admin/manager or device)
 */
async function attachTrackerToVehicle(
  trackerId,
  vehicleId,
  actorUserId = null
) {
  const tracker = await VehicleTracker.findById(trackerId);
  if (!tracker) {
    const err = new Error("Vehicle tracker not found.");
    err.statusCode = 404;
    throw err;
  }

  const vehicle = await Vehicle.findById(vehicleId).select("branch_id status");
  if (!vehicle) {
    const err = new Error("Vehicle not found.");
    err.statusCode = 404;
    throw err;
  }

  if (vehicle.status === "retired") {
    const err = new Error("Cannot attach tracker to a retired vehicle.");
    err.statusCode = 400;
    throw err;
  }

  tracker.attachToVehicle(vehicle._id, vehicle.branch_id);
  tracker.markSeen({}); // update last_seen_at at least

  await tracker.save();
  return tracker;
}

/**
 * Detach tracker from its vehicle
 */
async function detachTracker(trackerId, reason = "", actorUserId = null) {
  const tracker = await VehicleTracker.findById(trackerId);
  if (!tracker) {
    const err = new Error("Vehicle tracker not found.");
    err.statusCode = 404;
    throw err;
  }

  tracker.detachFromVehicle(reason);
  await tracker.save();
  return tracker;
}

/**
 * Device login:
 * For now we trust device_id only.
 * In production, you should add a secret/API key on the model and validate it here.
 */
async function deviceLogin(deviceId) {
  if (!deviceId) {
    const err = new Error("device_id is required.");
    err.statusCode = 400;
    throw err;
  }

  const tracker = await VehicleTracker.findOne({
    device_id: deviceId.toUpperCase(),
  });
  if (!tracker) {
    const err = new Error("Tracker not registered.");
    err.statusCode = 404;
    throw err;
  }

  if (tracker.status === "maintenance") {
    const err = new Error("Tracker is in maintenance mode.");
    err.statusCode = 403;
    throw err;
  }

  return tracker; // controller will issue a device token (JWT) if you want
}

/**
 * Attach tracker to vehicle from device context (by device_id)
 */
async function deviceAttachToVehicle(deviceId, vehicleId) {
  const tracker = await VehicleTracker.findOne({
    device_id: deviceId.toUpperCase(),
  });
  if (!tracker) {
    const err = new Error("Tracker not registered.");
    err.statusCode = 404;
    throw err;
  }

  return attachTrackerToVehicle(tracker._id, vehicleId, null);
}

/**
 * Detach tracker from vehicle from device context
 */
async function deviceDetachFromVehicle(deviceId, reason = "") {
  const tracker = await VehicleTracker.findOne({
    device_id: deviceId.toUpperCase(),
  });
  if (!tracker) {
    const err = new Error("Tracker not registered.");
    err.statusCode = 404;
    throw err;
  }

  return detachTracker(tracker._id, reason, null);
}

/**
 * Get last location for a vehicle (by vehicle_id)
 */
async function getLastLocationByVehicleId(vehicleId) {
  const tracker = await VehicleTracker.findOne({
    vehicle_id: vehicleId,
    status: { $in: ["active", "maintenance"] },
  });

  if (!tracker || !tracker.last_location) {
    const err = new Error(
      "No active tracker or location found for this vehicle."
    );
    err.statusCode = 404;
    throw err;
  }

  return {
    vehicle_id: String(vehicleId),
    tracker_id: String(tracker._id),
    last_location: tracker.last_location,
    updated_at: tracker.last_location.at || tracker.updated_at,
  };
}

module.exports = {
  createTracker,
  listTrackers,
  getTrackerById,
  updateTracker,
  deleteTracker,
  attachTrackerToVehicle,
  detachTracker,
  deviceLogin,
  deviceAttachToVehicle,
  deviceDetachFromVehicle,
  getLastLocationByVehicleId,
};
