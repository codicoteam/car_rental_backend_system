// services/vehicle_service.js
const VehicleModel = require("../models/vehicle_model");

/**
 * Helper: build filter object from query
 */
function buildVehicleModelFilter(query = {}) {
  const {
    make,
    model,
    year,
    class: vehicleClass,
    transmission,
    fuel_type,
    seats_min,
    seats_max,
    doors_min,
    doors_max,
    feature,
  } = query;

  const filter = {};

  if (make) filter.make = new RegExp(`^${make}$`, "i"); // case-insensitive exact
  if (model) filter.model = new RegExp(`^${model}$`, "i");
  if (year) filter.year = Number(year);
  if (vehicleClass) filter.class = vehicleClass;
  if (transmission) filter.transmission = transmission;
  if (fuel_type) filter.fuel_type = fuel_type;

  if (seats_min || seats_max) {
    filter.seats = {};
    if (seats_min) filter.seats.$gte = Number(seats_min);
    if (seats_max) filter.seats.$lte = Number(seats_max);
  }

  if (doors_min || doors_max) {
    filter.doors = {};
    if (doors_min) filter.doors.$gte = Number(doors_min);
    if (doors_max) filter.doors.$lte = Number(doors_max);
  }

  // single feature match (you can extend to multiple)
  if (feature) {
    filter.features = feature; // array contains feature
  }

  return filter;
}

/**
 * Create a new vehicle model
 */
async function createVehicleModel(payload) {
  try {
    const model = await VehicleModel.create(payload);
    return model;
  } catch (err) {
    // Duplicate key (make/model/year unique index)
    if (err.code === 11000) {
      const error = new Error(
        "Vehicle model with same make, model and year already exists"
      );
      error.statusCode = 409;
      error.code = "VEHICLE_MODEL_DUPLICATE";
      throw error;
    }

    const error = new Error("Failed to create vehicle model");
    error.statusCode = 400;
    error.code = "VEHICLE_MODEL_CREATE_FAILED";
    error.details = err.message;
    throw error;
  }
}

/**
 * List vehicle models with filters + pagination
 */
async function listVehicleModels(query = {}) {
  const page = query.page ? Number(query.page) : 1;
  const limit = query.limit ? Number(query.limit) : 20;
  const skip = (page - 1) * limit;

  const filter = buildVehicleModelFilter(query);

  const [items, total] = await Promise.all([
    VehicleModel.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ make: 1, model: 1, year: 1 }),
    VehicleModel.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a vehicle model by ID
 */
async function getVehicleModelById(id) {
  const model = await VehicleModel.findById(id);
  if (!model) {
    const error = new Error("Vehicle model not found");
    error.statusCode = 404;
    error.code = "VEHICLE_MODEL_NOT_FOUND";
    throw error;
  }
  return model;
}

/**
 * Update a vehicle model
 */
async function updateVehicleModel(id, payload) {
  // Don’t allow changing unique identity casually? We’ll allow,
  // but duplicates will trigger unique index error.
  try {
    const model = await VehicleModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    if (!model) {
      const error = new Error("Vehicle model not found");
      error.statusCode = 404;
      error.code = "VEHICLE_MODEL_NOT_FOUND";
      throw error;
    }

    return model;
  } catch (err) {
    if (err.code === 11000) {
      const error = new Error(
        "Vehicle model with same make, model and year already exists"
      );
      error.statusCode = 409;
      error.code = "VEHICLE_MODEL_DUPLICATE";
      throw error;
    }

    const error = new Error("Failed to update vehicle model");
    error.statusCode = 400;
    error.code = "VEHICLE_MODEL_UPDATE_FAILED";
    error.details = err.message;
    throw error;
  }
}

/**
 * Delete a vehicle model
 */
async function deleteVehicleModel(id) {
  const model = await VehicleModel.findByIdAndDelete(id);
  if (!model) {
    const error = new Error("Vehicle model not found");
    error.statusCode = 404;
    error.code = "VEHICLE_MODEL_NOT_FOUND";
    throw error;
  }
  return model;
}

module.exports = {
  createVehicleModel,
  listVehicleModels,
  getVehicleModelById,
  updateVehicleModel,
  deleteVehicleModel,
};
