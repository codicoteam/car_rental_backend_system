// services/service_schedule_service.js
const mongoose = require("mongoose");
const ServiceSchedule = require("../models/service_schedule_model");

function assertObjectId(id, fieldName = "id") {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error(`Invalid ${fieldName}`);
    err.statusCode = 400;
    throw err;
  }
}

async function createServiceSchedule(payload) {
  const schedule = new ServiceSchedule(payload);

  try {
    const saved = await schedule.save();
    return saved;
  } catch (err) {
    err.statusCode = 400;
    throw err;
  }
}

async function getServiceScheduleById(id) {
  assertObjectId(id, "service schedule id");

  const doc = await ServiceSchedule.findById(id);
  if (!doc) {
    const err = new Error("ServiceSchedule not found");
    err.statusCode = 404;
    throw err;
  }
  return doc;
}

async function listServiceSchedules({
  vehicle_id,
  vehicle_model_id,
  page = 1,
  limit = 20,
}) {
  const query = {};

  if (vehicle_id) {
    assertObjectId(vehicle_id, "vehicle_id");
    query.vehicle_id = vehicle_id;
  }

  if (vehicle_model_id) {
    assertObjectId(vehicle_model_id, "vehicle_model_id");
    query.vehicle_model_id = vehicle_model_id;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    ServiceSchedule.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit)),
    ServiceSchedule.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  };
}

async function getSchedulesByVehicle(vehicleId, { page = 1, limit = 20 }) {
  assertObjectId(vehicleId, "vehicle_id");
  const query = { vehicle_id: vehicleId };

  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    ServiceSchedule.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit)),
    ServiceSchedule.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  };
}

async function getSchedulesByVehicleModel(
  vehicleModelId,
  { page = 1, limit = 20 }
) {
  assertObjectId(vehicleModelId, "vehicle_model_id");
  const query = { vehicle_model_id: vehicleModelId };

  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    ServiceSchedule.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit)),
    ServiceSchedule.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  };
}

async function updateServiceSchedule(id, payload) {
  assertObjectId(id, "service schedule id");

  const updated = await ServiceSchedule.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    const err = new Error("ServiceSchedule not found");
    err.statusCode = 404;
    throw err;
  }

  return updated;
}

async function deleteServiceSchedule(id) {
  assertObjectId(id, "service schedule id");

  const deleted = await ServiceSchedule.findByIdAndDelete(id);

  if (!deleted) {
    const err = new Error("ServiceSchedule not found");
    err.statusCode = 404;
    throw err;
  }

  return deleted;
}

module.exports = {
  createServiceSchedule,
  getServiceScheduleById,
  listServiceSchedules,
  getSchedulesByVehicle,
  getSchedulesByVehicleModel,
  updateServiceSchedule,
  deleteServiceSchedule,
};
