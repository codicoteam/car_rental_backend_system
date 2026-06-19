const svc = require("../services/accounting_service");

// GET endpoints — (user, query)
const wrap = (fn) => async (req, res, next) => {
  try {
    const data = await fn(req.user, req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// Mutation endpoints — (user, body, params)
const wrapMut = (fn) => async (req, res, next) => {
  try {
    const data = await fn(req.user, req.body, req.params);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// Tier 1
exports.getOverview        = wrap(svc.getOverview);
exports.getTradingAccount  = wrap(svc.getTradingAccount);
exports.getIncomeStatement = wrap(svc.getIncomeStatement);
exports.getLedger          = wrap(svc.getLedger);
exports.getRevenueAnalysis = wrap(svc.getRevenueAnalysis);
exports.getAuditTrail      = wrap(svc.getAuditTrail);

// Tier 2 — GET
exports.getFixedAssets       = wrap(svc.getFixedAssets);
exports.getBalanceSheet      = wrap(svc.getBalanceSheet);
exports.getCashFlowStatement = wrap(svc.getCashFlowStatement);
exports.getDataHealth        = wrap(svc.getDataHealth);
exports.getBalanceEntries    = wrap(svc.getBalanceEntries);

// Tier 2 — Mutations
exports.createFixedAsset   = wrapMut(svc.createFixedAsset);
exports.updateFixedAsset   = wrapMut(svc.updateFixedAsset);
exports.createBalanceEntry = wrapMut(svc.createBalanceEntry);
exports.updateBalanceEntry = wrapMut(svc.updateBalanceEntry);
exports.deleteBalanceEntry = wrapMut(svc.deleteBalanceEntry);
