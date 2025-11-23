// controllers/vehicle_tracker_controller.js
const jwt = require("jsonwebtoken");
const vehicleTrackerService = require("../services/vehicle_tracker_service");

/**
 * Admin/Manager: create tracker
 */
async function createTracker(req, res) {
  try {
    const tracker = await vehicleTrackerService.createTracker(
      req.body,
      req.user?._id
    );
    res.status(201).json({
      success: true,
      data: tracker,
    });
  } catch (err) {
    console.error("createTracker error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to create vehicle tracker.",
    });
  }
}

/**
 * List trackers
 */
async function listTrackers(req, res) {
  try {
    const { status, vehicle_id, branch_id } = req.query;
    const trackers = await vehicleTrackerService.listTrackers({
      status,
      vehicle_id,
      branch_id,
    });
    res.json({ success: true, data: trackers });
  } catch (err) {
    console.error("listTrackers error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to list vehicle trackers.",
    });
  }
}

/**
 * Get tracker by ID
 */
async function getTracker(req, res) {
  try {
    const tracker = await vehicleTrackerService.getTrackerById(req.params.id);
    res.json({ success: true, data: tracker });
  } catch (err) {
    console.error("getTracker error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to fetch vehicle tracker.",
    });
  }
}

/**
 * Update tracker (label, notes, status, settings)
 */
async function updateTracker(req, res) {
  try {
    const tracker = await vehicleTrackerService.updateTracker(
      req.params.id,
      req.body
    );
    res.json({ success: true, data: tracker });
  } catch (err) {
    console.error("updateTracker error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to update vehicle tracker.",
    });
  }
}

/**
 * Delete tracker
 */
async function deleteTracker(req, res) {
  try {
    const result = await vehicleTrackerService.deleteTracker(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("deleteTracker error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to delete vehicle tracker.",
    });
  }
}

/**
 * Attach tracker to vehicle (admin/manager)
 */
async function attachTracker(req, res) {
  try {
    const { vehicle_id } = req.body;
    if (!vehicle_id) {
      return res.status(400).json({
        success: false,
        message: "vehicle_id is required.",
      });
    }

    const tracker = await vehicleTrackerService.attachTrackerToVehicle(
      req.params.id,
      vehicle_id,
      req.user?._id
    );

    res.json({ success: true, data: tracker });
  } catch (err) {
    console.error("attachTracker error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to attach tracker to vehicle.",
    });
  }
}

/**
 * Detach tracker from vehicle (admin/manager)
 */
async function detachTracker(req, res) {
  try {
    const { reason } = req.body;
    const tracker = await vehicleTrackerService.detachTracker(
      req.params.id,
      reason || "",
      req.user?._id
    );
    res.json({ success: true, data: tracker });
  } catch (err) {
    console.error("detachTracker error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to detach tracker from vehicle.",
    });
  }
}

/**
 * Device login - returns a device JWT token
 * In production, also validate some secret.
 */
async function deviceLogin(req, res) {
  try {
    const { device_id } = req.body;

    const tracker = await vehicleTrackerService.deviceLogin(device_id);

    // Mint a "device token" JWT
    const payload = {
      trackerId: String(tracker._id),
      deviceId: tracker.device_id,
      type: "tracker",
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d", // adjust as you like
    });

    res.json({
      success: true,
      data: {
        tracker,
        device_token: token,
      },
    });
  } catch (err) {
    console.error("deviceLogin error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to login tracker device.",
    });
  }
}

/**
 * Device attach to vehicle (using device_id)
 */
async function deviceAttach(req, res) {
  try {
    const { device_id, vehicle_id } = req.body;

    if (!device_id || !vehicle_id) {
      return res.status(400).json({
        success: false,
        message: "device_id and vehicle_id are required.",
      });
    }

    const tracker = await vehicleTrackerService.deviceAttachToVehicle(
      device_id,
      vehicle_id
    );

    res.json({ success: true, data: tracker });
  } catch (err) {
    console.error("deviceAttach error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to attach tracker from device.",
    });
  }
}

/**
 * Device detach from vehicle (using device_id)
 */
async function deviceDetach(req, res) {
  try {
    const { device_id, reason } = req.body;

    if (!device_id) {
      return res.status(400).json({
        success: false,
        message: "device_id is required.",
      });
    }

    const tracker = await vehicleTrackerService.deviceDetachFromVehicle(
      device_id,
      reason || ""
    );

    res.json({ success: true, data: tracker });
  } catch (err) {
    console.error("deviceDetach error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to detach tracker from device.",
    });
  }
}

/**
 * Get last location for a specific vehicle
 */
async function getLastLocationForVehicle(req, res) {
  try {
    const { vehicleId } = req.params;
    const data = await vehicleTrackerService.getLastLocationByVehicleId(
      vehicleId
    );

    res.json({ success: true, data });
  } catch (err) {
    console.error("getLastLocationForVehicle error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to fetch last known location.",
    });
  }
}

module.exports = {
  createTracker,
  listTrackers,
  getTracker,
  updateTracker,
  deleteTracker,
  attachTracker,
  detachTracker,
  deviceLogin,
  deviceAttach,
  deviceDetach,
  getLastLocationForVehicle,
};
