// services/notification_helper.js
// Best-effort helper to create and immediately dispatch a user-targeted notification.
// Never throws — all errors are swallowed so callers are not blocked.

const notifSvc = require('./notifications_service');

/**
 * Create and immediately send a notification to a single user.
 *
 * @param {object} opts
 * @param {string|ObjectId} opts.userId       - Target user's _id
 * @param {string}          opts.title        - Notification title (max 160 chars)
 * @param {string}          opts.message      - Notification body (max 4000 chars)
 * @param {string}          [opts.type]       - info | system | promo | booking | payment | maintenance | alert
 * @param {string[]}        [opts.channels]   - Defaults to ['in_app', 'push']
 * @param {string}          [opts.actionUrl]  - Deep-link / route for the mobile app
 * @param {string|ObjectId} [opts.createdBy]  - Admin/system user id (optional)
 */
async function sendToUser({
  userId,
  title,
  message,
  type = 'info',
  channels = ['in_app', 'push'],
  actionUrl,
  createdBy,
}) {
  try {
    const doc = await notifSvc.createNotification({
      payload: {
        title: String(title).slice(0, 160),
        message: String(message).slice(0, 4000),
        type,
        channels,
        status: 'draft',
        audience: { scope: 'user', user_id: userId },
        action_url: actionUrl || null,
      },
      created_by: createdBy || null,
    });

    // sendNow marks status='sent', sets sent_at, and dispatches push/sms
    await notifSvc.sendNow(String(doc._id));
  } catch (err) {
    console.error('[NotificationHelper] sendToUser failed:', err.message);
  }
}

/**
 * Create and immediately send a notification to all users with a given role.
 *
 * @param {object}   opts
 * @param {string[]} opts.roles        - e.g. ['customer']
 * @param {string}   opts.title
 * @param {string}   opts.message
 * @param {string}   [opts.type]
 * @param {string[]} [opts.channels]
 * @param {string}   [opts.actionUrl]
 * @param {string}   [opts.createdBy]
 */
async function sendToRoles({
  roles,
  title,
  message,
  type = 'info',
  channels = ['in_app', 'push'],
  actionUrl,
  createdBy,
}) {
  try {
    const doc = await notifSvc.createNotification({
      payload: {
        title: String(title).slice(0, 160),
        message: String(message).slice(0, 4000),
        type,
        channels,
        status: 'draft',
        audience: { scope: 'roles', roles },
        action_url: actionUrl || null,
      },
      created_by: createdBy || null,
    });

    await notifSvc.sendNow(String(doc._id));
  } catch (err) {
    console.error('[NotificationHelper] sendToRoles failed:', err.message);
  }
}

module.exports = { sendToUser, sendToRoles };
