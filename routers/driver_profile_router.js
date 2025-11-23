// routers/driver_profile_router.js
const express = require("express");
const router = express.Router();

const driverController = require("../controllers/driver_profile_controller");
const {
  authMiddleware,
  driverMiddleware,
  adminMiddleware,
  requireRoles,
} = require("../middlewares/auth_middleware");

const managerOrAdmin = requireRoles("manager", "admin");

/**
 * @swagger
 * tags:
 *   name: DriverProfiles
 *   description: Driver registration and profile management (standalone, not tied to car reservations)
 */

/**
 * @swagger
 * /api/v1/driver-profiles/public:
 *   get:
 *     summary: Public list of approved & available drivers
 *     description: >
 *       Returns drivers with status=approved and is_available=true.
 *       Can be used by customers/agents to browse drivers before booking.
 *     tags: [DriverProfiles]
 *     parameters:
 *       - in: query
 *         name: base_city
 *         schema:
 *           type: string
 *         description: Filter by base city (case-insensitive, partial match).
 *       - in: query
 *         name: base_country
 *         schema:
 *           type: string
 *         description: Filter by base country (case-insensitive, partial match).
 *       - in: query
 *         name: min_rating
 *         schema:
 *           type: number
 *         description: Minimum average rating.
 *     responses:
 *       200:
 *         description: List of approved and available drivers
 */
router.get("/public", driverController.listPublicDrivers);

/**
 * @swagger
 * /api/v1/driver-profiles/me:
 *   post:
 *     summary: Create my driver profile
 *     description: >
 *       Used by a user with role=driver to create their driver profile.
 *       Fails if a profile already exists.
 *     tags: [DriverProfiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/DriverProfileInput"
 *     responses:
 *       201:
 *         description: Driver profile created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: User is not a driver
 *       409:
 *         description: Profile already exists
 */
router.post(
  "/me",
  authMiddleware,
  driverMiddleware,
  driverController.createMyDriverProfile
);

/**
 * @swagger
 * /api/v1/driver-profiles/me:
 *   get:
 *     summary: Get my driver profile
 *     tags: [DriverProfiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Driver profile found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: User is not a driver
 *       404:
 *         description: Profile not found
 */
router.get(
  "/me",
  authMiddleware,
  driverMiddleware,
  driverController.getMyDriverProfile
);

/**
 * @swagger
 * /api/v1/driver-profiles/me:
 *   patch:
 *     summary: Update my driver profile
 *     tags: [DriverProfiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/DriverProfileInput"
 *     responses:
 *       200:
 *         description: Driver profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: User is not a driver
 *       404:
 *         description: Profile not found
 */
router.patch(
  "/me",
  authMiddleware,
  driverMiddleware,
  driverController.updateMyDriverProfile
);

/**
 * @swagger
 * /api/v1/driver-profiles:
 *   get:
 *     summary: List driver profiles (management)
 *     description: Only manager/admin can list all driver profiles.
 *     tags: [DriverProfiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: is_available
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: base_city
 *         schema:
 *           type: string
 *       - in: query
 *         name: base_country
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of driver profiles
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/",
  authMiddleware,
  managerOrAdmin,
  driverController.listDriverProfiles
);

/**
 * @swagger
 * /api/v1/driver-profiles/{id}:
 *   get:
 *     summary: Get driver profile by ID (management)
 *     tags: [DriverProfiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: DriverProfile _id
 *     responses:
 *       200:
 *         description: Driver profile found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Profile not found
 */
router.get(
  "/:id",
  authMiddleware,
  managerOrAdmin,
  driverController.getDriverProfileById
);

/**
 * @swagger
 * /api/v1/driver-profiles/{id}/approve:
 *   patch:
 *     summary: Approve a driver profile
 *     description: Admin only. Sets status=approved and records approved_by_admin + approved_at.
 *     tags: [DriverProfiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: DriverProfile _id
 *     responses:
 *       200:
 *         description: Driver profile approved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (requires admin)
 *       404:
 *         description: Profile not found
 */
router.patch(
  "/:id/approve",
  authMiddleware,
  adminMiddleware,
  driverController.approveDriverProfile
);

/**
 * @swagger
 * /api/v1/driver-profiles/{id}/reject:
 *   patch:
 *     summary: Reject a driver profile
 *     description: Admin only. Sets status=rejected and records approved_by_admin, approved_at, and rejection_reason.
 *     tags: [DriverProfiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: DriverProfile _id
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "License document is not clear."
 *     responses:
 *       200:
 *         description: Driver profile rejected
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (requires admin)
 *       404:
 *         description: Profile not found
 */
router.patch(
  "/:id/reject",
  authMiddleware,
  adminMiddleware,
  driverController.rejectDriverProfile
);

/**
 * @swagger
 * /api/v1/driver-profiles/{id}:
 *   patch:
 *     summary: Admin update driver profile
 *     description: >
 *       Admin/manager can update fields like is_available, hourly_rate, etc.
 *       Be careful with status changes – recommend using approve/reject endpoints instead.
 *     tags: [DriverProfiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/DriverProfile"
 *     responses:
 *       200:
 *         description: Driver profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Profile not found
 */
router.patch(
  "/:id",
  authMiddleware,
  managerOrAdmin,
  driverController.adminUpdateDriverProfile
);

/**
 * @swagger
 * /api/v1/driver-profiles/{id}:
 *   delete:
 *     summary: Delete a driver profile
 *     description: Admin only.
 *     tags: [DriverProfiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Driver profile deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Profile not found
 */
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  driverController.deleteDriverProfile
);

module.exports = router;
