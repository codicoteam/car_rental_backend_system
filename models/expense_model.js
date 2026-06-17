const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const EXPENSE_CATEGORIES = [
  { value: "fuel", label: "Fuel & Oil" },
  { value: "maintenance", label: "Vehicle Maintenance & Repairs" },
  { value: "insurance", label: "Insurance Premiums" },
  { value: "cleaning", label: "Vehicle Cleaning & Detailing" },
  { value: "salaries", label: "Staff Salaries & Wages" },
  { value: "rent", label: "Branch Rent & Lease" },
  { value: "utilities", label: "Utilities (Electricity, Water, Internet)" },
  { value: "parking", label: "Parking Fees & Tolls" },
  { value: "fines", label: "Traffic Fines & Penalties" },
  { value: "licensing", label: "Vehicle Licensing & Registration" },
  { value: "marketing", label: "Marketing & Advertising" },
  { value: "office_supplies", label: "Office Supplies & Stationery" },
  { value: "bank_charges", label: "Bank Charges & Fees" },
  { value: "tyres_parts", label: "Tyres & Spare Parts" },
  { value: "security", label: "Security Services" },
  { value: "it_software", label: "IT & Software" },
  { value: "travel", label: "Travel & Accommodation" },
  { value: "meals", label: "Meals & Entertainment" },
  { value: "vehicle_acquisition", label: "Vehicle Acquisition" },
  { value: "other", label: "Other" },
];

const CATEGORY_VALUES = EXPENSE_CATEGORIES.map((c) => c.value);

const ExpenseSchema = new Schema(
  {
    reference: { type: String, unique: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: CATEGORY_VALUES, index: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    currency: { type: String, enum: ["USD", "ZWL"], default: "USD" },
    date: { type: Date, required: true },
    description: { type: String, trim: true, default: "" },
    branch_id: { type: ObjectId, ref: "Branch", required: true, index: true },
    vehicle_id: { type: ObjectId, ref: "VehicleUnit", default: null },
    receipt_images: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["draft", "pending_approval", "approved", "rejected"],
      default: "draft",
      index: true,
    },
    submitted_by: { type: ObjectId, ref: "User", required: true, index: true },
    submitted_at: { type: Date, default: null },
    approved_by: { type: ObjectId, ref: "User", default: null },
    approved_at: { type: Date, default: null },
    rejection_reason: { type: String, trim: true, default: "" },
    tags: { type: [String], default: [] },
    notes: { type: String, trim: true, default: "" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "expenses",
  }
);

ExpenseSchema.pre("validate", function (next) {
  if (!this.reference) {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const rand = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.reference = `EXP-${ym}-${rand}`;
  }
  next();
});

ExpenseSchema.index({ branch_id: 1, date: -1 });
ExpenseSchema.index({ submitted_by: 1, date: -1 });
ExpenseSchema.index({ status: 1, date: -1 });
ExpenseSchema.index({ category: 1, date: -1 });

const Expense = mongoose.model("Expense", ExpenseSchema);
module.exports = Expense;
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
module.exports.CATEGORY_VALUES = CATEGORY_VALUES;
