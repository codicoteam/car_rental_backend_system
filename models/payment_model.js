const mongoose = require("mongoose");
const { Schema } = mongoose;

const PaymentSchema = new Schema(
  {
    // 🔗 Car reservation (optional now)
    reservation_id: {
      type: Schema.Types.ObjectId,
      ref: "Reservation",
      default: null,
      index: true,
    },

    // 🔗 Driver booking (new, optional)
    driver_booking_id: {
      type: Schema.Types.ObjectId,
      ref: "DriverBooking",
      default: null,
      index: true,
    },

    // Who is paying
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

    amount: { type: Schema.Types.Decimal128, required: true },
    currency: { type: String, enum: ["USD", "ZWL"], required: true },

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

    pollUrl: { type: String, default: "not available", trim: true },

    // Keep as Number as you wanted
    pricePaid: { type: Number, required: true },

    boughtAt: { type: Date, default: Date.now },

    provider_ref: { type: String, trim: true },
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

    // 🔗 Promo snapshot (optional)
    promo_code_id: {
      type: Schema.Types.ObjectId,
      ref: "PromoCode",
      default: null,
    },

    promo_code: {
      type: String,
      trim: true,
      default: null, // snapshot of the code text (WELCOME10 etc.)
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "payments",
  }
);

/**
 * Validation: must be linked to either a reservation OR a driver booking.
 */
PaymentSchema.pre("validate", function (next) {
  if (!this.reservation_id && !this.driver_booking_id) {
    return next(
      new Error(
        "Payment must reference either a reservation_id or a driver_booking_id."
      )
    );
  }
  next();
});

// Indexes
PaymentSchema.index({ reservation_id: 1, paymentStatus: 1 });
PaymentSchema.index({ driver_booking_id: 1, paymentStatus: 1 }); // for driver bookings
PaymentSchema.index({ provider_ref: 1 }, { sparse: true });
PaymentSchema.index({ promo_code_id: 1 });

module.exports = mongoose.model("Payment", PaymentSchema);
