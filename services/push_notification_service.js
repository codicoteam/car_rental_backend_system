// services/push_notification_service.js
// Lazy-initialise Firebase Admin once; send FCM messages.

const admin = require('firebase-admin');
const path = require('path');

/**
 * Initialise Firebase Admin SDK once.
 * Subsequent calls are no-ops.
 */
function _getApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH env var is not set.');
  }

  const resolvedPath = path.resolve(serviceAccountPath);
  const serviceAccount = require(resolvedPath);

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

/**
 * Send a push notification to a list of FCM tokens.
 *
 * @param {string[]} tokens - Array of FCM device tokens.
 * @param {{ title: string, body: string, data?: Record<string, string> }} payload
 * @returns {Promise<admin.messaging.BatchResponse>}
 */
async function sendToTokens(tokens, { title, body, data = {} }) {
  if (!tokens || tokens.length === 0) return null;

  const app = _getApp();
  const messaging = admin.messaging(app);

  // Ensure all data values are strings (FCM requirement)
  const stringifiedData = {};
  for (const [k, v] of Object.entries(data)) {
    stringifiedData[k] = String(v);
  }

  const message = {
    notification: { title, body },
    data: stringifiedData,
    android: {
      notification: {
        channelId: 'morental_notifications',
        priority: 'high',
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
    tokens,
  };

  const response = await messaging.sendEachForMulticast(message);
  console.log(
    `[PushService] Sent to ${tokens.length} tokens. Success: ${response.successCount}, Failure: ${response.failureCount}`
  );
  return response;
}

/**
 * Send a push notification to a topic.
 *
 * @param {string} topic - FCM topic name.
 * @param {{ title: string, body: string, data?: Record<string, string> }} payload
 * @returns {Promise<string>} - Message ID
 */
async function sendToTopic(topic, { title, body, data = {} }) {
  const app = _getApp();
  const messaging = admin.messaging(app);

  const stringifiedData = {};
  for (const [k, v] of Object.entries(data)) {
    stringifiedData[k] = String(v);
  }

  const message = {
    notification: { title, body },
    data: stringifiedData,
    android: {
      notification: {
        channelId: 'morental_notifications',
        priority: 'high',
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
    topic,
  };

  const messageId = await messaging.send(message);
  console.log(`[PushService] Sent to topic '${topic}'. Message ID: ${messageId}`);
  return messageId;
}

module.exports = { sendToTokens, sendToTopic };
