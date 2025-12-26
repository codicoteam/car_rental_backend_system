// controllers/service_schedule_controller.js
const serviceScheduleService = require("../services/service_schedule_service");

function handleError(res, error) {
  console.error(error);

  const status = error.statusCode || 500;
  const message =
    status === 500 ? "Internal server error" : error.message || "Error";

  return res.status(status).json({
    success: false,
    error: { message },
  });
}

// POST /service-schedules
async function createServiceSchedule(req, res) {
  try {
    const payload = req.body;
    const created = await serviceScheduleService.createServiceSchedule(payload);

    return res.status(201).json({
      success: true,
      data: created,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// GET /service-schedules/:id
async function getServiceScheduleById(req, res) {
  try {
    const { id } = req.params;
    const schedule = await serviceScheduleService.getServiceScheduleById(id);

    return res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// GET /service-schedules
async function getServiceSchedules(req, res) {
  try {
    const { vehicle_id, vehicle_model_id } = req.query;

    const items = await serviceScheduleService.listServiceSchedules({
      vehicle_id,
      vehicle_model_id,
    });

    return res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    return handleError(res, error);
  }
}


// GET /vehicles/:vehicleId/service-schedules
async function getSchedulesByVehicle(req, res) {
  try {
    const { vehicleId } = req.params;
    const { page, limit } = req.query;

    const result = await serviceScheduleService.getSchedulesByVehicle(
      vehicleId,
      { page, limit }
    );

    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// GET /vehicle-models/:vehicleModelId/service-schedules
async function getSchedulesByVehicleModel(req, res) {
  try {
    const { vehicleModelId } = req.params;
    const { page, limit } = req.query;

    const result = await serviceScheduleService.getSchedulesByVehicleModel(
      vehicleModelId,
      { page, limit }
    );

    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// PUT /service-schedules/:id
async function updateServiceSchedule(req, res) {
  try {
    const { id } = req.params;
    const payload = req.body;

    const updated = await serviceScheduleService.updateServiceSchedule(
      id,
      payload
    );

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// DELETE /service-schedules/:id
async function deleteServiceSchedule(req, res) {
  try {
    const { id } = req.params;
    await serviceScheduleService.deleteServiceSchedule(id);

    return res.status(204).send();
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  createServiceSchedule,
  getServiceScheduleById,
  getServiceSchedules,
  getSchedulesByVehicle,
  getSchedulesByVehicleModel,
  updateServiceSchedule,
  deleteServiceSchedule,
};
