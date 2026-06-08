/**
 * dev_checkout.js
 *
 * Dev-only seed script: marks the latest reservation for a given user
 * as PAID + CHECKED_OUT so you can see the full active-ride flow in the app
 * without going through a real payment gateway.
 *
 * Usage:
 *   node dev_checkout.js
 *   node dev_checkout.js --email someone@example.com
 *   node dev_checkout.js --email someone@example.com --status confirmed
 *
 * Flags:
 *   --email   Customer email  (default: zpmakaza@gmail.com)
 *   --status  Target status   pending | confirmed | checked_out (default: checked_out)
 *   --pay     also mark payment paid  (default: true)
 */

require("dotenv").config();
const mongoose = require("mongoose");

const User         = require("./models/user_model");
const Reservation  = require("./models/reservations_model");
const Payment      = require("./models/payment_model");
require("./models/vehicle_unit_model");   // registers "Vehicle"
require("./models/vehicle_model");        // registers "VehicleModel"

// ── Parse CLI args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function flag(name, def) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
}
const TARGET_EMAIL  = flag("email",  "zpmakaza@gmail.com");
const TARGET_STATUS = flag("status", "checked_out");
const SKIP_PAYMENT  = args.includes("--no-pay");

// ── Helpers ──────────────────────────────────────────────────────────────────
function toFloat(d) {
  if (d == null) return 0;
  if (typeof d === "number") return d;
  if (typeof d.toString === "function") return parseFloat(d.toString());
  return 0;
}

function hr(label) {
  console.log(`\n${"─".repeat(60)}`);
  if (label) console.log(`  ${label}`);
  console.log("─".repeat(60));
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  hr("MoRental Dev Checkout Script");
  console.log(`  Target e-mail : ${TARGET_EMAIL}`);
  console.log(`  Target status : ${TARGET_STATUS}`);
  console.log(`  Mark payment  : ${!SKIP_PAYMENT}`);

  // 1. Connect to DB
  console.log("\n⏳  Connecting to MongoDB…");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅  Connected");

  // 2. Find user
  const user = await User.findOne({ email: TARGET_EMAIL.toLowerCase() }).lean();
  if (!user) {
    console.error(`\n❌  No user found with email: ${TARGET_EMAIL}`);
    process.exit(1);
  }
  console.log(`\n👤  User found: ${user.full_name} (${user._id})`);

  // 3. Find latest reservation for this user that is not already done
  const reservation = await Reservation.findOne({
    user_id: user._id,
    status: { $nin: ["returned", "cancelled", "no_show"] },
  })
    .populate("vehicle_model_id", "make model year")
    .sort({ created_at: -1 })
    .lean();

  if (!reservation) {
    console.error("\n❌  No active reservation found for this user.");
    process.exit(1);
  }

  const modelName = reservation.vehicle_model_id
    ? `${reservation.vehicle_model_id.make} ${reservation.vehicle_model_id.model} ${reservation.vehicle_model_id.year}`
    : "Unknown vehicle";

  const grandTotal = toFloat(reservation.pricing?.grand_total);
  const currency   = reservation.pricing?.currency ?? "USD";

  hr("Reservation found");
  console.log(`  ID     : ${reservation._id}`);
  console.log(`  Code   : ${reservation.code}`);
  console.log(`  Vehicle: ${modelName}`);
  console.log(`  Status : ${reservation.status}`);
  console.log(`  Total  : ${currency} ${grandTotal.toFixed(2)}`);
  console.log(`  Pickup : ${reservation.pickup.at}`);
  console.log(`  Dropoff: ${reservation.dropoff.at}`);

  const now = new Date();

  // 4. Create / upsert a Payment record (provider: cash, for dev testing)
  if (!SKIP_PAYMENT) {
    const existing = await Payment.findOne({
      reservation_id: reservation._id,
      paymentStatus: "paid",
    }).lean();

    if (existing) {
      console.log("\n💳  Payment already marked as PAID — skipping.");
    } else {
      await Payment.create({
        reservation_id : reservation._id,
        user_id        : user._id,
        provider       : "cash",
        method         : "cash",
        amount         : reservation.pricing.grand_total,
        currency       : currency,
        paymentStatus  : "paid",
        pricePaid      : grandTotal,
        pollUrl        : "dev-seed",
        provider_ref   : `DEV-${Date.now()}`,
        captured_at    : now,
        boughtAt       : now,
      });
      console.log(`\n💳  Payment created — PAID  (${currency} ${grandTotal.toFixed(2)})`);
    }
  }

  // 5. Update reservation payment_summary + status
  await Reservation.updateOne(
    { _id: reservation._id },
    {
      $set: {
        status: TARGET_STATUS,
        "payment_summary.status"         : "paid",
        "payment_summary.paid_total"     : reservation.pricing.grand_total,
        "payment_summary.outstanding"    : 0,
        "payment_summary.last_payment_at": now,
      },
    }
  );

  hr("Done!");
  console.log(`  Reservation ${reservation.code}`);
  console.log(`  ✅  Status  → ${TARGET_STATUS}`);
  console.log(`  ✅  Payment → paid`);
  console.log("\n  Refresh the app to see the changes.\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("\n💥  Script failed:", err.message);
  process.exit(1);
});
