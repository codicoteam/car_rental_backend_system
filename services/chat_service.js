// services/chat_service.js
const ChatConversation = require("../models/chat_conversation_model");
const ChatMessage = require("../models/chat_message_model");
const User = require("../models/user_model");

/**
 * Helper to load roles for participants so we can snapshot role_at_time.
 */
async function buildParticipants(participantIds) {
  const users = await User.find({ _id: { $in: participantIds } }).select(
    "_id roles"
  );

  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return participantIds.map((id) => {
    const u = userMap.get(String(id));
    return {
      user_id: id,
      role_at_time: u && Array.isArray(u.roles) && u.roles.length > 0 ? u.roles[0] : null,
      joined_at: new Date(),
    };
  });
}

/**
 * Create a new conversation.
 */
async function createConversation({
  creatorUserId,
  participantIds,
  title,
  type = "direct",
  context_type = "general",
  context_id = null,
}) {
  // Ensure creator is in the participants list
  const allParticipantIds = Array.from(
    new Set([...participantIds.map(String), String(creatorUserId)])
  );

  if (allParticipantIds.length < 2) {
    throw new Error("A conversation must have at least two participants.");
  }

  const participants = await buildParticipants(allParticipantIds);

  const conversation = await ChatConversation.create({
    title: title || "",
    participants,
    type,
    context_type,
    context_id,
    created_by: creatorUserId,
    last_message_at: null,
    last_message_preview: "",
  });

  return conversation;
}

/**
 * Get all conversations for a user.
 */
async function getConversationsForUser(userId) {
  return ChatConversation.find({
    "participants.user_id": userId,
    is_archived: false,
  })
    .sort({ updated_at: -1 })
    .lean();
}

/**
 * Get a single conversation, ensuring the user is a participant.
 */
async function getConversationByIdForUser(conversationId, userId) {
  const convo = await ChatConversation.findOne({
    _id: conversationId,
    "participants.user_id": userId,
  });

  if (!convo) {
    const err = new Error("Conversation not found or access denied.");
    err.statusCode = 404;
    throw err;
  }

  return convo;
}

/**
 * Send a message in a conversation.
 */
async function sendMessage({ conversationId, senderId, content, attachments }) {
  const conversation = await ChatConversation.findOne({
    _id: conversationId,
    "participants.user_id": senderId,
  });

  if (!conversation) {
    const err = new Error("Conversation not found or you are not a participant.");
    err.statusCode = 404;
    throw err;
  }

  const trimmedContent = (content || "").trim();

  if (!trimmedContent && (!attachments || attachments.length === 0)) {
    const err = new Error("Message must have text content or at least one attachment.");
    err.statusCode = 400;
    throw err;
  }

  const message = await ChatMessage.create({
    conversation_id: conversationId,
    sender_id: senderId,
    content: trimmedContent,
    attachments: attachments || [],
    message_type: "user",
    read_by: [senderId], // sender has "read" their own message
  });

  // Update conversation last message info
  let preview = trimmedContent;
  if (!preview && message.attachments && message.attachments.length > 0) {
    preview = message.attachments[0].type === "image" ? "[Image]" : "[File]";
  }
  if (preview && preview.length > 200) {
    preview = preview.slice(0, 200) + "...";
  }

  conversation.last_message_at = new Date();
  conversation.last_message_preview = preview || "";
  await conversation.save();

  return message;
}

/**
 * Get all messages in a conversation for a specific user.
 */
async function getMessagesForConversation(conversationId, userId) {
  // Ensure user is participant
  const convo = await ChatConversation.findOne({
    _id: conversationId,
    "participants.user_id": userId,
  }).select("_id");

  if (!convo) {
    const err = new Error("Conversation not found or access denied.");
    err.statusCode = 404;
    throw err;
  }

  const messages = await ChatMessage.find({
    conversation_id: conversationId,
  })
    .sort({ created_at: 1 })
    .lean();

  return messages;
}

/**
 * Mark a message as read by a given user.
 */
async function markMessageRead(messageId, userId) {
  const message = await ChatMessage.findById(messageId);

  if (!message) {
    const err = new Error("Message not found.");
    err.statusCode = 404;
    throw err;
  }

  // Ensure user is in the same conversation
  const convo = await ChatConversation.findOne({
    _id: message.conversation_id,
    "participants.user_id": userId,
  }).select("_id");

  if (!convo) {
    const err = new Error("You are not allowed to read this message.");
    err.statusCode = 403;
    throw err;
  }

  if (!message.read_by.some((id) => String(id) === String(userId))) {
    message.read_by.push(userId);
    await message.save();
  }

  return message;
}

/**
 * Soft delete a message (only sender can delete).
 */
async function softDeleteMessage(messageId, userId) {
  const message = await ChatMessage.findById(messageId);

  if (!message) {
    const err = new Error("Message not found.");
    err.statusCode = 404;
    throw err;
  }

  if (String(message.sender_id) !== String(userId)) {
    const err = new Error("You are not allowed to delete this message.");
    err.statusCode = 403;
    throw err;
  }

  message.is_deleted = true;
  // Optional: blank text, but keep attachments metadata; adjust to taste
  message.content = "";
  await message.save();

  return message;
}

module.exports = {
  createConversation,
  getConversationsForUser,
  getConversationByIdForUser,
  sendMessage,
  getMessagesForConversation,
  markMessageRead,
  softDeleteMessage,
};
