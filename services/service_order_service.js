// services/service_order_service.js
const mongoose = require("mongoose");
const ServiceOrder = require("../models/service_order_model");

/**
 * Helper to ensure a valid ObjectId
 */
function assertObjectId(id, fieldName = "id") {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error(`Invalid ${fieldName}`);
    err.statusCode = 400;
    throw err;
  }
}

async function createServiceOrder(payload) {
  const serviceOrder = new ServiceOrder(payload);
  try {
    const saved = await serviceOrder.save();
    return saved;
  } catch (err) {
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Get by ID
 */
async function getServiceOrderById(id) {
  assertObjectId(id, "service order id");

  const doc = await ServiceOrder.findById(id);
  if (!doc) {
    const err = new Error("ServiceOrder not found");
    err.statusCode = 404;
    throw err;
  }
  return doc;
}

/**
 * List with filtering + pagination
 */
async function listServiceOrders({
  vehicle_id,
  status,
  type,
  created_from,
  created_to,
}) {
  const query = {};

  if (vehicle_id) {
    assertObjectId(vehicle_id, "vehicle_id");
    query.vehicle_id = vehicle_id;
  }

  if (status) query.status = status;
  if (type) query.type = type;

  if (created_from || created_to) {
    query.created_at = {};
    if (created_from) query.created_at.$gte = new Date(created_from);
    if (created_to) query.created_at.$lte = new Date(created_to);
  }

  const items = await ServiceOrder.find(query)
    .sort({ created_at: -1 })
    .populate({
      path: "vehicle_id",
      // select: "registration_number make model year", // optional
    });

  return items;
}

/**
 * Get all service orders for a given vehicle
 */
async function getServiceOrdersByVehicle(
  vehicleId,
  { status, type, page = 1, limit = 20 }
) {
  assertObjectId(vehicleId, "vehicle_id");

  const query = { vehicle_id: vehicleId };
  if (status) query.status = status;
  if (type) query.type = type;

  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    ServiceOrder.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit)),
    ServiceOrder.countDocuments(query),
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

/**
 * Update full document
 */
async function updateServiceOrder(id, payload) {
  assertObjectId(id, "service order id");

  const updated = await ServiceOrder.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    const err = new Error("ServiceOrder not found");
    err.statusCode = 404;
    throw err;
  }

  return updated;
}

/**
 * Update status only
 */
async function updateServiceOrderStatus(id, status) {
  assertObjectId(id, "service order id");

  const updated = await ServiceOrder.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!updated) {
    const err = new Error("ServiceOrder not found");
    err.statusCode = 404;
    throw err;
  }

  return updated;
}

/**
 * Delete service order (hard delete)
 * You can change this to soft-delete if needed
 */
async function deleteServiceOrder(id) {
  assertObjectId(id, "service order id");

  const deleted = await ServiceOrder.findByIdAndDelete(id);
  if (!deleted) {
    const err = new Error("ServiceOrder not found");
    err.statusCode = 404;
    throw err;
  }
  return deleted;
}

module.exports = {
  createServiceOrder,
  getServiceOrderById,
  listServiceOrders,
  getServiceOrdersByVehicle,
  updateServiceOrder,
  updateServiceOrderStatus,
  deleteServiceOrder,
};
