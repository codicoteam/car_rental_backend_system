// services/push_notification_service.js
// firebase-admin v14 uses the modular API — no longer exported from the root package.

const { initializeApp, getApps, getApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const path = require('path');

/**
 * Initialise Firebase Admin SDK once.
 * Subsequent calls return the existing default app.
 */
function _getApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH env var is not set.');
  }

  const resolvedPath = path.resolve(serviceAccountPath);
  const serviceAccount = require(resolvedPath);

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

/**
 * Send a push notification to a list of FCM tokens.
 *
 * @param {string[]} tokens - Array of FCM device tokens.
 * @param {{ title: string, body: string, data?: Record<string, string> }} payload
 * @returns {Promise<import('firebase-admin/messaging').BatchResponse|null>}
 */
async function sendToTokens(tokens, { title, body, data = {} }) {
  if (!tokens || tokens.length === 0) return null;

  const app = _getApp();
  const messaging = getMessaging(app);

  // FCM requires all data values to be strings
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

  // Log individual failures for debugging
  if (response.failureCount > 0) {
    response.responses.forEach((r, i) => {
      if (!r.success) {
        console.warn(`[PushService] Token[${i}] failed: ${r.error?.code} — ${r.error?.message}`);
      }
    });
  }

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
  const messaging = getMessaging(app);

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
