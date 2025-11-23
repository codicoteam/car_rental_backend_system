// sockets/vehicle_tracking_socket.js
const jwt = require("jsonwebtoken");
const VehicleTracker = require("../models/vehicle_tracker_model");

/**
 * Attach vehicle tracking Socket.IO handlers.
 *
 * Namespace suggestion: /tracking
 *  - Android tracker app connects here
 *  - Web dashboards also connect here to listen to vehicle locations
 */
function initVehicleTrackingNamespace(io) {
  const trackingNsp = io.of("/tracking");

  // --------- AUTH MIDDLEWARE FOR TRACKING DEVICES & USERS ----------
  trackingNsp.use(async (socket, next) => {
    try {
      // We support two types of clients:
      // 1) Tracker devices using `device_token`
      // 2) Authenticated users using normal `Authorization` JWT
      const { device_token, authToken } = socket.handshake.auth || {};

      // Case 1: Tracker device with device_token (from /device/login REST)
      if (device_token) {
        try {
          const decoded = jwt.verify(device_token, process.env.JWT_SECRET);
          if (!decoded.trackerId) {
            return next(new Error("INVALID_DEVICE_TOKEN"));
          }

          const tracker = await VehicleTracker.findById(decoded.trackerId);
          if (!tracker) {
            return next(new Error("TRACKER_NOT_FOUND"));
          }

          socket.clientType = "tracker";
          socket.tracker = tracker;
          return next();
        } catch (err) {
          console.error("Tracking namespace device auth error:", err.message);
          return next(new Error("DEVICE_AUTH_FAILED"));
        }
      }

      // Case 2: Normal user (dashboard, agent, etc.) with authToken
      if (authToken && authToken.startsWith("Bearer ")) {
        const raw = authToken.replace("Bearer ", "");
        const decoded = jwt.verify(raw, process.env.JWT_SECRET);
        const userId = decoded.userId || decoded.sub || decoded.id;
        if (!userId) {
          return next(new Error("USER_AUTH_FAILED"));
        }

        socket.clientType = "user";
        socket.user = { _id: userId };
        return next();
      }

      // If no valid credentials provided:
      return next(new Error("NO_AUTH_PROVIDED"));
    } catch (err) {
      console.error("Tracking namespace auth error:", err);
      next(new Error("AUTH_FAILED"));
    }
  });

  // --------- CONNECTION HANDLER ----------
  trackingNsp.on("connection", (socket) => {
    console.log(
      "[TRACKING] client connected:",
      socket.id,
      "type:",
      socket.clientType,
      socket.clientType === "tracker"
        ? `tracker:${socket.tracker.device_id}`
        : `user:${socket.user?._id}`
    );

    // ============ TRACKER-SIDE EVENTS ============

    // 1) Tracker signals it's online & attaches to a vehicle
    //    (in addition to REST /device/attach if you want)
    socket.on("tracker:attach_vehicle", async (payload) => {
      if (socket.clientType !== "tracker") return;

      try {
        const { vehicle_id, branch_id } = payload || {};
        if (!vehicle_id) {
          return socket.emit("tracking:error", {
            code: "VALIDATION_ERROR",
            message: "vehicle_id is required.",
          });
        }

        socket.tracker.attachToVehicle(vehicle_id, branch_id);
        socket.tracker.markSeen({
          location: null,
          ip: socket.handshake.address,
          userAgent: socket.handshake.headers["user-agent"],
        });
        await socket.tracker.save();

        // Join a room for this vehicle so we can broadcast updates
        const roomName = `vehicle:${vehicle_id}`;
        socket.join(roomName);

        socket.emit("tracker:attached", {
          success: true,
          trackerId: String(socket.tracker._id),
          vehicleId: String(vehicle_id),
        });

        // Notify dashboards
        trackingNsp.to(roomName).emit("vehicle:tracker_attached", {
          vehicleId: String(vehicle_id),
          trackerId: String(socket.tracker._id),
        });
      } catch (err) {
        console.error("tracker:attach_vehicle error:", err);
        socket.emit("tracking:error", {
          code: "ATTACH_FAILED",
          message: "Failed to attach tracker to vehicle.",
        });
      }
    });

    // 2) Tracker sends periodic location updates
    socket.on("tracker:location_update", async (payload) => {
      if (socket.clientType !== "tracker") return;

      try {
        const {
          latitude,
          longitude,
          speed_kmh,
          heading_deg,
          accuracy_m,
          source,
        } = payload || {};

        if (typeof latitude !== "number" || typeof longitude !== "number") {
          return socket.emit("tracking:error", {
            code: "VALIDATION_ERROR",
            message: "latitude and longitude (numbers) are required.",
          });
        }

        const location = {
          latitude,
          longitude,
          speed_kmh,
          heading_deg,
          accuracy_m,
          source: source || "gps",
          at: new Date(),
        };

        socket.tracker.markSeen({
          ip: socket.handshake.address,
          userAgent: socket.handshake.headers["user-agent"],
          location,
        });
        await socket.tracker.save();

        // Broadcast to any listeners for this vehicle
        const vehicleId = socket.tracker.vehicle_id;
        if (vehicleId) {
          const roomName = `vehicle:${vehicleId}`;
          trackingNsp.to(roomName).emit("vehicle:location_update", {
            vehicleId: String(vehicleId),
            trackerId: String(socket.tracker._id),
            location,
            updated_at: new Date().toISOString(),
          });
        }

        // Optional ACK back to tracker
        socket.emit("tracker:location_ack", {
          success: true,
          at: new Date().toISOString(),
        });
      } catch (err) {
        console.error("tracker:location_update error:", err);
        socket.emit("tracking:error", {
          code: "LOCATION_UPDATE_FAILED",
          message: "Failed to process location update.",
        });
      }
    });

    // 3) Tracker detach
    socket.on("tracker:detach_vehicle", async (payload) => {
      if (socket.clientType !== "tracker") return;

      try {
        const { reason } = payload || {};
        const oldVehicleId = socket.tracker.vehicle_id;

        socket.tracker.detachFromVehicle(reason || "detached via socket");
        socket.tracker.markSeen({
          ip: socket.handshake.address,
          userAgent: socket.handshake.headers["user-agent"],
        });
        await socket.tracker.save();

        if (oldVehicleId) {
          const roomName = `vehicle:${oldVehicleId}`;
          trackingNsp.to(roomName).emit("vehicle:tracker_detached", {
            vehicleId: String(oldVehicleId),
            trackerId: String(socket.tracker._id),
            reason: socket.tracker.detach_reason,
          });
          socket.leave(roomName);
        }

        socket.emit("tracker:detached", {
          success: true,
        });
      } catch (err) {
        console.error("tracker:detach_vehicle error:", err);
        socket.emit("tracking:error", {
          code: "DETACH_FAILED",
          message: "Failed to detach tracker from vehicle.",
        });
      }
    });

    // ============ USER-SIDE EVENTS ============

    // 4) User subscribes to real-time location for a vehicle
    socket.on("vehicle:subscribe", async (payload) => {
      if (socket.clientType !== "user") return;

      try {
        const { vehicleId } = payload || {};
        if (!vehicleId) {
          return socket.emit("tracking:error", {
            code: "VALIDATION_ERROR",
            message: "vehicleId is required.",
          });
        }

        const roomName = `vehicle:${vehicleId}`;
        socket.join(roomName);

        socket.emit("vehicle:subscribed", {
          vehicleId,
        });
      } catch (err) {
        console.error("vehicle:subscribe error:", err);
        socket.emit("tracking:error", {
          code: "SUBSCRIBE_FAILED",
          message: "Failed to subscribe to vehicle.",
        });
      }
    });

    // 5) User unsubscribes from real-time location for a vehicle
    socket.on("vehicle:unsubscribe", async (payload) => {
      if (socket.clientType !== "user") return;

      try {
        const { vehicleId } = payload || {};
        if (!vehicleId) {
          return socket.emit("tracking:error", {
            code: "VALIDATION_ERROR",
            message: "vehicleId is required.",
          });
        }

        const roomName = `vehicle:${vehicleId}`;
        socket.leave(roomName);

        socket.emit("vehicle:unsubscribed", {
          vehicleId,
        });
      } catch (err) {
        console.error("vehicle:unsubscribe error:", err);
        socket.emit("tracking:error", {
          code: "UNSUBSCRIBE_FAILED",
          message: "Failed to unsubscribe from vehicle.",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("[TRACKING] client disconnected:", socket.id);
    });
  });
}

module.exports = {
  initVehicleTrackingNamespace,
};
