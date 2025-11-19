// middleware/auth_middleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/user_model");

// Attach authenticated user (with active status) to req.user
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    const userId = decoded.userId || decoded.sub || decoded.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload.",
      });
    }

    // password_hash is select: false by default, so it won't be returned
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account is not active.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("authMiddleware error:", error);
    return res.status(401).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

// Helper: does user have any of the allowed roles?
const hasAnyRole = (user, allowedRoles = []) => {
  if (!user || !Array.isArray(user.roles)) return false;
  return user.roles.some((role) => allowedRoles.includes(role));
};

// Generic role-guard middleware factory
const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!hasAnyRole(req.user, allowedRoles)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of roles: ${allowedRoles.join(
          ", "
        )}.`,
      });
    }

    next();
  };
};

// Specific role middlewares (based on your enum: customer, agent, manager, admin)
const customerMiddleware = requireRoles("customer");
const agentMiddleware = requireRoles("agent");
const managerMiddleware = requireRoles("manager");
const adminMiddleware = requireRoles("admin");

// Customer-only (no agents) middleware
// Use this for APIs that must not be used by agents.
// Example: router.get('/customer-only', authMiddleware, customerOnlyMiddleware, handler);
const customerOnlyMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  const roles = req.user.roles || [];

  // must have customer role
  if (!roles.includes("customer")) {
    return res.status(403).json({
      success: false,
      message: "Access allowed only for customer accounts.",
    });
  }

  // explicitly block agents (even if they also have customer role, adjust if you want mixed roles allowed)
  if (roles.includes("agent")) {
    return res.status(403).json({
      success: false,
      message: "Agents are not allowed to access this resource.",
    });
  }

  next();
};

module.exports = {
  authMiddleware,
  requireRoles,
  customerMiddleware,
  agentMiddleware,
  managerMiddleware,
  adminMiddleware,
  customerOnlyMiddleware,
};
