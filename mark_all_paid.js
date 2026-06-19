/**
 * mark_all_paid.js
 * One-shot dev script: marks every payment as paid and syncs reservation payment_summary.
 * Usage: node mark_all_paid.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Payment     = require("./models/payment_model");
const Reservation = require("./models/reservations_model");

async function main() {
  console.log("⏳  Connecting…");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅  Connected\n");

  // 1. Mark all non-paid payments as paid
  const payResult = await Payment.updateMany(
    { paymentStatus: { $ne: "paid" } },
    {
      $set: {
        paymentStatus: "paid",
        captured_at: new Date(),
        boughtAt: new Date(),
      },
    }
  );
  console.log(`💳  Payments updated to PAID: ${payResult.modifiedCount}`);

  // 2. Sync every reservation's payment_summary using its linked payment(s)
  const payments = await Payment.find({ paymentStatus: "paid", reservation_id: { $ne: null } }).lean();

  let resUpdated = 0;
  for (const p of payments) {
    const total = typeof p.pricePaid === "number" ? p.pricePaid : parseFloat((p.amount || "0").toString());
    await Reservation.updateOne(
      { _id: p.reservation_id },
      {
        $set: {
          "payment_summary.status"         : "paid",
          "payment_summary.paid_total"     : mongoose.Types.Decimal128.fromString(total.toFixed(2)),
          "payment_summary.outstanding"    : mongoose.Types.Decimal128.fromString("0.00"),
          "payment_summary.last_payment_at": new Date(),
        },
      }
    );
    resUpdated++;
  }
  console.log(`📋  Reservations synced: ${resUpdated}`);

  console.log("\n✅  Done.\n");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("💥", err.message);
  process.exit(1);
});
