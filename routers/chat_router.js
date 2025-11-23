// routers/chat_router.js
const express = require("express");
const router = express.Router();

const {
  authMiddleware,
} = require("../middlewares/auth_middleware");

const chatController = require("../controllers/chat_controller");

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Chat conversations and messages between users
 */

/**
 * @swagger
 * /api/v1/chats/conversations:
 *   post:
 *     summary: Create a new chat conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Conversation creation payload
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ChatConversationCreateRequest"
 *     responses:
 *       201:
 *         description: Conversation created
 *         content:
 *           application/json:
 *             schema:
 *               type: "object"
 *               properties:
 *                 success:
 *                   type: "boolean"
 *                 data:
 *                   $ref: "#/components/schemas/ChatConversation"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/conversations",
  authMiddleware,
  chatController.createConversation
);

/**
 * @swagger
 * /api/v1/chats/conversations:
 *   get:
 *     summary: Get all chat conversations for the authenticated user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: "object"
 *               properties:
 *                 success:
 *                   type: "boolean"
 *                 data:
 *                   type: "array"
 *                   items:
 *                     $ref: "#/components/schemas/ChatConversation"
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/conversations",
  authMiddleware,
  chatController.getMyConversations
);

/**
 * @swagger
 * /api/v1/chats/conversations/{conversationId}:
 *   get:
 *     summary: Get a single conversation by ID
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation details
 *         content:
 *           application/json:
 *             schema:
 *               type: "object"
 *               properties:
 *                 success:
 *                   type: "boolean"
 *                 data:
 *                   $ref: "#/components/schemas/ChatConversation"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 */
router.get(
  "/conversations/:conversationId",
  authMiddleware,
  chatController.getConversationById
);

/**
 * @swagger
 * /api/v1/chats/messages:
 *   post:
 *     summary: Send a chat message in a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Message payload
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ChatMessageCreateRequest"
 *     responses:
 *       201:
 *         description: Message sent
 *         content:
 *           application/json:
 *             schema:
 *               type: "object"
 *               properties:
 *                 success:
 *                   type: "boolean"
 *                 data:
 *                   $ref: "#/components/schemas/ChatMessage"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/messages",
  authMiddleware,
  chatController.sendMessage
);

/**
 * @swagger
 * /api/v1/chats/conversations/{conversationId}/messages:
 *   get:
 *     summary: Get all messages in a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: List of messages in the conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: "object"
 *               properties:
 *                 success:
 *                   type: "boolean"
 *                 data:
 *                   type: "array"
 *                   items:
 *                     $ref: "#/components/schemas/ChatMessage"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 */
router.get(
  "/conversations/:conversationId/messages",
  authMiddleware,
  chatController.getConversationMessages
);

/**
 * @swagger
 * /api/v1/chats/messages/{messageId}/read:
 *   post:
 *     summary: Mark a chat message as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message read status updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message not found
 */
router.post(
  "/messages/:messageId/read",
  authMiddleware,
  chatController.markMessageRead
);

/**
 * @swagger
 * /api/v1/chats/messages/{messageId}:
 *   delete:
 *     summary: Soft delete a chat message (sender only)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not allowed to delete
 *       404:
 *         description: Message not found
 */
router.delete(
  "/messages/:messageId",
  authMiddleware,
  chatController.deleteMessage
);

module.exports = router;
