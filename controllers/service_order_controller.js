// controllers/service_order_controller.js
const serviceOrderService = require("../services/service_order_service");

/**
 * Standard error responder
 */
function handleError(res, error) {
  console.error(error);

  const status = error.statusCode || 500;
  const message =
    status === 500 ? "Internal server error" : error.message || "Error";

  return res.status(status).json({
    success: false,
    error: {
      message,
    },
  });
}

/**
 * POST /service-orders
 */
async function createServiceOrder(req, res) {
  try {
    const payload = req.body;
    const created = await serviceOrderService.createServiceOrder(payload);

    return res.status(201).json({
      success: true,
      data: created,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * GET /service-orders/:id
 */
async function getServiceOrderById(req, res) {
  try {
    const { id } = req.params;
    const serviceOrder = await serviceOrderService.getServiceOrderById(id);

    return res.status(200).json({
      success: true,
      data: serviceOrder,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * GET /service-orders
 * Query params: vehicle_id, status, type, created_from, created_to, page, limit
 */
async function getServiceOrders(req, res) {
  try {
    const { vehicle_id, status, type, created_from, created_to } = req.query;

    const items = await serviceOrderService.listServiceOrders({
      vehicle_id,
      status,
      type,
      created_from,
      created_to,
    });

    return res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    return handleError(res, error);
  }
}


/**
 * GET /vehicles/:vehicleId/service-orders
 */
async function getServiceOrdersByVehicle(req, res) {
  try {
    const { vehicleId } = req.params;
    const { status, type, page, limit } = req.query;

    const result = await serviceOrderService.getServiceOrdersByVehicle(
      vehicleId,
      { status, type, page, limit }
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

/**
 * PUT /service-orders/:id
 */
async function updateServiceOrder(req, res) {
  try {
    const { id } = req.params;
    const payload = req.body;

    const updated = await serviceOrderService.updateServiceOrder(id, payload);

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * PATCH /service-orders/:id/status
 */
async function updateServiceOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: { message: "Status is required" },
      });
    }

    const updated = await serviceOrderService.updateServiceOrderStatus(
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

/**
 * DELETE /service-orders/:id
 */
async function deleteServiceOrder(req, res) {
  try {
    const { id } = req.params;
    await serviceOrderService.deleteServiceOrder(id);

    return res.status(204).send(); // no body
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  createServiceOrder,
  getServiceOrderById,
  getServiceOrders,
  getServiceOrdersByVehicle,
  updateServiceOrder,
  updateServiceOrderStatus,
  deleteServiceOrder,
};
