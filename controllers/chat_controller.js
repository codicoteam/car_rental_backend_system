// controllers/chat_controller.js
const chatService = require("../services/chat_service");

/**
 * Create a new conversation.
 */
const createConversation = async (req, res) => {
  try {
    const { title, participant_ids, type, context_type, context_id } = req.body;

    if (!Array.isArray(participant_ids) || participant_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "participant_ids array is required and cannot be empty.",
      });
    }

    const conversation = await chatService.createConversation({
      creatorUserId: req.user._id,
      participantIds: participant_ids,
      title,
      type,
      context_type,
      context_id,
    });

    res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error("createConversation error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create conversation.",
    });
  }
};

/**
 * Get all conversations for the authenticated user.
 */
const getMyConversations = async (req, res) => {
  try {
    const conversations = await chatService.getConversationsForUser(
      req.user._id
    );

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error("getMyConversations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversations.",
    });
  }
};

/**
 * Get a single conversation by ID.
 */
const getConversationById = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await chatService.getConversationByIdForUser(
      conversationId,
      req.user._id
    );

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error("getConversationById error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch conversation.",
    });
  }
};

/**
 * Send a message.
 */
const sendMessage = async (req, res) => {
  try {
    const { conversation_id, content, attachments } = req.body;

    if (!conversation_id) {
      return res.status(400).json({
        success: false,
        message: "conversation_id is required.",
      });
    }

    const message = await chatService.sendMessage({
      conversationId: conversation_id,
      senderId: req.user._id,
      content,
      attachments,
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("sendMessage error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to send message.",
    });
  }
};

/**
 * Get all messages for a conversation.
 */
const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const messages = await chatService.getMessagesForConversation(
      conversationId,
      req.user._id
    );

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("getConversationMessages error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch messages.",
    });
  }
};

/**
 * Mark a message as read.
 */
const markMessageRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await chatService.markMessageRead(messageId, req.user._id);

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("markMessageRead error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to mark message as read.",
    });
  }
};

/**
 * Soft delete a message (sender only).
 */
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await chatService.softDeleteMessage(
      messageId,
      req.user._id
    );

    res.json({
      success: true,
      message: "Message deleted.",
      data: message,
    });
  } catch (error) {
    console.error("deleteMessage error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to delete message.",
    });
  }
};

module.exports = {
  createConversation,
  getMyConversations,
  getConversationById,
  sendMessage,
  getConversationMessages,
  markMessageRead,
  deleteMessage,
};
