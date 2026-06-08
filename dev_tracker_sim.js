/**
 * dev_tracker_sim.js
 *
 * Dev-only GPS simulator: creates a tracker (if needed), attaches it to
 * the last checked_out vehicle, then streams fake location updates
 * via Socket.IO — so you can test the mobile real-time tracking screen
 * without physical GPS hardware.
 *
 * Usage:
 *   node dev_tracker_sim.js
 *   node dev_tracker_sim.js --email zpmakaza@gmail.com
 *
 * The script simulates driving around central Harare, Zimbabwe.
 * Press Ctrl+C to stop.
 */

require("dotenv").config();
const mongoose  = require("mongoose");
const jwt       = require("jsonwebtoken");
const { io }    = require("socket.io-client");

const User          = require("./models/user_model");
const Reservation   = require("./models/reservations_model");
const VehicleTracker = require("./models/vehicle_tracker_model");
require("./models/vehicle_unit_model");
require("./models/vehicle_model");

// ── Config ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function flag(name, def) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
}
const TARGET_EMAIL   = flag("email", "zpmakaza@gmail.com");
const DEVICE_ID      = "DEV-SIM-001";
const INTERVAL_MS    = 4000; // send location every 4 s

// Central Harare route — a small loop around the CBD
const ROUTE = [
  { lat: -17.8316, lng: 31.0472 }, // Samora Machel Ave
  { lat: -17.8290, lng: 31.0510 }, // Julius Nyerere Way
  { lat: -17.8260, lng: 31.0550 }, // Harare Gardens area
  { lat: -17.8280, lng: 31.0590 }, // Enterprise Rd
  { lat: -17.8310, lng: 31.0570 }, // Rotten Row
  { lat: -17.8340, lng: 31.0530 }, // Kwame Nkrumah Ave
  { lat: -17.8330, lng: 31.0490 }, // First St
  { lat: -17.8316, lng: 31.0472 }, // back to start
];

function hr(label) {
  console.log(`\n${"─".repeat(60)}`);
  if (label) console.log(`  ${label}`);
  console.log("─".repeat(60));
}

function lerp(a, b, t) { return a + (b - a) * t; }

function bearing(from, to) {
  const dLng = to.lng - from.lng;
  const y = Math.sin(dLng) * Math.cos(to.lat);
  const x = Math.cos(from.lat) * Math.sin(to.lat) -
            Math.sin(from.lat) * Math.cos(to.lat) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  hr("MoRental GPS Simulator");
  console.log(`  Device ID  : ${DEVICE_ID}`);
  console.log(`  User email : ${TARGET_EMAIL}`);
  console.log(`  Interval   : ${INTERVAL_MS / 1000}s`);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("\n✅  MongoDB connected");

  // 1. Find the user's checked-out reservation
  const user = await User.findOne({ email: TARGET_EMAIL.toLowerCase() }).lean();
  if (!user) { console.error(`❌  User not found: ${TARGET_EMAIL}`); process.exit(1); }

  const reservation = await Reservation.findOne({
    user_id: user._id,
    status: "checked_out",
  }).sort({ created_at: -1 }).lean();

  if (!reservation || !reservation.vehicle_id) {
    console.error("❌  No checked_out reservation with an assigned vehicle.");
    console.error("    Run: node dev_checkout.js  first.");
    process.exit(1);
  }

  const vehicleId = String(reservation.vehicle_id);
  console.log(`\n🚗  Vehicle ID: ${vehicleId}`);
  console.log(`📋  Reservation: ${reservation.code}`);

  // 2. Ensure a simulator tracker exists
  let tracker = await VehicleTracker.findOne({ device_id: DEVICE_ID });
  if (!tracker) {
    tracker = await VehicleTracker.create({
      device_id: DEVICE_ID,
      label:     "Dev GPS Simulator",
      notes:     "Auto-created by dev_tracker_sim.js",
    });
    console.log(`\n🛰️   Created tracker: ${DEVICE_ID}`);
  } else {
    console.log(`\n🛰️   Using existing tracker: ${DEVICE_ID}`);
  }

  // 3. Attach tracker to the vehicle (REST is staff-only, do it directly in DB)
  tracker.attachToVehicle(vehicleId, reservation.pickup?.branch_id || null);
  tracker.status = "active";
  await tracker.save();
  console.log(`✅  Tracker attached to vehicle ${vehicleId}`);

  // 4. Mint a device JWT
  const deviceToken = jwt.sign(
    { trackerId: String(tracker._id), deviceId: tracker.device_id, type: "tracker" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  // 5. Connect to the /tracking Socket.IO namespace
  const socketUrl = `${process.env.BACKEND_URL || "http://localhost:5050"}/tracking`;
  console.log(`\n🔌  Connecting to ${socketUrl} …`);

  const socket = io(socketUrl, {
    auth: { device_token: deviceToken },
    transports: ["websocket"],
    reconnection: true,
  });

  socket.on("connect", () => {
    console.log(`✅  Socket connected: ${socket.id}`);

    // Attach via socket as well
    socket.emit("tracker:attach_vehicle", { vehicle_id: vehicleId });
  });

  socket.on("tracker:attached", (data) => {
    console.log(`🛰️   Tracker attached via socket to vehicle: ${data.vehicleId}`);
    startStreaming(socket, vehicleId);
  });

  socket.on("tracker:location_ack", (d) => {
    process.stdout.write(`  📍 ACK at ${d.at}\r`);
  });

  socket.on("tracking:error", (e) => {
    console.error("\n⚠️  Tracking error:", e);
  });

  socket.on("disconnect", () => {
    console.log("\n🔌  Socket disconnected.");
  });

  socket.on("connect_error", (err) => {
    console.error("\n❌  Connection error:", err.message);
  });

  process.on("SIGINT", async () => {
    console.log("\n\n⏹  Stopping simulator…");
    socket.emit("tracker:detach_vehicle", { reason: "dev_sim_stopped" });
    socket.disconnect();
    tracker.detachFromVehicle("dev_sim_stopped");
    await tracker.save();
    await mongoose.disconnect();
    console.log("✅  Cleaned up. Bye!\n");
    process.exit(0);
  });
}

function startStreaming(socket, vehicleId) {
  hr("Streaming GPS updates  (Ctrl+C to stop)");

  let routeIdx = 0;
  let subStep  = 0;
  const STEPS  = 20; // interpolation steps between waypoints

  setInterval(() => {
    const from = ROUTE[routeIdx % ROUTE.length];
    const to   = ROUTE[(routeIdx + 1) % ROUTE.length];
    const t    = subStep / STEPS;

    const lat   = lerp(from.lat, to.lat, t);
    const lng   = lerp(from.lng, to.lng, t);
    const hdg   = bearing(from, to);
    const speed = 30 + Math.random() * 20; // 30–50 km/h

    socket.emit("tracker:location_update", {
      latitude:    lat,
      longitude:   lng,
      speed_kmh:   parseFloat(speed.toFixed(1)),
      heading_deg: parseFloat(hdg.toFixed(1)),
      accuracy_m:  5,
      source:      "gps",
    });

    process.stdout.write(
      `  📍  lat:${lat.toFixed(5)}  lng:${lng.toFixed(5)}  ${speed.toFixed(0)}km/h  hdg:${hdg.toFixed(0)}°\r`
    );

    subStep++;
    if (subStep >= STEPS) {
      subStep = 0;
      routeIdx = (routeIdx + 1) % ROUTE.length;
    }
  }, INTERVAL_MS);
}

main().catch((err) => {
  console.error("\n💥  Simulator failed:", err.message);
  process.exit(1);
});
