// controllers/user_controller.js
const jwt = require("jsonwebtoken");
const userService = require("../services/user_service");

function generateToken(user) {
  const payload = {
    userId: user._id,
    roles: user.roles,
    status: user.status,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

/**
 * POST /api/users/register
 */
async function registerUser(req, res, next) {
  try {
    const { full_name, email, phone, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "full_name, email and password are required",
      });
    }

    const user = await userService.createUser({
      full_name,
      email,
      phone,
      password,
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    if (!error.statusCode) console.error(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to register user",
    });
  }
}

/**
 * POST /api/users/login
 */
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    const user = await userService.getUserByEmailWithPassword(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isValid = await userService.validatePassword(user, password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account is not active",
      });
    }

    const token = generateToken(user);

    // remove password_hash before sending
    user.password_hash = undefined;

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to login",
    });
  }
}

/**
 * GET /api/users/me
 */
async function getProfile(req, res) {
  try {
    const user = await userService.getUserById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
    });
  }
}

/**
 * PATCH /api/users/me
 */
async function updateProfile(req, res) {
  try {
    const user = await userService.updateOwnProfile(req.user._id, req.body);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
}

/**
 * GET /api/users
 * Admin / Manager
 */
async function getUsers(req, res) {
  try {
    const { status, role, page, limit } = req.query;

    const result = await userService.listUsers({
      status,
      role,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
}

/**
 * GET /api/users/:id
 * Admin / Manager
 */
async function getUserById(req, res) {
  try {
    const user = await userService.getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
}

/**
 * PATCH /api/users/:id
 * Admin / Manager
 */
async function updateUser(req, res) {
  try {
    const user = await userService.updateUserByAdmin(req.params.id, req.body);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
}

/**
 * PATCH /api/users/:id/status
 * Admin / Manager
 */
async function updateUserStatus(req, res) {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status is required",
      });
    }

    const user = await userService.changeUserStatus(req.params.id, status);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User status updated successfully",
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
}

/**
 * DELETE /api/users/:id
 * Admin
 */
async function removeUser(req, res) {
  try {
    const user = await userService.deleteUser(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
}

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  removeUser,
};
