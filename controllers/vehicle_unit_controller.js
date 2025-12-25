// controllers/vehicle_unit_controller.js
const vehicleUnitService = require("../services/vehicle_unit_service");

/**
 * POST /api/vehicles
 * Create vehicle unit (manager/admin)
 */
async function createVehicle(req, res) {
  try {
    const vehicle = await vehicleUnitService.createVehicle(req.body);

    return res.status(201).json({
      success: true,
      message: "Vehicle created successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("createVehicle error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "VEHICLE_CREATE_ERROR",
      message: error.message || "Failed to create vehicle",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

/**
 * GET /api/vehicles
 * Public: list vehicles with filters (no pagination)
 */
async function listVehicles(req, res) {
  try {
    const result = await vehicleUnitService.listVehicles(req.query);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("listVehicles error:", error);
    return res.status(500).json({
      success: false,
      code: "VEHICLE_LIST_ERROR",
      message: "Failed to fetch vehicles",
    });
  }
}


/**
 * GET /api/vehicles/:id
 * Public: get single vehicle
 */
async function getVehicleById(req, res) {
  try {
    const vehicle = await vehicleUnitService.getVehicleById(req.params.id);

    return res.json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error("getVehicleById error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "VEHICLE_GET_ERROR",
      message: error.message || "Failed to fetch vehicle",
    });
  }
}

/**
 * PATCH /api/vehicles/:id
 * Manager/admin only: update general details
 */
async function updateVehicle(req, res) {
  try {
    const vehicle = await vehicleUnitService.updateVehicle(
      req.params.id,
      req.body
    );

    return res.json({
      success: true,
      message: "Vehicle updated successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("updateVehicle error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "VEHICLE_UPDATE_ERROR",
      message: error.message || "Failed to update vehicle",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

/**
 * DELETE /api/vehicles/:id
 * Manager/admin only
 */
async function deleteVehicle(req, res) {
  try {
    await vehicleUnitService.deleteVehicle(req.params.id);

    return res.json({
      success: true,
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    console.error("deleteVehicle error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "VEHICLE_DELETE_ERROR",
      message: error.message || "Failed to delete vehicle",
    });
  }
}

/**
 * PATCH /api/vehicles/:id/availability
 * Manager/admin only: set availability_state
 */
async function updateVehicleAvailability(req, res) {
  try {
    const { availability_state } = req.body;

    if (!availability_state) {
      return res.status(400).json({
        success: false,
        code: "VEHICLE_AVAILABILITY_REQUIRED",
        message: "availability_state is required",
      });
    }

    const vehicle = await vehicleUnitService.setVehicleAvailability(
      req.params.id,
      availability_state
    );

    return res.json({
      success: true,
      message: "Vehicle availability updated successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("updateVehicleAvailability error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "VEHICLE_AVAILABILITY_ERROR",
      message: error.message || "Failed to update vehicle availability",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

/**
 * PATCH /api/vehicles/:id/service
 * Manager/admin only: record a service event
 */
async function recordVehicleService(req, res) {
  try {
    const { date, odometer_km } = req.body;

    const vehicle = await vehicleUnitService.recordVehicleService(
      req.params.id,
      date ? new Date(date) : undefined,
      typeof odometer_km === "number" ? odometer_km : undefined
    );

    return res.json({
      success: true,
      message: "Vehicle service recorded successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("recordVehicleService error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "VEHICLE_SERVICE_ERROR",
      message: error.message || "Failed to record vehicle service",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

module.exports = {
  createVehicle,
  listVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  updateVehicleAvailability,
  recordVehicleService,
};
