// models/chat_message_model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

/**
 * Attachment sub-schema for images/files
 */
const AttachmentSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["image", "file"],
      required: true,
      default: "image",
    },
    url: {
      type: String,
      required: true, // e.g. https://cdn.yourapp.com/uploads/...
      trim: true,
    },
    filename: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

/**
 * Chat message schema
 */
const ChatMessageSchema = new Schema(
  {
    conversation_id: {
      type: ObjectId,
      ref: "ChatConversation",
      required: true,
      index: true,
    },

    sender_id: {
      type: ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Main text content (can be empty if it's pure image/file)
    content: {
      type: String,
      trim: true,
      default: "",
    },

    // Attachments: images or other file URLs
    attachments: {
      type: [AttachmentSchema],
      default: [],
    },

    // Message type (in case you want to mark system messages later)
    message_type: {
      type: String,
      enum: ["user", "system"],
      default: "user",
      index: true,
    },

    // Basic read receipts: which users have read this message
    read_by: [
      {
        type: ObjectId,
        ref: "User",
      },
    ],

    // Soft delete flags (per message)
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "chat_messages",
  }
);

// Index to quickly pull messages in order for a conversation
ChatMessageSchema.index({ conversation_id: 1, created_at: 1 });

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);
