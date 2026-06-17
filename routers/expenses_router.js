const express = require("express");
const router = express.Router();
const { authMiddleware, requireRoles } = require("../middlewares/auth_middleware");
const ctrl = require("../controllers/expenses_controller");

const SUBMITTERS = ["admin", "manager", "branch_receptionist"];
const APPROVERS = ["admin", "manager"]; // NOT branch_receptionist

router.use(authMiddleware);

router.get("/summary", requireRoles(["admin", "manager", "branch_receptionist", "executive_admin"]), ctrl.getExpenseSummary);
router.get("/", requireRoles(["admin", "manager", "branch_receptionist", "executive_admin"]), ctrl.listExpenses);
router.get("/:id", requireRoles(["admin", "manager", "branch_receptionist", "executive_admin"]), ctrl.getExpense);
router.post("/", requireRoles(SUBMITTERS), ctrl.createExpense);
router.patch("/:id", requireRoles(["admin", "manager", "branch_receptionist"]), ctrl.updateExpense);
router.delete("/:id", requireRoles(["admin", "manager", "branch_receptionist"]), ctrl.deleteExpense);
router.post("/:id/submit", requireRoles(SUBMITTERS), ctrl.submitExpense);
router.post("/:id/approve", requireRoles(APPROVERS), ctrl.approveExpense);
router.post("/:id/reject", requireRoles(APPROVERS), ctrl.rejectExpense);

module.exports = router;
