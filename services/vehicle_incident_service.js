// services/vehicle_incident_service.js
const mongoose = require("mongoose");
const VehicleIncident = require("../models/vehicle_incident_model");

function assertObjectId(id, fieldName = "id") {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error(`Invalid ${fieldName}`);
    err.statusCode = 400;
    throw err;
  }
}

async function createVehicleIncident(payload) {
  const incident = new VehicleIncident(payload);
  try {
    const saved = await incident.save();
    return saved;
  } catch (err) {
    err.statusCode = 400;
    throw err;
  }
}

// GET /vehicle-incidents (optional filters, no pagination)
async function listVehicleIncidents(filters = {}) {
  const query = {};

  if (filters.vehicle_id) {
    assertObjectId(filters.vehicle_id, "vehicle_id");
    query.vehicle_id = filters.vehicle_id;
  }

  if (filters.reservation_id) {
    assertObjectId(filters.reservation_id, "reservation_id");
    query.reservation_id = filters.reservation_id;
  }

  if (filters.branch_id) {
    assertObjectId(filters.branch_id, "branch_id");
    query.branch_id = filters.branch_id;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.type) {
    query.type = filters.type;
  }

  const incidents = await VehicleIncident.find(query).sort({ occurred_at: -1 });
  return incidents;
}

async function getVehicleIncidentById(id) {
  assertObjectId(id, "incident id");

  const incident = await VehicleIncident.findById(id);
  if (!incident) {
    const err = new Error("VehicleIncident not found");
    err.statusCode = 404;
    throw err;
  }
  return incident;
}

// GET /vehicles/:vehicleId/vehicle-incidents
async function getIncidentsByVehicle(vehicleId) {
  assertObjectId(vehicleId, "vehicle_id");
  const incidents = await VehicleIncident.find({ vehicle_id: vehicleId }).sort({
    occurred_at: -1,
  });
  return incidents;
}

// GET /reservations/:reservationId/vehicle-incidents
async function getIncidentsByReservation(reservationId) {
  assertObjectId(reservationId, "reservation_id");
  const incidents = await VehicleIncident.find({
    reservation_id: reservationId,
  }).sort({ occurred_at: -1 });
  return incidents;
}

// GET /branches/:branchId/vehicle-incidents
async function getIncidentsByBranch(branchId) {
  assertObjectId(branchId, "branch_id");
  const incidents = await VehicleIncident.find({ branch_id: branchId }).sort({
    occurred_at: -1,
  });
  return incidents;
}

async function updateVehicleIncident(id, payload) {
  assertObjectId(id, "incident id");

  const updated = await VehicleIncident.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    const err = new Error("VehicleIncident not found");
    err.statusCode = 404;
    throw err;
  }

  return updated;
}

async function updateVehicleIncidentStatus(id, status) {
  assertObjectId(id, "incident id");

  const updated = await VehicleIncident.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!updated) {
    const err = new Error("VehicleIncident not found");
    err.statusCode = 404;
    throw err;
  }

  return updated;
}

async function deleteVehicleIncident(id) {
  assertObjectId(id, "incident id");

  const deleted = await VehicleIncident.findByIdAndDelete(id);
  if (!deleted) {
    const err = new Error("VehicleIncident not found");
    err.statusCode = 404;
    throw err;
  }
  return deleted;
}

module.exports = {
  createVehicleIncident,
  listVehicleIncidents,
  getVehicleIncidentById,
  getIncidentsByVehicle,
  getIncidentsByReservation,
  getIncidentsByBranch,
  updateVehicleIncident,
  updateVehicleIncidentStatus,
  deleteVehicleIncident,
};
