// services/chat_service.js
const ChatConversation = require("../models/chat_conversation_model");
const ChatMessage = require("../models/chat_message_model");
const User = require("../models/user_model");

// ---------------------------------------------------------------------------
// Role-based chat permission
// ---------------------------------------------------------------------------

const STAFF_ROLES = ["agent", "manager", "admin", "executive_admin", "branch_receptionist"];
const CUSTOMER_DRIVER_ROLES = ["customer", "driver"];

/**
 * Returns true if two role arrays are allowed to chat.
 *
 * Allowed pairs:
 *   customer ↔ agent | manager | admin
 *   driver   ↔ agent | manager | admin
 *   agent    ↔ anyone
 *   manager  ↔ anyone
 *   admin    ↔ anyone
 *
 * Denied:
 *   customer ↔ customer
 *   customer ↔ driver
 *   driver   ↔ driver
 */
function canChat(roles1, roles2) {
  const r1 = Array.isArray(roles1) ? roles1 : [];
  const r2 = Array.isArray(roles2) ? roles2 : [];

  const isStaff1 = r1.some((r) => STAFF_ROLES.includes(r));
  const isStaff2 = r2.some((r) => STAFF_ROLES.includes(r));

  // If either side is staff, always allowed
  if (isStaff1 || isStaff2) return true;

  // Both sides are customer/driver — not allowed
  return false;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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
      role_at_time:
        u && Array.isArray(u.roles) && u.roles.length > 0 ? u.roles[0] : null,
      joined_at: new Date(),
    };
  });
}

// ---------------------------------------------------------------------------
// Create conversation
// ---------------------------------------------------------------------------

/**
 * Create a new conversation (with role validation).
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

  // Role validation for direct conversations
  if (type === "direct" && allParticipantIds.length === 2) {
    const users = await User.find({ _id: { $in: allParticipantIds } }).select(
      "_id roles"
    );
    if (users.length === 2) {
      if (!canChat(users[0].roles, users[1].roles)) {
        const err = new Error(
          "Chat is not permitted between these user roles."
        );
        err.statusCode = 403;
        throw err;
      }
    }
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

// ---------------------------------------------------------------------------
// Find-or-create direct conversation
// ---------------------------------------------------------------------------

/**
 * Find an existing direct conversation between two users, or create one.
 * Validates role-based permissions before creating.
 */
async function findOrCreateDirectConversation({ userId1, userId2 }) {
  const id1 = String(userId1);
  const id2 = String(userId2);

  if (id1 === id2) {
    const err = new Error("Cannot start a conversation with yourself.");
    err.statusCode = 400;
    throw err;
  }

  // Role validation
  const users = await User.find({ _id: { $in: [id1, id2] } }).select(
    "_id roles full_name"
  );

  if (users.length < 2) {
    const err = new Error("One or both users not found.");
    err.statusCode = 404;
    throw err;
  }

  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const u1 = userMap.get(id1);
  const u2 = userMap.get(id2);

  if (!u1 || !u2) {
    const err = new Error("One or both users not found.");
    err.statusCode = 404;
    throw err;
  }

  if (!canChat(u1.roles, u2.roles)) {
    const err = new Error("Chat is not permitted between these user roles.");
    err.statusCode = 403;
    throw err;
  }

  // Try to find existing direct conversation
  const existing = await ChatConversation.findOne({
    $and: [
      { "participants.user_id": id1 },
      { "participants.user_id": id2 },
    ],
    type: "direct",
    is_archived: false,
  });

  if (existing) return existing;

  // Create new
  const participants = await buildParticipants([id1, id2]);

  const conversation = await ChatConversation.create({
    title: "",
    participants,
    type: "direct",
    context_type: "general",
    context_id: null,
    created_by: userId1,
    last_message_at: null,
    last_message_preview: "",
  });

  return conversation;
}

// ---------------------------------------------------------------------------
// Get conversations (basic)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Get conversations with populated participant details + unread count
// ---------------------------------------------------------------------------

/**
 * Like getConversationsForUser but enriches each conversation with full
 * participant user details (full_name, roles) and unread message count.
 */
