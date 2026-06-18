const express = require("express");
const router = express.Router();
const { authMiddleware, requireRoles } = require("../middlewares/auth_middleware");
const ctrl = require("../controllers/accounting_controller");

const ALLOWED = ["admin", "executive_admin", "manager", "branch_receptionist"];

router.use(authMiddleware);
router.use(requireRoles(...ALLOWED));

router.get("/overview", ctrl.getOverview);
router.get("/trading-account", ctrl.getTradingAccount);
router.get("/income-statement", ctrl.getIncomeStatement);
router.get("/ledger", ctrl.getLedger);
router.get("/revenue-analysis", ctrl.getRevenueAnalysis);
router.get("/audit-trail", ctrl.getAuditTrail);

module.exports = router;
