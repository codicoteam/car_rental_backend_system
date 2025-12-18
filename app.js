// app.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

// DB + Socket config
const connectDB = require("./config/db_config");
const initChatSocket = require("./config/socket_config");

// Swagger setup
const setupSwagger = require("./middlewares/swagger");

// Routers
const userRouter = require("./routers/user_router");
const profileRouter = require("./routers/profile_router");
const vehicleRouter = require("./routers/vehicle_router");
const vehicleUnitRouter = require("./routers/vehicle_unit_router");
const reservationsRouter = require("./routers/reservations_router");
const ratePlanRouter = require("./routers/rate_plan_router");
const branchRouter = require("./routers/branch_router");
const promoCodeRouter = require("./routers/promo_code_router");
const driverProfileRouter = require("./routers/driver_profile_router");
const driverBookingRouter = require("./routers/driver_booking_router");
const serviceOrderRouter = require("./routers/service_order_router");
const serviceScheduleRouter = require("./routers/service_schedule_router");
const vehicleIncidentRouter = require("./routers/vehicle_incident_router");
const chatRouter = require("./routers/chat_router");
const vehicleTrackerRouter = require("./routers/vehicle_tracker_router");
const paymentRouter = require("./routers/payment_router");
const notificationsRouter = require("./routers/notifications_router");

// Load env
dotenv.config();

// Connect DB
connectDB();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Swagger docs
setupSwagger(app);

// REST Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/profiles", profileRouter);
app.use("/api/v1/vehicle-models", vehicleRouter);
app.use("/api/v1/vehicles", vehicleUnitRouter);
app.use("/api/v1/reservations", reservationsRouter);
app.use("/api/v1/rate-plans", ratePlanRouter);
app.use("/api/v1/branches", branchRouter);
app.use("/api/v1/promo-codes", promoCodeRouter);
app.use("/api/v1/driver-profiles", driverProfileRouter);
app.use("/api/v1/driver-bookings", driverBookingRouter);
app.use("/api/v1/service-orders", serviceOrderRouter);
app.use("/api/v1/service-schedules", serviceScheduleRouter);
app.use("/api/v1/vehicle-incidents", vehicleIncidentRouter);
app.use("/api/v1/chats", chatRouter);
app.use("/api/v1/vehicle-trackers", vehicleTrackerRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/notifications", notificationsRouter);

// Global error handler (REST)
app.use((err, req, res, next) => {
  console.error("Global error handler:", err.stack || err);
  res.status(500).json({ message: "Something went wrong!" });
});

// Init Socket.IO (chat + tracking now)
initChatSocket(server);

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚗 Server running on port ${PORT}`);
  console.log(`📘 Swagger docs available at http://localhost:${PORT}/api-docs`);
});
