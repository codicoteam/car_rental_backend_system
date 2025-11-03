const mongoose = require("mongoose");
const { Schema } = mongoose;

const PaymentSchema = new Schema(
  {
    reservation_id: {
      type: Schema.Types.ObjectId,
      ref: "Reservation",
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["stripe", "paynow", "ecocash", "bank_transfer", "cash"],
      required: true,
    },
    method: {
      type: String,
      enum: ["card", "wallet", "bank", "cash"],
      required: true,
    },

    // amount authorized/captured for the transaction
    amount: { type: Schema.Types.Decimal128, required: true },
    currency: { type: String, enum: ["USD", "ZWL"], required: true },

    // ✅ New status per your spec
    paymentStatus: {
      type: String,
      enum: [
        "paid",
        "pending",
        "failed",
        "unpaid",
        "cancelled",
        "sent",
        "awaiting_delivery",
        "awaiting_confirmation",
      ],
      default: "pending",
      index: true,
    },

    // ✅ New fields per your spec
    pollUrl: { type: String, default: "not available", trim: true },
    pricePaid: { type: Number, required: true }, // keep as Number as requested
    boughtAt: { type: Date, default: Date.now },

    // PSP references & timestamps
    provider_ref: { type: String, trim: true }, // transaction/charge id from PSP
    captured_at: { type: Date, default: null },

    refunds: [
      {
        amount: { type: Schema.Types.Decimal128, required: true },
        provider_ref: { type: String, trim: true },
        at: { type: Date, required: true, default: Date.now },
      },
    ],

    snapshot: {
      payer_name: { type: String, trim: true },
      card_last4: { type: String, trim: true },
      card_brand: { type: String, trim: true },
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "payments",
  }
);

// Useful indexes
PaymentSchema.index({ reservation_id: 1, paymentStatus: 1 });
PaymentSchema.index({ provider_ref: 1 }, { sparse: true });

module.exports = mongoose.model("Payment", PaymentSchema);
