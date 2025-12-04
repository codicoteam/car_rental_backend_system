// routes/service_router.js
const express = require("express");
const router = express.Router();

const serviceOrderController = require("../controllers/service_order_controller");

const {
  authMiddleware,
  requireRoles,
} = require("../middlewares/auth_middleware");

/**
 * @swagger
 * tags:
 *   name: ServiceOrders
 *   description: Vehicle maintenance & service order management
 */

/**
 * @swagger
 * /api/v1/service-orders:
 *   post:
 *     summary: Create a new service order (Admin/Manager only)
 *     tags: [ServiceOrders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ServiceOrder"
 *     responses:
 *       201:
 *         description: Created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (role restriction)
 *       500:
 *         description: Internal server error
 *
 *   get:
 *     summary: List all service orders (all roles read-only)
 *     tags: [ServiceOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, completed, cancelled]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [scheduled_service, repair, tyre_change, inspection]
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: List fetched successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

// Create (Admin + Manager only)
router.post(
  "/",
  authMiddleware,
  requireRoles("admin", "manager"),
  serviceOrderController.createServiceOrder
);

// List (all authenticated users can read)
router.get(
  "/",
  authMiddleware,
  serviceOrderController.getServiceOrders
);

/**
 * @swagger
 * /api/v1/service-orders/{id}:
 *   get:
 *     summary: Get a service order by ID (read-only)
 *     tags: [ServiceOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service order retrieved
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 *
 *   put:
 *     summary: Update a service order (Admin/Manager only)
 *     tags: [ServiceOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ServiceOrder"
 *     responses:
 *       200:
 *         description: Updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden (role restriction)
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 *
 *   delete:
 *     summary: Delete a service order (Admin/Manager only)
 *     tags: [ServiceOrders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Deleted successfully
 *       400:
 *         description: Invalid ID
 *       403:
 *         description: Forbidden (role restriction)
 *       404:
 *         description: Not found
 */

// Get by ID (read-only)
router.get(
  "/service-orders/:id",
  authMiddleware,
  serviceOrderController.getServiceOrderById
);

// Full update (Admin + Manager only)
router.put(
  "/service-orders/:id",
  authMiddleware,
  requireRoles("admin", "manager"),
  serviceOrderController.updateServiceOrder
);

// Delete (Admin + Manager only)
router.delete(
  "/service-orders/:id",
  authMiddleware,
  requireRoles("admin", "manager"),
  serviceOrderController.deleteServiceOrder
);

/**
 * @swagger
 * /api/v1/vehicles/{vehicleId}/service-orders:
 *   get:
 *     summary: Get all service orders for a specific vehicle (read-only)
 *     tags: [ServiceOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: vehicleId
 *         in: path
 *         required: true
 *     responses:
 *       200:
 *         description: List retrieved
 *       400:
 *         description: Invalid vehicle ID
 *       500:
 *         description: Server error
 */
// Get all orders by vehicle (read-only)
router.get(
  "/vehicles/:vehicleId/service-orders",
  authMiddleware,
  serviceOrderController.getServiceOrdersByVehicle
);

/**
 * @swagger
 * /api/v1/service-orders/{id}/status:
 *   patch:
 *     summary: Update only the status of a service order (Admin/Manager only)
 *     tags: [ServiceOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, in_progress, completed, cancelled]
 *             required: [status]
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid status
 *       403:
 *         description: Forbidden (role restriction)
 *       404:
 *         description: Not found
 */
// Update status only (Admin + Manager only)
router.patch(
  "/service-orders/:id/status",
  authMiddleware,
  requireRoles("admin", "manager"),
  serviceOrderController.updateServiceOrderStatus
);

module.exports = router;
