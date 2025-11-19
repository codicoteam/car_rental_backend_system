const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

// Swagger setup
const setupSwagger = require("./middlewares/swagger"); // make sure the path is correct

// Routers
const userRouter = require("./routers/user_router"); // example router
const profileRouter = require("./routers/profile_router");
const vehicleRouter = require("./routers/vehicle_router");
const vehicleUnitRouter = require("./routers/vehicle_unit_router");
const reservationsRouter = require("./routers/reservations_router");
const ratePlanRouter = require("./routers/rate_plan_router");
const branchRouter = require("./routers/branch_router");
const promoCodeRouter = require("./routers/promo_code_router");

// Load environment variables
dotenv.config();

// Database connectionnode
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Error connecting to the database:", err));

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Swagger docs
setupSwagger(app);

// Routes
// const userRouter = require("./routers/user_router");
app.use("/api/v1/users", userRouter);
app.use("/api/v1/profiles", profileRouter);
app.use("/api/v1/vehicle-models", vehicleRouter);
app.use("/api/v1/vehicles", vehicleUnitRouter);
app.use("/api/v1/reservations", reservationsRouter);
app.use("/api/v1/rate-plans", ratePlanRouter);
app.use("/api/v1/branches", branchRouter);
app.use("/api/v1/promo-codes", promoCodeRouter);
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});
