// controllers/fcm_token_controller.js
// Manages FCM device tokens for push notifications.

const User = require('../models/user_model');

const MAX_TOKENS_PER_USER = 5;

/**
 * POST /api/v1/users/fcm-token
 * Body: { token: string }
 * Adds a new FCM token to the authenticated user's token list.
 * Deduplicates tokens and keeps a maximum of MAX_TOKENS_PER_USER.
 */
async function register(req, res) {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'token is required.' });
    }

    const trimmedToken = token.trim();
    const userId = req.user._id || req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let tokens = Array.isArray(user.fcm_tokens) ? [...user.fcm_tokens] : [];

    // Dedup: remove existing occurrence of same token
    tokens = tokens.filter((t) => t !== trimmedToken);

    // Prepend the new token
    tokens.unshift(trimmedToken);

    // Enforce max limit (keep most recently added first)
    if (tokens.length > MAX_TOKENS_PER_USER) {
      tokens = tokens.slice(0, MAX_TOKENS_PER_USER);
    }

    user.fcm_tokens = tokens;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'FCM token registered successfully.',
      data: { token_count: tokens.length },
    });
  } catch (err) {
    console.error('[FcmTokenController] register error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

/**
 * DELETE /api/v1/users/fcm-token
 * Body: { token: string }
 * Removes the given FCM token from the authenticated user's token list.
 */
async function unregister(req, res) {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'token is required.' });
    }

    const trimmedToken = token.trim();
    const userId = req.user._id || req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const before = (user.fcm_tokens || []).length;
    user.fcm_tokens = (user.fcm_tokens || []).filter((t) => t !== trimmedToken);
    await user.save();

    const removed = before - user.fcm_tokens.length;

    return res.status(200).json({
      success: true,
      message: removed > 0 ? 'FCM token removed.' : 'Token not found (no-op).',
      data: { token_count: user.fcm_tokens.length },
    });
  } catch (err) {
    console.error('[FcmTokenController] unregister error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

module.exports = { register, unregister };
