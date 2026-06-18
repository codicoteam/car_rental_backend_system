const accountingService = require("../services/accounting_service");

const wrap = (fn) => async (req, res, next) => {
  try {
    const data = await fn(req.user, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getOverview = wrap(accountingService.getOverview);
exports.getTradingAccount = wrap(accountingService.getTradingAccount);
exports.getIncomeStatement = wrap(accountingService.getIncomeStatement);
exports.getLedger = wrap(accountingService.getLedger);
exports.getRevenueAnalysis = wrap(accountingService.getRevenueAnalysis);
exports.getAuditTrail = wrap(accountingService.getAuditTrail);
