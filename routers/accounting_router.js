const express = require("express");
const router = express.Router();
const { authMiddleware, requireRoles } = require("../middlewares/auth_middleware");
const ctrl = require("../controllers/accounting_controller");

const ALL    = ["admin", "executive_admin", "manager", "branch_receptionist"];
const SENIOR = ["admin", "executive_admin", "manager"];
const ADMIN  = ["admin", "executive_admin"];

router.use(authMiddleware);

// ── Tier 1 ────────────────────────────────────────────────────────────────────
router.get("/overview",          requireRoles(...ALL),    ctrl.getOverview);
router.get("/trading-account",   requireRoles(...ALL),    ctrl.getTradingAccount);
router.get("/income-statement",  requireRoles(...ALL),    ctrl.getIncomeStatement);
router.get("/ledger",            requireRoles(...ALL),    ctrl.getLedger);
router.get("/revenue-analysis",  requireRoles(...ALL),    ctrl.getRevenueAnalysis);
router.get("/audit-trail",       requireRoles(...ALL),    ctrl.getAuditTrail);

// ── Tier 2 — read (all roles) ─────────────────────────────────────────────────
router.get("/fixed-assets",      requireRoles(...ALL),    ctrl.getFixedAssets);
router.get("/balance-sheet",     requireRoles(...ALL),    ctrl.getBalanceSheet);
router.get("/cash-flow",         requireRoles(...ALL),    ctrl.getCashFlowStatement);
router.get("/data-health",       requireRoles(...ALL),    ctrl.getDataHealth);
router.get("/balance-entries",   requireRoles(...ALL),    ctrl.getBalanceEntries);

// ── Tier 2 — fixed assets (manager can register/edit for their branch) ────────
router.post("/fixed-assets",          requireRoles(...SENIOR), ctrl.createFixedAsset);
router.put("/fixed-assets/:id",       requireRoles(...SENIOR), ctrl.updateFixedAsset);

// ── Tier 2 — balance entries (admin/exec only — these affect the BS) ──────────
router.post("/balance-entries",       requireRoles(...ADMIN),  ctrl.createBalanceEntry);
router.put("/balance-entries/:id",    requireRoles(...ADMIN),  ctrl.updateBalanceEntry);
router.delete("/balance-entries/:id", requireRoles(...ADMIN),  ctrl.deleteBalanceEntry);

module.exports = router;
