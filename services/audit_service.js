// services/audit_service.js
const AuditLog = require("../models/audit_log_model");

/**
 * Log an auditable event. Fire-and-forget — never throws.
 */
async function log({
  user_id,
  actor_id = null,
  action,
  entity_type = "other",
  entity_id = null,
  description = "",
  metadata = {},
  ip_address = null,
  user_agent = null,
}) {
  try {
    await AuditLog.create({
      user_id,
      actor_id,
      action,
      entity_type,
      entity_id,
      description,
      metadata,
      ip_address,
      user_agent,
    });
  } catch (err) {
    console.error("audit_service.log error:", err.message);
  }
}

/**
 * Get paginated audit logs for a user.
 */
async function getLogsForUser(userId, { page = 1, limit = 20, action } = {}) {
  const filter = { user_id: userId };
  if (action) filter.action = action;

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate("actor_id", "full_name email")
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
}

module.exports = { log, getLogsForUser };
