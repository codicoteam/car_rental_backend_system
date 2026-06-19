/**
 * seed_accounting_test.js
 *
 * Creates 5 completed, paid car rental records for zpmakaza@gmail.com
 * on vehicle ABC-1233 (BMW 3 Series) at HRE-CBD Branch.
 * Designed to populate the accounting module with realistic test data.
 *
 * Usage:
 *   node seed_accounting_test.js
 *   node seed_accounting_test.js --email someone@example.com
 *   node seed_accounting_test.js --dry-run     (print plan, do nothing)
 *   node seed_accounting_test.js --clean       (remove previously seeded records)
 */

require("dotenv").config();
const mongoose = require("mongoose");

const User        = require("./models/user_model");
const Reservation = require("./models/reservations_model");
const Payment     = require("./models/payment_model");
require("./models/vehicle_unit_model");
require("./models/vehicle_model");

// ── CLI flags ────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2);
function flag(name, def) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
}
const TARGET_EMAIL = flag("email", "zpmakaza@gmail.com");
const DRY_RUN      = args.includes("--dry-run");
const CLEAN        = args.includes("--clean");

// ── Known IDs (update if DB is re-seeded) ────────────────────────────────────
const VEHICLE_ID       = "6a2e714b865b070f229a09f0"; // ABC - 1233
const VEHICLE_MODEL_ID = "692afbeb8550dfebd86fd971"; // BMW 3 Series 2018
const BRANCH_ID        = "692b00198550dfebd86fd977"; // HRE-CBD
const SEED_TAG         = "SEED-ACCOUNTING-TEST";       // used to find/clean seeded docs