async function getConversationsForUserPopulated(userId) {
  const userIdStr = String(userId);

  const conversations = await ChatConversation.find({
    "participants.user_id": userIdStr,
    is_archived: false,
  })
    .sort({ last_message_at: -1, updated_at: -1 })
    .lean();

  if (conversations.length === 0) return [];

  // Collect all unique participant IDs across all conversations
  const allParticipantIds = new Set();
  for (const conv of conversations) {
    for (const p of conv.participants || []) {
      allParticipantIds.add(String(p.user_id));
    }
  }

  // Fetch user details in one query
  const userDocs = await User.find({
    _id: { $in: Array.from(allParticipantIds) },
  }).select("_id full_name roles");

  const userMap = new Map(userDocs.map((u) => [String(u._id), u]));

  // Compute unread counts in one aggregation
  const conversationIds = conversations.map((c) => c._id);
  const unreadAgg = await ChatMessage.aggregate([
    {
      $match: {
        conversation_id: { $in: conversationIds },
        is_deleted: false,
        read_by: { $not: { $elemMatch: { $eq: userId } } },
        sender_id: { $ne: userId },
      },
    },
    {
      $group: {
        _id: "$conversation_id",
        count: { $sum: 1 },
      },
    },
  ]);

  const unreadMap = new Map(
    unreadAgg.map((u) => [String(u._id), u.count])
  );

  // Merge everything
  return conversations.map((conv) => {
    const enrichedParticipants = (conv.participants || []).map((p) => {
      const uid = String(p.user_id);
      const userDoc = userMap.get(uid);
      return {
        user_id: uid,
        full_name: userDoc ? userDoc.full_name : "Unknown",
        roles: userDoc ? userDoc.roles : [],
        role_at_time: p.role_at_time || null,
      };
    });

    const convIdStr = String(conv._id);

    return {
      ...conv,
      participants: enrichedParticipants,
      unread_count: unreadMap.get(convIdStr) || 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Get contacts
// ---------------------------------------------------------------------------

/**
 * Returns users this person can chat with, based on role.
 *
 * - customer / driver → agents, managers, admins (staff)
 * - agent / manager / admin → all users (except themselves)
 */
async function getContactsForUser(user) {
  const myId = String(user._id);
  const myRoles = Array.isArray(user.roles) ? user.roles : [];
  const isStaff = myRoles.some((r) => STAFF_ROLES.includes(r));

  let query;
  if (isStaff) {
    // Staff can chat with everyone except themselves
    query = { _id: { $ne: myId } };
  } else {
    // customer/driver can only chat with staff
    query = { roles: { $in: STAFF_ROLES }, _id: { $ne: myId } };
  }

  const contacts = await User.find(query)
    .select("_id full_name roles")
    .sort({ full_name: 1 })
    .lean();

  return contacts;
}

// ---------------------------------------------------------------------------
// Get single conversation
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Send message
// ---------------------------------------------------------------------------

/**
 * Send a message in a conversation.
 */
async function sendMessage({ conversationId, senderId, content, attachments }) {
  const conversation = await ChatConversation.findOne({
    _id: conversationId,
    "participants.user_id": senderId,
  });

  if (!conversation) {
    const err = new Error(
      "Conversation not found or you are not a participant."
    );
    err.statusCode = 404;
    throw err;
  }

  const trimmedContent = (content || "").trim();

  if (!trimmedContent && (!attachments || attachments.length === 0)) {
    const err = new Error(
      "Message must have text content or at least one attachment."
    );
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

// ---------------------------------------------------------------------------
// Get messages
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Mark read
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Bulk mark read
// ---------------------------------------------------------------------------

/**
 * Mark all unread messages in a conversation as read for a given user.
 * Fire-and-forget friendly — resolves silently on error.
 */
async function bulkMarkConversationRead(conversationId, userId) {
  await ChatMessage.updateMany(
    {
      conversation_id: conversationId,
      read_by: { $not: { $elemMatch: { $eq: userId } } },
      is_deleted: false,
    },
    { $addToSet: { read_by: userId } }
  );
}

// ---------------------------------------------------------------------------
// Soft delete
// ---------------------------------------------------------------------------

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
  message.content = "";
  await message.save();

  return message;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  canChat,
  createConversation,
  findOrCreateDirectConversation,
  getConversationsForUser,
  getConversationsForUserPopulated,
  getContactsForUser,
  getConversationByIdForUser,
  sendMessage,
  getMessagesForConversation,
  markMessageRead,
  bulkMarkConversationRead,
  softDeleteMessage,
};
