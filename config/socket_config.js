// config/socket_config.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const chatService = require("../services/chat_service");
const { initVehicleTrackingNamespace } = require("./vehicle_tracking_socket");

/**
 * Helper: send a structured chat error to a single socket
 */
function emitChatError(socket, code, message) {
  socket.emit("chat:error", {
    code,
    message,
  });
}

/**
 * Initialize Socket.IO (chat + tracking) on top of an HTTP server
 * @param {http.Server} server
 * @returns {Server} io instance
 */
function initChatSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*", // TODO: restrict in production
    },
  });

  /**
   * Socket auth middleware using JWT for CHAT namespace (root)
   */
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || "";

      if (!token.startsWith("Bearer ")) {
        return next(new Error("AUTH_FAILED"));
      }

      const raw = token.replace("Bearer ", "");
      const decoded = jwt.verify(raw, process.env.JWT_SECRET);

      const userId = decoded.userId || decoded.sub || decoded.id;
      if (!userId) {
        return next(new Error("AUTH_FAILED"));
      }

      socket.user = { _id: userId };
      next();
    } catch (err) {
      console.error("Socket auth error:", err.message || err);
      next(new Error("AUTH_FAILED"));
    }
  });

  // ---------------- CHAT EVENTS ON ROOT NAMESPACE ----------------
  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id, "user:", socket.user?._id);

    // ---- JOIN CONVERSATION ----
    socket.on("chat:join_conversation", async (payload) => {
      try {
        const { conversationId } = payload || {};

        if (!conversationId) {
          return emitChatError(
            socket,
            "VALIDATION_ERROR",
            "conversationId is required."
          );
        }

        // Validate user has access
        await chatService.getConversationByIdForUser(
          conversationId,
          socket.user._id
        );

        const roomName = `conversation:${conversationId}`;
        socket.join(roomName);

        socket.emit("chat:conversation_joined", {
          conversationId,
          joined: true,
        });
      } catch (err) {
        console.error("chat:join_conversation error:", err);
        const msg =
          err.statusCode === 404
            ? "Conversation not found or access denied."
            : "Failed to join conversation.";
        emitChatError(socket, "JOIN_CONVERSATION_FAILED", msg);
      }
    });

    // ---- LEAVE CONVERSATION ----
    socket.on("chat:leave_conversation", async (payload) => {
      try {
        const { conversationId } = payload || {};

        if (!conversationId) {
          return emitChatError(
            socket,
            "VALIDATION_ERROR",
            "conversationId is required."
          );
        }

        const roomName = `conversation:${conversationId}`;
        socket.leave(roomName);

        socket.emit("chat:conversation_left", {
          conversationId,
          left: true,
        });
      } catch (err) {
        console.error("chat:leave_conversation error:", err);
        emitChatError(
          socket,
          "LEAVE_CONVERSATION_FAILED",
          "Failed to leave conversation."
        );
      }
    });

    // ---- SEND MESSAGE ----
    socket.on("chat:send_message", async (payload) => {
      try {
        const { conversation_id, content, attachments } = payload || {};

        if (!conversation_id) {
          return emitChatError(
            socket,
            "VALIDATION_ERROR",
            "conversation_id is required."
          );
        }

        const message = await chatService.sendMessage({
          conversationId: conversation_id,
          senderId: socket.user._id,
          content,
          attachments,
        });

        const roomName = `conversation:${conversation_id}`;

        io.to(roomName).emit("chat:message_created", {
          message,
        });
      } catch (err) {
        console.error("chat:send_message error:", err);
        const code =
          err.statusCode === 404
            ? "CONVERSATION_ACCESS_DENIED"
            : "SEND_MESSAGE_FAILED";
        emitChatError(socket, code, err.message || "Failed to send message.");
      }
    });

    // ---- MARK MESSAGE READ ----
    socket.on("chat:mark_read", async (payload) => {
      try {
        const { messageId } = payload || {};

        if (!messageId) {
          return emitChatError(
            socket,
            "VALIDATION_ERROR",
            "messageId is required."
          );
        }

        const message = await chatService.markMessageRead(
          messageId,
          socket.user._id
        );

        const conversationId = message.conversation_id;
        const roomName = `conversation:${conversationId}`;

        io.to(roomName).emit("chat:message_read", {
          messageId: String(message._id),
          userId: String(socket.user._id),
          readAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error("chat:mark_read error:", err);
        const code =
          err.statusCode === 404 || err.statusCode === 403
            ? "MARK_READ_NOT_ALLOWED"
            : "MARK_READ_FAILED";
        emitChatError(
          socket,
          code,
          err.message || "Failed to mark message as read."
        );
      }
    });

    // ---- DELETE MESSAGE (SOFT DELETE) ----
    socket.on("chat:delete_message", async (payload) => {
      try {
        const { messageId } = payload || {};

        if (!messageId) {
          return emitChatError(
            socket,
            "VALIDATION_ERROR",
            "messageId is required."
          );
        }

        const message = await chatService.softDeleteMessage(
          messageId,
          socket.user._id
        );

        const conversationId = message.conversation_id;
        const roomName = `conversation:${conversationId}`;

        io.to(roomName).emit("chat:message_deleted", {
          messageId: String(message._id),
        });
      } catch (err) {
        console.error("chat:delete_message error:", err);
        const code =
          err.statusCode === 403
            ? "DELETE_NOT_ALLOWED"
            : err.statusCode === 404
            ? "MESSAGE_NOT_FOUND"
            : "DELETE_MESSAGE_FAILED";
        emitChatError(socket, code, err.message || "Failed to delete message.");
      }
    });

    // ---- TYPING START ----
    socket.on("typing:start", async (payload) => {
      try {
        const { conversationId } = payload || {};

        if (!conversationId) {
          return emitChatError(
            socket,
            "VALIDATION_ERROR",
            "conversationId is required."
          );
        }

        const roomName = `conversation:${conversationId}`;

        socket.to(roomName).emit("typing:started", {
          conversationId,
          userId: String(socket.user._id),
        });
      } catch (err) {
        console.error("typing:start error:", err);
        emitChatError(
          socket,
          "TYPING_START_FAILED",
          "Failed to send typing start."
        );
      }
    });

    // ---- TYPING STOP ----
    socket.on("typing:stop", async (payload) => {
      try {
        const { conversationId } = payload || {};

        if (!conversationId) {
          return emitChatError(
            socket,
            "VALIDATION_ERROR",
            "conversationId is required."
          );
        }

        const roomName = `conversation:${conversationId}`;

        socket.to(roomName).emit("typing:stopped", {
          conversationId,
          userId: String(socket.user._id),
        });
      } catch (err) {
        console.error("typing:stop error:", err);
        emitChatError(
          socket,
          "TYPING_STOP_FAILED",
          "Failed to send typing stop."
        );
      }
    });

    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected:", socket.id);
    });
  });

  // ---------------- VEHICLE TRACKING NAMESPACE ----------------
  // This will set up /tracking with its own auth logic and events.
  initVehicleTrackingNamespace(io);

  return io;
}

module.exports = initChatSocket;