// ── Rental scenarios (past dates so they appear in monthly reports) ──────────
// Today is 2026-06-18. Dates are in May & June 2026.
const RENTALS = [
  {
    label     : "3-day rental — BMW 3 Series",
    pickupAt  : new Date("2026-05-03T08:00:00.000Z"),
    dropoffAt : new Date("2026-05-06T08:00:00.000Z"),
    days      : 3,
    dailyRate : 92,
    total     : 276.00,
  },
  {
    label     : "2-day rental — BMW 3 Series",
    pickupAt  : new Date("2026-05-09T09:00:00.000Z"),
    dropoffAt : new Date("2026-05-11T09:00:00.000Z"),
    days      : 2,
    dailyRate : 92,
    total     : 184.00,
  },
  {
    label     : "5-day rental — BMW 3 Series",
    pickupAt  : new Date("2026-05-14T07:00:00.000Z"),
    dropoffAt : new Date("2026-05-19T07:00:00.000Z"),
    days      : 5,
    dailyRate : 92,
    total     : 460.00,
  },
  {
    label     : "3-day rental — BMW 3 Series",
    pickupAt  : new Date("2026-05-24T10:00:00.000Z"),
    dropoffAt : new Date("2026-05-27T10:00:00.000Z"),
    days      : 3,
    dailyRate : 92,
    total     : 276.00,
  },
  {
    label     : "4-day rental — BMW 3 Series",
    pickupAt  : new Date("2026-06-03T08:00:00.000Z"),
    dropoffAt : new Date("2026-06-07T08:00:00.000Z"),
    days      : 4,
    dailyRate : 92,
    total     : 368.00,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function D128(val) {
  return mongoose.Types.Decimal128.fromString(val.toFixed(2));
}

function hr(label) {
  console.log(`\n${"─".repeat(64)}`);
  if (label) console.log(`  ${label}`);
  console.log("─".repeat(64));
}

// ── Clean mode ───────────────────────────────────────────────────────────────
async function cleanSeededData() {
  hr("CLEAN — removing previously seeded records");

  const payments = await Payment.find({ provider_ref: new RegExp(`^${SEED_TAG}`) }).lean();
  const payIds   = payments.map((p) => p._id);
  const resIds   = payments.map((p) => p.reservation_id).filter(Boolean);

  console.log(`  Found ${payments.length} seeded payment(s)`);
  console.log(`  Found ${resIds.length} linked reservation(s)`);

  if (!DRY_RUN) {
    await Payment.deleteMany({ _id: { $in: payIds } });
    await Reservation.deleteMany({ _id: { $in: resIds } });
    console.log("  ✅  Deleted.");
  } else {
    console.log("  [dry-run] skipping delete.");
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  hr("MoRental — Accounting Test Data Seeder");
  console.log(`  Email    : ${TARGET_EMAIL}`);
  console.log(`  Branch   : HRE-CBD (${BRANCH_ID})`);
  console.log(`  Vehicle  : ABC-1233 (${VEHICLE_ID})`);
  console.log(`  Dry-run  : ${DRY_RUN}`);
  console.log(`  Clean    : ${CLEAN}`);

  console.log("\n⏳  Connecting to MongoDB…");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅  Connected\n");

  if (CLEAN) {
    await cleanSeededData();
    await mongoose.disconnect();
    return;
  }

  // Find user
  const user = await User.findOne({ email: TARGET_EMAIL.toLowerCase() }).lean();
  if (!user) {
    console.error(`❌  No user found with email: ${TARGET_EMAIL}`);
    process.exit(1);
  }
  console.log(`👤  User: ${user.full_name}  (${user._id})`);

  const vehicleOid      = new mongoose.Types.ObjectId(VEHICLE_ID);
  const vehicleModelOid = new mongoose.Types.ObjectId(VEHICLE_MODEL_ID);
  const branchOid       = new mongoose.Types.ObjectId(BRANCH_ID);

  let created = 0;
  let skipped = 0;

  for (const r of RENTALS) {
    hr(r.label);
    console.log(`  Pickup : ${r.pickupAt.toISOString()}`);
    console.log(`  Dropoff: ${r.dropoffAt.toISOString()}`);
    console.log(`  Total  : USD ${r.total.toFixed(2)}`);

    if (DRY_RUN) {
      console.log("  [dry-run] skipping.");
      continue;
    }

    // Check for an existing seeded payment covering the same period
    const dupCheck = await Reservation.findOne({
      user_id   : user._id,
      vehicle_id: vehicleOid,
      "pickup.at" : r.pickupAt,
    }).lean();

    if (dupCheck) {
      console.log(`  ⚠️   Already exists (${dupCheck.code}) — skipping.`);
      skipped++;
      continue;
    }

    // 1. Create reservation
    const reservation = await Reservation.create({
      user_id          : user._id,
      created_by       : user._id,
      created_channel  : "web",
      vehicle_id       : vehicleOid,
      vehicle_model_id : vehicleModelOid,
      pickup  : { branch_id: branchOid, at: r.pickupAt },
      dropoff : { branch_id: branchOid, at: r.dropoffAt },
      status  : "returned",
      pricing : {
        currency   : "USD",
        grand_total: D128(r.total),
        computed_at: r.pickupAt,
        breakdown  : [
          {
            label      : `${r.days}-day rental`,
            quantity   : r.days,
            unit_amount: D128(r.dailyRate),
            total      : D128(r.total),
          },
        ],
        fees     : [],
        taxes    : [],
        discounts: [],
      },
      payment_summary: {
        status       : "paid",
        paid_total   : D128(r.total),
        outstanding  : D128(0),
        last_payment_at: r.dropoffAt,
      },
      vehicle_return: {
        returned_at  : r.dropoffAt,
        submitted_by : user._id,
        vehicle_check: {
          fuel_level  : "full",
          cleanliness : "clean",
          mileage_in  : null,
          damages_noted: false,
        },
      },
      closed_at: r.dropoffAt,
    });

    console.log(`  📋  Reservation: ${reservation.code}  (${reservation._id})`);

    // 2. Create cash payment
    const payment = await Payment.create({
      reservation_id: reservation._id,
      user_id       : user._id,
      provider      : "cash",
      method        : "cash",
      amount        : D128(r.total),
      currency      : "USD",
      paymentStatus : "paid",
      pricePaid     : r.total,
      pollUrl       : "dev-seed",
      provider_ref  : `${SEED_TAG}-${Date.now()}`,
      captured_at   : r.dropoffAt,
      boughtAt      : r.pickupAt,
    });

    console.log(`  💳  Payment: ${payment._id}  (USD ${r.total.toFixed(2)} — PAID)`);
    created++;
  }

  hr("Summary");
  console.log(`  Created : ${created} rental(s)`);
  console.log(`  Skipped : ${skipped} duplicate(s)`);
  console.log(`\n  Total revenue seeded: USD ${
    RENTALS.slice(0, created + skipped)
      .reduce((s, r) => s + r.total, 0)
      .toFixed(2)
  }`);
  console.log("\n  ✅  Done. Refresh the accounting module to see the data.\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("\n💥  Seeder failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});
