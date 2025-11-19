// routers/branch_router.js
const express = require("express");
const router = express.Router();

const branchController = require("../controllers/branch_controller");
const {
  authMiddleware,
  requireRoles,
} = require("../middlewares/auth_middleware");

const managerOrAdmin = requireRoles("manager", "admin");
const adminOnly = requireRoles("admin");

/**
 * @swagger
 * tags:
 *   name: Branches
 *   description: Branch locations & opening hours
 */

/**
 * @swagger
 * /api/v1/branches:
 *   get:
 *     summary: Get all branches
 *     description: Public endpoint to list all branches (no filters, no pagination).
 *     tags: [Branches]
 *     responses:
 *       200:
 *         description: List of branches
 */
router.get("/", branchController.getAllBranches);

/**
 * @swagger
 * /api/v1/branches/search:
 *   get:
 *     summary: Search branches by city/region/text
 *     description: Public standalone filter endpoint.
 *     tags: [Branches]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Text search on name and address.
 *     responses:
 *       200:
 *         description: Filtered list of branches
 */
router.get("/search", branchController.searchBranches);

/**
 * @swagger
 * /api/v1/branches/nearby:
 *   get:
 *     summary: Find nearby branches
 *     description: Public endpoint to find active branches near a coordinate.
 *     tags: [Branches]
 *     parameters:
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxDistance
 *         schema:
 *           type: integer
 *         description: Max distance in meters (default 5000).
 *     responses:
 *       200:
 *         description: Nearby branches
 *       400:
 *         description: Invalid parameters
 */
router.get("/nearby", branchController.findNearbyBranches);

/**
 * @swagger
 * /api/v1/branches/{id}/is-open:
 *   get:
 *     summary: Check if a branch is open at a given time
 *     description: >
 *       Public endpoint to check if the branch is open.  
 *       If `at` is omitted, uses current server time.
 *     tags: [Branches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Branch ID
 *       - in: query
 *         name: at
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Optional ISO date-time to check.
 *     responses:
 *       200:
 *         description: Open/closed status
 *       404:
 *         description: Branch not found
 */
router.get("/:id/is-open", branchController.isBranchOpen);

/**
 * @swagger
 * /api/v1/branches:
 *   post:
 *     summary: Create a branch
 *     description: Only manager/admin can create branches.
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *               - geo
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Harare CBD Branch"
 *               code:
 *                 type: string
 *                 example: "HRE-CBD"
 *               address:
 *                 type: object
 *                 properties:
 *                   line1:
 *                     type: string
 *                   line2:
 *                     type: string
 *                   city:
 *                     type: string
 *                   region:
 *                     type: string
 *                   postal_code:
 *                     type: string
 *                   country:
 *                     type: string
 *               geo:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: "Point"
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *                     example: [31.053, -17.829]
 *               opening_hours:
 *                 type: object
 *                 description: Per-day opening periods, each with open/close in HH:mm.
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               imageLoc:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Branch created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  "/",
  authMiddleware,
  managerOrAdmin,
  branchController.createBranch
);

/**
 * @swagger
 * /api/v1/branches/{id}:
 *   get:
 *     summary: Get a branch by ID
 *     tags: [Branches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch found
 *       404:
 *         description: Branch not found
 */
router.get("/:id", branchController.getBranchById);

/**
 * @swagger
 * /api/v1/branches/{id}:
 *   patch:
 *     summary: Update a branch
 *     description: Only manager/admin can update branches.
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Branch ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Branch updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Branch not found
 */
router.patch(
  "/:id",
  authMiddleware,
  managerOrAdmin,
  branchController.updateBranch
);

/**
 * @swagger
 * /api/v1/branches/{id}:
 *   delete:
 *     summary: Delete a branch
 *     description: Admin only.
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Branch not found
 */
router.delete(
  "/:id",
  authMiddleware,
  adminOnly,
  branchController.deleteBranch
);

module.exports = router;
