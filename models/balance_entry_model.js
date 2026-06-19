const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const ENTRY_TYPES = ["asset", "liability", "equity"];

const ENTRY_CATEGORIES = [
  // Asset
  "cash_bank", "accounts_receivable", "prepayments", "deposits",
  "other_current_asset", "property_equipment", "intangibles",
  "investments", "other_noncurrent_asset",
  // Liability
  "accounts_payable", "accrued_expenses", "tax_payable",
  "short_term_loan", "vehicle_loan", "bank_loan", "lease_obligation",
  "other_liability",
  // Equity
  "share_capital", "retained_earnings", "drawings",
  "revaluation_reserve", "other_equity",
];

const CATEGORY_LABELS = {
  cash_bank: "Cash & Bank",
  accounts_receivable: "Accounts Receivable",
  prepayments: "Prepayments",
  deposits: "Deposits",
  other_current_asset: "Other Current Asset",
  property_equipment: "Property & Equipment",
  intangibles: "Intangible Assets",
  investments: "Investments",
  other_noncurrent_asset: "Other Non-Current Asset",
  accounts_payable: "Accounts Payable",
  accrued_expenses: "Accrued Expenses",
  tax_payable: "Tax Payable",
  short_term_loan: "Short-Term Loan",
  vehicle_loan: "Vehicle Finance / Loan",
  bank_loan: "Bank Loan",
  lease_obligation: "Lease Obligation",
  other_liability: "Other Liability",
  share_capital: "Share Capital",
  retained_earnings: "Retained Earnings",
  drawings: "Drawings / Distributions",
  revaluation_reserve: "Revaluation Reserve",
  other_equity: "Other Equity",
};

// Which categories are current vs non-current
const CURRENT_ASSET_CATS = ["cash_bank", "accounts_receivable", "prepayments", "deposits", "other_current_asset"];
const NONCURRENT_ASSET_CATS = ["property_equipment", "intangibles", "investments", "other_noncurrent_asset"];
const CURRENT_LIABILITY_CATS = ["accounts_payable", "accrued_expenses", "tax_payable", "short_term_loan", "other_liability"];
const NONCURRENT_LIABILITY_CATS = ["vehicle_loan", "bank_loan", "lease_obligation"];

const BalanceChangeLogSchema = new Schema(
  {
    changed_by: { type: ObjectId, ref: "User", required: true },
    changed_at: { type: Date, default: Date.now },
    old_amount: { type: Schema.Types.Decimal128 },
    new_amount: { type: Schema.Types.Decimal128 },
    old_description: { type: String },
    new_description: { type: String },
    reason: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const BalanceEntrySchema = new Schema(
  {
    type: { type: String, enum: ENTRY_TYPES, required: true, index: true },
    category: { type: String, enum: ENTRY_CATEGORIES, required: true, index: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    currency: { type: String, default: "USD", uppercase: true, trim: true },
    effective_date: { type: Date, required: true, index: true },
    reference: { type: String, trim: true, default: "" },

    branch_id: { type: ObjectId, ref: "Branch", default: null, index: true },
    is_opening_balance: { type: Boolean, default: false },
    notes: { type: String, trim: true, default: "" },

    created_by: { type: ObjectId, ref: "User", required: true },
    updated_by: { type: ObjectId, ref: "User", default: null },
    change_log: { type: [BalanceChangeLogSchema], default: [] },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "balance_entries",
  }
);

BalanceEntrySchema.index({ type: 1, category: 1, effective_date: -1 });
BalanceEntrySchema.index({ branch_id: 1, effective_date: -1 });

const BalanceEntry = mongoose.model("BalanceEntry", BalanceEntrySchema);
module.exports = BalanceEntry;
module.exports.ENTRY_TYPES = ENTRY_TYPES;
module.exports.ENTRY_CATEGORIES = ENTRY_CATEGORIES;
module.exports.CATEGORY_LABELS = CATEGORY_LABELS;
module.exports.CURRENT_ASSET_CATS = CURRENT_ASSET_CATS;
module.exports.NONCURRENT_ASSET_CATS = NONCURRENT_ASSET_CATS;
module.exports.CURRENT_LIABILITY_CATS = CURRENT_LIABILITY_CATS;
module.exports.NONCURRENT_LIABILITY_CATS = NONCURRENT_LIABILITY_CATS;
