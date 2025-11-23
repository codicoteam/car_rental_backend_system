// models/chat_conversation_model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

/**
 * Participant sub-schema:
 * - user_id: which user
 * - role_at_time: snapshot of their role when they joined the conversation (optional but handy)
 */
const ParticipantSchema = new Schema(
  {
    user_id: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    role_at_time: {
      type: String,
      enum: ["customer", "agent", "manager", "admin", "driver"],
      default: null,
    },
    joined_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/**
 * Conversation schema
 * This represents a direct or group chat between users.
 */
const ChatConversationSchema = new Schema(
  {
    // Optional: Human readable name (for group chats, or "Support - #12345")
    title: {
      type: String,
      trim: true,
      default: "",
    },

    // Participants (for your current use-case: mostly 2 users)
    participants: {
      type: [ParticipantSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 2,
        message: "A conversation must have at least two participants.",
      },
    },

    // Conversation type: direct (1:1) or group
    type: {
      type: String,
      enum: ["direct", "group"],
      default: "direct",
      index: true,
    },

    // Optional context: you can link this chat to a reservation, driver booking, etc. later
    context_type: {
      type: String,
      enum: [
        "general",
        "reservation",
        "driver_booking",
        "support",
        "other",
      ],
      default: "general",
      index: true,
    },

    context_id: {
      type: ObjectId,
      default: null, // e.g. Reservation._id, DriverBooking._id if needed
    },

    // Who created this conversation
    created_by: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Quick last-message summary for listing
    last_message_at: {
      type: Date,
      default: null,
      index: true,
    },

    last_message_preview: {
      type: String,
      trim: true,
      default: "",
    },

    // Soft delete / archive flags (for future admin tools)
    is_archived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "chat_conversations",
  }
);

// Index to quickly find conversations for a user
ChatConversationSchema.index({ "participants.user_id": 1, updated_at: -1 });

module.exports = mongoose.model(
  "ChatConversation",
  ChatConversationSchema
);
