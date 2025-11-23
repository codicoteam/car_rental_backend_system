// controllers/vehicle_incident_controller.js
const vehicleIncidentService = require("../services/vehicle_incident_service");

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

// POST /vehicle-incidents
async function createVehicleIncident(req, res) {
  try {
    const payload = req.body;
    const created = await vehicleIncidentService.createVehicleIncident(payload);

    return res.status(201).json({
      success: true,
      data: created,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// GET /vehicle-incidents
async function getVehicleIncidents(req, res) {
  try {
    const { vehicle_id, reservation_id, branch_id, status, type } = req.query;

    const incidents = await vehicleIncidentService.listVehicleIncidents({
      vehicle_id,
      reservation_id,
      branch_id,
      status,
      type,
    });

    return res.status(200).json({
      success: true,
      data: incidents,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// GET /vehicle-incidents/:id
async function getVehicleIncidentById(req, res) {
  try {
    const { id } = req.params;
    const incident = await vehicleIncidentService.getVehicleIncidentById(id);

    return res.status(200).json({
      success: true,
      data: incident,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// GET /vehicles/:vehicleId/vehicle-incidents
async function getIncidentsByVehicle(req, res) {
  try {
    const { vehicleId } = req.params;
    const incidents = await vehicleIncidentService.getIncidentsByVehicle(
      vehicleId
    );

    return res.status(200).json({
      success: true,
      data: incidents,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// GET /reservations/:reservationId/vehicle-incidents
async function getIncidentsByReservation(req, res) {
  try {
    const { reservationId } = req.params;
    const incidents = await vehicleIncidentService.getIncidentsByReservation(
      reservationId
    );

    return res.status(200).json({
      success: true,
      data: incidents,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// GET /branches/:branchId/vehicle-incidents
async function getIncidentsByBranch(req, res) {
  try {
    const { branchId } = req.params;
    const incidents = await vehicleIncidentService.getIncidentsByBranch(
      branchId
    );

    return res.status(200).json({
      success: true,
      data: incidents,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// PUT /vehicle-incidents/:id
async function updateVehicleIncident(req, res) {
  try {
    const { id } = req.params;
    const payload = req.body;

    const updated = await vehicleIncidentService.updateVehicleIncident(
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

// PATCH /vehicle-incidents/:id/status
async function updateVehicleIncidentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: { message: "Status is required" },
      });
    }

    const updated = await vehicleIncidentService.updateVehicleIncidentStatus(
      id,
      status
    );

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// DELETE /vehicle-incidents/:id
async function deleteVehicleIncident(req, res) {
  try {
    const { id } = req.params;
    await vehicleIncidentService.deleteVehicleIncident(id);

    return res.status(204).send();
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  createVehicleIncident,
  getVehicleIncidents,
  getVehicleIncidentById,
  getIncidentsByVehicle,
  getIncidentsByReservation,
  getIncidentsByBranch,
  updateVehicleIncident,
  updateVehicleIncidentStatus,
  deleteVehicleIncident,
};
