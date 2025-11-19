// controllers/vehicle_controller.js
const vehicleService = require("../services/vehicle_service");

/**
 * POST /api/vehicle-models
 * Create a new vehicle model (manager/admin)
 */
async function createVehicleModel(req, res) {
  try {
    const model = await vehicleService.createVehicleModel(req.body);

    return res.status(201).json({
      success: true,
      message: "Vehicle model created successfully",
      data: model,
    });
  } catch (error) {
    console.error("createVehicleModel error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "VEHICLE_MODEL_CREATE_ERROR",
      message: error.message || "Failed to create vehicle model",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

/**
 * GET /api/vehicle-models
 * Public listing, with filters (make, model, year, class, etc.)
 */
async function listVehicleModels(req, res) {
  try {
    const result = await vehicleService.listVehicleModels(req.query);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("listVehicleModels error:", error);
    return res.status(500).json({
      success: false,
      code: "VEHICLE_MODEL_LIST_ERROR",
      message: "Failed to fetch vehicle models",
    });
  }
}

/**
 * GET /api/vehicle-models/:id
 * Public: get single model
 */
async function getVehicleModelById(req, res) {
  try {
    const model = await vehicleService.getVehicleModelById(req.params.id);

    return res.json({
      success: true,
      data: model,
    });
  } catch (error) {
    console.error("getVehicleModelById error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "VEHICLE_MODEL_GET_ERROR",
      message: error.message || "Failed to fetch vehicle model",
    });
  }
}

/**
 * PATCH /api/vehicle-models/:id
 * Manager/admin only
 */
async function updateVehicleModel(req, res) {
  try {
    const model = await vehicleService.updateVehicleModel(
      req.params.id,
      req.body
    );

    return res.json({
      success: true,
      message: "Vehicle model updated successfully",
      data: model,
    });
  } catch (error) {
    console.error("updateVehicleModel error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "VEHICLE_MODEL_UPDATE_ERROR",
      message: error.message || "Failed to update vehicle model",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}

/**
 * DELETE /api/vehicle-models/:id
 * Manager/admin only
 */
async function deleteVehicleModel(req, res) {
  try {
    await vehicleService.deleteVehicleModel(req.params.id);

    return res.json({
      success: true,
      message: "Vehicle model deleted successfully",
    });
  } catch (error) {
    console.error("deleteVehicleModel error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "VEHICLE_MODEL_DELETE_ERROR",
      message: error.message || "Failed to delete vehicle model",
    });
  }
}

module.exports = {
  createVehicleModel,
  listVehicleModels,
  getVehicleModelById,
  updateVehicleModel,
  deleteVehicleModel,
};
