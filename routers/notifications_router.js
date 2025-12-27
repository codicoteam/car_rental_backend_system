// routes/notifications_router.js
const express = require("express");
const router = express.Router();

const {
  authMiddleware, // no role restriction per requirements
} = require("../middlewares/auth_middleware");

const ctrl = require("../controllers/notifications_controller");

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Manage notifications (create, schedule, send, list, acknowledgements)
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Acknowledgement:
 *       type: object
 *       properties:
 *         user_id: { type: string }
 *         read_at: { type: string, format: date-time, nullable: true }
 *         acted_at: { type: string, format: date-time, nullable: true }
 *         action: { type: string, nullable: true }
 *     Notification:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         title: { type: string }
 *         message: { type: string }
 *         type: { type: string, enum: ["info","system","promo","booking","payment","maintenance","alert"] }
 *         priority: { type: string, enum: ["low","normal","high","critical"] }
 *         audience:
 *           type: object
 *           properties:
 *             scope: { type: string, enum: ["all","user","roles"] }
 *             user_id: { type: string, nullable: true }
 *             roles:
 *               type: array
 *               items: { type: string, enum: ["customer","agent","manager","admin","driver"] }
 *         channels:
 *           type: array
 *           items: { type: string, enum: ["in_app","email","sms","push"] }
 *         send_at: { type: string, format: date-time, nullable: true }
 *         sent_at: { type: string, format: date-time, nullable: true }
 *         expires_at: { type: string, format: date-time, nullable: true }
 *         status: { type: string, enum: ["draft","scheduled","sent","cancelled"] }
 *         is_active: { type: boolean }
 *         action_text: { type: string, nullable: true }
 *         action_url: { type: string, nullable: true }
 *         data: { type: object, additionalProperties: true }
 *         acknowledgements:
 *           type: array
 *           items: { $ref: "#/components/schemas/Acknowledgement" }
 *         created_by: { type: string, nullable: true }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: false }
 *         message: { type: string }
 */

/**
 * @swagger
 * /api/v1/notifications:
 *   post:
 *     summary: Create a notification (draft|scheduled|sent)
 *     tags: [Notifications]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/Notification"
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 notification: { $ref: "#/components/schemas/Notification" }
 *       4XX:
 *         description: Client error
 */
router.post("/", authMiddleware, ctrl.create);

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: List notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ["draft","scheduled","sent","cancelled"]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: "-created_at"
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get("/", authMiddleware, ctrl.list);

/**
 * @swagger
 * /api/v1/notifications/mine:
 *   get:
 *  
 *     tags: [Notifications]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: onlyUnread
 *         schema: { type: boolean, default: false }
 *       - in: query
 *         name: includeFuture
 *         schema: { type: boolean, default: false, description: "Include scheduled notifications not yet due" }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, example: "-created_at" }
 *     responses:
 *       200:
 *         description: Paginated list
 */
router.get("/mine", authMiddleware, ctrl.listMine);

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   get:
 *     summary: Get a single notification
 *     tags: [Notifications]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The notification
 *       404:
 *         description: Not found
 */
router.get("/:id", authMiddleware, ctrl.getOne);

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   patch:
 *     summary: Update a notification (not allowed if sent or cancelled)
 *     tags: [Notifications]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/Notification"
 *     responses:
 *       200:
 *         description: Updated
 *       409:
 *         description: Conflict (e.g., already sent)
 */
router.patch("/:id", authMiddleware, ctrl.update);

/**
 * @swagger
 * /api/v1/notifications/{id}/schedule:
 *   post:
 *     summary: Schedule a notification for a future date (sets status=scheduled)
 *     tags: [Notifications]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [send_at]
 *             properties:
 *               send_at: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Scheduled
 */
router.post("/:id/schedule", authMiddleware, ctrl.schedule);

/**
 * @swagger
 * /api/v1/notifications/{id}/send:
 *   post:
 *     summary: Send a notification immediately (sets status=sent, sent_at=now)
 *     tags: [Notifications]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sent
 */
router.post("/:id/send", authMiddleware, ctrl.sendNow);

/**
 * @swagger
 * /api/v1/notifications/{id}/cancel:
 *   post:
 *     summary: Cancel a notification (not allowed if already sent)
 *     tags: [Notifications]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cancelled
 *       409:
 *         description: Conflict (already sent)
 */
router.post("/:id/cancel", authMiddleware, ctrl.cancel);

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   delete:
 *     summary: Disable (soft-delete) a notification (is_active=false)
 *     tags: [Notifications]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Disabled
 */
router.delete("/:id", authMiddleware, ctrl.disable);

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   post:
 *     summary: Acknowledge read for the current user
 *     tags: [Notifications]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Acknowledged
 */
router.post("/:id/read", authMiddleware, ctrl.ackRead);

/**
 * @swagger
 * /api/v1/notifications/{id}/action:
 *   post:
 *     summary: Acknowledge an action (e.g., clicked) for the current user
 *     tags: [Notifications]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action: { type: string, example: "clicked" }
 *     responses:
 *       200:
 *         description: Action recorded
 */
router.post("/:id/action", authMiddleware, ctrl.ackAction);

/**
 * @swagger
 * /api/v1/notifications/bulk/read:
 *   post:
 *     summary: Bulk mark notifications as read for the current user
 *     tags: [Notifications]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Count of items updated
 */
router.post("/bulk/read", authMiddleware, ctrl.bulkRead);

/**
 * @swagger
 * /api/v1/notifications/{id}/acks:
 *   get:
 *     summary: List acknowledgements for a notification
 *     tags: [Notifications]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of acknowledgements
 */
router.get("/:id/acks", authMiddleware, ctrl.listAcks);



/**
 * @swagger
 * /api/v1/notifications/for-user/{userId}:
 *   get:
 *     summary: List notifications visible/sent to a specific user (no pagination)
 *     tags: [Notifications]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Target user's Mongo ObjectId
 *       - in: query
 *         name: onlyUnread
 *         schema: { type: boolean, default: false }
 *         description: If true, return only unread notifications for that user
 *       - in: query
 *         name: includeFuture
 *         schema: { type: boolean, default: false }
 *         description: If true, include scheduled notifications that are not yet due
 *       - in: query
 *         name: roles
 *         schema: { type: string, example: "customer,driver" }
 *         description: Comma-separated roles for that user (used when audience.scope=roles)
 *     responses:
 *       200:
 *         description: List of notifications (no pagination)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 total: { type: integer }
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Notification"
 *       401:
 *         description: Unauthorized
 */
router.get("/for-user/:userId", authMiddleware, ctrl.listForUserById);

/**
 * @swagger
 * /api/v1/notifications/created-by/{userId}:
 *   get:
 *     summary: List notifications created by a specific user (no pagination)
 *     tags: [Notifications]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: Creator user's Mongo ObjectId (created_by)
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: ["draft","scheduled","sent","cancelled"] }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: ["info","system","promo","booking","payment","maintenance","alert"] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: ["low","normal","high","critical"] }
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *         description: Filter by is_active
 *     responses:
 *       200:
 *         description: List of notifications (no pagination)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 total: { type: integer }
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Notification"
 *       401:
 *         description: Unauthorized
 */
router.get("/created-by/:userId", authMiddleware, ctrl.listCreatedByUserId);


module.exports = router;
