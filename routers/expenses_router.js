const express = require("express");
const router = express.Router();
const { authMiddleware, requireRoles } = require("../middlewares/auth_middleware");
const ctrl = require("../controllers/expenses_controller");

const VIEWERS = ["admin", "manager", "branch_receptionist", "executive_admin"];
const SUBMITTERS = ["admin", "manager", "branch_receptionist"];
const APPROVERS = ["admin", "manager"];

router.use(authMiddleware);

router.get("/summary", requireRoles(...VIEWERS), ctrl.getExpenseSummary);
router.get("/", requireRoles(...VIEWERS), ctrl.listExpenses);
router.get("/:id", requireRoles(...VIEWERS), ctrl.getExpense);
router.post("/", requireRoles(...SUBMITTERS), ctrl.createExpense);
router.patch("/:id", requireRoles(...SUBMITTERS), ctrl.updateExpense);
router.delete("/:id", requireRoles(...SUBMITTERS), ctrl.deleteExpense);
router.post("/:id/submit", requireRoles(...SUBMITTERS), ctrl.submitExpense);
router.post("/:id/approve", requireRoles(...APPROVERS), ctrl.approveExpense);
router.post("/:id/reject", requireRoles(...APPROVERS), ctrl.rejectExpense);

module.exports = router;
