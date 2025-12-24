// routers/profile_router.js
const express = require("express");
const router = express.Router();

const profileController = require("../controllers/profile_controller");
const {
  authMiddleware,
  requireRoles,
} = require("../middlewares/auth_middleware");

// role helpers
const agentManagerAdmin = requireRoles("agent", "manager", "admin");
const managerAdmin = requireRoles("manager", "admin");

/**
 * @swagger
 * tags:
 *   name: Profiles
 *   description: User profile operations (customer / agent / manager / admin)
 */

/**
 * @swagger
 * /api/v1/profiles/self:
 *   post:
 *     summary: Create your own profile for a role you already have
 *     description: A user can create a profile for any role present in their User.roles.
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [customer, agent, manager, admin]
 *                 example: customer
 *               full_name:
 *                 type: string
 *               dob:
 *                 type: string
 *                 format: date-time
 *               national_id:
 *                 type: string
 *               driver_license:
 *                 $ref: '#/components/schemas/DriverLicense'
 *               address:
 *                 $ref: '#/components/schemas/Address'
 *               preferences:
 *                 $ref: '#/components/schemas/Preferences'
 *               gdpr:
 *                 $ref: '#/components/schemas/Gdpr'
 *               loyalty_points:
 *                 type: number
 *                 description: Only applicable to customer role
 *               branch_id:
 *                 type: string
 *                 description: Only applicable to agent role
 *               branch_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Only applicable to manager role
 *               approval_limit_usd:
 *                 type: number
 *                 description: Only applicable to manager role
 *     responses:
 *       201:
 *         description: Profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Profile'
 *       400:
 *         description: Validation or business error
 *       401:
 *         description: Unauthorized
 */
router.post("/self", authMiddleware, profileController.createSelfProfile);

/**
 * @swagger
 * /api/v1/profiles/customer/by-staff:
 *   post:
 *     summary: Create a customer profile on behalf of another user
 *     description: Only agent, manager or admin can create customer profiles for other users.
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - target_user_id
 *             properties:
 *               target_user_id:
 *                 type: string
 *                 description: User ID of the customer
 *               full_name:
 *                 type: string
 *               dob:
 *                 type: string
 *                 format: date-time
 *               national_id:
 *                 type: string
 *               driver_license:
 *                 $ref: '#/components/schemas/DriverLicense'
 *               address:
 *                 $ref: '#/components/schemas/Address'
 *               preferences:
 *                 $ref: '#/components/schemas/Preferences'
 *               gdpr:
 *                 $ref: '#/components/schemas/Gdpr'
 *               loyalty_points:
 *                 type: number
 *               verified:
 *                 type: boolean
 *                 description: Staff can set verified flag when creating the profile
 *     responses:
 *       201:
 *         description: Customer profile created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  "/customer/by-staff",
  authMiddleware,
  agentManagerAdmin,
  profileController.createCustomerByStaff
);

/**
 * @swagger
 * /api/v1/profiles/agent/by-staff:
 *   post:
 *     summary: Create an agent profile on behalf of another user
 *     description: Only manager or admin can create agent profiles for other users.
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - target_user_id
 *             properties:
 *               target_user_id:
 *                 type: string
 *                 description: User ID of the agent
 *               full_name:
 *                 type: string
 *               dob:
 *                 type: string
 *                 format: date-time
 *               national_id:
 *                 type: string
 *               driver_license:
 *                 $ref: '#/components/schemas/DriverLicense'
 *               address:
 *                 $ref: '#/components/schemas/Address'
 *               preferences:
 *                 $ref: '#/components/schemas/Preferences'
 *               gdpr:
 *                 $ref: '#/components/schemas/Gdpr'
 *               branch_id:
 *                 type: string
 *               can_apply_discounts:
 *                 type: boolean
 *               verified:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Agent profile created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  "/agent/by-staff",
  authMiddleware,
  managerAdmin,
  profileController.createAgentByStaff
);

/**
 * @swagger
 * /api/v1/profiles/manager/by-staff:
 *   post:
 *     summary: Create a manager profile on behalf of another user
 *     description: Only admin can create manager profiles for other users.
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - target_user_id
 *             properties:
 *               target_user_id:
 *                 type: string
 *                 description: User ID of the manager
 *               full_name:
 *                 type: string
 *               dob:
 *                 type: string
 *                 format: date-time
 *               national_id:
 *                 type: string
 *               driver_license:
 *                 $ref: '#/components/schemas/DriverLicense'
 *               address:
 *                 $ref: '#/components/schemas/Address'
 *               preferences:
 *                 $ref: '#/components/schemas/Preferences'
 *               gdpr:
 *                 $ref: '#/components/schemas/Gdpr'
 *               branch_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               approval_limit_usd:
 *                 type: number
 *     responses:
 *       201:
 *         description: Manager profile created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  "/manager/by-staff",
  authMiddleware,
  requireRoles("admin"),
  profileController.createManagerByStaff
);

/**
 * @swagger
 * /api/v1/profiles/me/{role}:
 *   get:
 *     summary: Get current user's profile for a specific role
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [customer, agent, manager, admin]
 *     responses:
 *       200:
 *         description: Profile found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Profile'
 *       404:
 *         description: Profile not found
 *       401:
 *         description: Unauthorized
 */
router.get("/me/:role", authMiddleware, profileController.getMyProfileByRole);

/**
 * @swagger
 * /api/v1/profiles:
 *   get:
 *     summary: List profiles (manager/admin only)
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [customer, agent, manager, admin]
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of profiles
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/", authMiddleware, managerAdmin, profileController.listProfiles);

/**
 * @swagger
 * /api/v1/profiles/{id}:
 *   get:
 *     summary: Get a profile by ID
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Profile ID
 *     responses:
 *       200:
 *         description: Profile found
 *       404:
 *         description: Profile not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/:id", authMiddleware, profileController.getProfileById);

/**
 * @swagger
 * /api/v1/profiles/{id}:
 *   patch:
 *     summary: Update a profile
 *     description: Owner can update their own profile. Manager/Admin can update any profile.
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Profile ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Any updatable fields from Profile / specific role schemas (except user and role)
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       404:
 *         description: Profile not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.patch("/:id", authMiddleware, profileController.updateProfile);

/**
 * @swagger
 * /api/v1/profiles/{id}:
 *   delete:
 *     summary: Delete a profile (admin only)
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Profile ID
 *     responses:
 *       200:
 *         description: Profile deleted successfully
 *       404:
 *         description: Profile not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.delete(
  "/:id",
  authMiddleware,
  requireRoles("admin"),
  profileController.deleteProfile
);

/**
 * @swagger
 * /api/v1/profiles/user/{userId}:
 *   get:
 *     summary: Get all profiles for a user (all roles)
 *     description: Returns every profile document for the specified userId (customer/agent/manager/admin). Any authenticated user can access.
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the user whose profiles you want to fetch
 *         example: "64f1b2c3d4e5f67890123456"
 *     responses:
 *       200:
 *         description: Profiles found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     profiles:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Profile'
 *                     total:
 *                       type: integer
 *                       example: 2
 *       404:
 *         description: No profiles found for this user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: No profiles found for this user
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/user/:userId",
  authMiddleware,
  profileController.getProfilesByUserId
);

module.exports = router;
