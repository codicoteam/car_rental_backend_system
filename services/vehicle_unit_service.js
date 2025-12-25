// services/vehicle_unit_service.js
const Vehicle = require("../models/vehicle_unit_model");

/**
 * Build filter for listing/searching vehicles
 */
function buildVehicleFilter(query = {}) {
  const {
    plate_number,
    vin,
    branch_id,
    status,
    availability_state,
    color,
    odometer_min,
    odometer_max,
  } = query;

  const filter = {};

  if (plate_number) {
    // exact, case-insensitive
    filter.plate_number = new RegExp(`^${plate_number}$`, "i");
  }

  if (vin) {
    filter.vin = new RegExp(`^${vin}$`, "i");
  }

  if (branch_id) {
    filter.branch_id = branch_id;
  }

  if (status) {
    filter.status = status;
  }

  if (availability_state) {
    filter.availability_state = availability_state;
  }

  if (color) {
    filter.color = new RegExp(color, "i"); // partial match
  }

  if (odometer_min || odometer_max) {
    filter.odometer_km = {};
    if (odometer_min) filter.odometer_km.$gte = Number(odometer_min);
    if (odometer_max) filter.odometer_km.$lte = Number(odometer_max);
  }

  return filter;
}

/**
 * Create a vehicle unit
 */
async function createVehicle(payload) {
  try {
    const vehicle = await Vehicle.create(payload);
    return vehicle;
  } catch (err) {
    const error = new Error("Failed to create vehicle");
    error.statusCode = 400;
    error.code = "VEHICLE_CREATE_FAILED";

    // Duplicate plate_number or vin
    if (err.code === 11000) {
      error.statusCode = 409;
      error.code = "VEHICLE_DUPLICATE";
      if (err.keyPattern?.plate_number) {
        error.message = "Vehicle with this plate_number already exists";
      } else if (err.keyPattern?.vin) {
        error.message = "Vehicle with this VIN already exists";
      } else {
        error.message = "Vehicle already exists (duplicate key)";
      }
    } else {
      error.details = err.message;
    }

    throw error;
  }
}

/**
 * List vehicles with filters + pagination
 * This is guest-friendly (no auth required)
 */
async function listVehicles(query = {}) {
  const filter = buildVehicleFilter(query);

  const items = await Vehicle.find(filter)
    .sort({ created_at: -1 })
    .populate("vehicle_model_id")
    .populate("branch_id");

  return {
    items,
    total: items.length,
  };
}


/**
 * Get a single vehicle by ID
 */
async function getVehicleById(id) {
  const vehicle = await Vehicle.findById(id)
    .populate("vehicle_model_id")
    .populate("branch_id");

  if (!vehicle) {
    const error = new Error("Vehicle not found");
    error.statusCode = 404;
    error.code = "VEHICLE_NOT_FOUND";
    throw error;
  }

  return vehicle;
}

/**
 * Update vehicle (general fields)
 */
async function updateVehicle(id, payload) {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    if (!vehicle) {
      const error = new Error("Vehicle not found");
      error.statusCode = 404;
      error.code = "VEHICLE_NOT_FOUND";
      throw error;
    }

    return vehicle;
  } catch (err) {
    const error = new Error("Failed to update vehicle");
    error.statusCode = 400;
    error.code = "VEHICLE_UPDATE_FAILED";

    if (err.code === 11000) {
      error.statusCode = 409;
      error.code = "VEHICLE_DUPLICATE";
      if (err.keyPattern?.plate_number) {
        error.message = "Vehicle with this plate_number already exists";
      } else if (err.keyPattern?.vin) {
        error.message = "Vehicle with this VIN already exists";
      } else {
        error.message = "Vehicle already exists (duplicate key)";
      }
    } else {
      error.details = err.message;
    }

    throw error;
  }
}

/**
 * Delete vehicle
 */
async function deleteVehicle(id) {
  const vehicle = await Vehicle.findByIdAndDelete(id);
  if (!vehicle) {
    const error = new Error("Vehicle not found");
    error.statusCode = 404;
    error.code = "VEHICLE_NOT_FOUND";
    throw error;
  }
  return vehicle;
}

/**
 * Set availability state
 */
async function setVehicleAvailability(id, state) {
  const vehicle = await Vehicle.findById(id);
  if (!vehicle) {
    const error = new Error("Vehicle not found");
    error.statusCode = 404;
    error.code = "VEHICLE_NOT_FOUND";
    throw error;
  }

  try {
    vehicle.setAvailability(state);
  } catch (err) {
    const error = new Error("Invalid availability_state");
    error.statusCode = 400;
    error.code = "VEHICLE_AVAILABILITY_INVALID";
    error.details = err.message;
    throw error;
  }

  await vehicle.save();
  return vehicle;
}

/**
 * Record service event for vehicle
 */
async function recordVehicleService(id, date, odometerKm) {
  const vehicle = await Vehicle.findById(id);
  if (!vehicle) {
    const error = new Error("Vehicle not found");
    error.statusCode = 404;
    error.code = "VEHICLE_NOT_FOUND";
    throw error;
  }

  vehicle.recordService(date || new Date(), odometerKm);
  await vehicle.save();

  return vehicle;
}

module.exports = {
  createVehicle,
  listVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  setVehicleAvailability,
  recordVehicleService,
};
